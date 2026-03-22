-- Canonical object key inside bucket utility-docs (e.g. TICKET/govt_id/123-file.pdf).
-- Enables signed URLs even when public URL parsing fails or file_url was not stored.
ALTER TABLE public.utility_request_document
  ADD COLUMN IF NOT EXISTS storage_object_path text;

COMMENT ON COLUMN public.utility_request_document.storage_object_path IS
  'Storage object path within bucket utility-docs; used for createSignedUrl.';
