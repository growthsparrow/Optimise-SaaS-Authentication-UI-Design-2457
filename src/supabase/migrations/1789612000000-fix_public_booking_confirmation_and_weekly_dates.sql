/*
# Fix public booking confirmation and weekly date availability

1. Modified Functions

- `create_public_booking_request_1789608000000`
  - Removes ambiguous column references during booking confirmation.
  - Uses explicit table aliases and qualified return values.
  - Preserves the existing six-digit booking ID format.
  - Preserves validation for published business pages, enabled booking types,
    available weekdays, configured dates, unavailable dates, and time slots.
  - Allows full-day bookings without requiring a time slot.

2. Security

- Keeps the function as `SECURITY DEFINER`.
- Keeps the fixed `public` search path.
- Keeps anonymous and authenticated execution permissions.
- Does not expose private booking rows to public visitors.

3. Important Notes

- Existing bookings are not deleted or modified.
- Existing booking types and availability settings are preserved.
- The public interface now displays dates from today through the next 14 days,
  representing the current and upcoming week.
*/

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
  selected_page public.business_pages_1789493000000;
  selected_booking_type public.booking_types_1789450000000;
  generated_booking_id text;
  inserted_booking public.public_booking_requests_1789608000000;
  normalized_time text;
BEGIN
  normalized_time := trim(coalesce(booking_time_value, ''));

  SELECT pages.*
  INTO selected_page
  FROM public.business_pages_1789493000000 AS pages
  WHERE lower(pages.business_slug) = lower(trim(business_slug_value))
    AND pages.is_published = true
  LIMIT 1;

  IF selected_page.id IS NULL THEN
    RAISE EXCEPTION 'This business page is unavailable.';
  END IF;

  SELECT types.*
  INTO selected_booking_type
  FROM public.booking_types_1789450000000 AS types
  WHERE types.id = booking_type_id_value
    AND types.user_id = selected_page.user_id
    AND types.is_archived = false
    AND types.is_enabled = true
  LIMIT 1;

  IF selected_booking_type.id IS NULL THEN
    RAISE EXCEPTION 'This booking type is no longer available.';
  END IF;

  IF booking_date_value IS NULL OR booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  IF selected_booking_type.duration = 'full-day' THEN
    IF NOT (
      booking_date_value = ANY(selected_booking_type.available_dates)
    ) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    normalized_time := 'Full day';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM generate_series(0, 180) AS day_offset
      WHERE (
        current_date + day_offset::integer
      )::date = booking_date_value
      AND trim(to_char(
        (current_date + day_offset::integer)::date,
        'Day'
      )) = ANY(selected_booking_type.available_days)
      AND NOT (
        trim(to_char(
          (current_date + day_offset::integer)::date,
          'Day'
        )) = ANY(selected_booking_type.unavailable_weekdays)
      )
      AND NOT (
        (current_date + day_offset::integer)::date = ANY(
          selected_booking_type.unavailable_dates
        )
      )
    ) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    IF normalized_time = '' THEN
      RAISE EXCEPTION 'Choose an available time.';
    END IF;

    IF NOT (
      normalized_time = ANY(selected_booking_type.selected_time_slots)
    ) THEN
      RAISE EXCEPTION 'The selected time is not available.';
    END IF;

    IF normalized_time = ANY(selected_booking_type.unavailable_time_slots) THEN
      RAISE EXCEPTION 'The selected time is unavailable.';
    END IF;
  END IF;

  LOOP
    generated_booking_id := lpad(
      floor(random() * 1000000)::bigint::text,
      6,
      '0'
    );

    BEGIN
      INSERT INTO public.public_booking_requests_1789608000000 AS booking_requests (
        booking_id,
        user_id,
        business_page_id,
        booking_type_id,
        form_response,
        booking_date,
        booking_time
      )
      VALUES (
        generated_booking_id,
        selected_page.user_id,
        selected_page.id,
        selected_booking_type.id,
        coalesce(form_response_value, '{}'::jsonb),
        booking_date_value,
        normalized_time
      )
      RETURNING booking_requests.*
      INTO inserted_booking;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN QUERY
  SELECT
    inserted_booking.id AS id,
    inserted_booking.booking_id AS booking_id,
    inserted_booking.business_page_id AS business_page_id,
    inserted_booking.booking_type_id AS booking_type_id,
    inserted_booking.form_response AS form_response,
    inserted_booking.booking_date AS booking_date,
    inserted_booking.booking_time AS booking_time,
    inserted_booking.status AS status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_booking_request_1789608000000(
  text,
  uuid,
  date,
  text,
  jsonb
) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';