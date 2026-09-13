/* # Allow super administrators to manage team members

1. Modified Tables
- `team_members_1789325000000`
  - Keeps all existing team member columns and records unchanged.
  - Extends access policies so an authenticated super administrator can view,
    create, and update team members belonging to customer workspaces.

2. Security
- Existing workspace-owner policies remain active.
- Adds super-admin policies guarded by
  `public.is_super_admin_1789400000000()`.
- Super administrators can manage access records without receiving access to
  unrelated application data.
- No service-role key or public anonymous policy is introduced.

3. Important Notes
- Existing team member records are preserved.
- Setting a member to inactive disables team-member sign-in through the existing
  authentication function.
- The migration does not delete team members, workspaces, or credentials.
*/

DROP POLICY IF EXISTS team_members_super_admin_select_1789406000000
ON public.team_members_1789325000000;

CREATE POLICY team_members_super_admin_select_1789406000000
ON public.team_members_1789325000000
FOR SELECT
TO authenticated
USING (public.is_super_admin_1789400000000());

DROP POLICY IF EXISTS team_members_super_admin_insert_1789406000000
ON public.team_members_1789325000000;

CREATE POLICY team_members_super_admin_insert_1789406000000
ON public.team_members_1789325000000
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin_1789400000000());

DROP POLICY IF EXISTS team_members_super_admin_update_1789406000000
ON public.team_members_1789325000000;

CREATE POLICY team_members_super_admin_update_1789406000000
ON public.team_members_1789325000000
FOR UPDATE
TO authenticated
USING (public.is_super_admin_1789400000000())
WITH CHECK (public.is_super_admin_1789400000000());