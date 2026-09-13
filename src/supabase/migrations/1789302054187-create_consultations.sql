/*
# Create consultation catalogue

1. New Tables
- `consultations_1789302054187`
  - `id` (uuid, primary key): Unique consultation identifier.
  - `user_id` (uuid): Optimise workspace owner.
  - `consultation_name` (text): Name of the consultation shown to patients.
  - `consultation_fees_inr` (numeric): Consultation fee in Indian rupees.
  - `doctor_ids` (uuid[]): Doctors mapped to this consultation.
  - `location_ids` (uuid[]): Locations mapped to this consultation.
  - `important_information` (text): Guidance displayed to patients during booking.
  - `is_archived` (boolean): Soft-delete flag that preserves historical records.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Security
- Row-level security is enabled.
- Authenticated users can view, create and update only consultations belonging to their own workspace.
- No physical delete operation is used; removing a consultation archives it.

3. Changes
- Adds indexes for workspace ownership and archived consultation queries.
- Stores doctor and location mappings on each consultation.

4. Important Notes
- Existing doctors, locations and consultation data are not modified.
- Mappings reference existing doctor and location IDs and are validated by the application before saving.
- Doctors and locations can continue to be managed independently.
*/

CREATE TABLE IF NOT EXISTS public.consultations_1789302054187 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id) ON DELETE CASCADE,
  consultation_name text NOT NULL DEFAULT '',
  consultation_fees_inr numeric(10, 2) NOT NULL DEFAULT 0
    CHECK (consultation_fees_inr >= 0),
  doctor_ids uuid[] NOT NULL DEFAULT '{}',
  location_ids uuid[] NOT NULL DEFAULT '{}',
  important_information text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS consultations_user_id_idx_1789302054187
  ON public.consultations_1789302054187(user_id);

CREATE INDEX IF NOT EXISTS consultations_archived_idx_1789302054187
  ON public.consultations_1789302054187(is_archived);

ALTER TABLE public.consultations_1789302054187 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS consultations_select_own_1789302054187
  ON public.consultations_1789302054187;

CREATE POLICY consultations_select_own_1789302054187
  ON public.consultations_1789302054187
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS consultations_insert_own_1789302054187
  ON public.consultations_1789302054187;

CREATE POLICY consultations_insert_own_1789302054187
  ON public.consultations_1789302054187
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS consultations_update_own_1789302054187
  ON public.consultations_1789302054187;

CREATE POLICY consultations_update_own_1789302054187
  ON public.consultations_1789302054187
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());