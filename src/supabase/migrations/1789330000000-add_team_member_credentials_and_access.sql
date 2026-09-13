/* # Add team member credentials and restricted dashboard access

1. Modified Tables
- `team_members_1789325000000`
  - Adds `member_id` (text, unique): Four-digit identifier prefixed with `OP`, for example `OP2345`.
  - Existing team member records are preserved.
  - Existing contact numbers remain the team member password source.

2. Security
- Adds a security-definer function for team member sign-in.
- Adds a security-definer function for team member appointment reads.
- Adds a security-definer function for team member appointment status updates.
- Functions only accept active team members belonging to the workspace identified by the stored member record.
- Team members can update only `rescheduled`, `visited`, and `no_show` appointment statuses.
- Existing owner RLS policies remain unchanged.

3. Important Notes
- Team member sign-in uses the member ID as the username and the stored contact number as the password.
- The application keeps the resulting member access session in the current browser session.
- This does not create Supabase Auth accounts for team members.
- Existing data is not deleted, reassigned, or rewritten.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'team_members_1789325000000'
      AND column_name = 'member_id'
  ) THEN
    ALTER TABLE public.team_members_1789325000000
      ADD COLUMN member_id text;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_member_id_idx_1789330000000
  ON public.team_members_1789325000000(member_id)
  WHERE member_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.assign_team_member_id_1789330000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_member_id text;
BEGIN
  IF COALESCE(new.member_id, '') <> '' THEN
    RETURN new;
  END IF;

  LOOP
    generated_member_id := 'OP' || lpad(floor(random() * 10000)::int::text, 4, '0');

    BEGIN
      PERFORM 1
      FROM public.team_members_1789325000000
      WHERE member_id = generated_member_id;

      IF NOT FOUND THEN
        new.member_id := generated_member_id;
        RETURN new;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN new;
    END;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS assign_team_member_id_before_insert_1789330000000
  ON public.team_members_1789325000000;

CREATE TRIGGER assign_team_member_id_before_insert_1789330000000
BEFORE INSERT ON public.team_members_1789325000000
FOR EACH ROW
EXECUTE FUNCTION public.assign_team_member_id_1789330000000();

DO $$
DECLARE
  team_member record;
  generated_member_id text;
BEGIN
  FOR team_member IN
    SELECT id
    FROM public.team_members_1789325000000
    WHERE member_id IS NULL OR member_id = ''
  LOOP
    LOOP
      generated_member_id := 'OP' || lpad(floor(random() * 10000)::int::text, 4, '0');

      BEGIN
        UPDATE public.team_members_1789325000000
        SET member_id = generated_member_id
        WHERE id = team_member.id
          AND (member_id IS NULL OR member_id = '');

        EXIT WHEN FOUND;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.authenticate_team_member_1789330000000(
  member_id_value text,
  password_value text
)
RETURNS TABLE (
  id uuid,
  member_id text,
  full_name text,
  email text,
  phone_number text,
  role text,
  status text,
  workspace_user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    members.id,
    members.member_id,
    members.full_name,
    members.email,
    members.phone_number,
    members.role,
    members.status,
    members.user_id
  FROM public.team_members_1789325000000 members
  WHERE upper(trim(members.member_id)) = upper(trim(member_id_value))
    AND regexp_replace(members.phone_number, '[^0-9]', '', 'g')
      = regexp_replace(password_value, '[^0-9]', '', 'g')
    AND members.status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_team_member_bookings_1789330000000(
  member_id_value text
)
RETURNS SETOF jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'id', bookings.id,
    'booking_id', bookings.booking_id,
    'patient_name', bookings.patient_name,
    'phone_number', bookings.phone_number,
    'email', bookings.email,
    'gender', bookings.gender,
    'age', bookings.age,
    'location_id', bookings.location_id,
    'doctor_id', bookings.doctor_id,
    'consultation_id', bookings.consultation_id,
    'booking_date', bookings.booking_date,
    'booking_time', bookings.booking_time,
    'status', bookings.status,
    'created_at', bookings.created_at,
    'updated_at', bookings.updated_at,
    'doctor', jsonb_build_object(
      'id', doctors.id,
      'doctor_name', doctors.doctor_name,
      'speciality', doctors.speciality,
      'available_days', doctors.available_days,
      'selected_time_slots', doctors.selected_time_slots
    ),
    'consultation', jsonb_build_object(
      'id', consultations.id,
      'consultation_name', consultations.consultation_name,
      'consultation_fees_inr', consultations.consultation_fees_inr
    ),
    'location', jsonb_build_object(
      'id', locations.id,
      'location_name', locations.location_name,
      'address', locations.address,
      'contact_number', locations.contact_number
    )
  )
  FROM public.patient_bookings_1789315000000 bookings
  INNER JOIN public.team_members_1789325000000 members
    ON upper(trim(members.member_id)) = upper(trim(member_id_value))
   AND members.status = 'active'
  LEFT JOIN public.doctors_1789298737910 doctors
    ON doctors.id = bookings.doctor_id
   AND doctors.user_id = members.user_id
  LEFT JOIN public.consultations_1789302054187 consultations
    ON consultations.id = bookings.consultation_id
   AND consultations.user_id = members.user_id
  LEFT JOIN public.business_locations_1789300875912 locations
    ON locations.id = bookings.location_id
   AND locations.user_id = members.user_id
  WHERE EXISTS (
    SELECT 1
    FROM public.business_locations_1789300875912 owned_locations
    WHERE owned_locations.id = bookings.location_id
      AND owned_locations.user_id = members.user_id
  )
  ORDER BY bookings.booking_date, bookings.booking_time;
$$;

CREATE OR REPLACE FUNCTION public.update_team_member_booking_status_1789330000000(
  member_id_value text,
  booking_id_value uuid,
  status_value text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_booking jsonb;
BEGIN
  IF status_value NOT IN ('rescheduled', 'visited', 'no_show') THEN
    RAISE EXCEPTION 'Team members can only set rescheduled, visited, or no-show statuses.';
  END IF;

  UPDATE public.patient_bookings_1789315000000 bookings
  SET status = status_value,
      updated_at = now()
  WHERE bookings.id = booking_id_value
    AND EXISTS (
      SELECT 1
      FROM public.team_members_1789325000000 members
      INNER JOIN public.business_locations_1789300875912 locations
        ON locations.user_id = members.user_id
       AND locations.id = bookings.location_id
      WHERE upper(trim(members.member_id)) = upper(trim(member_id_value))
        AND members.status = 'active'
    )
  RETURNING jsonb_build_object(
    'id', id,
    'booking_id', booking_id,
    'status', status,
    'booking_date', booking_date,
    'booking_time', booking_time,
    'updated_at', updated_at
  )
  INTO updated_booking;

  IF updated_booking IS NULL THEN
    RAISE EXCEPTION 'Appointment could not be updated.';
  END IF;

  RETURN updated_booking;
END;
$$;

GRANT EXECUTE ON FUNCTION public.authenticate_team_member_1789330000000(text, text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_team_member_bookings_1789330000000(text)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_team_member_booking_status_1789330000000(text, uuid, text)
  TO anon, authenticated;