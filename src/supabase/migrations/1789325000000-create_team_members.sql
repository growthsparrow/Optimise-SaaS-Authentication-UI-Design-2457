/* # Create team members workspace table

1. New Tables
- `team_members_1789325000000`
  - `id` (uuid, primary key): Unique team member identifier.
  - `user_id` (uuid): Authenticated Optimise workspace owner.
  - `full_name` (text): Team member's name.
  - `email` (text): Team member's email address.
  - `phone_number` (text): Optional contact number.
  - `role` (text): Team member responsibility or role.
  - `status` (text): Member status, either `active` or `inactive`.
  - `created_at` (timestamptz): Record creation time.
  - `updated_at` (timestamptz): Most recent update time.

2. Security
- Enables Row Level Security on the new table.
- Authenticated users can view only team members in their own workspace.
- Authenticated users can create only records owned by themselves.
- Authenticated users can update only records owned by themselves.
- No delete policy is created. Team members are deactivated by changing `status`.

3. Important Notes
- Existing data is not modified or removed.
- New team members default to `active`.
- Phone numbers are optional and are validated in the application layer.
*/

CREATE TABLE IF NOT EXISTS public.team_members_1789325000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone_number text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Team member',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_members_status_valid_1789325000000
    CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX IF NOT EXISTS team_members_user_id_idx_1789325000000
  ON public.team_members_1789325000000(user_id);

CREATE INDEX IF NOT EXISTS team_members_status_idx_1789325000000
  ON public.team_members_1789325000000(status);

ALTER TABLE public.team_members_1789325000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS team_members_select_own_1789325000000
  ON public.team_members_1789325000000;

CREATE POLICY team_members_select_own_1789325000000
  ON public.team_members_1789325000000
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS team_members_insert_own_1789325000000
  ON public.team_members_1789325000000;

CREATE POLICY team_members_insert_own_1789325000000
  ON public.team_members_1789325000000
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS team_members_update_own_1789325000000
  ON public.team_members_1789325000000;

CREATE POLICY team_members_update_own_1789325000000
  ON public.team_members_1789325000000
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());