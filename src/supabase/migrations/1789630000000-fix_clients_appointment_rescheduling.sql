/*
# Fix client appointment rescheduling against the active booking schema

1. Modified Functions
- `reschedule_patient_booking_owner_1789620000000`
  - Uses `consultations_1789302054187`, which is the table referenced by
    `patient_bookings_1789315000000.consultation_id`.
  - Validates the selected doctor, consultation, location, vacations, weekdays,
    unavailable dates, configured time slots, and future date.
  - Preserves the existing booking ID and updates the existing booking row.
  - Stores `visited` bookings as completed in the dashboard without changing
    the historical database value.

2. Security
- Keeps the function `SECURITY DEFINER`.
- Keeps the fixed `public` search path.
- Restricts rescheduling to the authenticated workspace owner.
- No anonymous access is granted.
- No booking rows are deleted.

3. Important Notes
- The function no longer incorrectly queries `booking_types_1789450000000`.
- Client appointments continue to come from `patient_bookings_1789315000000`.
*/

CREATE OR REPLACE FUNCTION public.reschedule_patient_booking_owner_1789620000000(
  booking_id_value uuid,
  booking_date_value date,
  booking_time_value text
)
RETURNS SETOF public.patient_bookings_1789315000000
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_booking public.patient_bookings_1789315000000;
  selected_consultation public.consultations_1789302054187;
  selected_doctor public.doctors_1789298737910;
  selected_location public.business_locations_1789300875912;
  normalized_time text;
  selected_day text;
BEGIN
  SELECT bookings.*
  INTO selected_booking
  FROM public.patient_bookings_1789315000000 AS bookings
  INNER JOIN public.business_locations_1789300875912 AS locations
    ON locations.id = bookings.location_id
  WHERE bookings.id = booking_id_value
    AND locations.user_id = auth.uid()
  LIMIT 1;

  IF selected_booking.id IS NULL THEN
    RAISE EXCEPTION 'Client appointment could not be found.';
  END IF;

  IF selected_booking.status IN ('cancelled', 'completed', 'visited', 'no_show') THEN
    RAISE EXCEPTION 'This client appointment cannot be rescheduled.';
  END IF;

  IF booking_date_value IS NULL OR booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT consultations.*
  INTO selected_consultation
  FROM public.consultations_1789302054187 AS consultations
  WHERE consultations.id = selected_booking.consultation_id
    AND consultations.user_id = auth.uid()
    AND consultations.is_archived = false
    AND consultations.is_available_for_booking = true
  LIMIT 1;

  IF selected_consultation.id IS NULL THEN
    RAISE EXCEPTION 'The selected appointment type is no longer available.';
  END IF;

  SELECT doctors.*
  INTO selected_doctor
  FROM public.doctors_1789298737910 AS doctors
  WHERE doctors.id = selected_booking.doctor_id
    AND doctors.user_id = auth.uid()
    AND doctors.is_archived = false
    AND doctors.is_available_for_booking = true
  LIMIT 1;

  IF selected_doctor.id IS NULL THEN
    RAISE EXCEPTION 'The selected professional is no longer available.';
  END IF;

  SELECT locations.*
  INTO selected_location
  FROM public.business_locations_1789300875912 AS locations
  WHERE locations.id = selected_booking.location_id
    AND locations.user_id = auth.uid()
    AND locations.is_archived = false
    AND locations.is_available_for_booking = true
  LIMIT 1;

  IF selected_location.id IS NULL THEN
    RAISE EXCEPTION 'The selected location is no longer available.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.doctor_vacations_1789298737910 AS vacations
    WHERE vacations.doctor_id = selected_doctor.id
      AND vacations.is_active = true
      AND booking_date_value BETWEEN vacations.start_date AND vacations.end_date
  ) THEN
    RAISE EXCEPTION 'The professional is unavailable on the selected date.';
  END IF;

  selected_day := trim(to_char(booking_date_value, 'Day'));

  IF NOT selected_day = ANY(selected_location.business_days)
    OR NOT selected_day = ANY(selected_doctor.available_days)
    OR NOT selected_day = ANY(selected_consultation.available_days) THEN
    RAISE EXCEPTION 'The selected date is not available.';
  END IF;

  normalized_time := trim(coalesce(booking_time_value, ''));

  IF normalized_time = ''
    OR NOT normalized_time = ANY(selected_doctor.selected_time_slots) THEN
    RAISE EXCEPTION 'The selected time is not available.';
  END IF;

  IF normalized_time = ANY(selected_consultation.selected_time_slots) IS FALSE
    AND cardinality(selected_consultation.selected_time_slots) > 0 THEN
    RAISE EXCEPTION 'The selected time is not available for this appointment type.';
  END IF;

  IF normalized_time < selected_location.opens_at::text
    OR normalized_time > selected_location.closes_at::text THEN
    RAISE EXCEPTION 'The selected time is outside the location hours.';
  END IF;

  RETURN QUERY
  UPDATE public.patient_bookings_1789315000000 AS bookings
  SET
    booking_date = booking_date_value,
    booking_time = normalized_time,
    status = 'rescheduled',
    updated_at = now()
  WHERE bookings.id = selected_booking.id
  RETURNING bookings.*;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_patient_booking_owner_1789620000000(uuid, date, text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reschedule_patient_booking_owner_1789620000000(uuid, date, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';