/*
# Add location booking availability status

1. Modified Tables
- `business_locations_1789300875912`
  - Adds `is_available_for_booking` (boolean): Controls whether a location can accept new future bookings.
  - Existing locations default to enabled so current booking behavior is preserved.

2. Security
- Existing row-level security remains enabled.
- Existing owner-based policies continue to control access.
- Authenticated workspace owners can update the availability status for their own locations.

3. Changes
- Adds an index for booking availability queries.
- Disabled locations remain stored and visible in the management dashboard.

4. Important Notes
- No locations or bookings are deleted.
- Disabling a location prevents it from being returned by `listBookableLocations()`.
- Any booking creation flow must use `listBookableLocations()` or independently enforce `is_available_for_booking = true` before allowing a new booking.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_locations_1789300875912'
      AND column_name = 'is_available_for_booking'
  ) THEN
    ALTER TABLE public.business_locations_1789300875912
      ADD COLUMN is_available_for_booking boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_locations_booking_status_idx_1789301173269
  ON public.business_locations_1789300875912(is_available_for_booking);