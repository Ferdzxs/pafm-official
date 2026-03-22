-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('burial-documents', 'burial-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to read files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'burial-documents');

-- Allow anon/authenticated users to upload files
CREATE POLICY "Allow Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'burial-documents');

-- Allow users to update/overwrite files
CREATE POLICY "Allow Updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'burial-documents');

-- Allow users to delete files (optional, but good for cleanup)
CREATE POLICY "Allow Deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'burial-documents');
