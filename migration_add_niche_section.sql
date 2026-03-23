-- Add section column to niche_record if it doesn't exist
ALTER TABLE public.niche_record ADD COLUMN IF NOT EXISTS section VARCHAR(10);

-- Backfill section data based on the niche_number prefix (if it follows the 'A-', 'B-' pattern)
UPDATE public.niche_record 
SET section = SUBSTRING(niche_number FROM 1 FOR 1) 
WHERE section IS NULL AND niche_number SIMILAR TO '[A-F]-%';
