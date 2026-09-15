/*
# Create personalised business pages

This migration adds a workspace-owned business profile used to create a public,
shareable business page with appointment booking access.

## 1. New Tables

- `business_pages_1789493000000`
  - `id` (uuid, primary key): Unique business page identifier.
  - `user_id` (uuid, unique): Authenticated workspace owner.
  - `business_name` (text): Public business name.
  - `business_slug` (text, unique): URL-safe public page identifier.
  - `business_category` (text): Category captured during registration.
  - `logo_url` (text): Public business logo URL.
  - `business_expertise` (text): Business expertise or domain.
  - `services_offered` (text): Services displayed on the public page.
  - `products` (text): Products displayed on the public page.
  - `business_images` (text[]): Up to five public business or product image URLs.
  - `years_of_experience` (integer): Years operating in the business.
  - `primary_contact_number` (text): Public contact number.
  - `email_id` (text): Public business email.
  - `social_facebook` (text): Facebook URL.
  - `social_instagram` (text): Instagram URL.
  - `social_x` (text): X/Twitter URL.
  - `social_linkedin` (text): LinkedIn URL.
  - `is_published` (boolean): Controls public visibility.
  - `created_at` and `updated_at` (timestamptz): Record timestamps.

## 2. Security

- Enables RLS on the new table.
- Authenticated owners can read, create, and update only their own page.
- Anonymous visitors can read only published business pages.
- Storage uploads are restricted to the authenticated owner's folder.
- No destructive delete operation is included.

## 3. Important Notes

- Existing profile information and social links are preserved.
- Social links are moved to this business page experience by the application.
- Business images are limited to five URLs by a database constraint.
- Public pages use `/book/<business-slug>`.
*/

CREATE TABLE IF NOT EXISTS public.business_pages_1789493000000 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name text NOT NULL DEFAULT '',
  business_slug text NOT NULL UNIQUE DEFAULT '',
  business_category text NOT NULL DEFAULT '',
  logo_url text NOT NULL DEFAULT '',
  business_expertise text NOT NULL DEFAULT '',
  services_offered text NOT NULL DEFAULT '',
  products text NOT NULL DEFAULT '',
  business_images text[] NOT NULL DEFAULT '{}',
  years_of_experience integer NOT NULL DEFAULT 0 CHECK (years_of_experience >= 0),
  primary_contact_number text NOT NULL DEFAULT '',
  email_id text NOT NULL DEFAULT '',
  social_facebook text NOT NULL DEFAULT '',
  social_instagram text NOT NULL DEFAULT '',
  social_x text NOT NULL DEFAULT '',
  social_linkedin text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_pages_images_limit_1789493000000
    CHECK (cardinality(business_images) <= 5),
  CONSTRAINT business_pages_slug_format_1789493000000
    CHECK (business_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS business_pages_user_id_idx_1789493000000
  ON public.business_pages_1789493000000(user_id);

CREATE INDEX IF NOT EXISTS business_pages_slug_idx_1789493000000
  ON public.business_pages_1789493000000(business_slug);

CREATE INDEX IF NOT EXISTS business_pages_published_idx_1789493000000
  ON public.business_pages_1789493000000(is_published);

ALTER TABLE public.business_pages_1789493000000 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_pages_owner_select_1789493000000
  ON public.business_pages_1789493000000;

CREATE POLICY business_pages_owner_select_1789493000000
  ON public.business_pages_1789493000000
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS business_pages_owner_insert_1789493000000
  ON public.business_pages_1789493000000;

CREATE POLICY business_pages_owner_insert_1789493000000
  ON public.business_pages_1789493000000
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS business_pages_owner_update_1789493000000
  ON public.business_pages_1789493000000;

CREATE POLICY business_pages_owner_update_1789493000000
  ON public.business_pages_1789493000000
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS business_pages_public_read_1789493000000
  ON public.business_pages_1789493000000;

CREATE POLICY business_pages_public_read_1789493000000
  ON public.business_pages_1789493000000
  FOR SELECT
  TO anon, authenticated
  USING (is_published = true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('business-page-assets', 'business-page-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS business_page_assets_public_read_1789493000000
  ON storage.objects;

CREATE POLICY business_page_assets_public_read_1789493000000
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'business-page-assets');

DROP POLICY IF EXISTS business_page_assets_owner_insert_1789493000000
  ON storage.objects;

CREATE POLICY business_page_assets_owner_insert_1789493000000
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-page-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS business_page_assets_owner_update_1789493000000
  ON storage.objects;

CREATE POLICY business_page_assets_owner_update_1789493000000
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'business-page-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'business-page-assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

NOTIFY pgrst, 'reload schema';