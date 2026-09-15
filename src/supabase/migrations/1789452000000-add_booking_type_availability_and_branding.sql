/* # Add booking type availability controls and professional branding

1. Modified Tables
- `booking_types_1789450000000`
  - `is_enabled` (boolean): Controls whether this booking type can be used for new bookings.
  - `photo_url` (text): Uploaded professional photo or business logo.
  - `unavailable_weekdays` (text[]): Recurring weekdays when this booking type is unavailable.
  - `unavailable_dates` (date[]): Specific dates when this booking type is unavailable.
  - `unavailable_time_slots` (text[]): Specific configured time slots that should not be offered.

2. Storage
- Creates the public `booking-type-photos` bucket when it does not already exist.
- Allows authenticated workspace owners to upload and update files inside their own user folder.
- Allows authenticated users to view uploaded booking type photos.

3. Security
- Existing booking type row-level security remains enabled.
- Existing owner policies remain unchanged.
- Adds no anonymous write access.
- Storage policies restrict writes to the authenticated user's folder.

4. Important Notes
- Existing booking types remain enabled by default.
- Existing booking type records and photos are preserved.
- Disabling a booking type does not delete it or any historical booking data.
- Vacation rules are stored as configuration and can be changed without removing the booking type.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'is_enabled'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN is_enabled boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN photo_url text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'unavailable_weekdays'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN unavailable_weekdays text[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'unavailable_dates'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN unavailable_dates date[] NOT NULL DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_types_1789450000000'
      AND column_name = 'unavailable_time_slots'
  ) THEN
    ALTER TABLE public.booking_types_1789450000000
      ADD COLUMN unavailable_time_slots text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS booking_types_enabled_idx_1789452000000
  ON public.booking_types_1789450000000(is_enabled);

CREATE INDEX IF NOT EXISTS booking_types_unavailable_dates_idx_1789452000000
  ON public.booking_types_1789450000000
  USING gin(unavailable_dates);

CREATE INDEX IF NOT EXISTS booking_types_unavailable_weekdays_idx_1789452000000
  ON public.booking_types_1789450000000
  USING gin(unavailable_weekdays);

INSERT INTO storage.buckets (id, name, public)
VALUES ('booking-type-photos', 'booking-type-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS booking_type_photos_select_1789452000000
  ON storage.objects;

CREATE POLICY booking_type_photos_select_1789452000000
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'booking-type-photos');

DROP POLICY IF EXISTS booking_type_photos_insert_1789452000000
  ON storage.objects;

CREATE POLICY booking_type_photos_insert_1789452000000
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'booking-type-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS booking_type_photos_update_1789452000000
  ON storage.objects;

CREATE POLICY booking_type_photos_update_1789452000000
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'booking-type-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'booking-type-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';