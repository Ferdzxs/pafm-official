-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This adds the new_condition column to ocular_inspection

ALTER TABLE public.ocular_inspection
ADD COLUMN IF NOT EXISTS new_condition text;

-- To REVERT this change, run:
-- ALTER TABLE public.ocular_inspection DROP COLUMN IF EXISTS new_condition;
