/*
# Add consultation booking availability status

1. Modified Tables
- `consultations_1789302054187`
  - Adds `is_available_for_booking` (boolean): Controls whether patients can create future bookings for the consultation.
  - Existing consultations default to enabled so current booking behavior is preserved.

2. Security
- Existing row-level security remains enabled.
- Existing owner-based policies continue to control access to each consultation.

3. Changes
- Adds an index for consultation availability queries.
- Disabled consultations remain stored and visible in the management dashboard.

4. Important Notes
- No consultations or bookings are deleted.
- `listBookableConsultations()` excludes archived and disabled consultations.
- Any patient booking flow must use `listBookableConsultations()` or independently enforce `is_available_for_booking = true` before creating a future booking.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'consultations_1789302054187'
      AND column_name = 'is_available_for_booking'
  ) THEN
    ALTER TABLE public.consultations_1789302054187
      ADD COLUMN is_available_for_booking boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS consultations_booking_status_idx_1789303200000
  ON public.consultations_1789302054187(is_available_for_booking);