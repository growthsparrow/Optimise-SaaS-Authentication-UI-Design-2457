/* # Expand super admin account directory details

This migration adds the account, contact, and subscription fields needed by the
super admin user directory. Existing profiles and authentication records are
preserved. Existing customer IDs remain unchanged.

## 1. Modified Tables

- `user_profiles_1789400000000`
  - `contact_number` (text): Workspace owner's contact number.
  - `subscription_package` (text): Name of the subscribed package.
  - `subscription_status` (text): Subscription state, such as `active`,
    `trialing`, `cancelled`, or `not_subscribed`.
  - `subscription_start_date` (timestamptz): Subscription start date.
  - `subscription_end_date` (timestamptz): Subscription end date.
  - `next_renewal_date` (timestamptz): Next scheduled renewal date.

## 2. Existing Data

- Existing profile rows are preserved.
- Existing contact numbers are filled from available signup metadata only when
  the profile does not already contain a contact number.
- Existing subscription fields default to an unsubscribed state.
- No user, profile, customer ID, or subscription data is deleted.

## 3. Security

- Existing row-level security remains enabled.
- Existing super admin and user profile policies continue to control access.
- The existing safe profile trigger now captures contact number metadata for
  newly created users.

## 4. Important Notes

- Subscription fields are available to the super admin directory and can later
  be populated by a billing or subscription-management workflow.
- Existing accounts without subscription information display `Not subscribed`.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='contact_number'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN contact_number text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='subscription_package'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN subscription_package text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='subscription_status'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN subscription_status text NOT NULL DEFAULT 'not_subscribed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='subscription_start_date'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN subscription_start_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='subscription_end_date'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN subscription_end_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='next_renewal_date'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN next_renewal_date timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='user_profiles_subscription_status_valid_1789402000000'
      AND conrelid='public.user_profiles_1789400000000'::regclass
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD CONSTRAINT user_profiles_subscription_status_valid_1789402000000
      CHECK (
        subscription_status IN (
          'active',
          'trialing',
          'past_due',
          'cancelled',
          'expired',
          'not_subscribed'
        )
      );
  END IF;
END $$;

UPDATE public.user_profiles_1789400000000 profiles
SET contact_number=COALESCE(
  NULLIF(profiles.contact_number,''),
  COALESCE(auth_users.raw_user_meta_data ->> 'contact_number','')
)
FROM auth.users auth_users
WHERE profiles.id=auth_users.id
  AND COALESCE(profiles.contact_number,'')='';

CREATE INDEX IF NOT EXISTS user_profiles_subscription_status_idx_1789402000000
  ON public.user_profiles_1789400000000(subscription_status);

CREATE INDEX IF NOT EXISTS user_profiles_next_renewal_date_idx_1789402000000
  ON public.user_profiles_1789400000000(next_renewal_date);

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
    contact_number
  )
  VALUES (
    new.id,
    COALESCE(new.email,''),
    COALESCE(new.raw_user_meta_data ->> 'name',''),
    COALESCE(new.raw_user_meta_data ->> 'business_name',''),
    COALESCE(new.raw_user_meta_data ->> 'contact_number','')
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;