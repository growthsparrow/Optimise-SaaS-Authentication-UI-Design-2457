/*
# Add business page content sections

This migration adds editable About Us, client testimonial, and client logo content
to the existing business page table.

## 1. Modified Tables

- `business_pages_1789493000000`
  - `about_us` (text): Long-form About Us content displayed publicly.
  - `client_testimonials` (jsonb): Testimonial entries containing client name,
    quote, and optional role or company.
  - `client_logos` (text[]): Public image URLs for client or partner logos.

## 2. Defaults and Data Preservation

- Existing business pages are preserved.
- Existing rows receive empty defaults for the new content fields.
- No existing columns, rows, images, or users are deleted.
- The existing `is_published` value remains available for compatibility, while
  the application now saves business pages as published immediately.

## 3. Security

- Existing row-level security policies remain unchanged.
- Business page owners continue to manage only their own pages.
- Published page content continues to be publicly readable through the existing
  public-page policy.

## 4. Important Notes

- Testimonial data is stored as a JSON array so multiple testimonials can be
  edited together without creating a separate orphaned table.
- Client logos are stored as an array of public image URLs.
- The frontend limits the number of displayed client logos to eight.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'about_us'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN about_us text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'client_testimonials'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN client_testimonials jsonb NOT NULL DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'business_pages_1789493000000'
      AND column_name = 'client_logos'
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD COLUMN client_logos text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'business_pages_testimonials_array_1789506000000'
      AND conrelid = 'public.business_pages_1789493000000'::regclass
  ) THEN
    ALTER TABLE public.business_pages_1789493000000
      ADD CONSTRAINT business_pages_testimonials_array_1789506000000
      CHECK (jsonb_typeof(client_testimonials) = 'array');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS business_pages_testimonials_idx_1789506000000
  ON public.business_pages_1789493000000
  USING gin (client_testimonials);

NOTIFY pgrst, 'reload schema';