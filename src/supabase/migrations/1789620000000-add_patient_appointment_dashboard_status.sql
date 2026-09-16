/*
# Add patient appointment dashboard status support

1. Modified Tables
- `patient_bookings_1789315000000`
  - Adds support for the `completed` status used by the appointment management dashboard.
  - Existing `confirmed`, `rescheduled`, `cancelled`, `visited`, and `no_show` statuses remain valid.
  - Existing booking rows and values are preserved.

2. Security
- Existing owner-based RLS policies remain unchanged.
- Existing team-member restrictions remain unchanged.
- No anonymous write access is added.
- No physical delete operation is used.

3. Important Notes
- The dashboard reads from `patient_bookings_1789315000000`, which is the booking table used by the public patient booking page.
- Existing `visited` records remain unchanged and are displayed as completed in the dashboard.
- Existing bookings are not deleted, reassigned, or rewritten.
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
  ADD CONSTRAINT patient_bookings_dashboard_status_valid_1789620000000
  CHECK (status IN ('confirmed', 'rescheduled', 'cancelled', 'visited', 'completed', 'no_show'));

CREATE INDEX IF NOT EXISTS patient_bookings_status_idx_1789620000000
  ON public.patient_bookings_1789315000000(status);

CREATE INDEX IF NOT EXISTS patient_bookings_consultation_idx_1789620000000
  ON public.patient_bookings_1789315000000(consultation_id);

CREATE INDEX IF NOT EXISTS patient_bookings_doctor_idx_1789620000000
  ON public.patient_bookings_1789315000000(doctor_id);

NOTIFY pgrst, 'reload schema';