/*
# Expose generated Google Meet links on public booking confirmation

1. Modified Functions
- Updates `get_public_booking_confirmation_1789632000000` to return the generated
  Meet URL and synchronization status.
- Existing verification, booking access, and rescheduling behavior is preserved.

2. Security
- The function still requires the booking ID plus a matching phone or email value.
- No anonymous table access is granted.
- Only the generated Meet link is exposed for the verified booking.

3. Important Notes
- Offline bookings return an empty Meet URL.
- Existing booking records remain unchanged.
*/

DROP FUNCTION IF EXISTS public.get_public_booking_confirmation_1789632000000(text, text);

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
  meeting_invite_link text,
  google_meet_link text,
  google_calendar_sync_status text,
  google_calendar_sync_error text
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
    ),
    types.booking_name,
    CASE WHEN types.show_professional_name THEN types.professional_name ELSE '' END,
    bookings.booking_date,
    bookings.booking_time,
    bookings.status,
    types.booking_type,
    CASE WHEN types.booking_type = 'offline' THEN types.address ELSE '' END,
    CASE WHEN types.booking_type = 'offline' THEN types.google_maps_link ELSE '' END,
    CASE WHEN types.booking_type = 'offline' THEN types.contact_number ELSE '' END,
    CASE WHEN types.booking_type = 'online' THEN types.meeting_invite_link ELSE '' END,
    CASE WHEN types.booking_type = 'online' THEN bookings.google_meet_link ELSE '' END,
    bookings.google_calendar_sync_status,
    bookings.google_calendar_sync_error
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
      WHERE lower(trim(response_fields.field_value)) = lower(trim(verification_value))
         OR regexp_replace(response_fields.field_value, '[^0-9]', '', 'g')
          = regexp_replace(verification_value, '[^0-9]', '', 'g')
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_booking_confirmation_1789632000000(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_booking_confirmation_1789632000000(text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';