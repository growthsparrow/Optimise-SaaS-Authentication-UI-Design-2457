/*
# Add Cater To content to business pages

This migration adds a Cater To field to the existing business page content.

## 1. Modified Tables

- `business_pages_1789493000000`
  - `cater_to` (text): Describes the customers, industries, audiences, or use cases the business serves.

## 2. Data Preservation

- Existing business pages and content remain unchanged.
- Existing rows receive an empty default value.
- No rows or existing columns are deleted.

## 3. Security

- Existing row-level security policies remain unchanged.
- The field follows the existing owner-only edit and published-page read policies.

## 4. Important Notes

- The field is available in the My Business page dashboard.
- The saved value is also displayed publicly in the What you offer section.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'cater_to'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN cater_to text NOT NULL DEFAULT '';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';