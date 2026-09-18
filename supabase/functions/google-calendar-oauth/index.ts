const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Inside your serve handler:
if (action === 'auth') {
  const userId = url.searchParams.get('user_id') || ''
  const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar')
  
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&access_type=offline&prompt=consent&state=${userId}`

  // Return the URL as JSON payload instead of redirecting
  return new Response(
    JSON.stringify({ url: googleAuthUrl }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  )
}