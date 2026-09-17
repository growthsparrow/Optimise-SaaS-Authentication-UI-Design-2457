/* # Enforce ten-digit phone numbers across booking records

1. Modified Tables
- `patient_bookings_1789315000000`
  - Validates `phone_number` as exactly 10 numeric digits.
  - Existing records are not changed.
- `team_members_1789325000000`
  - Validates `phone_number` as exactly 10 numeric digits.
  - Existing records are not changed.
- `public_booking_requests_1789608000000`
  - Validates phone, mobile, and contact fields inside `form_response` when those fields are present.
  - Existing booking responses are not changed.

2. Security
- Adds owner-safe validation triggers only.
- Existing RLS policies and public booking RPC permissions remain unchanged.
- No public read or write permissions are added.

3. Important Notes
- Phone values are normalized by the frontend before saving.
- The database rejects incomplete, oversized, or non-numeric phone values.
- Existing data is preserved and is not rewritten, deleted, or reassigned.
*/

CREATE OR REPLACE FUNCTION public.validate_ten_digit_phone_numbers_1789634000000()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  response_key text;
  response_value text;
BEGIN
  IF TG_TABLE_NAME = 'patient_bookings_1789315000000' THEN
    NEW.phone_number := regexp_replace(COALESCE(NEW.phone_number, ''), '[^0-9]', '', 'g');

    IF NEW.phone_number !~ '^[0-9]{10}$' THEN
      RAISE EXCEPTION 'Phone number must contain exactly 10 digits.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'team_members_1789325000000' THEN
    NEW.phone_number := regexp_replace(COALESCE(NEW.phone_number, ''), '[^0-9]', '', 'g');

    IF NEW.phone_number !~ '^[0-9]{10}$' THEN
      RAISE EXCEPTION 'Phone number must contain exactly 10 digits.';
    END IF;

    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'public_booking_requests_1789608000000' THEN
    FOR response_key, response_value IN
      SELECT key, value
      FROM jsonb_each_text(COALESCE(NEW.form_response, '{}'::jsonb))
    LOOP
      IF response_key ~* '(phone|mobile|contact)'
        AND NULLIF(trim(response_value), '') IS NOT NULL
      THEN
        response_value := regexp_replace(response_value, '[^0-9]', '', 'g');

        IF response_value !~ '^[0-9]{10}$' THEN
          RAISE EXCEPTION 'Phone number must contain exactly 10 digits.';
        END IF;

        NEW.form_response := jsonb_set(
          NEW.form_response,
          ARRAY[response_key],
          to_jsonb(response_value),
          true
        );
      END IF;
    END LOOP;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_patient_booking_phone_1789634000000
ON public.patient_bookings_1789315000000;

CREATE TRIGGER validate_patient_booking_phone_1789634000000
BEFORE INSERT OR UPDATE OF phone_number
ON public.patient_bookings_1789315000000
FOR EACH ROW
EXECUTE FUNCTION public.validate_ten_digit_phone_numbers_1789634000000();

DROP TRIGGER IF EXISTS validate_team_member_phone_1789634000000
ON public.team_members_1789325000000;

CREATE TRIGGER validate_team_member_phone_1789634000000
BEFORE INSERT OR UPDATE OF phone_number
ON public.team_members_1789325000000
FOR EACH ROW
EXECUTE FUNCTION public.validate_ten_digit_phone_numbers_1789634000000();

DROP TRIGGER IF EXISTS validate_public_booking_phone_1789634000000
ON public.public_booking_requests_1789608000000;

CREATE TRIGGER validate_public_booking_phone_1789634000000
BEFORE INSERT OR UPDATE OF form_response
ON public.public_booking_requests_1789608000000
FOR EACH ROW
EXECUTE FUNCTION public.validate_ten_digit_phone_numbers_1789634000000();