-- Run once in Supabase SQL Editor (adds structured QMC-style application data).
-- Reference: https://quezoncity.gov.ph/wp-content/uploads/2024/09/Application-Form-Use-of-QMC-facilities.pdf

ALTER TABLE public.park_reservation_record
  ADD COLUMN IF NOT EXISTS application_form_payload jsonb;

COMMENT ON COLUMN public.park_reservation_record.application_form_payload IS
  'Citizen-submitted park application fields (aligned with QC QMC facilities form).';
