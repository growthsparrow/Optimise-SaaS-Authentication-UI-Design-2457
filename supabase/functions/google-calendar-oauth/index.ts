import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')
    const frontendUrl = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000'

    if (!clientId || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI secrets" }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // PATH 1: Initiate OAuth Flow (?action=auth)
    if (action === 'auth') {
      const userId = url.searchParams.get('user_id') || ''
      const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar')
      
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${userId}`

      return Response.redirect(googleAuthUrl, 302)
    }

    // PATH 2: Handle Google Callback (?action=callback)
    if (action === 'callback') {
      const code = url.searchParams.get('code')
      const userId = url.searchParams.get('state')

      if (!code) {
        return new Response(
          JSON.stringify({ error: "Missing 'code' parameter from Google redirect" }), 
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (!clientSecret) {
        return new Response(
          JSON.stringify({ error: "Missing GOOGLE_CLIENT_SECRET environment variable" }), 
          { status: 500, headers: { 'Content-Type': 'application/json' } }
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
        return new Response(JSON.stringify({ google_error: tokenData }), { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        })
      }

      // Save tokens to database if user_id was passed in state
      if (userId) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()

        const { error: dbError } = await supabase.from('user_tokens').upsert({
          user_id: userId,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })

        if (dbError) {
          console.error('Database Upsert Error:', dbError)
        }
      }

      // Redirect user back to frontend application
      return Response.redirect(`${frontendUrl}/dashboard?calendar=connected`, 302)
    }

    return new Response(
      JSON.stringify({ error: "Invalid action parameter. Use ?action=auth or ?action=callback" }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unhandled Edge Function Exception:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})