-- Add polygon coordinates column to niche_record table
ALTER TABLE public.niche_record
ADD COLUMN IF NOT EXISTS coordinates JSONB;

-- coordinates will store an array of {lat, lng} objects
-- Example: [{"lat": 14.6979, "lng": 121.0298}, ...]
