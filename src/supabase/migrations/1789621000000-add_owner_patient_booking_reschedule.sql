/*
# Add owner rescheduling for patient bookings

1. New Functions
- `reschedule_patient_booking_owner_1789620000000`
  - Allows an authenticated workspace owner to reschedule a booking created through
    the public patient booking page.
  - Validates ownership through the related business location.
  - Validates future dates, doctor availability, consultation mappings, vacations,
    unavailable weekdays, unavailable dates, and configured time slots.

2. Security
- The function is `SECURITY DEFINER` with a fixed `public` search path.
- Only authenticated workspace owners can execute it.
- Existing booking records are updated in place.
- No booking rows are deleted.

3. Important Notes
- Booking IDs remain unchanged after rescheduling.
- Cancelled, completed, and no-show bookings cannot be rescheduled.
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
  selected_type public.booking_types_1789450000000;
  selected_doctor public.doctors_1789298737910;
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
    RAISE EXCEPTION 'Appointment could not be found.';
  END IF;

  IF selected_booking.status IN ('cancelled', 'completed', 'visited', 'no_show') THEN
    RAISE EXCEPTION 'This appointment cannot be rescheduled.';
  END IF;

  IF booking_date_value IS NULL OR booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT booking_types.*
  INTO selected_type
  FROM public.booking_types_1789450000000 AS booking_types
  WHERE booking_types.id = selected_booking.consultation_id
    AND booking_types.user_id = auth.uid()
    AND booking_types.is_archived = false
    AND booking_types.is_enabled = true
  LIMIT 1;

  IF selected_type.id IS NULL THEN
    RAISE EXCEPTION 'The selected consultation is no longer available.';
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
    RAISE EXCEPTION 'The selected doctor is no longer available.';
  END IF;

  normalized_time := trim(coalesce(booking_time_value, ''));

  IF EXISTS (
    SELECT 1
    FROM public.doctor_vacations_1789298737910 AS vacations
    WHERE vacations.doctor_id = selected_doctor.id
      AND vacations.is_active = true
      AND booking_date_value BETWEEN vacations.start_date AND vacations.end_date
  ) THEN
    RAISE EXCEPTION 'The doctor is unavailable on the selected date.';
  END IF;

  IF selected_type.duration = 'full-day' THEN
    IF NOT booking_date_value = ANY(selected_type.available_dates) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    normalized_time := 'Full day';
  ELSE
    selected_day := trim(to_char(booking_date_value, 'Day'));

    IF NOT selected_day = ANY(selected_doctor.available_days)
      OR NOT selected_day = ANY(selected_type.available_days)
      OR selected_day = ANY(selected_type.unavailable_weekdays)
      OR booking_date_value = ANY(selected_type.unavailable_dates) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    IF normalized_time = ''
      OR NOT normalized_time = ANY(selected_doctor.selected_time_slots)
      OR NOT normalized_time = ANY(selected_type.selected_time_slots)
      OR normalized_time = ANY(selected_type.unavailable_time_slots) THEN
      RAISE EXCEPTION 'The selected time is not available.';
    END IF;
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