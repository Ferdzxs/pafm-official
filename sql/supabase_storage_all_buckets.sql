-- Run once in Supabase Dashboard → SQL Editor.
-- Fixes: { "statusCode":"404","error":"Bucket not found","message":"Bucket not found" }
-- when the app calls supabase.storage.from('<bucket>') for a bucket that was never created.
--
-- This script creates every Storage bucket referenced in the BPM codebase:
--   parks-docs, utility-docs, burial-documents, inspection-evidence
--
-- BPM often uses the anon key without Supabase Auth JWT; policies must allow public/anon
-- where needed. See sql/supabase_storage_parks_docs.sql and sql/supabase_burial_citizen_writes.sql
-- for notes; utility RLS is in sql/supabase_utility_docs_storage_and_rls.sql.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) parks-docs (parks LOI, barangay uploads, reservation officer PDFs)
-- ═══════════════════════════════════════════════════════════════════════════
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

DROP POLICY IF EXISTS "parks_docs_insert_public" ON storage.objects;
CREATE POLICY "parks_docs_insert_public"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'parks-docs');

DROP POLICY IF EXISTS "parks_docs_update_public" ON storage.objects;
CREATE POLICY "parks_docs_update_public"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'parks-docs')
  WITH CHECK (bucket_id = 'parks-docs');

DROP POLICY IF EXISTS "parks_docs_select_public" ON storage.objects;
CREATE POLICY "parks_docs_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'parks-docs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) utility-docs (utility citizen uploads; app may use signed URLs)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public)
VALUES ('utility-docs', 'utility-docs', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "utility_docs_all_anon" ON storage.objects;
CREATE POLICY "utility_docs_all_anon"
ON storage.objects FOR ALL
TO anon, authenticated
USING (bucket_id = 'utility-docs')
WITH CHECK (bucket_id = 'utility-docs');

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) burial-documents (citizen burial application uploads)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'burial-documents',
  'burial-documents',
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

DROP POLICY IF EXISTS "burial_docs_insert_public" ON storage.objects;
CREATE POLICY "burial_docs_insert_public"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'burial-documents');

DROP POLICY IF EXISTS "burial_docs_update_public" ON storage.objects;
CREATE POLICY "burial_docs_update_public"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'burial-documents')
  WITH CHECK (bucket_id = 'burial-documents');

DROP POLICY IF EXISTS "burial_docs_select_public" ON storage.objects;
CREATE POLICY "burial_docs_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'burial-documents');

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) inspection-evidence (FAMCD ocular inspection photos, inventory report uploads)
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'inspection-evidence',
  'inspection-evidence',
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

DROP POLICY IF EXISTS "inspection_evidence_insert_public" ON storage.objects;
CREATE POLICY "inspection_evidence_insert_public"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'inspection-evidence');

DROP POLICY IF EXISTS "inspection_evidence_update_public" ON storage.objects;
CREATE POLICY "inspection_evidence_update_public"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'inspection-evidence')
  WITH CHECK (bucket_id = 'inspection-evidence');

DROP POLICY IF EXISTS "inspection_evidence_select_public" ON storage.objects;
CREATE POLICY "inspection_evidence_select_public"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'inspection-evidence');

-- If you use utility citizen uploads, also run: sql/supabase_utility_docs_storage_and_rls.sql
-- (includes utility_request_document RLS when that table exists).
