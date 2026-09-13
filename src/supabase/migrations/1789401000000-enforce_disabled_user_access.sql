/* # Enforce disabled user access checks

1. New Database Function
- `is_user_enabled_1789401000000`
  - Returns whether the currently authenticated Supabase user has an enabled
    profile in `user_profiles_1789400000000`.
  - Returns `false` when no authenticated user or profile exists.

2. Security
- The function runs as `SECURITY DEFINER`.
- The function uses a fixed `public` search path.
- Authenticated clients may execute the function only for their own session.
- No user, profile, authentication, or application data is deleted.

3. Important Notes
- The frontend signs out disabled users immediately after authentication.
- Existing sessions are also rejected by the regular dashboard route.
- Super administrator access checks remain separate and unchanged.
*/

CREATE OR REPLACE FUNCTION public.is_user_enabled_1789401000000()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles_1789400000000
    WHERE id = auth.uid()
      AND is_enabled = true
  );
$$;

REVOKE ALL
ON FUNCTION public.is_user_enabled_1789401000000()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.is_user_enabled_1789401000000()
TO authenticated;