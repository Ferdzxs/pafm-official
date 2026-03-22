-- Run on existing Supabase DBs so park reservations sort by submission time (newest first).
ALTER TABLE public.park_reservation_record
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.park_reservation_record.created_at IS 'When the reservation request was submitted (for citizen list ordering).';
