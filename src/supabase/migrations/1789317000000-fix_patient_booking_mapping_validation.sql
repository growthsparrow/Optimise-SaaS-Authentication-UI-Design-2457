/*
# Fix patient booking mapping validation

1. Modified Functions
- `create_patient_booking_1789315000000`
  - Keeps the existing booking creation behavior.
  - Validates that the selected doctor is mapped to the selected location through
    an active consultation.
  - Validates that the selected consultation is mapped to both the selected doctor
    and selected location.

2. Security
- The function remains `SECURITY DEFINER`.
- The existing booking table RLS and permissions remain unchanged.

3. Important Notes
- No existing bookings, doctors, consultations, or locations are deleted.
- This migration fixes validation only; the frontend now reads location mappings
  from consultation records instead of querying the nonexistent doctor
  `location_ids` column.
*/

CREATE OR REPLACE FUNCTION public.create_patient_booking_1789315000000(
  patient_name_value text,
  phone_number_value text,
  email_value text,
  gender_value text,
  age_value integer,
  location_id_value uuid,
  doctor_id_value uuid,
  consultation_id_value uuid,
  booking_date_value date,
  booking_time_value text
)
RETURNS SETOF public.patient_bookings_1789315000000
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_phone text;
  location_exists boolean;
  doctor_exists boolean;
  consultation_exists boolean;
BEGIN
  normalized_phone := regexp_replace(phone_number_value, '[^0-9]', '', 'g');

  IF length(normalized_phone) < 10 THEN
    RAISE EXCEPTION 'Enter a valid contact number.';
  END IF;

  IF booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.business_locations_1789300875912
    WHERE id = location_id_value
      AND is_archived = false
      AND is_available_for_booking = true
  )
  INTO location_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.doctors_1789298737910
    WHERE id = doctor_id_value
      AND is_archived = false
      AND is_available_for_booking = true
  )
  INTO doctor_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.consultations_1789302054187
    WHERE id = consultation_id_value
      AND is_archived = false
      AND is_available_for_booking = true
      AND doctor_id_value = ANY(doctor_ids)
      AND location_id_value = ANY(location_ids)
  )
  INTO consultation_exists;

  IF NOT location_exists OR NOT doctor_exists OR NOT consultation_exists THEN
    RAISE EXCEPTION 'The selected booking option is no longer available.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.consultations_1789302054187
    WHERE id = consultation_id_value
      AND doctor_id_value = ANY(doctor_ids)
      AND location_id_value = ANY(location_ids)
  ) THEN
    RAISE EXCEPTION 'This doctor is not mapped to the selected location and consultation.';
  END IF;

  RETURN QUERY
  INSERT INTO public.patient_bookings_1789315000000 (
    patient_name,
    phone_number,
    email,
    gender,
    age,
    location_id,
    doctor_id,
    consultation_id,
    booking_date,
    booking_time
  )
  VALUES (
    trim(patient_name_value),
    normalized_phone,
    lower(trim(email_value)),
    trim(gender_value),
    age_value,
    location_id_value,
    doctor_id_value,
    consultation_id_value,
    booking_date_value,
    trim(booking_time_value)
  )
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_patient_booking_1789315000000(
  text,
  text,
  text,
  text,
  integer,
  uuid,
  uuid,
  uuid,
  date,
  text
) TO anon, authenticated;