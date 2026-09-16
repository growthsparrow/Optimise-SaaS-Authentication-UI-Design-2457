/*
# Create appointment forms and public booking requests

1. New Tables

- `appointment_forms_1789608000000`
  - `id` (uuid, primary key): Form identifier.
  - `user_id` (uuid): Workspace owner.
  - `form_name` (text): Internal form name.
  - `description` (text): Optional explanation shown in the dashboard.
  - `fields` (jsonb): Ordered field definitions configured by the owner.
  - `is_published` (boolean): Controls whether the form is used publicly.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

- `public_booking_requests_1789608000000`
  - `id` (uuid, primary key): Booking request identifier.
  - `booking_id` (text, unique): Six-digit public confirmation number.
  - `user_id` (uuid): Workspace owner.
  - `business_page_id` (uuid): Public business page.
  - `booking_type_id` (uuid): Selected public booking type.
  - `form_response` (jsonb): Submitted values from the configured appointment form.
  - `booking_date` (date): Selected appointment date.
  - `booking_time` (text): Selected appointment time.
  - `status` (text): Booking status.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Security

- Enables RLS on both tables.
- Workspace owners can manage their own appointment form.
- Workspace owners can read and update their own public booking requests.
- Anonymous visitors cannot directly read booking data.
- Anonymous visitors create bookings only through a security-definer RPC.
- The RPC validates the published business page and enabled booking type before inserting.

3. Important Notes

- Existing appointment tables and booking data are not modified or deleted.
- The form field definitions are stored in their configured order.
- Booking IDs contain exactly six numeric digits.
- Existing booking flows remain available for compatibility.
*/

CREATE TABLE IF NOT EXISTS public.appointment_forms_1789608000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  form_name text NOT NULL DEFAULT 'Appointment form',
  description text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appointment_forms_fields_array_1789608000000
    CHECK (jsonb_typeof(fields) = 'array')
);

CREATE TABLE IF NOT EXISTS public.public_booking_requests_1789608000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_page_id uuid NOT NULL REFERENCES public.business_pages_1789493000000(id),
  booking_type_id uuid NOT NULL REFERENCES public.booking_types_1789450000000(id),
  form_response jsonb NOT NULL DEFAULT '{}'::jsonb,
  booking_date date NOT NULL,
  booking_time text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_booking_requests_id_format_1789608000000
    CHECK (booking_id ~ '^[0-9]{6}$'),
  CONSTRAINT public_booking_requests_status_valid_1789608000000
    CHECK (status IN ('confirmed', 'cancelled', 'completed'))
);

CREATE INDEX IF NOT EXISTS appointment_forms_user_id_idx_1789608000000
  ON public.appointment_forms_1789608000000(user_id);

CREATE INDEX IF NOT EXISTS public_booking_requests_user_id_idx_1789608000000
  ON public.public_booking_requests_1789608000000(user_id);

CREATE INDEX IF NOT EXISTS public_booking_requests_date_idx_1789608000000
  ON public.public_booking_requests_1789608000000(booking_date);

ALTER TABLE public.appointment_forms_1789608000000 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_booking_requests_1789608000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appointment_forms_select_own_1789608000000
  ON public.appointment_forms_1789608000000;

CREATE POLICY appointment_forms_select_own_1789608000000
  ON public.appointment_forms_1789608000000
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS appointment_forms_insert_own_1789608000000
  ON public.appointment_forms_1789608000000;

CREATE POLICY appointment_forms_insert_own_1789608000000
  ON public.appointment_forms_1789608000000
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS appointment_forms_update_own_1789608000000
  ON public.appointment_forms_1789608000000;

CREATE POLICY appointment_forms_update_own_1789608000000
  ON public.appointment_forms_1789608000000
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS public_booking_requests_select_own_1789608000000
  ON public.public_booking_requests_1789608000000;

CREATE POLICY public_booking_requests_select_own_1789608000000
  ON public.public_booking_requests_1789608000000
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS public_booking_requests_update_own_1789608000000
  ON public.public_booking_requests_1789608000000;

CREATE POLICY public_booking_requests_update_own_1789608000000
  ON public.public_booking_requests_1789608000000
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_public_appointment_form_1789608000000(
  business_slug_value text
)
RETURNS TABLE (
  form_id uuid,
  form_name text,
  description text,
  fields jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    forms.id,
    forms.form_name,
    forms.description,
    forms.fields
  FROM public.appointment_forms_1789608000000 forms
  INNER JOIN public.business_pages_1789493000000 pages
    ON pages.user_id = forms.user_id
  WHERE lower(pages.business_slug) = lower(trim(business_slug_value))
    AND pages.is_published = true
    AND forms.is_published = true
  ORDER BY forms.updated_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.create_public_booking_request_1789608000000(
  business_slug_value text,
  booking_type_id_value uuid,
  booking_date_value date,
  booking_time_value text,
  form_response_value jsonb
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  business_page_id uuid,
  booking_type_id uuid,
  form_response jsonb,
  booking_date date,
  booking_time text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  page_record public.business_pages_1789493000000;
  booking_type_record public.booking_types_1789450000000;
  generated_id text;
  created_record public.public_booking_requests_1789608000000;
BEGIN
  SELECT *
  INTO page_record
  FROM public.business_pages_1789493000000
  WHERE lower(business_slug) = lower(trim(business_slug_value))
    AND is_published = true
  LIMIT 1;

  IF page_record.id IS NULL THEN
    RAISE EXCEPTION 'This business page is unavailable.';
  END IF;

  SELECT *
  INTO booking_type_record
  FROM public.booking_types_1789450000000
  WHERE id = booking_type_id_value
    AND user_id = page_record.user_id
    AND is_archived = false
    AND is_enabled = true
  LIMIT 1;

  IF booking_type_record.id IS NULL THEN
    RAISE EXCEPTION 'This booking type is no longer available.';
  END IF;

  IF booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  IF booking_type_record.duration = 'full-day' THEN
    IF NOT (booking_date_value = ANY(booking_type_record.available_dates)) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;
  ELSE
    IF NOT (booking_date_value = ANY(
      ARRAY(
        SELECT (current_date + day_offset)::date
        FROM generate_series(0, 180) AS day_offset
        WHERE trim(to_char(current_date + day_offset, 'Day'))
          = ANY(booking_type_record.available_days)
      )
    )) THEN
      RAISE EXCEPTION 'The selected day is not available.';
    END IF;

    IF NOT (booking_time_value = ANY(booking_type_record.selected_time_slots)) THEN
      RAISE EXCEPTION 'The selected time is not available.';
    END IF;

    IF booking_time_value = ANY(booking_type_record.unavailable_time_slots) THEN
      RAISE EXCEPTION 'The selected time is unavailable.';
    END IF;
  END IF;

  LOOP
    generated_id := lpad(floor(random() * 1000000)::bigint::text, 6, '0');

    BEGIN
      INSERT INTO public.public_booking_requests_1789608000000 (
        booking_id,
        user_id,
        business_page_id,
        booking_type_id,
        form_response,
        booking_date,
        booking_time
      )
      VALUES (
        generated_id,
        page_record.user_id,
        page_record.id,
        booking_type_record.id,
        COALESCE(form_response_value, '{}'::jsonb),
        booking_date_value,
        trim(booking_time_value)
      )
      RETURNING *
      INTO created_record;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN QUERY
  SELECT
    created_record.id,
    created_record.booking_id,
    created_record.business_page_id,
    created_record.booking_type_id,
    created_record.form_response,
    created_record.booking_date,
    created_record.booking_time,
    created_record.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_appointment_form_1789608000000(text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_public_booking_request_1789608000000(
  text,
  uuid,
  date,
  text,
  jsonb
)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';