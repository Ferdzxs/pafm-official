-- Run in Supabase Dashboard → SQL Editor (once per project).
-- BPM citizen login uses custom auth + anon key (no Supabase Auth JWT). Inserts and
-- storage uploads therefore run as role `anon`. If RLS is enabled without permissive
-- policies, burial submissions fail with "new row violates row-level security policy".
--
-- 1) Storage: bucket + policies for burial document uploads
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

-- 2) Tables: allow anon to insert/update rows the citizen form needs.
-- Tighten later (e.g. Edge Function + service role, or Supabase Auth).
ALTER TABLE public.deceased ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "deceased_citizen_anon_all" ON public.deceased;
CREATE POLICY "deceased_citizen_anon_all"
  ON public.deceased FOR ALL TO public
  USING (true) WITH CHECK (true);

ALTER TABLE public.online_burial_application ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "online_burial_citizen_anon_all" ON public.online_burial_application;
CREATE POLICY "online_burial_citizen_anon_all"
  ON public.online_burial_application FOR ALL TO public
  USING (true) WITH CHECK (true);

ALTER TABLE public.indigent_assistance_record ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "indigent_citizen_anon_all" ON public.indigent_assistance_record;
CREATE POLICY "indigent_citizen_anon_all"
  ON public.indigent_assistance_record FOR ALL TO public
  USING (true) WITH CHECK (true);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notification_log_citizen_anon_insert" ON public.notification_log;
CREATE POLICY "notification_log_citizen_anon_insert"
  ON public.notification_log FOR INSERT TO public
  WITH CHECK (true);
