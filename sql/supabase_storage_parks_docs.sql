-- Run in Supabase Dashboard → SQL Editor (once per project).
-- Fixes: "Bucket not found" when uploading park LOIs / permits.
--
-- IMPORTANT — RLS and this app’s auth model:
-- BPM login uses custom tables (citizen_account / system_users) + localStorage, not
-- supabase.auth sessions. Storage requests therefore use the anon key without a JWT
-- (`auth.role()` = anon, not authenticated). Policies must use TO public (anon +
-- authenticated) or uploads will fail with: "new row violates row-level security policy".
-- For stronger security later, migrate to Supabase Auth sessions or upload via Edge
-- Function (service role).

-- 1) Bucket (public URL for digital_document.file_url)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'parks-docs',
  'parks-docs',
  true,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) RLS: anon + authenticated can insert/update (see note above); anyone can read
DROP POLICY IF EXISTS "parks_docs_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "parks_docs_insert_public" ON storage.objects;
CREATE POLICY "parks_docs_insert_public"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'parks-docs');

DROP POLICY IF EXISTS "parks_docs_update_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "parks_docs_update_public" ON storage.objects;
CREATE POLICY "parks_docs_update_public"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'parks-docs')
  WITH CHECK (bucket_id = 'parks-docs');

DROP POLICY IF EXISTS "parks_docs_select_public" ON storage.objects;
CREATE POLICY "parks_docs_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'parks-docs');
