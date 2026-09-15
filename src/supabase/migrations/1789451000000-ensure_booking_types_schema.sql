/* # Ensure booking types schema is available

1. New Tables
- No new logical table is introduced.
- Ensures `booking_types_1789450000000` exists with:
  - `id`: Unique booking type identifier.
  - `user_id`: Authenticated workspace owner.
  - `booking_name`: Booking name shown to customers.
  - `professional_name`: Name of the professional or expert.
  - `show_professional_name`: Controls professional name visibility.
  - `professional_expertise`: Professional expertise description.
  - `show_professional_expertise`: Controls expertise visibility.
  - `available_days`: Days offered for booking.
  - `duration`: Booking duration.
  - `available_periods`: Morning, afternoon, or evening availability.
  - `selected_time_slots`: Explicitly selected booking slots.
  - `cost_inr`: Booking cost in Indian rupees.
  - `show_cost`: Controls booking cost visibility.
  - `booking_type`: Offline or online booking mode.
  - `location_name`: Offline location name.
  - `address`: Offline booking address.
  - `contact_number`: Offline location contact number.
  - `google_maps_link`: Offline Google Maps link.
  - `meeting_invite_link`: Online meeting URL.
  - `is_archived`: Soft-archive flag that preserves records.
  - `created_at` and `updated_at`: Record timestamps.

2. Security
- Enables Row Level Security on the booking types table.
- Authenticated workspace owners can read only their own booking types.
- Authenticated workspace owners can create only their own booking types.
- Authenticated workspace owners can update only their own booking types.
- No destructive delete operation is included.

3. Changes
- Adds indexes for workspace ownership and archived records.
- Recreates the required policies safely if they are missing.
- Requests a PostgREST schema cache refresh so the frontend can query the table immediately.

4. Important Notes
- Existing booking type records are preserved.
- This migration is safe to run when the original table already exists.
- The table name matches the frontend service exactly: `booking_types_1789450000000`.
*/

CREATE TABLE IF NOT EXISTS public.booking_types_1789450000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_name text NOT NULL DEFAULT '',
  professional_name text NOT NULL DEFAULT '',
  show_professional_name boolean NOT NULL DEFAULT true,
  professional_expertise text NOT NULL DEFAULT '',
  show_professional_expertise boolean NOT NULL DEFAULT true,
  available_days text[] NOT NULL DEFAULT '{}',
  duration text NOT NULL DEFAULT '30',
  available_periods text[] NOT NULL DEFAULT '{}',
  selected_time_slots text[] NOT NULL DEFAULT '{}',
  cost_inr numeric(10,2) NOT NULL DEFAULT 0,
  show_cost boolean NOT NULL DEFAULT true,
  booking_type text NOT NULL DEFAULT 'offline',
  location_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  google_maps_link text NOT NULL DEFAULT '',
  meeting_invite_link text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_types_user_id_idx_1789451000000
  ON public.booking_types_1789450000000(user_id);

CREATE INDEX IF NOT EXISTS booking_types_archived_idx_1789451000000
  ON public.booking_types_1789450000000(is_archived);

ALTER TABLE public.booking_types_1789450000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_types_select_own_1789451000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_select_own_1789451000000
  ON public.booking_types_1789450000000
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS booking_types_insert_own_1789451000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_insert_own_1789451000000
  ON public.booking_types_1789450000000
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS booking_types_update_own_1789451000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_update_own_1789451000000
  ON public.booking_types_1789450000000
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';