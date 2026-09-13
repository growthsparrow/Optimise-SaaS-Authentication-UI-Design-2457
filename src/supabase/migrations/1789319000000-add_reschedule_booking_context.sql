/* # Return booking context for patient rescheduling

1. Changes
- Updates `find_future_patient_bookings_1789315000000` so the booking flow also receives the selected location, doctor, and consultation IDs.
- These IDs allow an already-booked patient to return directly to the correct date and time selection step.
- Existing booking records are preserved.
- Existing booking IDs and appointment details are not changed.

2. Security
- The existing security-definer function remains security-definer.
- The function continues to expose only future active bookings matching the submitted phone number.
- No new table or policy is created.

3. Important Notes
- The frontend uses these IDs to load the original booking availability.
- Patients must choose a date different from their existing booking date before rescheduling.
- No bookings are deleted.
*/

DROP FUNCTION IF EXISTS public.find_future_patient_bookings_1789315000000(text);

CREATE OR REPLACE FUNCTION public.find_future_patient_bookings_1789315000000(
  patient_phone text
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  patient_name text,
  booking_date date,
  booking_time text,
  status text,
  location_id uuid,
  doctor_id uuid,
  consultation_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path=public
AS $$
  SELECT
    bookings.id,
    bookings.booking_id,
    bookings.patient_name,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status,
    bookings.location_id,
    bookings.doctor_id,
    bookings.consultation_id
  FROM public.patient_bookings_1789315000000 bookings
  WHERE bookings.phone_number=regexp_replace(patient_phone,'[^0-9]','','g')
    AND bookings.booking_date>=CURRENT_DATE
    AND bookings.status IN ('confirmed','rescheduled')
  ORDER BY bookings.booking_date,bookings.booking_time;
$$;

GRANT EXECUTE ON FUNCTION public.find_future_patient_bookings_1789315000000(text)
TO anon,authenticated;