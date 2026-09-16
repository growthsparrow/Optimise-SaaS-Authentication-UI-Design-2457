/*
# Allow public appointment type reads

This migration fixes the public appointment flow where appointment types can appear unavailable on mobile or other unauthenticated devices.

## 1. Modified Tables
- `booking_types_1789450000000`
  - No columns, rows, booking types, or historical booking data are changed.
  - Adds a read-only public access policy for booking types that belong to a published business page.

## 2. Security
- Row Level Security remains enabled on `booking_types_1789450000000`.
- Anonymous and authenticated public visitors can read only booking types that:
  - belong to a business with a published business page;
  - are not archived; and
  - are enabled for booking.
- Workspace owners retain their existing owner-only management policies.
- No public insert, update, archive, or delete access is granted.

## 3. Important Notes
- This resolves the underlying access issue rather than a mobile layout issue.
- Public visitors do not have a Supabase login session, so the existing owner-only read policy prevented the appointment-type query from returning data.
- The public booking page can now load active appointment types consistently on mobile and desktop.
*/

ALTER TABLE public.booking_types_1789450000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_types_public_booking_read_1789631000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_public_booking_read_1789631000000
  ON public.booking_types_1789450000000
  FOR SELECT
  TO anon, authenticated
  USING (
    is_archived = false
    AND is_enabled = true
    AND EXISTS (
      SELECT 1
      FROM public.business_pages_1789493000000 AS pages
      WHERE pages.user_id = booking_types_1789450000000.user_id
        AND pages.is_published = true
    )
  );

NOTIFY pgrst, 'reload schema';