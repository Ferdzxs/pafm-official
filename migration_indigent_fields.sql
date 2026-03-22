-- ============================================================
-- Migration: Add indigent burial intake fields
-- Table: public.indigent_assistance_record
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Issuing barangay of the Indigency Certificate
ALTER TABLE public.indigent_assistance_record
    ADD COLUMN IF NOT EXISTS issuing_barangay TEXT;

-- 2. 4Ps / NHTS status
--    Allowed values: '4ps' | 'nhts' | 'barangay_indigent'
ALTER TABLE public.indigent_assistance_record
    ADD COLUMN IF NOT EXISTS four_ps_nhts_status TEXT
    CONSTRAINT ck_four_ps_nhts_status CHECK (
        four_ps_nhts_status IS NULL OR
        four_ps_nhts_status IN ('4ps', 'nhts', 'barangay_indigent')
    );

-- 3. Household monthly income (in PHP)
ALTER TABLE public.indigent_assistance_record
    ADD COLUMN IF NOT EXISTS monthly_income NUMERIC;

-- 4. URL of the uploaded Barangay Indigency Certificate
ALTER TABLE public.indigent_assistance_record
    ADD COLUMN IF NOT EXISTS indigency_cert_url TEXT;

-- ============================================================
-- Verify
-- ============================================================
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'indigent_assistance_record'
ORDER BY ordinal_position;
