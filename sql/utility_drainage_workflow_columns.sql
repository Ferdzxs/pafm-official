-- Optional columns for Path C (drainage) — program of works & materials (TO-BE §5.4).
-- Run in Supabase SQL editor if your project was created before this migration.

ALTER TABLE public.drainage_request
  ADD COLUMN IF NOT EXISTS program_of_works_note text,
  ADD COLUMN IF NOT EXISTS materials_status text DEFAULT 'pending';

COMMENT ON COLUMN public.drainage_request.materials_status IS 'pending | ready | n_a';
