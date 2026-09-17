/*
# Add secure Google Calendar connections and booking event references

1. New Tables
- `google_calendar_connections_1789640000000`
  - `id`: Unique connection identifier.
  - `user_id`: Workspace owner.
  - `google_email`: Connected Google account email.
  - `access_token_ciphertext`: Encrypted short-lived access token.
  - `refresh_token_ciphertext`: Encrypted refresh token.
  - `token_expires_at`: Access-token expiry timestamp.
  - `calendar_id`: Google Calendar identifier.
  - `status`: Connection state.
  - `last_error`: Safe synchronization diagnostic.
  - `created_at` and `updated_at`: Record timestamps.

2. Modified Tables
- `public_booking_requests_1789608000000`
  - Adds `google_calendar_event_id`.
  - Adds `google_meet_link`.
  - Adds `google_calendar_sync_status`.
  - Adds `google_calendar_sync_error`.
  - Existing booking records are preserved.

3. Security
- Enables RLS on the Google Calendar connection table.
- Creates no browser-access policies for OAuth credentials.
- Google credentials are readable only by the server-side Edge Function using the
  service-role client.
- Existing booking security policies remain unchanged.

4. Important Notes
- Configure Google OAuth credentials and the encryption key as Edge Function secrets.
- Offline bookings are not synchronized.
- Existing rows are not deleted or reassigned.
*/

CREATE TABLE IF NOT EXISTS public.google_calendar_connections_1789640000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email text NOT NULL DEFAULT '',
  access_token_ciphertext text NOT NULL DEFAULT '',
  refresh_token_ciphertext text NOT NULL DEFAULT '',
  token_expires_at timestamptz,
  calendar_id text NOT NULL DEFAULT 'primary',
  status text NOT NULL DEFAULT 'connected',
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_connection_status_valid_1789640000000
    CHECK (status IN ('connected', 'expired', 'permission_error'))
);

CREATE INDEX IF NOT EXISTS google_calendar_connections_user_id_idx_1789640000000
  ON public.google_calendar_connections_1789640000000(user_id);

CREATE INDEX IF NOT EXISTS google_calendar_connections_status_idx_1789640000000
  ON public.google_calendar_connections_1789640000000(status);

ALTER TABLE public.google_calendar_connections_1789640000000
  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_booking_requests_1789608000000'
      AND column_name = 'google_calendar_event_id'
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      ADD COLUMN google_calendar_event_id text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_booking_requests_1789608000000'
      AND column_name = 'google_meet_link'
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      ADD COLUMN google_meet_link text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_booking_requests_1789608000000'
      AND column_name = 'google_calendar_sync_status'
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      ADD COLUMN google_calendar_sync_status text NOT NULL DEFAULT 'not_required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'public_booking_requests_1789608000000'
      AND column_name = 'google_calendar_sync_error'
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      ADD COLUMN google_calendar_sync_error text NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_booking_google_sync_status_valid_1789640000000'
      AND conrelid = 'public.public_booking_requests_1789608000000'::regclass
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      ADD CONSTRAINT public_booking_google_sync_status_valid_1789640000000
      CHECK (
        google_calendar_sync_status IN (
          'not_required',
          'pending',
          'synced',
          'error'
        )
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS public_booking_google_event_id_idx_1789640000000
  ON public.public_booking_requests_1789608000000(google_calendar_event_id)
  WHERE google_calendar_event_id <> '';

NOTIFY pgrst, 'reload schema';