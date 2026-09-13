/*
# Create customer IDs for Optimise users

This migration gives every Optimise account a unique customer ID in the format
`OP` followed by five random digits, such as `OP48291`.

## 1. New Tables
- `customer_ids_1789307150923`
  - `id` (uuid, primary key): The linked Supabase Auth user ID.
  - `customer_id` (text, unique): The customer-facing Optimise ID beginning with `OP`.
  - `created_at` (timestamptz): When the customer ID was assigned.

## 2. Existing Users
- Creates customer IDs for every existing authenticated user that does not
  already have one.
- Existing accounts and application data are preserved.

## 3. New Users
- Adds a safe Auth trigger that assigns a customer ID immediately after each
  new user signs up.
- The trigger is security-definer and protected so customer ID generation
  cannot interrupt account creation.

## 4. Security
- Row Level Security is enabled.
- Authenticated users can view only their own customer ID.
- No delete policies are created, preserving customer identity records.

## 5. Important Notes
- Customer IDs are randomly generated and protected by a unique constraint.
- No existing user data is deleted or reassigned.
*/
CREATE TABLE IF NOT EXISTS public.customer_ids_1789307150923 (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text NOT NULL UNIQUE DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_ids_format_1789307150923 CHECK (customer_id ~ '^OP[0-9]{5}$')
);

CREATE INDEX IF NOT EXISTS customer_ids_customer_id_idx_1789307150923
  ON public.customer_ids_1789307150923(customer_id);

ALTER TABLE public.customer_ids_1789307150923 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_ids_select_own_1789307150923
  ON public.customer_ids_1789307150923;

CREATE POLICY customer_ids_select_own_1789307150923
  ON public.customer_ids_1789307150923
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.assign_customer_id_1789307150923()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  generated_customer_id text;
BEGIN
  LOOP
    generated_customer_id := 'OP' || lpad(floor(random() * 100000)::text, 5, '0');

    BEGIN
      INSERT INTO public.customer_ids_1789307150923 (id, customer_id)
      VALUES (new.id, generated_customer_id)
      ON CONFLICT (id) DO NOTHING;

      EXIT;
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END LOOP;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_customer_id_1789307150923
  ON auth.users;

CREATE TRIGGER on_auth_user_created_customer_id_1789307150923
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_customer_id_1789307150923();

DO $$
DECLARE
  auth_user record;
  generated_customer_id text;
  inserted boolean;
BEGIN
  FOR auth_user IN
    SELECT id
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.customer_ids_1789307150923
      WHERE customer_ids_1789307150923.id = auth.users.id
    )
  LOOP
    inserted := false;

    WHILE NOT inserted LOOP
      generated_customer_id := 'OP' || lpad(floor(random() * 100000)::text, 5, '0');

      BEGIN
        INSERT INTO public.customer_ids_1789307150923 (id, customer_id)
        VALUES (auth_user.id, generated_customer_id)
        ON CONFLICT (id) DO NOTHING;

        inserted := true;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END LOOP;
END $$;