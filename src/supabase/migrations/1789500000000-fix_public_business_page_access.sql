/*
# Fix public business page access

This migration ensures published business pages can be loaded by anonymous visitors from a generated link or QR code.

## 1. Modified Tables

- `business_pages_1789493000000`
  - No columns are added, removed, or changed.
  - Existing business page records remain preserved.

## 2. Security

- Keeps row-level security enabled.
- Ensures anonymous and authenticated visitors can read only pages where `is_published = true`.
- Keeps workspace-owner policies for private management access.
- Allows public access only to published page content.

## 3. Storage

- Ensures public visitors can read files stored in the `business-page-assets` bucket.
- Existing uploaded logos and images are preserved.

## 4. Important Notes

- Draft pages remain private.
- Saving a page with “Publish this page” enabled makes it available through its public URL.
- No business pages, images, or user data are deleted.
*/

ALTER TABLE public.business_pages_1789493000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_pages_public_read_1789500000000
ON public.business_pages_1789493000000;

CREATE POLICY business_pages_public_read_1789500000000
ON public.business_pages_1789493000000
FOR SELECT
TO anon, authenticated
USING (is_published = true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-page-assets', 'business-page-assets', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS business_page_assets_public_read_1789500000000
ON storage.objects;

CREATE POLICY business_page_assets_public_read_1789500000000
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'business-page-assets');

NOTIFY pgrst, 'reload schema';