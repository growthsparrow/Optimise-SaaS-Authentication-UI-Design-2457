/* # Create super admin portal and subscription management

1. New Tables
- `super_admins_1789400000000`
  - `id` (uuid, primary key): Super admin record identifier.
  - `email` (text, unique): Supabase Auth email allowed to access the admin portal.
  - `is_enabled` (boolean): Controls whether admin access is permitted.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.
- `user_profiles_1789400000000`
  - `id` (uuid, primary key): Linked Supabase Auth user identifier.
  - `email` (text): Registered user email.
  - `full_name` (text): User display name.
  - `business_name` (text): Workspace or business name.
  - `is_enabled` (boolean): Controls whether the user account is enabled.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.
- `subscription_packages_1789400000000`
  - `id` (uuid, primary key): Package identifier.
  - `name` (text): Public subscription package name.
  - `description` (text): Package description.
  - `price_inr` (numeric): Package price in INR.
  - `billing_period` (text): Billing interval.
  - `features` (text[]): Package feature list.
  - `is_published` (boolean): Controls public visibility.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

2. Security
- Enables RLS on all new tables.
- Only the configured super admin email can view and manage users, administrators, and packages.
- Users can read and update their own profile.
- Published packages are publicly readable.
- Adds a safe Auth trigger that creates a profile whenever a new Supabase Auth user signs up.

3. Important Notes
- No existing users, packages, or authentication records are deleted.
- The super admin account must be created in Supabase Auth using the requested email and password.
- The allowlisted email is `satish@growthsparrow.com`.
- Disabling a user changes a flag only; it does not delete their account or data.
*/ 

CREATE TABLE IF NOT EXISTS public.super_admins_1789400000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_profiles_1789400000000 (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  full_name text NOT NULL DEFAULT '',
  business_name text NOT NULL DEFAULT '',
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_packages_1789400000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  price_inr numeric(10, 2) NOT NULL DEFAULT 0 CHECK (price_inr >= 0),
  billing_period text NOT NULL DEFAULT 'monthly',
  features text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS super_admins_email_idx_1789400000000
  ON public.super_admins_1789400000000(email);

CREATE INDEX IF NOT EXISTS user_profiles_email_idx_1789400000000
  ON public.user_profiles_1789400000000(email);

CREATE INDEX IF NOT EXISTS user_profiles_enabled_idx_1789400000000
  ON public.user_profiles_1789400000000(is_enabled);

CREATE INDEX IF NOT EXISTS subscription_packages_published_idx_1789400000000
  ON public.subscription_packages_1789400000000(is_published);

ALTER TABLE public.super_admins_1789400000000 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles_1789400000000 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_packages_1789400000000 ENABLE ROW LEVEL SECURITY;

INSERT INTO public.super_admins_1789400000000 (email, is_enabled)
VALUES ('satish@growthsparrow.com', true)
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_super_admin_1789400000000()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.super_admins_1789400000000
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND is_enabled = true
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_profile_1789400000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles_1789400000000 (
    id,
    email,
    full_name,
    business_name
  )
  VALUES (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'business_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile_1789400000000
  ON auth.users;

CREATE TRIGGER on_auth_user_created_profile_1789400000000
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile_1789400000000();

INSERT INTO public.user_profiles_1789400000000 (
  id,
  email,
  full_name,
  business_name
)
SELECT
  users.id,
  coalesce(users.email, ''),
  coalesce(users.raw_user_meta_data ->> 'name', ''),
  coalesce(users.raw_user_meta_data ->> 'business_name', '')
FROM auth.users users
WHERE NOT EXISTS (
  SELECT 1
  FROM public.user_profiles_1789400000000 profiles
  WHERE profiles.id = users.id
);

DROP POLICY IF EXISTS super_admins_read_1789400000000
  ON public.super_admins_1789400000000;

CREATE POLICY super_admins_read_1789400000000
ON public.super_admins_1789400000000
FOR SELECT
TO authenticated
USING (public.is_super_admin_1789400000000());

DROP POLICY IF EXISTS user_profiles_read_1789400000000
  ON public.user_profiles_1789400000000;

CREATE POLICY user_profiles_read_1789400000000
ON public.user_profiles_1789400000000
FOR SELECT
TO authenticated
USING (
  id = auth.uid()
  OR public.is_super_admin_1789400000000()
);

DROP POLICY IF EXISTS user_profiles_update_1789400000000
  ON public.user_profiles_1789400000000;

CREATE POLICY user_profiles_update_1789400000000
ON public.user_profiles_1789400000000
FOR UPDATE
TO authenticated
USING (
  id = auth.uid()
  OR public.is_super_admin_1789400000000()
)
WITH CHECK (
  id = auth.uid()
  OR public.is_super_admin_1789400000000()
);

DROP POLICY IF EXISTS subscription_packages_public_read_1789400000000
  ON public.subscription_packages_1789400000000;

CREATE POLICY subscription_packages_public_read_1789400000000
ON public.subscription_packages_1789400000000
FOR SELECT
TO anon, authenticated
USING (
  is_published = true
  OR public.is_super_admin_1789400000000()
);

DROP POLICY IF EXISTS subscription_packages_admin_insert_1789400000000
  ON public.subscription_packages_1789400000000;

CREATE POLICY subscription_packages_admin_insert_1789400000000
ON public.subscription_packages_1789400000000
FOR INSERT
TO authenticated
WITH CHECK (public.is_super_admin_1789400000000());

DROP POLICY IF EXISTS subscription_packages_admin_update_1789400000000
  ON public.subscription_packages_1789400000000;

CREATE POLICY subscription_packages_admin_update_1789400000000
ON public.subscription_packages_1789400000000
FOR UPDATE
TO authenticated
USING (public.is_super_admin_1789400000000())
WITH CHECK (public.is_super_admin_1789400000000());