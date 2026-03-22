-- ============================================================
-- Migration: Burial requirements document URLs + residency flag
-- Table: public.online_burial_application
-- Run this in the Supabase SQL Editor
-- ============================================================

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS is_resident               BOOLEAN DEFAULT TRUE;

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS doc_death_cert_url        TEXT;

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS doc_medical_cert_url      TEXT;

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS doc_embalming_cert_url    TEXT;

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS doc_valid_id_url          TEXT;

ALTER TABLE public.online_burial_application
    ADD COLUMN IF NOT EXISTS doc_proof_relationship_url TEXT;
