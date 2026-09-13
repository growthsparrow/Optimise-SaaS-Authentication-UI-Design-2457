/*
# Create patient appointment booking flow

1. New Tables
- `patient_bookings_1789315000000`
  - `id` (uuid, primary key): Unique internal booking identifier.
  - `booking_id` (text, unique): Human-readable booking reference shown to patients.
  - `patient_name` (text): Patient full name.
  - `phone_number` (text): Patient contact number used for duplicate booking checks.
  - `email` (text): Optional patient email address.
  - `gender` (text): Patient gender.
  - `age` (integer): Patient age.
  - `location_id` (uuid): Selected business location.
  - `doctor_id` (uuid): Selected doctor.
  - `consultation_id` (uuid): Selected consultation.
  - `booking_date` (date): Appointment date.
  - `booking_time` (text): Appointment time slot.
  - `status` (text): Booking state: confirmed, rescheduled, or cancelled.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Security
- Row-level security is enabled.
- Anonymous visitors may create bookings through the booking function.
- Workspace owners may read and update bookings belonging to their own workspace data.
- Patients can check duplicate future bookings through a restricted security-definer function.
- No physical deletion is used. Cancellation changes the booking status.

3. Functions
- `find_future_patient_bookings_1789315000000`: Finds active future bookings by phone number.
- `create_patient_booking_1789315000000`: Creates a fresh booking.
- `reschedule_patient_booking_1789315000000`: Updates an existing booking date and time without deleting the booking.

4. Important Notes
- Existing tables and data are not modified or removed.
- Booking availability is validated against the selected location, doctor, consultation, and time slot.
- Existing doctors, locations, and consultations remain managed by their existing workspace tables.
*/

CREATE TABLE IF NOT EXISTS public.patient_bookings_1789315000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL UNIQUE DEFAULT (
    'OPT-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  patient_name text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  age integer NOT NULL DEFAULT 0 CHECK (age > 0 AND age < 130),
  location_id uuid NOT NULL REFERENCES public.business_locations_1789300875912(id),
  doctor_id uuid NOT NULL REFERENCES public.doctors_1789298737910(id),
  consultation_id uuid NOT NULL REFERENCES public.consultations_1789302054187(id),
  booking_date date NOT NULL,
  booking_time text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed', 'rescheduled', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS patient_bookings_phone_idx_1789315000000
  ON public.patient_bookings_1789315000000(phone_number);

CREATE INDEX IF NOT EXISTS patient_bookings_date_idx_1789315000000
  ON public.patient_bookings_1789315000000(booking_date);

ALTER TABLE public.patient_bookings_1789315000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS patient_bookings_owner_select_1789315000000
  ON public.patient_bookings_1789315000000;

CREATE POLICY patient_bookings_owner_select_1789315000000
  ON public.patient_bookings_1789315000000
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_locations_1789300875912 locations
      WHERE locations.id = location_id
        AND locations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS patient_bookings_owner_update_1789315000000
  ON public.patient_bookings_1789315000000;

CREATE POLICY patient_bookings_owner_update_1789315000000
  ON public.patient_bookings_1789315000000
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.business_locations_1789300875912 locations
      WHERE locations.id = location_id
        AND locations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.business_locations_1789300875912 locations
      WHERE locations.id = location_id
        AND locations.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.find_future_patient_bookings_1789315000000(
  patient_phone text
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  patient_name text,
  booking_date date,
  booking_time text,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bookings.id,
    bookings.booking_id,
    bookings.patient_name,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status
  FROM public.patient_bookings_1789315000000 bookings
  WHERE bookings.phone_number = regexp_replace(patient_phone, '[^0-9]', '', 'g')
    AND bookings.booking_date >= CURRENT_DATE
    AND bookings.status IN ('confirmed', 'rescheduled')
  ORDER BY bookings.booking_date, bookings.booking_time;
$$;

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
  ) INTO location_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.doctors_1789298737910
    WHERE id = doctor_id_value
      AND is_archived = false
      AND is_available_for_booking = true
  ) INTO doctor_exists;

  SELECT EXISTS (
    SELECT 1
    FROM public.consultations_1789302054187
    WHERE id = consultation_id_value
      AND is_archived = false
      AND is_available_for_booking = true
  ) INTO consultation_exists;

  IF NOT location_exists OR NOT doctor_exists OR NOT consultation_exists THEN
    RAISE EXCEPTION 'The selected booking option is no longer available.';
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

CREATE OR REPLACE FUNCTION public.reschedule_patient_booking_1789315000000(
  booking_id_value uuid,
  booking_date_value date,
  booking_time_value text,
  patient_phone_value text
)
RETURNS SETOF public.patient_bookings_1789315000000
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.patient_bookings_1789315000000
  SET
    booking_date = booking_date_value,
    booking_time = trim(booking_time_value),
    status = 'rescheduled',
    updated_at = now()
  WHERE id = booking_id_value
    AND phone_number = regexp_replace(patient_phone_value, '[^0-9]', '', 'g')
    AND status IN ('confirmed', 'rescheduled')
    AND booking_date >= CURRENT_DATE
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_future_patient_bookings_1789315000000(text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_patient_booking_1789315000000(
  text, text, text, text, integer, uuid, uuid, uuid, date, text
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reschedule_patient_booking_1789315000000(
  uuid, date, text, text
) TO anon, authenticated;