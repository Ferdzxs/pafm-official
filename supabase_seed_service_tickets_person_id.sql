-- ══════════════════════════════════════════════════════════════════════
-- BPM — Seed: service_tickets person_id + FK to person
-- Run this in Supabase SQL Editor to add person_id and seed/update rows.
-- Requires: service_tickets and person tables exist.
-- ══════════════════════════════════════════════════════════════════════

-- 1. Add person_id column if missing
ALTER TABLE service_tickets
ADD COLUMN IF NOT EXISTS person_id TEXT;

-- 1.5 Action tracking and completion proof columns (for who did what + proof photo)
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS assigned_by TEXT;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS resolved_by TEXT;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS validated_by TEXT;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS completion_proof_url TEXT;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS completion_proof_uploaded_by TEXT;
ALTER TABLE service_tickets ADD COLUMN IF NOT EXISTS completion_proof_uploaded_at TIMESTAMPTZ;

-- 2. Upsert service_tickets seed rows (insert or update by ticket_id)
INSERT INTO service_tickets (
  ticket_id, ticket_type, requester_name, requester_contact, description, location,
  priority, status, assigned_to, assigned_at, resolved_at, resolution_note, person_id, created_at
) VALUES
  ('ST-2024-100','water_connection','Luisa M. Hernandez','09171111100','Requesting new water connection for residential unit.','Blk 4 Lot 12, Brgy. Tandang Sora, QC','medium','open',NULL,NULL,NULL,NULL,'PER-012',NOW()-INTERVAL '1 day'),
  ('ST-2024-099','leak_report','Ricardo C. Castillo','09182222100','Major pipe burst near main road causing flooding.','Quirino Highway, Brgy. Fairview, QC','critical','in_progress','Engr. Cruz B. Dagatan',NOW()-INTERVAL '12 hours',NULL,NULL,'PER-013',NOW()-INTERVAL '14 hours'),
  ('ST-2024-098','drainage','Norma P. Dela Vega','09193333100','Drainage clogged causing water backup along access road.','Batasan Road, Brgy. Batasan Hills, QC','high','assigned','Team B',NOW()-INTERVAL '6 hours',NULL,NULL,'PER-014',NOW()-INTERVAL '18 hours'),
  ('ST-2024-097','general','Eduardo R. Marquez','09104444100','Inquiry about water bill discrepancy in October statement.','CGSD District Office, Elliptical Rd, QC','low','open',NULL,NULL,NULL,NULL,NULL,NOW()-INTERVAL '32 hours'),
  ('ST-2024-096','leak_report','Christina D. Moran','09115555100','Underground pipe leak detected causing sinkholes.','Brgy. Commonwealth, QC','high','assigned','Engr. Cruz B. Dagatan',NOW()-INTERVAL '48 hours',NULL,NULL,'PER-004',NOW()-INTERVAL '3 days'),
  ('ST-2024-095','water_connection','Manuel M. Soriano','09126666100','Water connection for new commercial establishment.','Congressional Ave., Brgy. Bahay Toro, QC','medium','resolved','Engr. Cruz B. Dagatan',NOW()-INTERVAL '5 days',NOW()-INTERVAL '2 days','New connection installed and tested successfully.',NULL,NOW()-INTERVAL '6 days'),
  ('ST-2024-094','drainage','Rosa A. Garcia','09137777100','Drainage overflow during heavy rain affecting 3 households.','Sampaguita St., Brgy. Bagong Silang, QC','high','in_progress','Team C',NOW()-INTERVAL '7 days',NULL,NULL,'PER-008',NOW()-INTERVAL '7 days'),
  ('ST-2024-093','water_connection','Aurelio B. Pascual','09148888100','Request for water meter replacement — inaccurate reading.','Brgy. Payatas, QC','medium','resolved','Team A',NOW()-INTERVAL '10 days',NOW()-INTERVAL '8 days','Meter replaced and calibrated.',NULL,NOW()-INTERVAL '11 days'),
  ('ST-2024-092','leak_report','Teresita O. Lim','09159999100','Water pressure extremely low — 5 consecutive days.','Brgy. Gulod, Novaliches, QC','medium','closed','Engr. Cruz B. Dagatan',NOW()-INTERVAL '20 days',NOW()-INTERVAL '18 days','Main valve adjusted; pressure restored.','PER-008',NOW()-INTERVAL '22 days'),
  ('ST-2024-091','general','Rodrigo C. Beltran','09160000100','Request for drainage map for subdivision permit application.','QC Permit Office, City Hall, QC','low','closed','Admin Desk',NOW()-INTERVAL '25 days',NOW()-INTERVAL '24 days','Documents emailed to client.',NULL,NOW()-INTERVAL '26 days'),
  ('ST-2024-090','drainage','Gina M. Soriano','09171000101','Storm drain overflowing with solid waste near elementary school.','Brgy. Bagbag, Novaliches, QC','critical','open',NULL,NULL,NULL,NULL,'PER-009',NOW()-INTERVAL '4 hours'),
  ('ST-2024-089','water_connection','Arturo D. Navarro','09182000102','Water service disconnected without notice — urgent restoration.','Brgy. Holy Spirit, QC','critical','assigned','Engr. Cruz B. Dagatan',NOW()-INTERVAL '2 hours',NULL,NULL,NULL,NOW()-INTERVAL '3 hours'),
  ('ST-2024-088','leak_report','Amelita C. Santos','09193000103','Rusty water running from tap for 3 weeks.','Lot 5 Blk 3, Brgy. Tandang Sora, QC','medium','in_progress','Team B',NOW()-INTERVAL '8 days',NULL,NULL,NULL,NOW()-INTERVAL '10 days'),
  ('ST-2024-087','general','Benjamin P. Cruz','09104000104','Request to install public water faucet in relocation site.','Relocation Area, Brgy. Bagong Silang, QC','low','open',NULL,NULL,NULL,NULL,NULL,NOW()-INTERVAL '2 days')
ON CONFLICT (ticket_id) DO UPDATE SET
  ticket_type       = EXCLUDED.ticket_type,
  requester_name    = EXCLUDED.requester_name,
  requester_contact = EXCLUDED.requester_contact,
  description       = EXCLUDED.description,
  location          = EXCLUDED.location,
  priority          = EXCLUDED.priority,
  status            = EXCLUDED.status,
  assigned_to       = EXCLUDED.assigned_to,
  assigned_at       = EXCLUDED.assigned_at,
  resolved_at       = EXCLUDED.resolved_at,
  resolution_note   = EXCLUDED.resolution_note,
  person_id         = EXCLUDED.person_id,
  created_at        = EXCLUDED.created_at;

-- 3. Add FK constraint service_tickets.person_id -> person(person_id) if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_service_tickets_person' AND table_name = 'service_tickets'
  ) THEN
    ALTER TABLE service_tickets
    ADD CONSTRAINT fk_service_tickets_person
    FOREIGN KEY (person_id) REFERENCES person(person_id);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. utility_request_document — citizen uploads for utility requests (view/verify by helpdesk/engineering)
DROP TABLE IF EXISTS utility_request_document CASCADE;
CREATE TABLE utility_request_document (
    id              TEXT PRIMARY KEY,
    ticket_id       TEXT NOT NULL REFERENCES service_tickets(ticket_id) ON DELETE CASCADE,
    requirement_key  TEXT NOT NULL,
    file_name       TEXT NOT NULL,
    file_url        TEXT NOT NULL,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
    verified_at     TIMESTAMPTZ,
    verified_by     TEXT
);
ALTER TABLE utility_request_document ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_utility_request_document" ON utility_request_document;
CREATE POLICY "allow_all_utility_request_document" ON utility_request_document FOR ALL USING (true) WITH CHECK (true);
