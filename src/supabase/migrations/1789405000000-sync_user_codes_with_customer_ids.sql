/* # Sync customer user codes with customer IDs

1. Modified Tables
- `user_profiles_1789400000000`
  - Adds `user_code` (text): The customer-facing code assigned to the registered user.
  - Existing profile rows are preserved.
  - Existing values default to an empty string before being populated.

2. Existing Customer Accounts
- Copies each user's existing value from `customer_ids_1789307150923.customer_id` into the matching profile's `user_code`.
- Every registered user with a customer ID receives the same value in `user_code`.

3. Future Customer Accounts
- Adds a trigger on `customer_ids_1789307150923`.
- Newly assigned or updated customer IDs are automatically copied to the matching user's `user_code`.

4. Security
- Existing row-level security on `user_profiles_1789400000000` remains enabled.
- Existing profile policies continue to control access.
- No new public access is granted.

5. Important Notes
- No users, profiles, customer IDs, bookings, or subscriptions are deleted.
- The existing customer ID remains the source of truth.
- The super admin directory can display `user_code` while retaining the existing Customer ID value.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='user_profiles_1789400000000'
      AND column_name='user_code'
  ) THEN
    ALTER TABLE public.user_profiles_1789400000000
      ADD COLUMN user_code text NOT NULL DEFAULT '';
  END IF;
END
$$;

UPDATE public.user_profiles_1789400000000 profiles
SET user_code=customer_ids.customer_id
FROM public.customer_ids_1789307150923 customer_ids
WHERE profiles.id=customer_ids.id
  AND COALESCE(customer_ids.customer_id,'') <> ''
  AND COALESCE(profiles.user_code,'') <> customer_ids.customer_id;

CREATE INDEX IF NOT EXISTS user_profiles_user_code_idx_1789405000000
  ON public.user_profiles_1789400000000(user_code);

CREATE OR REPLACE FUNCTION public.sync_user_code_from_customer_id_1789405000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
BEGIN
  UPDATE public.user_profiles_1789400000000
  SET user_code=NEW.customer_id,
      updated_at=now()
  WHERE id=NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_code_from_customer_id_1789405000000
  ON public.customer_ids_1789307150923;

CREATE TRIGGER sync_user_code_from_customer_id_1789405000000
AFTER INSERT OR UPDATE OF customer_id
ON public.customer_ids_1789307150923
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_code_from_customer_id_1789405000000();

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
    user_code,
    is_enabled
  )
  SELECT
    new.id,
    COALESCE(new.email,''),
    COALESCE(new.raw_user_meta_data ->> 'name',''),
    COALESCE(new.raw_user_meta_data ->> 'business_name',''),
    COALESCE(new.raw_user_meta_data ->> 'contact_number',''),
    COALESCE(customer_ids.customer_id,''),
    true
  FROM (
    SELECT new.id AS id
  ) profile_user
  LEFT JOIN public.customer_ids_1789307150923 customer_ids
    ON customer_ids.id=profile_user.id
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;