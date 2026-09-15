/*
# Create booking types management

This migration adds a workspace-owned booking type catalogue for configuring reusable booking options.

## 1. New Tables

- `booking_types_1789450000000`
  - `id` (uuid, primary key): Unique booking type identifier.
  - `user_id` (uuid): Authenticated workspace owner.
  - `booking_name` (text): Name displayed for the booking type.
  - `professional_name` (text): Optional professional name.
  - `show_professional_name` (boolean): Controls whether the professional name appears during booking.
  - `professional_expertise` (text): Optional professional expertise.
  - `show_professional_expertise` (boolean): Controls whether expertise appears during booking.
  - `available_days` (text[]): Selected booking days from Monday through Sunday.
  - `duration` (text): Booking duration option.
  - `available_periods` (text[]): Selected morning, afternoon, and evening periods.
  - `selected_time_slots` (text[]): Explicitly selected appointment time slots.
  - `cost_inr` (numeric): Booking cost in Indian rupees.
  - `show_cost` (boolean): Controls whether cost appears during booking.
  - `booking_type` (text): Either `offline` or `online`.
  - `location_name` (text): Offline location name.
  - `address` (text): Offline location address.
  - `contact_number` (text): Offline contact number.
  - `google_maps_link` (text): Offline Google Maps link.
  - `meeting_invite_link` (text): Online meeting link.
  - `is_archived` (boolean): Soft-removal flag that preserves existing booking type data.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

## 2. Security

- Enables Row Level Security on the new table.
- Authenticated workspace owners can read only their own booking types.
- Authenticated workspace owners can create only their own booking types.
- Authenticated workspace owners can update only their own booking types.
- No physical delete operation is added. Booking types are archived instead.

## 3. Validation

- Booking duration must be one of the supported duration values.
- Booking type must be either `offline` or `online`.
- At least one available day is required.
- At least one available period is required.
- Offline booking types require location details.
- Online booking types require a meeting invite link.

## 4. Important Notes

- Existing tables and records are not modified or deleted.
- Time slot selection is stored explicitly so workspace owners can select or deselect individual slots.
- Visibility flags allow professional name, expertise, and cost to be hidden from public booking pages without removing their configured values.
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
  cost_inr numeric(10, 2) NOT NULL DEFAULT 0 CHECK (cost_inr >= 0),
  show_cost boolean NOT NULL DEFAULT true,
  booking_type text NOT NULL DEFAULT 'offline' CHECK (booking_type IN ('offline', 'online')),
  location_name text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  google_maps_link text NOT NULL DEFAULT '',
  meeting_invite_link text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_types_duration_valid_1789450000000
    CHECK (duration IN ('1', '5', '10', '15', '30', '60', '120', '240', '480', 'full-day')),
  CONSTRAINT booking_types_days_required_1789450000000
    CHECK (cardinality(available_days) > 0),
  CONSTRAINT booking_types_periods_required_1789450000000
    CHECK (cardinality(available_periods) > 0),
  CONSTRAINT booking_types_mode_details_valid_1789450000000
    CHECK (
      (
        booking_type = 'offline'
        AND location_name <> ''
        AND address <> ''
        AND contact_number <> ''
        AND google_maps_link <> ''
      )
      OR (
        booking_type = 'online'
        AND meeting_invite_link <> ''
      )
    )
);

CREATE INDEX IF NOT EXISTS booking_types_user_id_idx_1789450000000
  ON public.booking_types_1789450000000(user_id);

CREATE INDEX IF NOT EXISTS booking_types_archived_idx_1789450000000
  ON public.booking_types_1789450000000(is_archived);

ALTER TABLE public.booking_types_1789450000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS booking_types_select_own_1789450000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_select_own_1789450000000
  ON public.booking_types_1789450000000
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS booking_types_insert_own_1789450000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_insert_own_1789450000000
  ON public.booking_types_1789450000000
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS booking_types_update_own_1789450000000
  ON public.booking_types_1789450000000;

CREATE POLICY booking_types_update_own_1789450000000
  ON public.booking_types_1789450000000
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());