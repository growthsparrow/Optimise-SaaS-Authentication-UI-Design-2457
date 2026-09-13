/*
# Add vacation-aware booking availability lookup

This migration adds a read-only security-definer function so public patients can
see which dates are unavailable for a selected doctor without exposing private
doctor or workspace records.

1. New Tables
- None.

2. Modified Tables
- None. Existing doctor vacation data is preserved.

3. Security
- Adds a `get_active_doctor_vacations_1789321000000` function.
- The function returns only active vacation dates for the requested doctor.
- The function is executable by anonymous and authenticated booking visitors.
- The function uses SECURITY DEFINER with a fixed public search path.

4. Important Notes
- No bookings, doctors, or vacation records are deleted or modified.
- The booking page uses this function to hide vacation dates.
- Existing booking behavior remains unchanged for doctors without vacations.
*/

CREATE OR REPLACE FUNCTION public.get_active_doctor_vacations_1789321000000(
  doctor_id_value uuid
)
RETURNS TABLE (
  start_date date,
  end_date date,
  reason text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vacations.start_date,
    vacations.end_date,
    vacations.reason
  FROM public.doctor_vacations_1789298737910 vacations
  WHERE vacations.doctor_id = doctor_id_value
    AND vacations.is_active = true
    AND vacations.end_date >= CURRENT_DATE
  ORDER BY vacations.start_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_doctor_vacations_1789321000000(uuid)
TO anon, authenticated;