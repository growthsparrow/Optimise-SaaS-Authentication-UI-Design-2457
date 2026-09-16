/* # Add business location details to public business pages
1. Modified Tables
- `business_pages_1789493000000`
- `business_address` (text): Full business street address.
- `pincode` (text): Postal or ZIP code for the business.
- `website_address` (text): Optional public business website.
- `office_location_map_link` (text): Optional Google Maps or map URL for the office.

2. Data Preservation
- Existing business page records remain unchanged.
- New fields use empty-string defaults.
- No rows, existing columns, images, or users are deleted or reassigned.

3. Security
- Existing owner-only policies continue to control editing.
- Existing published-page policy continues to control public visibility.

4. Important Notes
- Website address is optional.
- The map link is displayed as a navigation link when provided.
- The fields are shown on the owner’s My Business Page and the public business page.
*/ 
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'business_address'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN business_address text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'pincode'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN pincode text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'website_address'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN website_address text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'office_location_map_link'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN office_location_map_link text NOT NULL DEFAULT '';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';