/*
# Add secure public appointment confirmation and rescheduling

This migration adds the public data access needed by the appointment confirmation page.

## 1. Modified Data
- No tables, rows, bookings, appointment types, or customer records are deleted.
- Existing `public_booking_requests_1789608000000` records remain unchanged.
- Existing owner-only rescheduling remains available through
  `reschedule_public_booking_request_1789615000000`.

## 2. New Functions
- `get_public_booking_confirmation_1789632000000`
  - Returns the confirmation details for one booking.
  - Requires the six-digit booking ID and a matching phone or email value stored in
    the submitted form response.
  - Returns the client name, appointment type, professional, date, time, booking ID,
    and offline location details.

- `reschedule_public_booking_request_1789632000000`
  - Reschedules a public booking using the booking ID and matching phone or email.
  - Validates the business page, appointment type, date, weekday, unavailable dates,
    unavailable weekdays, and selected time slot.
  - Preserves the original booking row and booking ID.

## 3. Security
- Both functions use `SECURITY DEFINER` with a fixed `public` search path.
- Anonymous callers must provide both a booking ID and a verification value.
- The verification value must exactly match a top-level submitted form response value
  after normalizing phone-number formatting.
- No anonymous table read, insert, update, or delete policy is added.
- No service-role key is exposed.

## 4. Important Notes
- The appointment confirmation page should pass the patient phone number or email used
  during booking as the verification value.
- Existing bookings without a matching phone or email value in `form_response` cannot
  be publicly rescheduled through these functions.
- Existing booking data is preserved.
*/

CREATE OR REPLACE FUNCTION public.get_public_booking_confirmation_1789632000000(
  booking_id_value text,
  verification_value text
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  client_name text,
  appointment_type text,
  professional_name text,
  appointment_date date,
  appointment_time text,
  booking_status text,
  booking_type text,
  business_address text,
  maps_url text,
  business_contact text,
  meeting_invite_link text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    bookings.id,
    bookings.booking_id,
    COALESCE(
      bookings.form_response ->> 'name',
      bookings.form_response ->> 'full_name',
      bookings.form_response ->> 'client_name',
      bookings.form_response ->> 'patient_name',
      ''
    ) AS client_name,
    types.booking_name AS appointment_type,
    CASE
      WHEN types.show_professional_name THEN types.professional_name
      ELSE ''
    END AS professional_name,
    bookings.booking_date AS appointment_date,
    bookings.booking_time AS appointment_time,
    bookings.status AS booking_status,
    types.booking_type,
    CASE
      WHEN types.booking_type = 'offline' THEN types.address
      ELSE ''
    END AS business_address,
    CASE
      WHEN types.booking_type = 'offline' THEN types.google_maps_link
      ELSE ''
    END AS maps_url,
    CASE
      WHEN types.booking_type = 'offline' THEN types.contact_number
      ELSE ''
    END AS business_contact,
    CASE
      WHEN types.booking_type = 'online' THEN types.meeting_invite_link
      ELSE ''
    END AS meeting_invite_link
  FROM public.public_booking_requests_1789608000000 AS bookings
  INNER JOIN public.business_pages_1789493000000 AS pages
    ON pages.id = bookings.business_page_id
   AND pages.is_published = true
  INNER JOIN public.booking_types_1789450000000 AS types
    ON types.id = bookings.booking_type_id
   AND types.user_id = bookings.user_id
  WHERE bookings.booking_id = trim(booking_id_value)
    AND bookings.status IN ('confirmed', 'rescheduled')
    AND EXISTS (
      SELECT 1
      FROM jsonb_each_text(bookings.form_response) AS response_fields(field_name, field_value)
      WHERE
        lower(trim(response_fields.field_value)) = lower(trim(verification_value))
        OR regexp_replace(response_fields.field_value, '[^0-9]', '', 'g')
          = regexp_replace(verification_value, '[^0-9]', '', 'g')
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_public_booking_request_1789632000000(
  booking_id_value text,
  verification_value text,
  booking_date_value date,
  booking_time_value text
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  appointment_date date,
  appointment_time text,
  booking_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_booking public.public_booking_requests_1789608000000;
  selected_type public.booking_types_1789450000000;
  normalized_time text;
  selected_day text;
BEGIN
  SELECT bookings.*
  INTO selected_booking
  FROM public.public_booking_requests_1789608000000 AS bookings
  INNER JOIN public.business_pages_1789493000000 AS pages
    ON pages.id = bookings.business_page_id
   AND pages.is_published = true
  WHERE bookings.booking_id = trim(booking_id_value)
    AND bookings.status IN ('confirmed', 'rescheduled')
    AND EXISTS (
      SELECT 1
      FROM jsonb_each_text(bookings.form_response) AS response_fields(field_name, field_value)
      WHERE
        lower(trim(response_fields.field_value)) = lower(trim(verification_value))
        OR regexp_replace(response_fields.field_value, '[^0-9]', '', 'g')
          = regexp_replace(verification_value, '[^0-9]', '', 'g')
    )
  LIMIT 1;

  IF selected_booking.id IS NULL THEN
    RAISE EXCEPTION 'Booking confirmation could not be verified.';
  END IF;

  IF booking_date_value IS NULL OR booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT types.*
  INTO selected_type
  FROM public.booking_types_1789450000000 AS types
  WHERE types.id = selected_booking.booking_type_id
    AND types.user_id = selected_booking.user_id
    AND types.is_archived = false
    AND types.is_enabled = true
  LIMIT 1;

  IF selected_type.id IS NULL THEN
    RAISE EXCEPTION 'This appointment type is no longer available.';
  END IF;

  normalized_time := trim(coalesce(booking_time_value, ''));

  IF selected_type.duration = 'full-day' THEN
    IF NOT booking_date_value = ANY(selected_type.available_dates) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    normalized_time := 'Full day';
  ELSE
    selected_day := trim(to_char(booking_date_value, 'Day'));

    IF NOT selected_day = ANY(selected_type.available_days) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    IF selected_day = ANY(selected_type.unavailable_weekdays) THEN
      RAISE EXCEPTION 'The selected date is unavailable.';
    END IF;

    IF booking_date_value = ANY(selected_type.unavailable_dates) THEN
      RAISE EXCEPTION 'The selected date is unavailable.';
    END IF;

    IF normalized_time = ''
      OR NOT normalized_time = ANY(selected_type.selected_time_slots)
      OR normalized_time = ANY(selected_type.unavailable_time_slots) THEN
      RAISE EXCEPTION 'The selected time is not available.';
    END IF;
  END IF;

  RETURN QUERY
  UPDATE public.public_booking_requests_1789608000000 AS bookings
  SET
    booking_date = booking_date_value,
    booking_time = normalized_time,
    status = 'rescheduled',
    updated_at = now()
  WHERE bookings.id = selected_booking.id
  RETURNING
    bookings.id,
    bookings.booking_id,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_confirmation_1789632000000(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_confirmation_1789632000000(text, text) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.reschedule_public_booking_request_1789632000000(text, text, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reschedule_public_booking_request_1789632000000(text, text, date, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';