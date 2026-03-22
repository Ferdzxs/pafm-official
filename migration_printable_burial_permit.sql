-- Add cause of death to deceased
ALTER TABLE public.deceased 
ADD COLUMN IF NOT EXISTS cause_of_death TEXT;

-- Add or_number and permit_document_id to online_burial_application
ALTER TABLE public.online_burial_application 
ADD COLUMN IF NOT EXISTS or_number TEXT,
ADD COLUMN IF NOT EXISTS permit_document_id TEXT;
