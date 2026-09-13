/*
# Create doctor scheduling workspace

This migration adds the data model needed to manage doctors, availability, consultation
durations, consultation charges, doctor photos, and vacation periods.

1. New Tables

- `doctors_1789298737910`
  - `id` (uuid, primary key): Unique doctor identifier.
  - `user_id` (uuid): Optimise workspace owner from Supabase Auth.
  - `doctor_name` (text): Doctor's display name.
  - `speciality` (text): Medical speciality.
  - `phone_number` (text): Doctor contact number.
  - `email_id` (text): Doctor email address.
  - `available_days` (text[]): Selected working days.
  - `consultation_duration` (integer): Appointment duration in minutes.
  - `selected_time_slots` (text[]): Slots available for booking.
  - `photo_url` (text): Public doctor photo URL.
  - `consultation_charges_inr` (numeric): Consultation charges in INR.
  - `is_archived` (boolean): Soft-delete flag that preserves historical data.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

- `doctor_vacations_1789298737910`
  - `id` (uuid, primary key): Unique vacation identifier.
  - `user_id` (uuid): Optimise workspace owner.
  - `doctor_id` (uuid): Related doctor.
  - `start_date` (date): Vacation start date.
  - `end_date` (date): Vacation end date, equal to start date for one-day vacations.
  - `reason` (text): Optional vacation note.
  - `is_active` (boolean): Soft-delete flag.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Storage

- Creates the `doctor-photos` public storage bucket if it does not already exist.
- Adds authenticated-owner policies for uploading, updating, and viewing doctor photos.

3. Security

- Enables Row Level Security on both new tables.
- Authenticated users can only view, create, and update records belonging to their own workspace.
- No physical delete operation is used; records are archived with `is_archived` or `is_active`.

4. Important Notes

- Existing data is not modified or removed.
- Doctor photo files are stored under an authenticated user's folder.
- Consultation durations and time slots are validated by the application layer.
*/

CREATE TABLE IF NOT EXISTS public.doctors_1789298737910 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_name text NOT NULL DEFAULT '',
  speciality text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  email_id text NOT NULL DEFAULT '',
  available_days text[] NOT NULL DEFAULT '{}',
  consultation_duration integer NOT NULL DEFAULT 30,
  selected_time_slots text[] NOT NULL DEFAULT '{}',
  photo_url text NOT NULL DEFAULT '',
  consultation_charges_inr numeric(10, 2) NOT NULL DEFAULT 0,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.doctor_vacations_1789298737910 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.doctors_1789298737910(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT doctor_vacations_valid_dates_1789298737910 CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS doctors_user_id_idx_1789298737910
  ON public.doctors_1789298737910(user_id);

CREATE INDEX IF NOT EXISTS doctor_vacations_user_id_idx_1789298737910
  ON public.doctor_vacations_1789298737910(user_id);

CREATE INDEX IF NOT EXISTS doctor_vacations_doctor_id_idx_1789298737910
  ON public.doctor_vacations_1789298737910(doctor_id);

ALTER TABLE public.doctors_1789298737910 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_vacations_1789298737910 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS doctors_select_own_1789298737910
  ON public.doctors_1789298737910;

CREATE POLICY doctors_select_own_1789298737910
  ON public.doctors_1789298737910
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS doctors_insert_own_1789298737910
  ON public.doctors_1789298737910;

CREATE POLICY doctors_insert_own_1789298737910
  ON public.doctors_1789298737910
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS doctors_update_own_1789298737910
  ON public.doctors_1789298737910;

CREATE POLICY doctors_update_own_1789298737910
  ON public.doctors_1789298737910
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS doctor_vacations_select_own_1789298737910
  ON public.doctor_vacations_1789298737910;

CREATE POLICY doctor_vacations_select_own_1789298737910
  ON public.doctor_vacations_1789298737910
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS doctor_vacations_insert_own_1789298737910
  ON public.doctor_vacations_1789298737910;

CREATE POLICY doctor_vacations_insert_own_1789298737910
  ON public.doctor_vacations_1789298737910
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS doctor_vacations_update_own_1789298737910
  ON public.doctor_vacations_1789298737910;

CREATE POLICY doctor_vacations_update_own_1789298737910
  ON public.doctor_vacations_1789298737910
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('doctor-photos', 'doctor-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS doctor_photos_select_1789298737910
  ON storage.objects;

CREATE POLICY doctor_photos_select_1789298737910
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'doctor-photos');

DROP POLICY IF EXISTS doctor_photos_insert_1789298737910
  ON storage.objects;

CREATE POLICY doctor_photos_insert_1789298737910
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'doctor-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS doctor_photos_update_1789298737910
  ON storage.objects;

CREATE POLICY doctor_photos_update_1789298737910
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'doctor-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'doctor-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );