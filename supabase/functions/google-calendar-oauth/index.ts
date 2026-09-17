import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')!;
const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const googleRedirectUri = Deno.env.get('GOOGLE_REDIRECT_URI')!;
const appUrl = Deno.env.get('APP_URL')!;
const encryptionKey = Deno.env.get('GOOGLE_TOKEN_ENCRYPTION_KEY')!;

const admin = createClient(supabaseUrl, serviceRoleKey);
const connectionsTable = 'google_calendar_connections_1789640000000';
const bookingsTable = 'public_booking_requests_1789608000000';
const bookingTypesTable = 'booking_types_1789450000000';
const businessPagesTable = 'business_pages_1789493000000';

function validateGoogleConfiguration() {
  const missing = [
    ['GOOGLE_CLIENT_ID', googleClientId],
    ['GOOGLE_CLIENT_SECRET', googleClientSecret],
    ['GOOGLE_REDIRECT_URI', googleRedirectUri],
    ['APP_URL', appUrl],
    ['GOOGLE_TOKEN_ENCRYPTION_KEY', encryptionKey]
  ]
    .filter(([, value]) => !value || !value.trim())
    .map(([name]) => name);

  if (missing.length > 0) {
    throw new Error(
      `Google Calendar is not configured. Missing Edge Function secret(s): ${missing.join(', ')}.`
    );
  }

  let redirectUrl;

  try {
    redirectUrl = new URL(googleRedirectUri);
  } catch {
    throw new Error(
      'Google Calendar is not configured. GOOGLE_REDIRECT_URI must be a complete HTTPS URL.'
    );
  }

  if (redirectUrl.protocol !== 'https:') {
    throw new Error(
      'Google Calendar is not configured. GOOGLE_REDIRECT_URI must use HTTPS.'
    );
  }

  if (redirectUrl.searchParams.get('action') !== 'callback') {
    throw new Error(
      'Google Calendar is not configured. GOOGLE_REDIRECT_URI must end with ?action=callback.'
    );
  }

  let applicationUrl;

  try {
    applicationUrl = new URL(appUrl);
  } catch {
    throw new Error(
      'Google Calendar is not configured. APP_URL must be a complete application URL.'
    );
  }

  if (!['http:', 'https:'].includes(applicationUrl.protocol)) {
    throw new Error(
      'Google Calendar is not configured. APP_URL must use HTTP or HTTPS.'
    );
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-max-age': '86400'
    }
  });
}

function encode(value: Uint8Array) {
  return btoa(String.fromCharCode(...value));
}

function decode(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function getEncryptionKey() {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(encryptionKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await getEncryptionKey(),
    new TextEncoder().encode(value)
  );

  return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}

async function decrypt(value: string) {
  const [ivValue, encryptedValue] = value.split('.');
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decode(ivValue) },
    await getEncryptionKey(),
    decode(encryptedValue)
  );

  return new TextDecoder().decode(decrypted);
}

async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  const { data } = await admin.auth.getUser(token);
  return data.user || null;
}

async function googleTokenRequest(values: Record<string, string>) {
  const body = new URLSearchParams({
    ...values,
    client_id: googleClientId,
    client_secret: googleClientSecret
  });

  const result = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body
  });

  const data = await result.json();

  if (!result.ok) {
    throw new Error(data.error_description || 'Google authorization failed.');
  }

  return data;
}

function makeState(userId: string) {
  return btoa(JSON.stringify({
    userId,
    expiresAt: Date.now() + 10 * 60 * 1000
  }));
}

function readState(value: string) {
  const state = JSON.parse(atob(value));

  if (!state.userId || state.expiresAt < Date.now()) {
    throw new Error('Google authorization expired. Please try again.');
  }

  return state;
}

async function getConnection(userId: string) {
  const { data, error } = await admin
    .from(connectionsTable)
    .select('google_email,status,token_expires_at,last_error')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function createAuthorizationUrl(userId: string) {
  const params = new URLSearchParams({
    client_id: googleClientId,
    redirect_uri: googleRedirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state: makeState(userId),
    scope: [
      'openid',
      'email',
      'https://www.googleapis.com/auth/calendar.events'
    ].join(' ')
  });

  return {
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  };
}

async function handleCallback(request: Request) {
  const url = new URL(request.url);
  const state = readState(url.searchParams.get('state') || '');
  const code = url.searchParams.get('code');

  if (!code) {
    throw new Error('Google authorization was cancelled.');
  }

  const tokens = await googleTokenRequest({
    code,
    grant_type: 'authorization_code',
    redirect_uri: googleRedirectUri
  });

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { authorization: `Bearer ${tokens.access_token}` }
  });
  const profile = await profileResponse.json();

  const { data: existing } = await admin
    .from(connectionsTable)
    .select('refresh_token_ciphertext')
    .eq('user_id', state.userId)
    .maybeSingle();

  const refreshToken = tokens.refresh_token
    ? await encrypt(tokens.refresh_token)
    : existing?.refresh_token_ciphertext || '';

  const { error } = await admin.from(connectionsTable).upsert({
    user_id: state.userId,
    google_email: profile.email || '',
    access_token_ciphertext: await encrypt(tokens.access_token),
    refresh_token_ciphertext: refreshToken,
    token_expires_at: new Date(
      Date.now() + (tokens.expires_in || 3600) * 1000
    ).toISOString(),
    calendar_id: 'primary',
    status: 'connected',
    last_error: '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) {
    throw error;
  }

  return Response.redirect(
    `${appUrl}/#/dashboard?google_calendar=connected`,
    303
  );
}

async function disconnect(userId: string) {
  const { error } = await admin
    .from(connectionsTable)
    .update({
      access_token_ciphertext: '',
      refresh_token_ciphertext: '',
      status: 'expired',
      last_error: 'Disconnected by workspace owner.',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return { disconnected: true };
}

async function accessToken(connection: Record<string, string>) {
  if (
    connection.token_expires_at &&
    new Date(connection.token_expires_at).getTime() > Date.now() + 60_000
  ) {
    return decrypt(connection.access_token_ciphertext);
  }

  const refreshToken = await decrypt(connection.refresh_token_ciphertext);
  const tokens = await googleTokenRequest({
    refresh_token: refreshToken,
    grant_type: 'refresh_token'
  });

  await admin
    .from(connectionsTable)
    .update({
      access_token_ciphertext: await encrypt(tokens.access_token),
      token_expires_at: new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000
      ).toISOString(),
      status: 'connected',
      last_error: '',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', connection.user_id);

  return tokens.access_token;
}

function timeToIso(value: string) {
  if (value === 'Full day') {
    return '09:00';
  }

  const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);

  if (!match) {
    return '09:00';
  }

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hour < 12) {
    hour += 12;
  }

  if (period === 'AM' && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function durationMinutes(value: string) {
  if (value === 'full-day') {
    return 480;
  }

  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
}

async function syncBooking(bookingId: string) {
  const { data: booking, error } = await admin
    .from(bookingsTable)
    .select(`
      id,
      booking_id,
      user_id,
      booking_type_id,
      form_response,
      booking_date,
      booking_time,
      status,
      google_calendar_event_id,
      google_meet_link,
      booking_type:${bookingTypesTable} (
        booking_name,
        booking_type,
        professional_name,
        duration
      ),
      business_page:${businessPagesTable} (
        business_name
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    throw error;
  }

  if (booking.booking_type?.booking_type !== 'online') {
    return { skipped: true, reason: 'offline_booking' };
  }

  if (!['confirmed', 'rescheduled'].includes(booking.status)) {
    return { skipped: true, reason: 'booking_not_active' };
  }

  if (booking.google_calendar_event_id && booking.google_meet_link) {
    return {
      eventId: booking.google_calendar_event_id,
      meetLink: booking.google_meet_link,
      alreadySynced: true
    };
  }

  const { data: connection } = await admin
    .from(connectionsTable)
    .select('*')
    .eq('user_id', booking.user_id)
    .eq('status', 'connected')
    .maybeSingle();

  if (!connection) {
    await admin
      .from(bookingsTable)
      .update({
        google_calendar_sync_status: 'error',
        google_calendar_sync_error: 'Connect Google Calendar in Configure Bookings.'
      })
      .eq('id', booking.id);

    throw new Error('Google Calendar is not connected for this workspace.');
  }

  try {
    const token = await accessToken({
      ...connection,
      user_id: booking.user_id
    });

    const clientName = booking.form_response?.full_name
      || booking.form_response?.name
      || booking.form_response?.client_name
      || 'Client';

    const start = `${booking.booking_date}T${timeToIso(booking.booking_time)}:00`;
    const end = new Date(
      new Date(`${start}+05:30`).getTime()
      + durationMinutes(booking.booking_type?.duration) * 60000
    ).toISOString();

    const eventResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(connection.calendar_id)}/events?conferenceDataVersion=1`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          id: `optimise${booking.id.replaceAll('-', '')}`,
          summary: `${booking.booking_type?.booking_name || 'Appointment'} · ${clientName}`,
          description: `Booking ID: ${booking.booking_id}\nProfessional: ${booking.booking_type?.professional_name || 'Professional'}`,
          location: 'Online appointment',
          start: {
            dateTime: start,
            timeZone: 'Asia/Kolkata'
          },
          end: {
            dateTime: end,
            timeZone: 'Asia/Kolkata'
          },
          conferenceData: {
            createRequest: {
              requestId: `optimise-${booking.id}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet'
              }
            }
          }
        })
      }
    );

    const event = await eventResponse.json();

    if (!eventResponse.ok) {
      throw new Error(
        event.error?.message || 'Google Calendar could not create the event.'
      );
    }

    const meetLink = event.hangoutLink
      || event.conferenceData?.entryPoints?.find(
        (entry: { entryPointType?: string }) => entry.entryPointType === 'video'
      )?.uri
      || '';

    if (!meetLink) {
      throw new Error(
        'Google Calendar created the event but did not return a Meet link.'
      );
    }

    await admin
      .from(bookingsTable)
      .update({
        google_calendar_event_id: event.id,
        google_meet_link: meetLink,
        google_calendar_sync_status: 'synced',
        google_calendar_sync_error: '',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking.id);

    return {
      eventId: event.id,
      meetLink
    };
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Google Calendar synchronization failed.';

    await admin
      .from(connectionsTable)
      .update({
        status: /permission|unauthoriz|forbidden/i.test(message)
          ? 'permission_error'
          : connection.status,
        last_error: message,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', booking.user_id);

    await admin
      .from(bookingsTable)
      .update({
        google_calendar_sync_status: 'error',
        google_calendar_sync_error: message
      })
      .eq('id', booking.id);

    throw error;
  }
}

Deno.serve(async (request) => {
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-max-age': '86400'
        }
      });
    }

    validateGoogleConfiguration();

    const url = new URL(request.url);

    if (url.searchParams.get('action') === 'callback') {
      return await handleCallback(request);
    }

    const user = await getUser(request);

    if (!user) {
      return jsonResponse({ error: 'Authentication required.' }, 401);
    }

    const action = url.searchParams.get('action');

    if (action === 'connect') {
      return jsonResponse(await createAuthorizationUrl(user.id));
    }

    if (action === 'status') {
      return jsonResponse({
        connection: await getConnection(user.id)
      });
    }

    if (action === 'disconnect') {
      return jsonResponse(await disconnect(user.id));
    }

    if (action === 'sync-booking') {
      const payload = await request.json().catch(() => ({}));

      if (!payload.bookingId) {
        return jsonResponse({ error: 'Booking ID is required.' }, 400);
      }

      return jsonResponse(await syncBooking(payload.bookingId));
    }

    return jsonResponse({ error: 'Unknown Google Calendar action.' }, 400);
  } catch (error) {
    return jsonResponse({
      error: error instanceof Error
        ? error.message
        : 'Google Calendar request failed.'
    }, 400);
  }
});