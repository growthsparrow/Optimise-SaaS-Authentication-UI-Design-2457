import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://optimise-saas-v1-01.netlify.app'
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!clientId || !redirectUri || !supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required secrets. Configure GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY in Edge Function settings." 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // PATH 1: Initiate OAuth Flow (?action=auth)
    if (action === 'auth') {
      const userId = url.searchParams.get('user_id') || ''
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar')
      
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${userId}`

      return Response.redirect(googleAuthUrl, 302)
    }

    // PATH 2: Handle Google Callback (code parameter present)
    const code = url.searchParams.get('code')
    const userId = url.searchParams.get('state')

    if (code) {
      if (!clientSecret) {
        return new Response(
          JSON.stringify({ error: "Missing GOOGLE_CLIENT_SECRET environment variable" }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Exchange authorization code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      })

      const tokenData = await tokenResponse.json()

      if (!tokenResponse.ok) {
        console.error('Google Token Exchange Error:', tokenData)
        return Response.redirect(`${frontendUrl}/dashboard?google_calendar=error&message=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Token exchange failed')}`, 302)
      }

      // Get user's Google email
      let googleEmail = ''
      try {
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` }
        })
        const profileData = await profileResponse.json()
        googleEmail = profileData.email || ''
      } catch (err) {
        console.error('Failed to fetch Google profile:', err)
      }

      // Save connection to database if user_id was passed in state
      if (userId) {
        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

        const { error: dbError } = await supabase
          .from('google_calendar_connections_1789640000000')
          .upsert({
            user_id: userId,
            google_email: googleEmail,
            access_token_ciphertext: tokenData.access_token,
            refresh_token_ciphertext: tokenData.refresh_token || '',
            token_expires_at: expiresAt,
            status: 'connected',
            last_error: '',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })

        if (dbError) {
          console.error('Database Upsert Error:', dbError)
          return Response.redirect(`${frontendUrl}/dashboard?google_calendar=error&message=${encodeURIComponent('Database error: ' + dbError.message)}`, 302)
        }
      }

      // Redirect user back to frontend application
      return Response.redirect(`${frontendUrl}/dashboard?google_calendar=connected`, 302)
    }

    // PATH 3: Get connection status (?action=status)
    if (action === 'status') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data: connection, error: connError } = await supabase
        .from('google_calendar_connections_1789640000000')
        .select('id, google_email, status, last_error, created_at, updated_at')
        .eq('user_id', user.id)
        .single()

      if (connError && connError.code !== 'PGRST116') {
        return new Response(
          JSON.stringify({ error: connError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ connection: connection || null }), 
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // PATH 4: Disconnect (?action=disconnect)
    if (action === 'disconnect') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const token = authHeader.replace('Bearer ', '')
      const { data: { user }, error: authError } = await supabase.auth.getUser(token)

      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }), 
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: deleteError } = await supabase
        .from('google_calendar_connections_1789640000000')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Google Calendar disconnected' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: "Invalid action parameter. Use ?action=auth, ?action=status, or ?action=disconnect" }), 
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unhandled Edge Function Exception:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})