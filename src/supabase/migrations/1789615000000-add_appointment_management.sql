/*
# Add appointment management and rescheduling

1. Modified Tables
- `public_booking_requests_1789608000000`
  - Supports `rescheduled` and `no_show` appointment statuses.
  - Existing booking rows and statuses are preserved.
  - Adds indexes for status and appointment type filtering.

2. Security
- Existing authenticated owner RLS policies remain in place.
- Adds a security-definer rescheduling function that validates ownership,
  future dates, booking type availability, unavailable dates, weekdays, and slots.
- No physical deletes are performed.

3. Functions
- `reschedule_public_booking_request_1789615000000`
  - Reschedules an owner booking to a future available date and time.
  - Keeps the original booking ID and booking record.

4. Important Notes
- Completed, cancelled, rescheduled, and no-show states are retained.
- Analytics are calculated from preserved booking records.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'public_booking_requests_status_valid_1789608000000'
      AND conrelid = 'public.public_booking_requests_1789608000000'::regclass
  ) THEN
    ALTER TABLE public.public_booking_requests_1789608000000
      DROP CONSTRAINT public_booking_requests_status_valid_1789608000000;
  END IF;
END $$;

ALTER TABLE public.public_booking_requests_1789608000000
  ADD CONSTRAINT public_booking_requests_status_valid_1789615000000
  CHECK (status IN ('confirmed', 'rescheduled', 'cancelled', 'completed', 'no_show'));

CREATE INDEX IF NOT EXISTS public_booking_requests_status_idx_1789615000000
  ON public.public_booking_requests_1789608000000(status);

CREATE INDEX IF NOT EXISTS public_booking_requests_booking_type_idx_1789615000000
  ON public.public_booking_requests_1789608000000(booking_type_id);

CREATE OR REPLACE FUNCTION public.reschedule_public_booking_request_1789615000000(
  booking_id_value uuid,
  booking_date_value date,
  booking_time_value text
)
RETURNS TABLE (
  id uuid,
  booking_id text,
  booking_date date,
  booking_time text,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_booking public.public_booking_requests_1789608000000;
  selected_booking_type public.booking_types_1789450000000;
  normalized_time text;
BEGIN
  SELECT bookings.*
  INTO selected_booking
  FROM public.public_booking_requests_1789608000000 AS bookings
  WHERE bookings.id = booking_id_value
    AND bookings.user_id = auth.uid()
  LIMIT 1;

  IF selected_booking.id IS NULL THEN
    RAISE EXCEPTION 'Appointment could not be found.';
  END IF;

  IF selected_booking.status IN ('cancelled', 'completed', 'no_show') THEN
    RAISE EXCEPTION 'This appointment cannot be rescheduled.';
  END IF;

  IF booking_date_value IS NULL OR booking_date_value < CURRENT_DATE THEN
    RAISE EXCEPTION 'Choose a future appointment date.';
  END IF;

  SELECT booking_types.*
  INTO selected_booking_type
  FROM public.booking_types_1789450000000 AS booking_types
  WHERE booking_types.id = selected_booking.booking_type_id
    AND booking_types.user_id = auth.uid()
    AND booking_types.is_archived = false
    AND booking_types.is_enabled = true
  LIMIT 1;

  IF selected_booking_type.id IS NULL THEN
    RAISE EXCEPTION 'This appointment type is no longer available.';
  END IF;

  normalized_time := trim(coalesce(booking_time_value, ''));

  IF selected_booking_type.duration = 'full-day' THEN
    IF NOT booking_date_value = ANY(selected_booking_type.available_dates) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    normalized_time := 'Full day';
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM generate_series(0, 180) AS day_offset
      WHERE (CURRENT_DATE + day_offset::integer)::date = booking_date_value
        AND trim(to_char((CURRENT_DATE + day_offset::integer)::date, 'Day'))
          = ANY(selected_booking_type.available_days)
        AND NOT trim(to_char((CURRENT_DATE + day_offset::integer)::date, 'Day'))
          = ANY(selected_booking_type.unavailable_weekdays)
        AND NOT (booking_date_value = ANY(selected_booking_type.unavailable_dates))
    ) THEN
      RAISE EXCEPTION 'The selected date is not available.';
    END IF;

    IF normalized_time = ''
      OR NOT normalized_time = ANY(selected_booking_type.selected_time_slots)
      OR normalized_time = ANY(selected_booking_type.unavailable_time_slots) THEN
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
    AND bookings.user_id = auth.uid()
  RETURNING
    bookings.id,
    bookings.booking_id,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status,
    bookings.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.reschedule_public_booking_request_1789615000000(uuid, date, text)
  FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.reschedule_public_booking_request_1789615000000(uuid, date, text)
  TO authenticated;

NOTIFY pgrst, 'reload schema';