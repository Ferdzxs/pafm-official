-- Add coordinates JSONB column to niche_record to store polygon shape data
ALTER TABLE public.niche_record
ADD COLUMN coordinates JSONB;

COMMENT ON COLUMN public.niche_record.coordinates IS 'Stores an array of exact LatLng points [{lat, lng}, ...] defining the niche boundary polygon on the map.';
