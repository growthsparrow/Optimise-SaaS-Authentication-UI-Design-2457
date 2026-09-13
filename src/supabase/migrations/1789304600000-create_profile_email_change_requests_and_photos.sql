/* # Add secure profile photo storage and email change requests

1. New Tables
- `profile_email_change_requests_1789304600000`
  - `id` (uuid, primary key): Unique request identifier.
  - `user_id` (uuid): The authenticated workspace owner making the request.
  - `current_email` (text): The registration email currently attached to the account.
  - `requested_email` (text): The new email requested by the user.
  - `message` (text): Optional context supplied with the request.
  - `status` (text): Request state, defaulting to `pending`.
  - `created_at` (timestamptz): Request creation time.
  - `updated_at` (timestamptz): Last update time.

2. Storage
- Creates the public `profile-photos` bucket if it does not already exist.
- Authenticated users can upload and update only files inside their own user folder.
- Authenticated users can view profile photos.

3. Security
- Enables RLS on the email change request table.
- Users can view only their own requests.
- Users can create requests only for themselves.
- Users cannot modify another user's request.

4. Important Notes
- Registration email addresses are not changed from the dashboard.
- Email change requests are preserved for workspace review.
- No existing profile, account, or storage data is deleted.
*/ 
CREATE TABLE IF NOT EXISTS public.profile_email_change_requests_1789304600000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  current_email text NOT NULL DEFAULT '',
  requested_email text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_email_change_requests_email_valid_1789304600000
    CHECK (requested_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  CONSTRAINT profile_email_change_requests_status_valid_1789304600000
    CHECK (status IN ('pending', 'reviewed', 'approved', 'declined'))
);

CREATE INDEX IF NOT EXISTS profile_email_change_requests_user_id_idx_1789304600000
  ON public.profile_email_change_requests_1789304600000(user_id);

CREATE INDEX IF NOT EXISTS profile_email_change_requests_status_idx_1789304600000
  ON public.profile_email_change_requests_1789304600000(status);

ALTER TABLE public.profile_email_change_requests_1789304600000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_email_change_requests_select_own_1789304600000
  ON public.profile_email_change_requests_1789304600000;

CREATE POLICY profile_email_change_requests_select_own_1789304600000
  ON public.profile_email_change_requests_1789304600000
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS profile_email_change_requests_insert_own_1789304600000
  ON public.profile_email_change_requests_1789304600000;

CREATE POLICY profile_email_change_requests_insert_own_1789304600000
  ON public.profile_email_change_requests_1789304600000
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS profile_photos_select_1789304600000
  ON storage.objects;

CREATE POLICY profile_photos_select_1789304600000
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS profile_photos_insert_1789304600000
  ON storage.objects;

CREATE POLICY profile_photos_insert_1789304600000
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS profile_photos_update_1789304600000
  ON storage.objects;

CREATE POLICY profile_photos_update_1789304600000
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );