/*
# Create business locations

1. New Tables
- `business_locations_1789300875912`
  - `id` (uuid, primary key): Unique location identifier.
  - `user_id` (uuid): Authenticated workspace owner.
  - `location_name` (text): Name shown for the business location.
  - `address` (text): Full physical address.
  - `google_maps_link` (text): Google Maps URL for navigation.
  - `contact_number` (text): Exactly 10 numeric digits.
  - `business_days` (text[]): Selected days of the week.
  - `opens_at` (time): Daily opening time.
  - `closes_at` (time): Daily closing time.
  - `is_archived` (boolean): Soft-delete flag that preserves location history.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Security
- Row-level security is enabled.
- Authenticated workspace owners can view, add and update only their own locations.
- No physical delete operation is used. Removing a location archives it instead.

3. Changes
- Adds a dedicated table for location management.
- Adds indexes for owner and archived-status queries.

4. Important Notes
- Existing tables and data are not modified.
- Contact numbers are validated in both the application and database.
- Closing time must be later than opening time.
*/

CREATE TABLE IF NOT EXISTS public.business_locations_1789300875912 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  location_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  google_maps_link text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  business_days text[] NOT NULL DEFAULT '{}',
  opens_at time NOT NULL DEFAULT '09:00',
  closes_at time NOT NULL DEFAULT '18:00',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_locations_contact_number_valid_1789300875912
    CHECK (contact_number ~ '^[0-9]{10}$'),
  CONSTRAINT business_locations_hours_valid_1789300875912
    CHECK (closes_at > opens_at),
  CONSTRAINT business_locations_days_valid_1789300875912
    CHECK (
      business_days <@ ARRAY[
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday'
      ]::text[]
    )
);

CREATE INDEX IF NOT EXISTS business_locations_user_id_idx_1789300875912
  ON public.business_locations_1789300875912(user_id);

CREATE INDEX IF NOT EXISTS business_locations_archived_idx_1789300875912
  ON public.business_locations_1789300875912(is_archived);

ALTER TABLE public.business_locations_1789300875912 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_locations_select_own_1789300875912
  ON public.business_locations_1789300875912;

CREATE POLICY business_locations_select_own_1789300875912
  ON public.business_locations_1789300875912
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS business_locations_insert_own_1789300875912
  ON public.business_locations_1789300875912;

CREATE POLICY business_locations_insert_own_1789300875912
  ON public.business_locations_1789300875912
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS business_locations_update_own_1789300875912
  ON public.business_locations_1789300875912;

CREATE POLICY business_locations_update_own_1789300875912
  ON public.business_locations_1789300875912
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());