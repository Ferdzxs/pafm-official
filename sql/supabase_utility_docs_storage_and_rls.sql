-- Utility citizen uploads: storage bucket + RLS for utility_request_document
-- Run in Supabase SQL Editor after service_tickets exists.
-- App stores public URLs; staff/citizen clients use anon key — policies must allow needed access.

-- ── Storage bucket (private: app uses signed URLs via createSignedUrl) ─────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('utility-docs', 'utility-docs', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Citizens upload during apply; staff read via signed URL (service role or authenticated).
-- With custom JWT / anon-only clients, permissive policies are common for this demo app.
DROP POLICY IF EXISTS "utility_docs_insert_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "utility_docs_select_authenticated" ON storage.objects;
DROP POLICY IF EXISTS "utility_docs_all_anon" ON storage.objects;

CREATE POLICY "utility_docs_all_anon"
ON storage.objects FOR ALL
TO anon, authenticated
USING (bucket_id = 'utility-docs')
WITH CHECK (bucket_id = 'utility-docs');

-- ── Table RLS (if table exists) ─────────────────────────────────────────────
ALTER TABLE IF EXISTS public.utility_request_document ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "utility_request_document_all" ON public.utility_request_document;
CREATE POLICY "utility_request_document_all"
ON public.utility_request_document
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
