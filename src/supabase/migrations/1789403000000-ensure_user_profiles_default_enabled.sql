/* # Ensure new customer profiles are enabled by default

1. Modified Tables
- `user_profiles_1789400000000`
  - Ensures `is_enabled` defaults to `true`.
  - Existing profile records remain unchanged.

2. Security
- Existing row-level security policies remain in place.
- The existing authenticated-user access function continues to determine whether a customer may use the dashboard.

3. Changes
- Updates the profile creation trigger so every newly created profile explicitly starts with enabled access.
- Keeps the super admin-controlled `is_enabled` value available for later account suspension.

4. Important Notes
- No users, profiles, subscriptions, or application data are deleted.
- This migration does not re-enable existing disabled accounts.
- Regular customer access checks must use the regular authenticated Supabase client so the current customer's session is evaluated.
*/ 

ALTER TABLE public.user_profiles_1789400000000
  ALTER COLUMN is_enabled SET DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile_1789400000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  INSERT INTO public.user_profiles_1789400000000 (
    id,
    email,
    full_name,
    business_name,
    contact_number,
    is_enabled
  )
  VALUES (
    new.id,
    COALESCE(new.email,''),
    COALESCE(new.raw_user_meta_data ->> 'name',''),
    COALESCE(new.raw_user_meta_data ->> 'business_name',''),
    COALESCE(new.raw_user_meta_data ->> 'contact_number',''),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;