/* # Expand customer IDs to the OP plus eight-digit format

1. Modified Tables
- `customer_ids_1789307150923`
  - Keeps the existing `id` linked to each registered Supabase Auth user.
  - Updates `customer_id` to the format `OP` followed by exactly eight digits.
  - Existing customer ID rows are preserved and reassigned only when their current value does not match the new format.

2. Registered Users
- Ensures every existing Auth user has a customer ID.
- Existing users with five-digit IDs receive a new unique eight-digit ID.
- New users receive a unique eight-digit ID automatically through the Auth trigger.

3. Security
- Existing row-level security policies remain unchanged.
- Customer IDs remain readable only by the corresponding authenticated user or the super admin through the existing admin client flow.

4. Super Admin Directory
- The existing customer directory continues to read customer IDs from `customer_ids_1789307150923`.
- Every registered user will therefore display an eight-digit customer ID in the Customer ID column.

5. Important Notes
- No users, profiles, bookings, or customer ID rows are deleted.
- Existing customer ID values may change from the old five-digit format to the new eight-digit format.
- Customer IDs remain unique.
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname='customer_ids_format_1789307150923'
      AND conrelid='public.customer_ids_1789307150923'::regclass
  ) THEN
    ALTER TABLE public.customer_ids_1789307150923
      DROP CONSTRAINT customer_ids_format_1789307150923;
  END IF;
END
$$;

ALTER TABLE public.customer_ids_1789307150923
  ADD CONSTRAINT customer_ids_format_1789404000000
  CHECK (customer_id ~ '^OP[0-9]{8}$');

CREATE OR REPLACE FUNCTION public.assign_customer_id_1789307150923()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public
AS $$
DECLARE
  generated_customer_id text;
BEGIN
  IF COALESCE(new.customer_id,'') ~ '^OP[0-9]{8}$' THEN
    RETURN new;
  END IF;

  LOOP
    generated_customer_id :=
      'OP' || lpad(floor(random() * 100000000)::bigint::text,8,'0');

    BEGIN
      PERFORM 1
      FROM public.customer_ids_1789307150923
      WHERE customer_id=generated_customer_id
        AND id<>new.id;

      IF NOT FOUND THEN
        new.customer_id=generated_customer_id;
        RETURN new;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN new;
    END;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS assign_customer_id_before_insert_1789404000000
  ON public.customer_ids_1789307150923;

CREATE TRIGGER assign_customer_id_before_insert_1789404000000
BEFORE INSERT OR UPDATE OF customer_id
ON public.customer_ids_1789307150923
FOR EACH ROW
EXECUTE FUNCTION public.assign_customer_id_1789307150923();

DO $$
DECLARE
  customer_record record;
  generated_customer_id text;
BEGIN
  FOR customer_record IN
    SELECT id
    FROM public.customer_ids_1789307150923
    WHERE customer_id IS NULL
      OR customer_id !~ '^OP[0-9]{8}$'
  LOOP
    LOOP
      generated_customer_id :=
        'OP' || lpad(floor(random() * 100000000)::bigint::text,8,'0');

      BEGIN
        UPDATE public.customer_ids_1789307150923
        SET customer_id=generated_customer_id
        WHERE id=customer_record.id
          AND (
            customer_id IS NULL
            OR customer_id !~ '^OP[0-9]{8}$'
          );

        EXIT WHEN FOUND;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END LOOP;
END
$$;

DO $$
DECLARE
  auth_user record;
  generated_customer_id text;
BEGIN
  FOR auth_user IN
    SELECT users.id
    FROM auth.users users
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.customer_ids_1789307150923 customer_ids
      WHERE customer_ids.id=users.id
    )
  LOOP
    LOOP
      generated_customer_id :=
        'OP' || lpad(floor(random() * 100000000)::bigint::text,8,'0');

      BEGIN
        INSERT INTO public.customer_ids_1789307150923 (
          id,
          customer_id
        )
        VALUES (
          auth_user.id,
          generated_customer_id
        )
        ON CONFLICT (id) DO NOTHING;

        EXIT;
      EXCEPTION
        WHEN unique_violation THEN
          NULL;
      END;
    END LOOP;
  END LOOP;
END
$$;

CREATE INDEX IF NOT EXISTS customer_ids_eight_digit_lookup_idx_1789404000000
  ON public.customer_ids_1789307150923(customer_id);