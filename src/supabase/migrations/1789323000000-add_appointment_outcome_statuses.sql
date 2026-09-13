/*
# Add appointment outcome statuses

This migration allows workspace users to record the outcome of an appointment
without deleting or altering the booking record.

1. New Tables
- None.

2. Modified Tables
- `patient_bookings_1789315000000`
  - Expands the existing `status` constraint to support `visited` and `no_show`.
  - Existing statuses `confirmed`, `rescheduled`, and `cancelled` remain valid.

3. Security
- Existing row-level security policies remain unchanged.
- Existing authenticated workspace owners retain their current update permissions.

4. Important Notes
- No appointment rows are deleted.
- Existing appointment statuses and booking information are preserved.
- `visited` means the patient attended the appointment.
- `no_show` means the patient did not attend.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patient_bookings_1789315000000_status_check'
      AND conrelid = 'public.patient_bookings_1789315000000'::regclass
  ) THEN
    ALTER TABLE public.patient_bookings_1789315000000
      DROP CONSTRAINT patient_bookings_1789315000000_status_check;
  END IF;
END $$;

ALTER TABLE public.patient_bookings_1789315000000
  ADD CONSTRAINT patient_bookings_1789315000000_status_check
  CHECK (status IN ('confirmed', 'rescheduled', 'cancelled', 'visited', 'no_show'));