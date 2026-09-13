/* 
# Add doctor booking availability status

This migration adds a safe enable/disable status to doctor profiles without
deleting or archiving any existing doctors.

1. Modified Tables
- `doctors_1789298737910`
  - Adds `is_available_for_booking` (boolean): Controls whether the doctor
    appears as available for new appointment bookings.
  - Existing doctors default to enabled so current booking behavior is preserved.

2. Security
- Existing row-level security policies remain in place.
- Authenticated workspace owners can update the status only for their own doctors.

3. Important Notes
- Disabling a doctor does not delete the profile or historical data.
- Disabled doctors remain visible in the management dashboard with a Disabled badge.
- Booking availability queries should filter `is_available_for_booking = true`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'doctors_1789298737910'
      AND column_name = 'is_available_for_booking'
  ) THEN
    ALTER TABLE public.doctors_1789298737910
      ADD COLUMN is_available_for_booking boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS doctors_booking_status_idx_1789298737910
  ON public.doctors_1789298737910(is_available_for_booking);