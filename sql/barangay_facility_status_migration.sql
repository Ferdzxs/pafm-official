-- One-time migration: align legacy barangay_reservation_record.status values with BPMN vocabulary.
-- Run in Supabase SQL Editor after deploying the new app version.
--
-- Mapping:
--   pending     → submitted (citizen request awaiting secretary intake)
--   confirmed   → permit_issued (already approved / scheduled in old model)
--   rejected    → pb_rejected
--   completed   → completed (unchanged if present)

UPDATE public.barangay_reservation_record
SET status = 'submitted'
WHERE status IS NULL OR lower(trim(status)) = 'pending';

UPDATE public.barangay_reservation_record
SET status = 'permit_issued'
WHERE lower(trim(status)) = 'confirmed';

UPDATE public.barangay_reservation_record
SET status = 'pb_rejected'
WHERE lower(trim(status)) = 'rejected';
