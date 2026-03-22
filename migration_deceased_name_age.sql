-- ============================================================
-- Migration: Split deceased name + add age_at_death
-- Table: public.deceased
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.deceased
    ADD COLUMN IF NOT EXISTS last_name  TEXT;

ALTER TABLE public.deceased
    ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE public.deceased
    ADD COLUMN IF NOT EXISTS middle_name TEXT;

ALTER TABLE public.deceased
    ADD COLUMN IF NOT EXISTS age_at_death INTEGER;
