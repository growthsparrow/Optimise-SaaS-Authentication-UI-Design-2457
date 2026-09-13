/* # Use numerical patient booking IDs

1. Changes
- Updates `patient_bookings_1789315000000.booking_id` generation for new bookings.
- New IDs use the format `OP-12345678`.
- The eight characters after `OP-` are numeric digits only.
- Existing booking IDs are preserved and are not changed.

2. Security
- The existing RLS policies remain unchanged.
- The existing security-definer booking functions retain their current permissions.

3. Important Notes
- No bookings are deleted or modified.
- Rescheduled bookings keep their original booking ID.
- New IDs are generated inside the booking function and retried if a numerical ID collision occurs.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='patient_bookings_booking_id_format_1789318000000'
  ) THEN
    ALTER TABLE public.patient_bookings_1789315000000
      ADD CONSTRAINT patient_bookings_booking_id_format_1789318000000
      CHECK (booking_id ~ '^OP-[0-9]{8}$');
  END IF;
END $$;

ALTER TABLE public.patient_bookings_1789315000000
  ALTER COLUMN booking_id
  SET DEFAULT (
    'OP-' || lpad(floor(random() * 100000000)::bigint::text,8,'0')
  );

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
SET search_path=public
AS $$
DECLARE
  normalized_phone text;
  location_exists boolean;
  doctor_exists boolean;
  consultation_exists boolean;
  generated_booking_id text;
  inserted_booking public.patient_bookings_1789315000000;
BEGIN
  normalized_phone := regexp_replace(phone_number_value,'[^0-9]','','g');

  IF length(normalized_phone) < 10 THEN
    RAISE EXCEPTION 'Enter a valid contact number.';
  END IF;

  IF booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.business_locations_1789300875912
    WHERE id=location_id_value
      AND is_archived=false
      AND is_available_for_booking=true
  )
  INTO location_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.doctors_1789298737910
    WHERE id=doctor_id_value
      AND is_archived=false
      AND is_available_for_booking=true
  )
  INTO doctor_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.consultations_1789302054187
    WHERE id=consultation_id_value
      AND is_archived=false
      AND is_available_for_booking=true
      AND doctor_id_value=ANY(doctor_ids)
      AND location_id_value=ANY(location_ids)
  )
  INTO consultation_exists;

  IF NOT location_exists OR NOT doctor_exists OR NOT consultation_exists THEN
    RAISE EXCEPTION 'The selected booking option is no longer available.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.consultations_1789302054187
    WHERE id=consultation_id_value
      AND doctor_id_value=ANY(doctor_ids)
      AND location_id_value=ANY(location_ids)
  ) THEN
    RAISE EXCEPTION 'This doctor is not mapped to the selected location and consultation.';
  END IF;

  LOOP
    generated_booking_id :=
      'OP-' || lpad(floor(random() * 100000000)::bigint::text,8,'0');

    BEGIN
      INSERT INTO public.patient_bookings_1789315000000 (
        booking_id,
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
        generated_booking_id,
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
      RETURNING * INTO inserted_booking;

      RETURN NEXT inserted_booking;
      RETURN;
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;
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
) TO anon,authenticated;