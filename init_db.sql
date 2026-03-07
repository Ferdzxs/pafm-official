-- ══════════════════════════════════════════════════════════════════════
-- BPM — Public Assets & Facilities Management
-- SEED FILE (safe to re-run: DROP IF EXISTS)
--
-- TABLES IN THIS FILE (not duplicated in supabase_erd_supplement.sql):
--   1. system_users          — app role accounts
--   2. burial_applications   — citizen burial application requests
--   3. service_tickets       — water/drainage utility tickets
--   4. constituent_records   — QC barangay resident registry
--   5. barangay_ordinances   — barangay legislation records
--   6. barangay_documents    — issued certificates, clearances, etc.
--   7. asset_inventory       — QC city-owned land & building registry
--
-- TABLES REMOVED (use ERD supplement equivalents instead):
--   ✗ cemetery_niches       → niche_record (ERD)
--   ✗ parks                 → park_venue (ERD)
--   ✗ park_reservations     → park_reservation_record (ERD)
--   ✗ barangay_facilities   → barangay_facility (ERD)
--   ✗ barangay_reservations → barangay_reservation_record (ERD)
--   ✗ payment_transactions  → digital_payment (ERD)
--   ✗ notifications         → notification_log (ERD)
-- ══════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Safe drop order ───────────────────────────────────────────────────
DROP TABLE IF EXISTS service_tickets        CASCADE;
DROP TABLE IF EXISTS barangay_documents     CASCADE;
DROP TABLE IF EXISTS barangay_ordinances    CASCADE;
DROP TABLE IF EXISTS constituent_records    CASCADE;
DROP TABLE IF EXISTS burial_applications    CASCADE;
DROP TABLE IF EXISTS asset_inventory        CASCADE;
DROP TABLE IF EXISTS system_users           CASCADE;

-- ══════════════════════════════════════════════════════════════════════
-- 1. SYSTEM USERS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE system_users (
    user_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       TEXT NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    role            TEXT NOT NULL,
    department      TEXT,
    contact_no      TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_su" ON system_users FOR ALL USING (true) WITH CHECK (true);

INSERT INTO system_users (full_name, email, role, department, contact_no) VALUES
('Admin User',             'admin@bpm.qc.gov.ph',      'system_admin',       'CGSD — IT Division',                    '09170000001'),
('Sec. Maribel N. Reyes',  'secretary@bpm.qc.gov.ph',  'barangay_secretary', 'Barangay 33-D Secretariat, QC',         '09170000002'),
('Capt. Rodrigo T. Lim',   'punong@bpm.qc.gov.ph',     'punong_barangay',    'Barangay 33-D Executive, QC',           '09170000003'),
('Tres. Gloria A. Santos',  'treasurer@bpm.qc.gov.ph',  'treasurer',          'CGSD Finance Office, QC',               '09170000004'),
('Jose P. Makabayan',      'cemetery@bpm.qc.gov.ph',   'cemetery_office',    'CGSD Cemetery Division, QC',            '09170000005'),
('Maria L. Welfare',       'ssdd@bpm.qc.gov.ph',       'ssdd',               'SSDD — Quezon City',                    '09170000006'),
('Juan D. Manalac',        'citizen@bpm.qc.gov.ph',    'citizen',            NULL,                                    '09170000007'),
('Engr. Cruz B. Dagatan',  'utility@bpm.qc.gov.ph',    'utility_engineer',   'CGSD Engineering Division, QC',         '09170000008'),
('Parks Admin F. Reyes',   'parks@bpm.qc.gov.ph',      'parks_admin',        'CGSD Parks & Recreation Division, QC',  '09170000009'),
('Desk Officer A. Lim',    'desk@bpm.qc.gov.ph',       'reservation_desk',   'CGSD Reservation Office, QC',           '09170000010'),
('Death Reg. O. Santos',   'deathreg@bpm.qc.gov.ph',   'death_registration', 'Civil Registrar — QC',                  '09170000011'),
('FAMCD Officer R. Cruz',  'famcd@bpm.qc.gov.ph',      'famcd',              'FAMCD — Quezon City Hall',              '09170000012');

-- ══════════════════════════════════════════════════════════════════════
-- 2. BURIAL APPLICATIONS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE burial_applications (
    application_id       TEXT PRIMARY KEY,
    applicant_name       TEXT NOT NULL,
    applicant_contact    TEXT,
    applicant_address    TEXT,
    deceased_name        TEXT NOT NULL,
    deceased_age         INT,
    date_of_death        DATE NOT NULL,
    cause_of_death       TEXT,
    death_certificate_no TEXT,
    relationship         TEXT,
    niche_requested      TEXT,
    status               TEXT DEFAULT 'pending',
    notes                TEXT,
    reviewed_by          TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE burial_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ba" ON burial_applications FOR ALL USING (true) WITH CHECK (true);

INSERT INTO burial_applications VALUES
('BA-2024-050','Pedro R. Bautista','09171111111','Blk 4 Lot 2, Brgy. Bagong Silang, QC','Maria C. Bautista',72,'2024-03-01','Cardiac Arrest','DC-2024-0901','Son','Standard Niche','pending',NULL,NULL,NOW()-INTERVAL '2 days',NOW()-INTERVAL '2 days'),
('BA-2024-049','Jose M. Santos','09182222222','Purok 3, Brgy. Fairview, QC','Lolita B. Santos',68,'2024-02-28','Pneumonia','DC-2024-0899','Husband','Economy Niche','approved',NULL,'Jose P. Makabayan',NOW()-INTERVAL '4 days',NOW()-INTERVAL '3 days'),
('BA-2024-048','Ana G. Reyes','09193333333','Lot 12, Blk 7, Brgy. Novaliches Proper, QC','Ramon S. Reyes',80,'2024-02-26','Old Age','DC-2024-0895','Daughter','Premium Niche','under_review',NULL,NULL,NOW()-INTERVAL '6 days',NOW()-INTERVAL '5 days'),
('BA-2024-047','Carlos P. Flores','09154444444','Brgy. Commonwealth, QC','Gloria M. Flores',65,'2024-02-24','Hypertension','DC-2024-0891','Son','Standard Niche','completed',NULL,'Jose P. Makabayan',NOW()-INTERVAL '8 days',NOW()-INTERVAL '6 days'),
('BA-2024-046','Maria A. Torres','09165555555','Brgy. Batasan Hills, QC','Eduardo R. Torres',74,'2024-02-22','Stroke','DC-2024-0888','Wife','Standard Niche','rejected','Incomplete documents submitted.',NULL,NOW()-INTERVAL '10 days',NOW()-INTERVAL '9 days'),
('BA-2024-045','Roberto C. Gonzalez','09176666666','Brgy. Holy Spirit, QC','Perla L. Gonzalez',70,'2024-02-20','Cancer','DC-2024-0885','Son','Economy Niche','pending',NULL,NULL,NOW()-INTERVAL '12 days',NOW()-INTERVAL '12 days'),
('BA-2024-044','Luisa M. Hernandez','09187777777','Brgy. Tandang Sora, QC','Andres C. Hernandez',88,'2024-02-18','Natural Causes','DC-2024-0880','Daughter','Premium Niche','approved',NULL,'Jose P. Makabayan',NOW()-INTERVAL '14 days',NOW()-INTERVAL '13 days'),
('BA-2024-043','Diego P. Miranda','09198888888','Brgy. Payatas, QC','Rosario F. Miranda',75,'2024-02-15','Heart Failure','DC-2024-0876','Son','Standard Niche','completed',NULL,'Jose P. Makabayan',NOW()-INTERVAL '18 days',NOW()-INTERVAL '16 days'),
('BA-2024-042','Elena R. Castro','09109999999','Brgy. Culiat, QC','Benjamin A. Castro',82,'2024-02-12','COPD','DC-2024-0871','Daughter','Economy Niche','under_review',NULL,NULL,NOW()-INTERVAL '21 days',NOW()-INTERVAL '20 days'),
('BA-2024-041','Fernando B. Ramos','09121010101','Brgy. Pasong Tamo, QC','Consuelo G. Ramos',77,'2024-02-10','Kidney Failure','DC-2024-0868','Son','Standard Niche','approved',NULL,'Jose P. Makabayan',NOW()-INTERVAL '23 days',NOW()-INTERVAL '22 days'),
('BA-2024-040','Grace O. Villanueva','09132020202','Brgy. San Agustin, Novaliches, QC','Manuel P. Villanueva',69,'2024-02-08','Diabetes','DC-2024-0865','Wife','Economy Niche','completed',NULL,'Jose P. Makabayan',NOW()-INTERVAL '25 days',NOW()-INTERVAL '24 days'),
('BA-2024-039','Henry C. Dela Cruz','09143030303','Brgy. Bagbag, Novaliches, QC','Ester M. Dela Cruz',84,'2024-02-05','Alzheimers','DC-2024-0861','Son','Premium Niche','pending',NULL,NULL,NOW()-INTERVAL '28 days',NOW()-INTERVAL '28 days');

-- ══════════════════════════════════════════════════════════════════════
-- 3. SERVICE TICKETS (Water, Drainage, Utility)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE service_tickets (
    ticket_id         TEXT PRIMARY KEY,
    ticket_type       TEXT NOT NULL,
    requester_name    TEXT NOT NULL,
    requester_contact TEXT,
    description       TEXT NOT NULL,
    location          TEXT NOT NULL,
    priority          TEXT DEFAULT 'medium',
    status            TEXT DEFAULT 'open',
    assigned_to       TEXT,
    assigned_at       TIMESTAMPTZ,
    resolved_at       TIMESTAMPTZ,
    resolution_note   TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE service_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_st" ON service_tickets FOR ALL USING (true) WITH CHECK (true);

INSERT INTO service_tickets VALUES
('ST-2024-100','water_connection','Luisa M. Hernandez','09171111100','Requesting new water connection for residential unit.','Blk 4 Lot 12, Brgy. Tandang Sora, QC','medium','open',NULL,NULL,NULL,NULL,NOW()-INTERVAL '1 day'),
('ST-2024-099','leak_report','Ricardo C. Castillo','09182222100','Major pipe burst near main road causing flooding.','Quirino Highway, Brgy. Fairview, QC','critical','in_progress','Engr. Cruz B. Dagatan',NOW()-INTERVAL '12 hours',NULL,NULL,NOW()-INTERVAL '14 hours'),
('ST-2024-098','drainage','Norma P. Dela Vega','09193333100','Drainage clogged causing water backup along access road.','Batasan Road, Brgy. Batasan Hills, QC','high','assigned','Team B',NOW()-INTERVAL '6 hours',NULL,NULL,NOW()-INTERVAL '18 hours'),
('ST-2024-097','general','Eduardo R. Marquez','09104444100','Inquiry about water bill discrepancy in October statement.','CGSD District Office, Elliptical Rd, QC','low','open',NULL,NULL,NULL,NULL,NOW()-INTERVAL '32 hours'),
('ST-2024-096','leak_report','Christina D. Moran','09115555100','Underground pipe leak detected causing sinkholes.','Brgy. Commonwealth, QC','high','assigned','Engr. Cruz B. Dagatan',NOW()-INTERVAL '48 hours',NULL,NULL,NOW()-INTERVAL '3 days'),
('ST-2024-095','water_connection','Manuel M. Soriano','09126666100','Water connection for new commercial establishment.','Congressional Ave., Brgy. Bahay Toro, QC','medium','resolved','Engr. Cruz B. Dagatan',NOW()-INTERVAL '5 days',NOW()-INTERVAL '2 days','New connection installed and tested successfully.',NOW()-INTERVAL '6 days'),
('ST-2024-094','drainage','Rosa A. Garcia','09137777100','Drainage overflow during heavy rain affecting 3 households.','Sampaguita St., Brgy. Bagong Silang, QC','high','in_progress','Team C',NOW()-INTERVAL '7 days',NULL,NULL,NOW()-INTERVAL '7 days'),
('ST-2024-093','water_connection','Aurelio B. Pascual','09148888100','Request for water meter replacement — inaccurate reading.','Brgy. Payatas, QC','medium','resolved','Team A',NOW()-INTERVAL '10 days',NOW()-INTERVAL '8 days','Meter replaced and calibrated.',NOW()-INTERVAL '11 days'),
('ST-2024-092','leak_report','Teresita O. Lim','09159999100','Water pressure extremely low — 5 consecutive days.','Brgy. Gulod, Novaliches, QC','medium','closed','Engr. Cruz B. Dagatan',NOW()-INTERVAL '20 days',NOW()-INTERVAL '18 days','Main valve adjusted; pressure restored.',NOW()-INTERVAL '22 days'),
('ST-2024-091','general','Rodrigo C. Beltran','09160000100','Request for drainage map for subdivision permit application.','QC Permit Office, City Hall, QC','low','closed','Admin Desk',NOW()-INTERVAL '25 days',NOW()-INTERVAL '24 days','Documents emailed to client.',NOW()-INTERVAL '26 days'),
('ST-2024-090','drainage','Gina M. Soriano','09171000101','Storm drain overflowing with solid waste near elementary school.','Brgy. Bagbag, Novaliches, QC','critical','open',NULL,NULL,NULL,NULL,NOW()-INTERVAL '4 hours'),
('ST-2024-089','water_connection','Arturo D. Navarro','09182000102','Water service disconnected without notice — urgent restoration.','Brgy. Holy Spirit, QC','critical','assigned','Engr. Cruz B. Dagatan',NOW()-INTERVAL '2 hours',NULL,NULL,NOW()-INTERVAL '3 hours'),
('ST-2024-088','leak_report','Amelita C. Santos','09193000103','Rusty water running from tap for 3 weeks.','Lot 5 Blk 3, Brgy. Tandang Sora, QC','medium','in_progress','Team B',NOW()-INTERVAL '8 days',NULL,NULL,NOW()-INTERVAL '10 days'),
('ST-2024-087','general','Benjamin P. Cruz','09104000104','Request to install public water faucet in relocation site.','Relocation Area, Brgy. Bagong Silang, QC','low','open',NULL,NULL,NULL,NULL,NOW()-INTERVAL '2 days');

-- ══════════════════════════════════════════════════════════════════════
-- 4. CONSTITUENT RECORDS (QC Barangay Residents)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE constituent_records (
    record_id        TEXT PRIMARY KEY,
    full_name        TEXT NOT NULL,
    birthdate        DATE,
    gender           TEXT,
    civil_status     TEXT,
    purok            TEXT,
    address          TEXT,
    contact_no       TEXT,
    registered_voter BOOLEAN DEFAULT FALSE,
    indigent         BOOLEAN DEFAULT FALSE,
    senior_citizen   BOOLEAN DEFAULT FALSE,
    pwd              BOOLEAN DEFAULT FALSE,
    solo_parent      BOOLEAN DEFAULT FALSE,
    tags             TEXT[],
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE constituent_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_cr" ON constituent_records FOR ALL USING (true) WITH CHECK (true);

INSERT INTO constituent_records VALUES
('CR-001','Juan S. Dela Cruz','1980-05-15','Male','Married','Purok 1','Blk 4 Lot 2, Brgy. Bagong Silang, QC','09171234567',TRUE,FALSE,FALSE,FALSE,FALSE,ARRAY['NHTS'],NOW()),
('CR-002','Maria I. Reyes','1990-08-22','Female','Single','Purok 2','Blk 7 Lot 5, Brgy. Fairview, QC','09281234567',TRUE,TRUE,FALSE,FALSE,TRUE,ARRAY['4Ps','Indigent'],NOW()),
('CR-003','Pedro S. Bautista','1955-12-01','Male','Married','Purok 1','Brgy. Novaliches Proper, QC','09501234567',TRUE,FALSE,TRUE,FALSE,FALSE,ARRAY['Senior','OSY'],NOW()),
('CR-004','Lolita T. Gonzalez','1985-03-18','Female','Widowed','Purok 3','Brgy. Commonwealth, QC','09181234567',FALSE,TRUE,FALSE,FALSE,FALSE,ARRAY['Indigent'],NOW()),
('CR-005','Roberto A. Flores','1948-11-30','Male','Married','Purok 2','Brgy. Batasan Hills, QC','09271234567',TRUE,FALSE,TRUE,FALSE,FALSE,ARRAY['Senior'],NOW()),
('CR-006','Ana C. Villanueva','1995-07-04','Female','Single','Purok 4','Brgy. Holy Spirit, QC','09361234567',TRUE,FALSE,FALSE,FALSE,FALSE,ARRAY[]::TEXT[],NOW()),
('CR-007','Eduardo M. Ramos','1975-09-12','Male','Married','Purok 3','Brgy. Culiat, QC','09451234567',TRUE,FALSE,FALSE,TRUE,FALSE,ARRAY['PWD'],NOW()),
('CR-008','Rosa D. Castillo','1945-01-25','Female','Widowed','Purok 1','Brgy. Tandang Sora, QC','09561234567',FALSE,TRUE,TRUE,FALSE,FALSE,ARRAY['Indigent','Senior'],NOW()),
('CR-009','Fernando J. Morales','2000-04-14','Male','Single','Purok 2','Brgy. Payatas, QC','09671234567',FALSE,FALSE,FALSE,FALSE,FALSE,ARRAY['OSY'],NOW()),
('CR-010','Gloria E. Tan','1960-06-30','Female','Married','Purok 1','Brgy. Pasong Tamo, QC','09781234567',TRUE,FALSE,TRUE,FALSE,FALSE,ARRAY['Senior'],NOW()),
('CR-011','Arturo D. Cruz','1970-02-19','Male','Married','Purok 4','Brgy. San Agustin, Novaliches, QC','09891234567',TRUE,FALSE,FALSE,FALSE,FALSE,ARRAY[]::TEXT[],NOW()),
('CR-012','Marites O. Reyes','1988-10-05','Female','Married','Purok 3','Brgy. Bagbag, Novaliches, QC','09901234567',TRUE,TRUE,FALSE,TRUE,FALSE,ARRAY['Indigent','PWD'],NOW()),
('CR-013','Noel B. Santos','1965-07-22','Male','Married','Purok 2','Brgy. San Bartolome, Novaliches, QC','09011234567',TRUE,FALSE,FALSE,FALSE,FALSE,ARRAY['NHTS'],NOW()),
('CR-014','Ligaya P. Flores','1950-11-11','Female','Widowed','Purok 3','Brgy. Kaligayahan, Novaliches, QC','09121234567',TRUE,FALSE,TRUE,FALSE,FALSE,ARRAY['Senior','4Ps'],NOW()),
('CR-015','Dennis M. Dela Paz','1992-03-27','Male','Single','Purok 4','Brgy. Gulod, Novaliches, QC','09231234567',FALSE,FALSE,FALSE,FALSE,FALSE,ARRAY[]::TEXT[],NOW()),
('CR-016','Elena C. Buenaventura','1982-08-08','Female','Married','Purok 1','Brgy. Sauyo, Novaliches, QC','09341234567',TRUE,FALSE,FALSE,FALSE,TRUE,ARRAY['Solo Parent'],NOW()),
('CR-017','Crisanto M. Vergara','1940-12-25','Male','Widowed','Purok 2','Brgy. Paltok, QC','09451234560',TRUE,TRUE,TRUE,FALSE,FALSE,ARRAY['Indigent','Senior','NHTS'],NOW()),
('CR-018','Patricia D. Lim','1978-05-05','Female','Married','Purok 3','Brgy. Manresa, QC','09561234560',TRUE,FALSE,FALSE,FALSE,FALSE,ARRAY[]::TEXT[],NOW()),
('CR-019','Romulo A. Navarro','2002-09-09','Male','Single','Purok 4','Brgy. Talayan, QC','09671234560',FALSE,FALSE,FALSE,FALSE,FALSE,ARRAY['OSY'],NOW()),
('CR-020','Juanita P. Mendoza','1956-04-14','Female','Married','Purok 1','Brgy. Matandang Balara, QC','09781234560',TRUE,FALSE,TRUE,FALSE,FALSE,ARRAY['Senior'],NOW());

-- ══════════════════════════════════════════════════════════════════════
-- 5. BARANGAY ORDINANCES
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE barangay_ordinances (
    ordinance_id   TEXT PRIMARY KEY,
    ordinance_no   TEXT UNIQUE NOT NULL,
    title          TEXT NOT NULL,
    description    TEXT,
    category       TEXT,
    date_enacted   DATE,
    date_effective DATE,
    status         TEXT DEFAULT 'active',
    enacted_by     TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE barangay_ordinances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ord" ON barangay_ordinances FOR ALL USING (true) WITH CHECK (true);

INSERT INTO barangay_ordinances VALUES
('ORD-001','Ord. No. 34 s.2024','Anti-Noise Pollution Ordinance','Regulates noise levels in residential and commercial areas of the barangay from 10PM to 6AM, with penalties for non-compliance.','Public Order','2024-01-15','2024-01-22','active','Capt. Rodrigo T. Lim',NOW()),
('ORD-002','Ord. No. 33 s.2023','Solid Waste Segregation Ordinance','Mandates waste segregation at source for all households and establishments in accordance with RA 9003 and QC ordinance standards.','Environment','2023-09-01','2023-09-15','active','Capt. Rodrigo T. Lim',NOW()),
('ORD-003','Ord. No. 32 s.2023','Senior Citizens Welfare Ordinance Amendment','Amendment expanding monthly cash assistance and medicine subsidy for senior citizens registered in the barangay.','Social Welfare','2023-07-20','2023-08-01','amended','Capt. Rodrigo T. Lim',NOW()),
('ORD-004','Ord. No. 31 s.2023','Youth Sports Development Fund Ordinance','Allocates 5% of barangay quarterly budget to youth sports programs, equipment procurement, and inter-barangay competitions.','Youth & Sports','2023-05-10','2023-06-01','active','Capt. Rodrigo T. Lim',NOW()),
('ORD-005','Ord. No. 30 s.2023','Anti-Littering and Clean Sidewalk Ordinance','Prohibits littering and sidewalk obstruction. Fines range from ₱500 to ₱2,000 per violation following QC anti-littering standards.','Environment','2023-03-14','2023-04-01','active','Capt. Rodrigo T. Lim',NOW()),
('ORD-006','Ord. No. 29 s.2022','Barangay Health Emergency Response Ordinance','Establishes community health emergency team and protocols consistent with DOH and QC Health Department guidelines.','Health','2022-11-20','2022-12-01','active','Capt. Rodrigo T. Lim',NOW()),
('ORD-007','Ord. No. 28 s.2022','Senior Citizens Benefits Ordinance','Monthly cash assistance and medicine subsidies for OSCA-registered senior citizens per QC SP Resolution 2022-06.','Social Welfare','2022-08-05','2022-09-01','amended','Capt. Rodrigo T. Lim',NOW()),
('ORD-008','Ord. No. 27 s.2022','Curfew Ordinance for Minors','Establishes curfew hours for minors below 18: 10PM to 5AM on school days, aligned with QC Juvenile Curfew Act.','Public Order','2022-05-01','2022-05-15','active','Capt. Jose B. Manalac',NOW()),
('ORD-009','Ord. No. 26 s.2021','Anti-Stray Animals Ordinance','Requires all pet owners to register animals with the barangay and prohibits free-roaming in public areas.','Public Order','2021-12-10','2022-01-01','active','Capt. Jose B. Manalac',NOW()),
('ORD-010','Ord. No. 25 s.2021','Community Vegetable Garden Program','Requires households with available open space to maintain a community vegetable garden for food security per QC urban agriculture thrust.','Environment','2021-07-15','2021-08-01','repealed','Capt. Jose B. Manalac',NOW()),
('ORD-011','Ord. No. 24 s.2020','Disaster Risk Reduction Ordinance','Establishes BDRRMC structure, roles, and evacuation protocols aligned with QC DRRMO standards.','Infrastructure','2020-09-01','2020-10-01','active','Capt. Jose B. Manalac',NOW()),
('ORD-012','Ord. No. 23 s.2020','Barangay Beautification Ordinance','Requires establishments to maintain clean surroundings and plant trees/shrubs in accordance with QC Green Building Code.','Environment','2020-04-10','2020-05-01','active','Capt. Jose B. Manalac',NOW());

-- ══════════════════════════════════════════════════════════════════════
-- 6. BARANGAY DOCUMENTS
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE barangay_documents (
    document_id   TEXT PRIMARY KEY,
    document_no   TEXT UNIQUE,
    document_type TEXT NOT NULL,
    title         TEXT NOT NULL,
    issued_to     TEXT,
    purpose       TEXT,
    status        TEXT DEFAULT 'filed',
    issued_by     TEXT,
    document_date DATE,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE barangay_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_bd" ON barangay_documents FOR ALL USING (true) WITH CHECK (true);

INSERT INTO barangay_documents VALUES
('DOC-001','RES-001-2024','resolution','Resolution Endorsing QC Youth Leadership Program','N/A','For submission to QC City Youth Development Office','filed','Sec. Maribel N. Reyes','2024-03-01',NOW()),
('DOC-002','CERT-0290','clearance','Barangay Clearance','Anna R. Santos','For employment application — CGSD Office, QC','released','Sec. Maribel N. Reyes','2024-03-05',NOW()),
('DOC-003','CERT-0289','clearance','Barangay Clearance','Juan S. Dela Cruz','For NBI Clearance renewal — QC NBI Office','released','Sec. Maribel N. Reyes','2024-03-05',NOW()),
('DOC-004','CERT-0288','certificate','Certificate of Residency','Maria I. Reyes','For enrollment at QC Science High School','released','Sec. Maribel N. Reyes','2024-03-04',NOW()),
('DOC-005','PER-0045','permit','Permit to Renovate — Blk 5 Lot 3','Pedro S. Bautista','Residential renovation — QC Buildings & Structures Division','filed','Sec. Maribel N. Reyes','2024-03-04',NOW()),
('DOC-006','MEMO-019','memo','Memorandum on Prohibited Garbage Burning','All Purok Leaders','DENR compliance directive — QC Environment Protection','filed','Sec. Maribel N. Reyes','2024-03-03',NOW()),
('DOC-007','LTR-008','letter','Letter to DSWD-QC Re: Indigent Assistance Funding','DSWD — Quezon City Field Office','Official funding request for indigent constituents','draft','Sec. Maribel N. Reyes','2024-03-02',NOW()),
('DOC-008','RES-021-2024','resolution','Resolution Approving Community Hall Reservation','N/A','Official record — Barangay Council Minutes','filed','Sec. Maribel N. Reyes','2024-03-05',NOW()),
('DOC-009','CERT-0287','certificate','Certificate of Indigency','Dolores A. Torres','For medical assistance — QC General Hospital','released','Sec. Maribel N. Reyes','2024-02-28',NOW()),
('DOC-010','CERT-0286','certificate','Certificate of Residency','Rodrigo C. Beltran','For QC business permit renewal','released','Sec. Maribel N. Reyes','2024-02-27',NOW()),
('DOC-011','PER-0044','permit','Business Permit Endorsement — Sari-sari Store','Gloria E. Santos','For QC City Treasurer business permit','filed','Sec. Maribel N. Reyes','2024-02-26',NOW()),
('DOC-012','LTR-007','letter','Letter of Recommendation for QC Scholarship','QC Schools Division Office','Academic scholarship endorsement for constituent','released','Sec. Maribel N. Reyes','2024-02-25',NOW()),
('DOC-013','CERT-0285','clearance','Barangay Clearance','Eduardo R. Ramos','For LTO driver license renewal — QC East District','released','Sec. Maribel N. Reyes','2024-02-24',NOW()),
('DOC-014','RES-020-2024','resolution','Resolution Condemning Illegal Dumping Along Creek','N/A','Official barangay position — QC DENR referral','filed','Sec. Maribel N. Reyes','2024-02-22',NOW()),
('DOC-015','CERT-0284','certificate','Senior Citizen Certificate','Ricardo C. Castillo','For OSCA ID application — QC OSCA Office','released','Sec. Maribel N. Reyes','2024-02-20',NOW());

-- ══════════════════════════════════════════════════════════════════════
-- 7. ASSET INVENTORY — QC CITY-OWNED LAND & BUILDINGS
--    (Sourced from Inventory of City-Owned Land and Building, QC 2024)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE asset_inventory (
    asset_id         TEXT PRIMARY KEY,
    asset_name       TEXT NOT NULL,
    asset_type       TEXT,
    category         TEXT,
    serial_no        TEXT,
    acquisition_date DATE,
    acquisition_cost NUMERIC,
    current_value    NUMERIC,
    condition        TEXT DEFAULT 'good',
    location         TEXT,
    assigned_to      TEXT,
    last_maintenance DATE,
    notes            TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ai" ON asset_inventory FOR ALL USING (true) WITH CHECK (true);

INSERT INTO asset_inventory (asset_id, asset_name, asset_type, category, serial_no, acquisition_date, acquisition_cost, current_value, condition, location, assigned_to, last_maintenance, notes) VALUES
-- QC CITY-OWNED LANDS
('LAND-001','Quezon City Hall Complex Lot','land','City-Owned Land','TCT-T-78321','1939-06-16',NULL,NULL,'good','Elliptical Road, Diliman, Quezon City','CGSD — FAMCD',NULL,'97,872 sqm. Main administrative complex of Quezon City Government.'),
('LAND-002','Quezon Memorial Circle Grounds','land','City-Owned Land','TCT-T-112233','1960-08-12',NULL,NULL,'good','Elliptical Road, Diliman, Quezon City','CGSD — Parks & Recreation',NULL,'145,000 sqm. Major landmark park. Administered by CGSD Parks Division.'),
('LAND-003','Amoranto Sports Complex (QC Sports Club) Lot','land','City-Owned Land','TCT-T-98765','1975-04-20',NULL,NULL,'good','A. Roces Avenue, South Triangle, Quezon City','CGSD — Sports Division',NULL,'29,950 sqm. Includes stadium, pools, and multi-sports facilities.'),
('LAND-004','Quezon City General Hospital Lot','land','City-Owned Land','TCT-T-45612','1950-09-01',NULL,NULL,'good','Seminary Road, Brgy. Bago Bantay, Quezon City','QC Health Department',NULL,'18,500 sqm. QCGH campus land. Includes ER, OPD, and admin buildings.'),
('LAND-005','Novaliches District Hospital Lot','land','City-Owned Land','TCT-T-56789','1980-03-15',NULL,NULL,'good','Quirino Highway, Novaliches, Quezon City','QC Health Department',NULL,'8,200 sqm. Northern QC district hospital serving Novaliches area.'),
('LAND-006','QC Public Cemetery No. 1 — Kamuning','land','City-Owned Land','TCT-T-34521','1945-11-20',NULL,NULL,'good','Kamuning Road, Quezon City','CGSD — Cemetery Division',NULL,'28,000 sqm. Operates under CGSD Cemetery Division administration.'),
('LAND-007','Bagbag Public Cemetery Lot','land','City-Owned Land','TCT-T-67890','1980-06-10',NULL,NULL,'good','Brgy. Bagbag, Novaliches, Quezon City','CGSD — Cemetery Division',NULL,'45,000 sqm. Bagbag public cemetery serving Novaliches District.'),
('LAND-008','Ninoy Aquino Parks and Wildlife Center','land','City-Owned Land','TCT-T-88123','1970-01-05',NULL,NULL,'good','North Avenue, Diliman, Quezon City','CGSD — Parks & Recreation',NULL,'22,375 sqm. NAPWC managed by CGSD in coordination with DENR.'),
('LAND-009','La Mesa Eco Park — Section A','land','City-Owned Land','TCT-T-90234','1995-07-22',NULL,NULL,'good','Commonwealth Avenue, Batasan Hills, Quezon City','CGSD — Parks & Recreation',NULL,'33,200 sqm. Eco-tourism and environmental park. Section A of full estate.'),
('LAND-010','CGSD Depot and Compound','land','City-Owned Land','TCT-T-11456','2002-05-18',NULL,NULL,'good','BIR Road, Brgy. Pinyahan, Quezon City','CGSD Engineering Division',NULL,'6,800 sqm. Main CGSD heavy equipment yard and operations depot.'),
('LAND-011','Batasan Complex Legislative Grounds','land','City-Owned Land','TCT-T-22567','1978-10-30',NULL,NULL,'good','Constitution Hills, Batasan Hills, Quezon City','QC Sangguniang Panlungsod',NULL,'52,100 sqm. Houses SP building, judiciary annex, and legislative offices.'),
('LAND-012','Anonas Public Market Lot','land','City-Owned Land','TCT-T-55890','1960-04-14',NULL,NULL,'good','Anonas St., Brgy. Project 3, Quezon City','CGSD — Market Authority',NULL,'5,600 sqm. Anonas public market — Quezon City government-owned.'),
('LAND-013','Fairview Public Market Lot','land','City-Owned Land','TCT-T-66901','1990-09-30',NULL,NULL,'good','Quirino Highway, Fairview, Quezon City','CGSD — Market Authority',NULL,'9,100 sqm. Fairview district public market lot.'),
('LAND-014','Social Services Development Center Lot','land','City-Owned Land','TCT-T-33450','2003-03-21',NULL,NULL,'good','BIR Road, Diliman, Quezon City','SSDD — Quezon City',NULL,'3,200 sqm. SSDD main office and welfare center.'),
('LAND-015','Novaliches Public Cemetery Lot','land','City-Owned Land','TCT-T-77812','1975-01-15',NULL,NULL,'good','Quirino Highway, Novaliches Proper, Quezon City','CGSD — Cemetery Division',NULL,'38,500 sqm. Novaliches public cemetery serving northern QC residents.'),
-- QC CITY-OWNED BUILDINGS
('BLDG-001','Quezon City Hall Main Building','building','City-Owned Building','BLD-REG-1939-001','1939-06-16',NULL,NULL,'good','Elliptical Road, Diliman, Quezon City','CGSD — FAMCD','2023-06-01','24,500 sqm GFA. Main seat of QC city government. Multiple floors with executive and legislative offices.'),
('BLDG-002','Quezon City Hall Annex Building','building','City-Owned Building','BLD-REG-2005-002','2005-11-12',NULL,NULL,'good','Elliptical Road, Diliman, Quezon City','CGSD — FAMCD','2023-06-01','8,200 sqm GFA. Houses additional city government offices and QC Assessment Center.'),
('BLDG-003','Quezon City General Hospital Building','building','City-Owned Building','BLD-REG-1950-003','1950-09-01',NULL,NULL,'fair','Seminary Road, Brgy. Bago Bantay, Quezon City','QC Health Department','2023-09-15','22,000 sqm GFA. East wing renovation completed 2023. ICU refurbishment ongoing.'),
('BLDG-004','Novaliches District Hospital Building','building','City-Owned Building','BLD-REG-1980-004','1980-03-15',NULL,NULL,'good','Quirino Highway, Novaliches, Quezon City','QC Health Department','2022-11-20','6,400 sqm GFA. Serves northern QC residents. Extension building completed 2019.'),
('BLDG-005','Amoranto Sports Complex — Main Arena','building','City-Owned Building','BLD-REG-1978-005','1978-06-12',NULL,NULL,'fair','A. Roces Ave., South Triangle, Quezon City','CGSD — Sports Division','2022-08-01','8,500 sqm GFA. Main arena with spectator stands. Roof structural assessment needed.'),
('BLDG-006','Quezon City Science High School Building','building','City-Owned Building','BLD-REG-2003-006','2003-07-20',NULL,NULL,'good','Misamis St., Brgy. Bago Bantay, Quezon City','QC Schools Division','2023-03-10','5,800 sqm GFA. Main academic building with science laboratories.'),
('BLDG-007','Batasan Complex Legislative Building','building','City-Owned Building','BLD-REG-1978-007','1978-10-30',NULL,NULL,'good','Constitution Hills, Batasan Hills, Quezon City','QC Sangguniang Panlungsod','2022-10-05','18,500 sqm GFA. Houses SP session hall, committee rooms, and judicial offices.'),
('BLDG-008','CGSD Main Office and Warehouse','building','City-Owned Building','BLD-REG-2002-008','2002-05-18',NULL,NULL,'good','BIR Road, Brgy. Pinyahan, Quezon City','CGSD Engineering Division','2023-12-01','1,800 sqm GFA. Main engineering office, storage, and workshop.'),
('BLDG-009','Quezon City Public Library — Main Branch','building','City-Owned Building','BLD-REG-2009-009','2009-04-23',NULL,NULL,'good','Elliptical Rd, Diliman, Quezon City','CGSD — FAMCD','2023-07-15','2,400 sqm GFA. Main public library with digital resource center.'),
('BLDG-010','Kamuning Public Market Building','building','City-Owned Building','BLD-REG-1990-010','1990-06-01',NULL,NULL,'fair','Kamuning Road, Quezon City','CGSD — Market Authority','2022-05-20','4,200 sqm GFA. Active public market. Roof repair needed in Section C.'),
('BLDG-011','Commonwealth Market Building','building','City-Owned Building','BLD-REG-1988-011','1988-09-15',NULL,NULL,'fair','Commonwealth Ave., Quezon City','CGSD — Market Authority','2021-11-10','6,800 sqm GFA. One of the major QC public markets. Structural upgrade pending.'),
('BLDG-012','Social Services Development Center Building','building','City-Owned Building','BLD-REG-2015-012','2015-02-28',NULL,NULL,'good','BIR Road, Diliman, Quezon City','SSDD — Quezon City','2023-10-01','1,500 sqm GFA. SSDD main service center including livelihood and welfare offices.'),
('BLDG-013','FAMCD Asset Management Building','building','City-Owned Building','BLD-REG-2012-013','2012-08-10',NULL,NULL,'excellent','City Hall Complex, Elliptical Rd, Quezon City','CGSD — FAMCD','2024-01-15','980 sqm GFA. Houses FAMCD offices, asset records division, and review board.'),
('BLDG-014','QC Local Government Operations Center','building','City-Owned Building','BLD-REG-2010-014','2010-11-22',NULL,NULL,'good','Elliptical Road, Diliman, Quezon City','CGSD — FAMCD','2023-08-20','3,200 sqm GFA. 24/7 operations center. Disaster monitoring and coordination hub.'),
('BLDG-015','Bagong Silang Multi-Purpose Building','building','City-Owned Building','BLD-REG-2008-015','2008-04-05',NULL,NULL,'good','Bagong Silang, Quezon City','CGSD — Community Division','2022-12-01','2,100 sqm GFA. Multi-purpose community center for Bagong Silang district.');

SELECT 'BPM Seed complete! Tables: 7 | Rows: 100+' AS status;


-- ══════════════════════════════════════════════════════════════════════
-- BPM — TO-BE ERD Supplement (run AFTER supabase_seed.sql)
-- Adds all missing tables from TO-BE ERD.txt with mock seed data
-- ══════════════════════════════════════════════════════════════════════

-- ── Safe drops (reverse FK order) ─────────────────────────────────────
DROP TABLE IF EXISTS submission_record           CASCADE;
DROP TABLE IF EXISTS approval_record             CASCADE;
DROP TABLE IF EXISTS inventory_report            CASCADE;
DROP TABLE IF EXISTS ocular_inspection           CASCADE;
DROP TABLE IF EXISTS inventory_request           CASCADE;
DROP TABLE IF EXISTS property                    CASCADE;
DROP TABLE IF EXISTS drainage_repair_record      CASCADE;
DROP TABLE IF EXISTS program_of_works            CASCADE;
DROP TABLE IF EXISTS drainage_inspection_report  CASCADE;
DROP TABLE IF EXISTS drainage_request            CASCADE;
DROP TABLE IF EXISTS leak_repair_record          CASCADE;
DROP TABLE IF EXISTS excavation_clearance        CASCADE;
DROP TABLE IF EXISTS leak_report                 CASCADE;
DROP TABLE IF EXISTS installation_record         CASCADE;
DROP TABLE IF EXISTS technical_assessment        CASCADE;
DROP TABLE IF EXISTS hcdrd_clearance             CASCADE;
DROP TABLE IF EXISTS water_connection_request    CASCADE;
DROP TABLE IF EXISTS site_usage_log              CASCADE;
DROP TABLE IF EXISTS park_reservation_record     CASCADE;
DROP TABLE IF EXISTS park_venue                  CASCADE;
DROP TABLE IF EXISTS administration_office       CASCADE;
DROP TABLE IF EXISTS barangay_reservation_approval CASCADE;
DROP TABLE IF EXISTS barangay_reservation_record CASCADE;
DROP TABLE IF EXISTS barangay_facility           CASCADE;
DROP TABLE IF EXISTS barangay                    CASCADE;
DROP TABLE IF EXISTS online_burial_application   CASCADE;
DROP TABLE IF EXISTS indigent_assistance_record  CASCADE;
DROP TABLE IF EXISTS funeral_home                CASCADE;
DROP TABLE IF EXISTS burial_record               CASCADE;
DROP TABLE IF EXISTS niche_record                CASCADE;
DROP TABLE IF EXISTS cemetery                    CASCADE;
DROP TABLE IF EXISTS deceased                    CASCADE;
DROP TABLE IF EXISTS notification_log            CASCADE;
DROP TABLE IF EXISTS digital_payment             CASCADE;
DROP TABLE IF EXISTS digital_document            CASCADE;
DROP TABLE IF EXISTS citizen_account             CASCADE;
DROP TABLE IF EXISTS employee                    CASCADE;
DROP TABLE IF EXISTS government_office           CASCADE;
DROP TABLE IF EXISTS person                      CASCADE;

-- ══════════════════════════════════════════════════════════════════════
-- CORE ENTITIES
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE person (
    person_id       TEXT PRIMARY KEY,
    full_name       TEXT NOT NULL,
    address         TEXT,
    contact_number  TEXT,
    valid_id_type   TEXT,
    valid_id_number TEXT,
    account_id      TEXT
);

INSERT INTO person VALUES
('PER-001','Juan Santos Dela Cruz','Blk 4 Lot 2, Purok 1, Brgy 123','09171234567','PhilSys','1234-5678-9012',NULL),
('PER-002','Maria Isabel Reyes','Blk 7 Lot 5, Purok 2, Brgy 123','09281234567','Voter ID','VID-20220001',NULL),
('PER-003','Pedro Santiago Bautista','Corner P. Florentino, Purok 1','09501234567','UMID','UMID-3344556',NULL),
('PER-004','Lolita Torres Gonzalez','Phase 2, Brgy 456','09181234567','PhilSys','1234-9999-0001',NULL),
('PER-005','Roberto Aquino Flores','Sampaguita St., Purok 2','09271234567','Driver License','DL-20210220',NULL),
('PER-006','Ana Clara Villanueva','Purok 4 Sitio A','09361234567','PhilSys','2345-6789-0123',NULL),
('PER-007','Eduardo Marcos Ramos','Unit 3 Lot B, Purok 3','09451234567','PWD ID','PWD-QC-00789',NULL),
('PER-008','Rosa Divina Castillo','Blk 1 Lot 1, Purok 1','09561234567','Senior Citizen ID','SC-QC-012345',NULL),
('PER-009','Fernando Javier Morales','Phase 1 Housing Area','09671234567','PhilSys','3456-7890-1234',NULL),
('PER-010','Gloria Esperanza Tan','Lot 10 Blk 2, Purok 1','09781234567','Senior Citizen ID','SC-QC-023456',NULL),
('PER-011','Diego Miranda','Lot 3 Blk 9, Pasig','09198888888','Voter ID','VID-20230099',NULL),
('PER-012','Luisa Hernandez','Brgy 789 Phase 2','09187777777','PhilSys','4567-8901-2345',NULL),
('PER-013','Ricardo Castillo','QC Ave, Zone 4','09182222100','Driver License','DL-20190115',NULL),
('PER-014','Norma Dela Vega','P. Florentino St.','09193333100','Voter ID','VID-20210055',NULL),
('PER-015','Manuel Soriano','Scout Barrio, QC','09126666100','PhilSys','5678-9012-3456',NULL);

-- ── Government Office ─────────────────────────────────────────────────
CREATE TABLE government_office (
    office_id   TEXT PRIMARY KEY,
    office_name TEXT NOT NULL,
    office_type TEXT,
    location    TEXT
);

INSERT INTO government_office VALUES
('OFF-001','Cemetery Office','Division Office','Barangay Hall, Ground Floor'),
('OFF-002','Social Services Development Department','Department','City Hall, 3rd Floor'),
('OFF-003','Parks & Recreation Administration','Division Office','City Hall Annex'),
('OFF-004','Barangay Secretariat','Barangay Office','Barangay Hall'),
('OFF-005','Utility Engineering Division','Engineering Office','CGSD Building'),
('OFF-006','CGSD Finance','Finance Office','City Hall, 2nd Floor'),
('OFF-007','FAMCD Asset Management','Division Office','City Hall, 4th Floor'),
('OFF-008','Health Office','Division Office','Barangay Health Center'),
('OFF-009','HCDRD Clearance Division','Clearance Office','HCDRD Building'),
('OFF-010','IT Department','Support Office','Admin Building, 2nd Floor');

-- ── Employee ──────────────────────────────────────────────────────────
CREATE TABLE employee (
    employee_id     TEXT PRIMARY KEY,
    office_id       TEXT REFERENCES government_office(office_id),
    full_name       TEXT NOT NULL,
    position_title  TEXT,
    department      TEXT,
    employee_no     TEXT,
    contact_number  TEXT,
    is_active       BOOLEAN DEFAULT TRUE
);

INSERT INTO employee VALUES
('EMP-001','OFF-001','Jose Makabayan','Cemetery Officer','Cemetery Division','EMP-2019-001','09170001001',TRUE),
('EMP-002','OFF-002','Maria Welfare','Social Worker II','Social Services','EMP-2020-002','09170001002',TRUE),
('EMP-003','OFF-003','Parks Admin Reyes','Parks Administrator','Parks & Recreation','EMP-2021-003','09170001003',TRUE),
('EMP-004','OFF-004','Sec. Maribel Reyes','Barangay Secretary','Secretariat','EMP-2018-004','09170001004',TRUE),
('EMP-005','OFF-005','Engr. Cruz Dagatan','Civil Engineer III','Engineering','EMP-2017-005','09170001005',TRUE),
('EMP-006','OFF-006','Tres. Gloria Santos','Treasurer','Finance','EMP-2016-006','09170001006',TRUE),
('EMP-007','OFF-007','Asset Officer Lim','Property Custodian','FAMCD','EMP-2022-007','09170001007',TRUE),
('EMP-008','OFF-004','Capt. Rodrigo Lim','Punong Barangay','Executive','EMP-2019-008','09170001008',TRUE),
('EMP-009','OFF-005','Team Lead Santos','Engineering Technician','Engineering','EMP-2020-009','09170001009',TRUE),
('EMP-010','OFF-009','Clearance Officer Bautista','Records Officer','HCDRD','EMP-2021-010','09170001010',TRUE);

-- ── Citizen Account ───────────────────────────────────────────────────
CREATE TABLE citizen_account (
    account_id          TEXT PRIMARY KEY,
    person_id           TEXT REFERENCES person(person_id),
    email               TEXT UNIQUE NOT NULL,
    password_hash       TEXT,
    verification_status TEXT DEFAULT 'pending',
    registered_date     DATE,
    registry_ref_no     TEXT
);

INSERT INTO citizen_account VALUES
('ACC-001','PER-001','juan.delacruz@email.com','$2b$10$hashed001','verified','2024-01-10','REG-2024-0001'),
('ACC-002','PER-002','maria.reyes@email.com','$2b$10$hashed002','verified','2024-01-15','REG-2024-0002'),
('ACC-003','PER-003','pedro.bautista@email.com','$2b$10$hashed003','verified','2024-01-20','REG-2024-0003'),
('ACC-004','PER-004','lolita.torres@email.com','$2b$10$hashed004','pending','2024-02-01','REG-2024-0004'),
('ACC-005','PER-005','roberto.flores@email.com','$2b$10$hashed005','verified','2024-02-05','REG-2024-0005'),
('ACC-006','PER-011','diego.miranda@email.com','$2b$10$hashed006','verified','2024-02-10','REG-2024-0006'),
('ACC-007','PER-012','luisa.hernandez@email.com','$2b$10$hashed007','verified','2024-02-12','REG-2024-0007'),
('ACC-008','PER-013','ricardo.castillo@email.com','$2b$10$hashed008','pending','2024-02-15','REG-2024-0008'),
('ACC-009','PER-006','ana.villanueva@email.com','$2b$10$hashed009','verified','2024-02-20','REG-2024-0009'),
('ACC-010','PER-009','fernando.morales@email.com','$2b$10$hashed010','suspended','2024-02-22','REG-2024-0010');

-- ── Digital Document ──────────────────────────────────────────────────
CREATE TABLE digital_document (
    document_id         TEXT PRIMARY KEY,
    document_type       TEXT NOT NULL,
    reference_no        TEXT UNIQUE,
    date_created        DATE,
    status              TEXT DEFAULT 'active',
    created_by_office   TEXT REFERENCES government_office(office_id),
    received_by_employee TEXT REFERENCES employee(employee_id),
    person_id           TEXT REFERENCES person(person_id),
    file_url            TEXT
);

INSERT INTO digital_document VALUES
('DDOC-001','burial_permit','BP-2024-0049','2024-02-28','active','OFF-001','EMP-001','PER-002','https://storage.bpm.gov/burial/BP-2024-0049.pdf'),
('DDOC-002','burial_permit','BP-2024-0047','2024-02-24','active','OFF-001','EMP-001','PER-003','https://storage.bpm.gov/burial/BP-2024-0047.pdf'),
('DDOC-003','park_permit','PP-2024-0019','2024-03-10','active','OFF-003','EMP-003','PER-001','https://storage.bpm.gov/parks/PP-2024-0019.pdf'),
('DDOC-004','park_permit','PP-2024-0018','2024-03-08','active','OFF-003','EMP-003','PER-006','https://storage.bpm.gov/parks/PP-2024-0018.pdf'),
('DDOC-005','facility_permit','FP-2024-0030','2024-03-20','active','OFF-004','EMP-004','PER-001','https://storage.bpm.gov/facility/FP-2024-0030.pdf'),
('DDOC-006','water_connection_doc','WC-2024-0095','2024-03-02','active','OFF-005','EMP-005','PER-015','https://storage.bpm.gov/water/WC-2024-0095.pdf'),
('DDOC-007','excavation_clearance','EC-2024-0088','2024-03-04','active','OFF-009','EMP-010','PER-013','https://storage.bpm.gov/clearance/EC-2024-0088.pdf'),
('DDOC-008','clearance','HC-2024-0096','2024-02-29','active','OFF-009','EMP-010','PER-012','https://storage.bpm.gov/clearance/HC-2024-0096.pdf'),
('DDOC-009','barangay_clearance','BC-2024-0290','2024-03-05','active','OFF-004','EMP-004','PER-002','https://storage.bpm.gov/brgy/BC-2024-0290.pdf'),
('DDOC-010','certificate_of_indigency','CI-2024-0001','2024-02-28','active','OFF-004','EMP-004','PER-004','https://storage.bpm.gov/brgy/CI-2024-0001.pdf');

-- ── Digital Payment ───────────────────────────────────────────────────
CREATE TABLE digital_payment (
    payment_id      TEXT PRIMARY KEY,
    document_id     TEXT REFERENCES digital_document(document_id),
    amount_paid     NUMERIC NOT NULL,
    payment_date    DATE,
    payment_method  TEXT,
    transaction_ref_no TEXT,
    digital_or_no   TEXT,
    payment_status  TEXT DEFAULT 'pending'
);

INSERT INTO digital_payment VALUES
('PAY-001','DDOC-001',2500,'2024-02-28','gcash','TXN-2024-550','OR-2024-1001','settled'),
('PAY-002','DDOC-002',2500,'2024-02-24','maya','TXN-2024-546','OR-2024-1002','settled'),
('PAY-003','DDOC-003',5000,'2024-03-10','gcash','TXN-2024-545','OR-2024-1003','settled'),
('PAY-004','DDOC-004',1500,'2024-03-08','landbank','TXN-2024-542','OR-2024-1004','settled'),
('PAY-005','DDOC-005',2500,'2024-03-20','gcash','TXN-2024-548','OR-2024-1005','settled'),
('PAY-006','DDOC-006',500,'2024-03-02','gcash','TXN-2024-540','OR-2024-1006','settled'),
('PAY-007','DDOC-007',1200,'2024-03-04','maya','TXN-2024-543','OR-2024-1007','settled'),
('PAY-008','DDOC-008',0,'2024-02-29','cash','CASH-2024-001','OR-2024-1008','settled'),
('PAY-009',NULL,2500,'2024-03-01','gcash','TXN-2024-537','OR-2024-1009','pending'),
('PAY-010',NULL,3200,'2024-03-04','credit_card','TXN-2024-547','OR-2024-1010','failed');

-- ── Notification Log ──────────────────────────────────────────────────
CREATE TABLE notification_log (
    notif_id        TEXT PRIMARY KEY,
    account_id      TEXT REFERENCES citizen_account(account_id),
    module_reference TEXT,
    reference_id    TEXT,
    notif_type      TEXT,
    message         TEXT,
    sent_at         TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO notification_log VALUES
('NLOG-001','ACC-001','burial','BA-2024-050','application_received','Your burial application BA-2024-050 has been received and is pending review.',NOW()-INTERVAL '2 days'),
('NLOG-002','ACC-006','burial','BA-2024-049','application_approved','Your burial application BA-2024-049 has been approved.',NOW()-INTERVAL '3 days'),
('NLOG-003','ACC-001','parks','PR-2024-019','reservation_approved','Your park reservation PR-2024-019 has been approved.',NOW()-INTERVAL '8 days'),
('NLOG-004','ACC-009','parks','PR-2024-018','reservation_completed','Your park reservation PR-2024-018 is marked completed.',NOW()-INTERVAL '12 days'),
('NLOG-005','ACC-001','barangay','BR-2024-030','reservation_confirmed','Your facility reservation BR-2024-030 has been confirmed.',NOW()-INTERVAL '3 days'),
('NLOG-006','ACC-007','water','ST-2024-100','ticket_received','Your water connection request ST-2024-100 has been logged.',NOW()-INTERVAL '1 day'),
('NLOG-007','ACC-008','water','ST-2024-099','ticket_critical','Your leak report ST-2024-099 is now in progress — CRITICAL.',NOW()-INTERVAL '14 hours'),
('NLOG-008','ACC-002','burial','BA-2024-048','status_update','Your burial application BA-2024-048 is under review.',NOW()-INTERVAL '5 days'),
('NLOG-009','ACC-005','parks','PR-2024-016','reservation_pending','Your reservation PR-2024-016 (Wedding Reception) is pending approval.',NOW()-INTERVAL '1 day'),
('NLOG-010','ACC-010','barangay','BR-2024-025','reservation_pending','Your facility reservation BR-2024-025 is pending review.',NOW()-INTERVAL '1 day');

-- ══════════════════════════════════════════════════════════════════════
-- MODULE 1 — CEMETERY & BURIAL
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE deceased (
    deceased_id         TEXT PRIMARY KEY,
    full_name           TEXT NOT NULL,
    date_of_death       DATE NOT NULL,
    place_of_death      TEXT,
    death_certificate_no TEXT
);

INSERT INTO deceased VALUES
('DEC-001','Maria Bautista','2024-03-01','Brgy 123 Residence','DC-2024-0901'),
('DEC-002','Lolita Santos','2024-02-28','Ospital ng QC','DC-2024-0899'),
('DEC-003','Ramon Reyes','2024-02-26','St. Luke''s Medical Center','DC-2024-0895'),
('DEC-004','Gloria Flores','2024-02-24','Brgy Health Center','DC-2024-0891'),
('DEC-005','Eduardo Torres','2024-02-22','Home, P. Florentino St.','DC-2024-0888'),
('DEC-006','Perla Gonzalez','2024-02-20','QC General Hospital','DC-2024-0885'),
('DEC-007','Andres Hernandez','2024-02-18','Home, Brgy 789','DC-2024-0880'),
('DEC-008','Rosario Miranda','2024-02-15','Pasig Memorial Hospital','DC-2024-0876'),
('DEC-009','Benjamin Castro','2024-02-12','Dela Paz Clinic','DC-2024-0871'),
('DEC-010','Consuelo Ramos','2024-02-10','Home, Bagong Silang','DC-2024-0868');

CREATE TABLE cemetery (
    cemetery_id     TEXT PRIMARY KEY,
    cemetery_name   TEXT NOT NULL,
    location        TEXT,
    administered_by TEXT REFERENCES government_office(office_id)
);

INSERT INTO cemetery VALUES
('CEM-001','Bagbag Public Cemetery','Brgy. Bagbag, Novaliches, Quezon City','OFF-001'),
('CEM-002','Novaliches Public Cemetery','Quirino Highway, Novaliches Proper, Quezon City','OFF-001');

CREATE TABLE funeral_home (
    funeral_home_id     TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    accreditation_status TEXT DEFAULT 'accredited',
    contact_person      TEXT,
    system_registered   BOOLEAN DEFAULT FALSE
);

INSERT INTO funeral_home (funeral_home_id, name, accreditation_status, contact_person, system_registered) VALUES
('FH-001','Sanctuario Funeral Homes','accredited','Mr. Perez',TRUE),
('FH-002','Angelus Memorial Chapel','accredited','Ms. Soriano',TRUE),
('FH-003','Eternal Grace Mortuary','pending','Mr. Valdez',FALSE),
('FH-004','Manila Memorial Park Services','accredited','Ms. Tan',TRUE),
('FH-005','Camino al Cielo Funerals','accredited','Mr. Cruz',TRUE);

CREATE TABLE niche_record (
    niche_id        TEXT PRIMARY KEY,
    cemetery_id     TEXT REFERENCES cemetery(cemetery_id),
    niche_number    TEXT NOT NULL,
    status          TEXT DEFAULT 'available',
    burial_schedule_date DATE,
    assigned_document TEXT REFERENCES digital_document(document_id)
);

INSERT INTO niche_record VALUES
('NR-001','CEM-001','A-01-001','occupied','2024-03-01','DDOC-001'),
('NR-002','CEM-001','A-01-002','occupied','2024-02-28','DDOC-002'),
('NR-003','CEM-001','A-01-003','available',NULL,NULL),
('NR-004','CEM-001','A-01-004','reserved','2024-03-10',NULL),
('NR-005','CEM-001','A-02-001','available',NULL,NULL),
('NR-006','CEM-001','A-02-002','occupied','2024-02-24',NULL),
('NR-007','CEM-001','B-01-001','available',NULL,NULL),
('NR-008','CEM-001','B-01-002','occupied','2024-02-22',NULL),
('NR-009','CEM-002','A-01-001','occupied','2024-02-15',NULL),
('NR-010','CEM-002','A-01-002','available',NULL,NULL),
('NR-011','CEM-002','A-01-003','maintenance',NULL,NULL),
('NR-012','CEM-002','B-01-001','occupied','2024-02-10',NULL),
('NR-013','CEM-002','B-01-002','available',NULL,NULL),
('NR-014','CEM-002','B-02-001','reserved','2024-04-01',NULL),
('NR-015','CEM-002','B-02-002','available',NULL,NULL);

CREATE TABLE indigent_assistance_record (
    assistance_id               TEXT PRIMARY KEY,
    deceased_id                 TEXT REFERENCES deceased(deceased_id),
    issued_by_office            TEXT REFERENCES government_office(office_id),
    digital_cert_of_guarantee_url TEXT,
    social_worker_employee_id   TEXT REFERENCES employee(employee_id),
    social_worker_eval_date     DATE,
    status                      TEXT DEFAULT 'pending'
);

INSERT INTO indigent_assistance_record VALUES
('IAR-001','DEC-001','OFF-002','https://storage.bpm.gov/indigent/IAR-001.pdf','EMP-002','2024-03-02','approved'),
('IAR-002','DEC-005','OFF-002','https://storage.bpm.gov/indigent/IAR-002.pdf','EMP-002','2024-02-23','approved'),
('IAR-003','DEC-009','OFF-002',NULL,'EMP-002','2024-02-13','pending'),
('IAR-004','DEC-006','OFF-002',NULL,NULL,NULL,'not_applicable'),
('IAR-005','DEC-010','OFF-002','https://storage.bpm.gov/indigent/IAR-005.pdf','EMP-002','2024-02-11','approved');

CREATE TABLE burial_record (
    burial_id               TEXT PRIMARY KEY,
    deceased_id             TEXT REFERENCES deceased(deceased_id),
    cemetery_id             TEXT REFERENCES cemetery(cemetery_id),
    niche_id                TEXT REFERENCES niche_record(niche_id),
    burial_date             DATE,
    burial_permit_doc       TEXT REFERENCES digital_document(document_id),
    funeral_home_id         TEXT REFERENCES funeral_home(funeral_home_id),
    indigent_assistance_id  TEXT REFERENCES indigent_assistance_record(assistance_id),
    payment_id              TEXT REFERENCES digital_payment(payment_id)
);

INSERT INTO burial_record VALUES
('BUR-001','DEC-001','CEM-001','NR-001','2024-03-02','DDOC-001','FH-001','IAR-001','PAY-001'),
('BUR-002','DEC-002','CEM-001','NR-002','2024-03-01','DDOC-002','FH-002',NULL,'PAY-002'),
('BUR-003','DEC-004','CEM-001','NR-006','2024-02-25',NULL,'FH-004',NULL,NULL),
('BUR-004','DEC-005','CEM-002','NR-009','2024-02-23',NULL,'FH-001','IAR-002',NULL),
('BUR-005','DEC-010','CEM-002','NR-012','2024-02-12',NULL,'FH-005','IAR-005',NULL);

CREATE TABLE online_burial_application (
    application_id              TEXT PRIMARY KEY,
    person_id                   TEXT REFERENCES person(person_id),
    deceased_id                 TEXT REFERENCES deceased(deceased_id),
    submission_date             DATE,
    document_validation_status  TEXT DEFAULT 'pending',
    application_status          TEXT DEFAULT 'pending',
    payment_id                  TEXT REFERENCES digital_payment(payment_id),
    received_by_employee        TEXT REFERENCES employee(employee_id),
    approved_by_employee        TEXT REFERENCES employee(employee_id)
);

INSERT INTO online_burial_application VALUES
('OBA-001','PER-001','DEC-001','2024-03-01','validated','approved','PAY-001','EMP-001','EMP-001'),
('OBA-002','PER-002','DEC-002','2024-02-28','validated','approved','PAY-002','EMP-001','EMP-001'),
('OBA-003','PER-003','DEC-003','2024-02-26','pending','under_review',NULL,'EMP-001',NULL),
('OBA-004','PER-004','DEC-004','2024-02-24','validated','completed',NULL,'EMP-001','EMP-001'),
('OBA-005','PER-005','DEC-005','2024-02-22','rejected','rejected',NULL,'EMP-001',NULL),
('OBA-006','PER-006','DEC-006','2024-02-20','pending','pending',NULL,NULL,NULL),
('OBA-007','PER-007','DEC-007','2024-02-18','validated','approved',NULL,'EMP-001','EMP-001'),
('OBA-008','PER-011','DEC-008','2024-02-15','validated','completed',NULL,'EMP-001','EMP-001'),
('OBA-009','PER-009','DEC-009','2024-02-12','pending','under_review',NULL,'EMP-001',NULL),
('OBA-010','PER-015','DEC-010','2024-02-10','validated','approved',NULL,'EMP-001','EMP-001');

-- ══════════════════════════════════════════════════════════════════════
-- MODULE 2 — PARKS & RECREATION
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE administration_office (
    admin_office_id     TEXT PRIMARY KEY,
    office_name         TEXT NOT NULL,
    parent_department   TEXT,
    location            TEXT
);

INSERT INTO administration_office VALUES
('ADM-001','Parks Administration Office','Parks & Recreation Division','City Hall Annex, Ground Floor'),
('ADM-002','CGSD Parks Unit','CGSD','CGSD Building, Room 201'),
('ADM-003','Barangay Parks Coordinator','Barangay Affairs','Barangay Hall'),
('ADM-004','FAMCD Park Assets','FAMCD','City Hall, 4th Floor');

CREATE TABLE park_venue (
    park_venue_id       TEXT PRIMARY KEY,
    park_venue_name     TEXT NOT NULL,
    location            TEXT,
    venue_type          TEXT,
    admin_office_id     TEXT REFERENCES administration_office(admin_office_id),
    availability_status TEXT DEFAULT 'available'
);

INSERT INTO park_venue VALUES
('PV-001','Quezon Memorial Circle — Main Pavilion','Elliptical Rd, QC','pavilion','ADM-001','available'),
('PV-002','Quezon Memorial Circle — Zone B Picnic Area','Elliptical Rd, QC','picnic_area','ADM-001','available'),
('PV-003','NAPWC Open Field','North Ave, QC','open_field','ADM-001','available'),
('PV-004','La Mesa Eco Park — Campsite A','Commonwealth Ave, QC','campsite','ADM-002','available'),
('PV-005','Eastwood City Park — Events Grounds','Eastwood Ave, Libis','events_ground','ADM-001','available'),
('PV-006','Brgy 123 Mini Park — Basketball Court','P. Florentino St, QC','court','ADM-003','under_maintenance'),
('PV-007','QC Memorial Circle — Jogging Path (Full Loop)','Elliptical Rd, QC','jogging_path','ADM-001','available'),
('PV-008','La Mesa Eco Park — Swimming Pool Area','Commonwealth Ave, QC','swimming_pool','ADM-002','available');

CREATE TABLE park_reservation_record (
    reservation_id          TEXT PRIMARY KEY,
    park_venue_id           TEXT REFERENCES park_venue(park_venue_id),
    applicant_person_id     TEXT REFERENCES person(person_id),
    letter_of_intent_doc    TEXT REFERENCES digital_document(document_id),
    application_form_doc    TEXT REFERENCES digital_document(document_id),
    reservation_date        DATE NOT NULL,
    time_slot               TEXT,
    status                  TEXT DEFAULT 'pending',
    processed_by_admin      TEXT REFERENCES administration_office(admin_office_id),
    received_by_employee    TEXT REFERENCES employee(employee_id),
    approved_by_employee    TEXT REFERENCES employee(employee_id),
    payment_id              TEXT REFERENCES digital_payment(payment_id),
    digital_permit_url      TEXT
);

INSERT INTO park_reservation_record VALUES
('PRR-001','PV-002','PER-001',NULL,NULL,'2024-03-15','09:00-17:00','approved','ADM-001','EMP-003','EMP-003','PAY-004','https://storage.bpm.gov/parks/PRR-001-permit.pdf'),
('PRR-002','PV-003','PER-001',NULL,NULL,'2024-03-10','06:00-20:00','approved','ADM-001','EMP-003','EMP-003','PAY-003','https://storage.bpm.gov/parks/PRR-002-permit.pdf'),
('PRR-003','PV-001','PER-006',NULL,NULL,'2024-03-08','14:00-19:00','completed','ADM-001','EMP-003','EMP-003',NULL,'https://storage.bpm.gov/parks/PRR-003-permit.pdf'),
('PRR-004','PV-004','PER-005',NULL,NULL,'2024-03-05','08:00-17:00','approved','ADM-002','EMP-003','EMP-003',NULL,'https://storage.bpm.gov/parks/PRR-004-permit.pdf'),
('PRR-005','PV-005','PER-009',NULL,NULL,'2024-04-20','15:00-22:00','pending','ADM-001','EMP-003',NULL,NULL,NULL),
('PRR-006','PV-007','PER-013',NULL,NULL,'2024-04-14','05:00-09:00','pending','ADM-001','EMP-003',NULL,NULL,NULL),
('PRR-007','PV-006','PER-007',NULL,NULL,'2024-03-22','08:00-16:00','rejected','ADM-003','EMP-003',NULL,NULL,NULL),
('PRR-008','PV-004','PER-015',NULL,NULL,'2024-04-05','16:00-10:00','approved','ADM-002','EMP-003','EMP-003',NULL,'https://storage.bpm.gov/parks/PRR-008-permit.pdf');

CREATE TABLE site_usage_log (
    usage_id            TEXT PRIMARY KEY,
    reservation_id      TEXT REFERENCES park_reservation_record(reservation_id),
    permit_document     TEXT REFERENCES digital_document(document_id),
    monitored_by_office TEXT REFERENCES administration_office(admin_office_id),
    remarks             TEXT,
    event_conducted_flag BOOLEAN DEFAULT FALSE
);

INSERT INTO site_usage_log VALUES
('SUL-001','PRR-001','DDOC-003','ADM-001','Event conducted as planned. No violations noted.',TRUE),
('SUL-002','PRR-002','DDOC-004','ADM-001','Tournament completed successfully. Court returned in good condition.',TRUE),
('SUL-003','PRR-003',NULL,'ADM-001','Birthday celebration completed. Minor garbage left behind — cleaned up.',TRUE),
('SUL-004','PRR-004',NULL,'ADM-002','Team building event conducted. Full campsite used.',TRUE),
('SUL-005','PRR-007',NULL,'ADM-003','Reservation rejected — venue under maintenance. Applicant notified.',FALSE);

-- ══════════════════════════════════════════════════════════════════════
-- MODULE 3 — BARANGAY FACILITY RESERVATION
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE barangay (
    barangay_id     TEXT PRIMARY KEY,
    barangay_name   TEXT NOT NULL,
    office_id       TEXT REFERENCES government_office(office_id)
);

INSERT INTO barangay VALUES
('BRY-001','Barangay 123','OFF-004'),
('BRY-002','Barangay 456','OFF-004'),
('BRY-003','Barangay Holy Spirit','OFF-004'),
('BRY-004','Barangay Bagong Silang','OFF-004'),
('BRY-005','Barangay Tandang Sora','OFF-004');

CREATE TABLE barangay_facility (
    barangay_facility_id TEXT PRIMARY KEY,
    barangay_id         TEXT REFERENCES barangay(barangay_id),
    facility_name       TEXT NOT NULL,
    facility_type       TEXT,
    rental_rate         NUMERIC DEFAULT 0,
    ordinance_reference TEXT,
    availability_status TEXT DEFAULT 'available'
);

INSERT INTO barangay_facility VALUES
('BF-001','BRY-001','Multi-Purpose Hall','hall',500,'Ord. No. 34 s.2024','available'),
('BF-002','BRY-001','Basketball Court','court',0,'Ord. No. 30 s.2023','available'),
('BF-003','BRY-001','Function Room','room',300,'Ord. No. 34 s.2024','available'),
('BF-004','BRY-001','Livelihood Training Center','multipurpose',200,'Ord. No. 31 s.2023','available'),
('BF-005','BRY-001','Senior Citizens Hall','hall',0,'Ord. No. 32 s.2023','available'),
('BF-006','BRY-002','Community Hall','hall',400,'Ord. No. 34 s.2024','available'),
('BF-007','BRY-003','Covered Court','court',0,NULL,'available'),
('BF-008','BRY-004','Multi-Purpose Hall','hall',500,'Ord. No. 34 s.2024','available');

CREATE TABLE barangay_reservation_record (
    reservation_id          TEXT PRIMARY KEY,
    barangay_facility_id    TEXT REFERENCES barangay_facility(barangay_facility_id),
    applicant_person_id     TEXT REFERENCES person(person_id),
    request_slip_doc        TEXT REFERENCES digital_document(document_id),
    reservation_date        DATE NOT NULL,
    time_slot               TEXT,
    status                  TEXT DEFAULT 'pending',
    approved_by_office      TEXT REFERENCES government_office(office_id),
    received_by_employee    TEXT REFERENCES employee(employee_id),
    payment_id              TEXT REFERENCES digital_payment(payment_id),
    digital_permit_url      TEXT
);

INSERT INTO barangay_reservation_record VALUES
('BRR-001','BF-001','PER-001','DDOC-009','2024-03-20','10:00-18:00','confirmed','OFF-004','EMP-004','PAY-005','https://storage.bpm.gov/brgy/BRR-001-permit.pdf'),
('BRR-002','BF-002','PER-003',NULL,'2024-03-18','06:00-22:00','confirmed','OFF-004','EMP-004',NULL,'https://storage.bpm.gov/brgy/BRR-002-permit.pdf'),
('BRR-003','BF-003','PER-006',NULL,'2024-03-15','08:00-17:00','confirmed','OFF-004','EMP-004',NULL,'https://storage.bpm.gov/brgy/BRR-003-permit.pdf'),
('BRR-004','BF-001','PER-002',NULL,'2024-03-12','15:00-21:00','completed','OFF-004','EMP-004',NULL,NULL),
('BRR-005','BF-004','PER-009',NULL,'2024-03-10','08:00-17:00','completed','OFF-004','EMP-004',NULL,NULL),
('BRR-006','BF-001','PER-005',NULL,'2024-04-25','16:00-22:00','pending',NULL,'EMP-004',NULL,NULL),
('BRR-007','BF-003','PER-007',NULL,'2024-04-18','08:00-12:00','pending',NULL,'EMP-004',NULL,NULL),
('BRR-008','BF-002','PER-013',NULL,'2024-04-12','07:00-17:00','confirmed','OFF-004','EMP-004',NULL,'https://storage.bpm.gov/brgy/BRR-008-permit.pdf'),
('BRR-009','BF-004','PER-014',NULL,'2024-03-28','08:00-18:00','rejected',NULL,'EMP-004',NULL,NULL),
('BRR-010','BF-001','PER-010',NULL,'2024-04-21','06:00-12:00','confirmed','OFF-004','EMP-004',NULL,'https://storage.bpm.gov/brgy/BRR-010-permit.pdf');

CREATE TABLE barangay_reservation_approval (
    approval_id         TEXT PRIMARY KEY,
    reservation_id      TEXT REFERENCES barangay_reservation_record(reservation_id),
    approved_by_office  TEXT REFERENCES government_office(office_id),
    approved_by_employee TEXT REFERENCES employee(employee_id),
    approval_date       DATE,
    decision            TEXT,
    remarks             TEXT
);

INSERT INTO barangay_reservation_approval VALUES
('BRA-001','BRR-001','OFF-004','EMP-004','2024-03-17','approved','All documents in order. Reservation confirmed.'),
('BRA-002','BRR-002','OFF-004','EMP-004','2024-03-16','approved','Basketball tournament. No fee required for community events.'),
('BRA-003','BRR-003','OFF-004','EMP-004','2024-03-13','approved','Government-sponsored seminar. Fee waived.'),
('BRA-004','BRR-004','OFF-004','EMP-004','2024-03-11','approved','Private event. Fee paid.'),
('BRA-005','BRR-005','OFF-004','EMP-004','2024-03-09','approved','TESDA-accredited training. Fee waived.'),
('BRA-006','BRR-008','OFF-004','EMP-004','2024-04-10','approved','PNP community event. No fee.'),
('BRA-007','BRR-009','OFF-004','EMP-004','2024-03-26','rejected','Facility unavailable during requested dates.'),
('BRA-008','BRR-010','OFF-004','EMP-004','2024-04-19','approved','Religious gathering. Approved per barangay policy.');

-- ══════════════════════════════════════════════════════════════════════
-- MODULE 4 & 5 — WATER SUPPLY & DRAINAGE
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE water_connection_request (
    water_request_id    TEXT PRIMARY KEY,
    ticket_id           TEXT,
    person_id           TEXT REFERENCES person(person_id),
    application_doc     TEXT REFERENCES digital_document(document_id),
    property_type       TEXT,
    status              TEXT DEFAULT 'pending'
);

INSERT INTO water_connection_request VALUES
('WCR-001','ST-2024-100','PER-012','DDOC-008','residential','pending'),
('WCR-002','ST-2024-095','PER-015','DDOC-006','commercial','completed'),
('WCR-003','ST-2024-090','PER-009',NULL,'residential','assigned'),
('WCR-004','ST-2024-093',NULL,NULL,'residential','completed'),
('WCR-005',NULL,'PER-007',NULL,'residential','pending');

CREATE TABLE hcdrd_clearance (
    clearance_id        TEXT PRIMARY KEY,
    water_request_id    TEXT REFERENCES water_connection_request(water_request_id),
    issued_by_office    TEXT REFERENCES government_office(office_id),
    clearance_type      TEXT,
    issue_date          DATE,
    digital_clearance_url TEXT
);

INSERT INTO hcdrd_clearance VALUES
('HC-001','WCR-002','OFF-009','water_connection_clearance','2024-02-28','https://storage.bpm.gov/clearance/HC-001.pdf'),
('HC-002','WCR-004','OFF-009','water_connection_clearance','2024-02-20','https://storage.bpm.gov/clearance/HC-002.pdf');

CREATE TABLE technical_assessment (
    assessment_id       TEXT PRIMARY KEY,
    water_request_id    TEXT REFERENCES water_connection_request(water_request_id),
    findings            TEXT,
    meter_type          TEXT,
    feasibility_status  TEXT,
    quotation_amount    NUMERIC,
    assessed_by_employee TEXT REFERENCES employee(employee_id)
);

INSERT INTO technical_assessment VALUES
('TA-001','WCR-002','Pipe infrastructure adequate. Meter installation feasible.','Class C 15mm','feasible',4500,'EMP-005'),
('TA-002','WCR-004','Existing meter defective. Replacement required.','Class C 15mm','feasible',2800,'EMP-009'),
('TA-003','WCR-001','Assessment pending site visit.','TBD','pending',NULL,'EMP-005'),
('TA-004','WCR-005','New connection — requires main line extension.','Class D 20mm','feasible',8500,'EMP-005');

CREATE TABLE installation_record (
    installation_id     TEXT PRIMARY KEY,
    water_request_id    TEXT REFERENCES water_connection_request(water_request_id),
    installation_date   DATE,
    executed_by_office  TEXT REFERENCES government_office(office_id),
    executed_by_employee TEXT REFERENCES employee(employee_id),
    payment_id          TEXT REFERENCES digital_payment(payment_id),
    activation_confirmed BOOLEAN DEFAULT FALSE
);

INSERT INTO installation_record VALUES
('IR-001','WCR-002','2024-03-04','OFF-005','EMP-005','PAY-006',TRUE),
('IR-002','WCR-004','2024-02-22','OFF-005','EMP-009',NULL,TRUE);

CREATE TABLE leak_report (
    leak_report_id          TEXT PRIMARY KEY,
    ticket_id               TEXT,
    person_id               TEXT REFERENCES person(person_id),
    report_doc              TEXT REFERENCES digital_document(document_id),
    urgency_classification  TEXT DEFAULT 'medium',
    status                  TEXT DEFAULT 'open'
);

INSERT INTO leak_report VALUES
('LR-001','ST-2024-099','PER-013',NULL,'critical','in_progress'),
('LR-002','ST-2024-096','PER-004',NULL,'high','assigned'),
('LR-003','ST-2024-092','PER-008',NULL,'medium','closed'),
('LR-004','ST-2024-088',NULL,NULL,'medium','in_progress'),
('LR-005',NULL,'PER-010',NULL,'low','open');

CREATE TABLE excavation_clearance (
    excav_clearance_id  TEXT PRIMARY KEY,
    leak_report_id      TEXT REFERENCES leak_report(leak_report_id),
    issued_by_office    TEXT REFERENCES government_office(office_id),
    clearance_type      TEXT,
    issue_date          DATE,
    digital_clearance_url TEXT
);

INSERT INTO excavation_clearance VALUES
('EC-001','LR-001','OFF-009','emergency_excavation','2024-03-04','https://storage.bpm.gov/clearance/EC-001.pdf'),
('EC-002','LR-002','OFF-009','standard_excavation','2024-03-02','https://storage.bpm.gov/clearance/EC-002.pdf'),
('EC-003','LR-003','OFF-009','standard_excavation','2024-02-15','https://storage.bpm.gov/clearance/EC-003.pdf');

CREATE TABLE leak_repair_record (
    repair_id               TEXT PRIMARY KEY,
    leak_report_id          TEXT REFERENCES leak_report(leak_report_id),
    completion_date         DATE,
    executed_by_office      TEXT REFERENCES government_office(office_id),
    executed_by_employee    TEXT REFERENCES employee(employee_id),
    completion_status       TEXT DEFAULT 'pending',
    excavation_required     BOOLEAN DEFAULT FALSE
);

INSERT INTO leak_repair_record VALUES
('LRR-001','LR-003','2024-02-20','OFF-005','EMP-005','completed',TRUE),
('LRR-002','LR-001',NULL,'OFF-005','EMP-005','in_progress',TRUE),
('LRR-003','LR-002',NULL,'OFF-005','EMP-009','in_progress',FALSE),
('LRR-004','LR-004',NULL,'OFF-005','EMP-009','in_progress',FALSE);

CREATE TABLE drainage_request (
    drainage_request_id TEXT PRIMARY KEY,
    ticket_id           TEXT,
    person_id           TEXT REFERENCES person(person_id),
    request_doc         TEXT REFERENCES digital_document(document_id),
    issue_description   TEXT,
    date_reported       DATE,
    status              TEXT DEFAULT 'open'
);

INSERT INTO drainage_request VALUES
('DR-001','ST-2024-098','PER-014',NULL,'Drainage clogged causing water backup in street','2024-03-04','assigned'),
('DR-002','ST-2024-094','PER-008',NULL,'Drainage overflow during heavy rain affecting 3 households','2024-02-27','in_progress'),
('DR-003','ST-2024-091','PER-009',NULL,'Storm drain overflowing with solid waste near school','2024-03-05','open'),
('DR-004','ST-2024-087',NULL,NULL,'Request to install public water faucet in relocation site','2024-03-03','open'),
('DR-005',NULL,'PER-002',NULL,'Drainage in Purok 2 backing up after rainy season','2024-03-01','resolved');

CREATE TABLE drainage_inspection_report (
    inspection_id           TEXT PRIMARY KEY,
    drainage_request_id     TEXT REFERENCES drainage_request(drainage_request_id),
    findings                TEXT,
    inspected_by_office     TEXT REFERENCES government_office(office_id),
    inspected_by_employee   TEXT REFERENCES employee(employee_id)
);

INSERT INTO drainage_inspection_report VALUES
('DIR-001','DR-001','Clog confirmed 30m downstream. Debris accumulation. Requires manual clearing.','OFF-005','EMP-009'),
('DIR-002','DR-002','Multiple clog points identified. Overflow confirmed. Requires immediate clearing.','OFF-005','EMP-005'),
('DIR-003','DR-005','Drain blockage caused by solid waste. Cleared during inspection.','OFF-005','EMP-009'),
('DIR-004','DR-003','Storm drain inlet blocked by garbage. Emergency clearing required.','OFF-005','EMP-005');

CREATE TABLE program_of_works (
    pow_id              TEXT PRIMARY KEY,
    inspection_id       TEXT REFERENCES drainage_inspection_report(inspection_id),
    description         TEXT,
    estimated_cost      NUMERIC,
    materials_available BOOLEAN DEFAULT FALSE,
    prepared_by_employee TEXT REFERENCES employee(employee_id)
);

INSERT INTO program_of_works VALUES
('POW-001','DIR-001','Manual drain clearing — 30m section. Labor: 4 workers x 1 day.',5500,TRUE,'EMP-005'),
('POW-002','DIR-002','Emergency drain clearing — multiple points. Heavy equipment required.',18000,FALSE,'EMP-005'),
('POW-003','DIR-004','Emergency storm drain clearing. Garbage truck deployment required.',9500,TRUE,'EMP-009');

CREATE TABLE drainage_repair_record (
    repair_id               TEXT PRIMARY KEY,
    drainage_request_id     TEXT REFERENCES drainage_request(drainage_request_id),
    completion_date         DATE,
    executed_by_office      TEXT REFERENCES government_office(office_id),
    executed_by_employee    TEXT REFERENCES employee(employee_id),
    completion_status       TEXT DEFAULT 'pending'
);

INSERT INTO drainage_repair_record VALUES
('DRR-001','DR-005','2024-03-03','OFF-005','EMP-009','completed'),
('DRR-002','DR-001',NULL,'OFF-005','EMP-009','in_progress'),
('DRR-003','DR-002',NULL,'OFF-005','EMP-005','in_progress'),
('DRR-004','DR-003',NULL,'OFF-005','EMP-005','pending');

-- ══════════════════════════════════════════════════════════════════════
-- MODULE 6 — ASSET INVENTORY TRACKER
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE property (
    property_id     TEXT PRIMARY KEY,
    property_type   TEXT,
    property_name   TEXT NOT NULL,
    location        TEXT,
    area_size       TEXT,
    managing_office TEXT REFERENCES government_office(office_id),
    registry_ref_no TEXT,
    asset_condition TEXT DEFAULT 'good'
);

INSERT INTO property (property_id, property_type, property_name, location, area_size, managing_office, registry_ref_no, asset_condition) VALUES
-- CITY-OWNED LANDS
('PROP-001','land','Quezon City Hall Complex Lot','Elliptical Road, Diliman, Quezon City','97,872 sqm','OFF-007','TCT No. T-78321','good'),
('PROP-002','land','Quezon Memorial Circle Grounds','Elliptical Road, Diliman, Quezon City','145,000 sqm','OFF-003','TCT No. T-112233','good'),
('PROP-003','land','QC Sports Club Lot (Amoranto Stadium)','A. Roces Avenue, South Triangle, QC','29,950 sqm','OFF-003','TCT No. T-98765','good'),
('PROP-004','land','Quezon City General Hospital Lot','Seminary Road, Brgy. Bago Bantay, QC','18,500 sqm','OFF-008','TCT No. T-45612','good'),
('PROP-005','land','Novaliches District Hospital Lot','Quirino Highway, Novaliches, QC','8,200 sqm','OFF-008','TCT No. T-56789','good'),
('PROP-006','land','QC Public Cemetery No. 1 — Kamuning','Kamuning Road, Quezon City','28,000 sqm','OFF-001','TCT No. T-34521','good'),
('PROP-007','land','QC Public Cemetery No. 2 — Bagong Silang','Bagong Silang, Caloocan (QC admin area)','45,000 sqm','OFF-001','TCT No. T-67890','good'),
('PROP-008','land','Ninoy Aquino Parks and Wildlife Center Lot','North Avenue, Diliman, QC','22,375 sqm','OFF-003','TCT No. T-88123','good'),
('PROP-009','land','La Mesa Eco Park — Section A','Commonwealth Avenue, Batasan Hills, QC','33,200 sqm','OFF-003','TCT No. T-90234','good'),
('PROP-010','land','CGSD Compound and Depot','BIR Road, Brgy. Pinyahan, QC','6,800 sqm','OFF-005','TCT No. T-11456','good'),
('PROP-011','land','Batasan Complex Legislative Lot','Constitution Hills, Batasan, QC','52,100 sqm','OFF-007','TCT No. T-22567','good'),
('PROP-012','land','QC Circle Children''s Park Lot','Elliptical Rd cor E. Rodriguez Ave., QC','12,450 sqm','OFF-003','TCT No. T-33678','good'),
('PROP-013','land','Balara Water Reservoir Land','Balara, QC (MWSS Area)','15,300 sqm','OFF-005','TCT No. T-44789','good'),
('PROP-014','land','Anonas Public Market Lot','Anonas St., Brgy. Project 3, QC','5,600 sqm','OFF-007','TCT No. T-55890','good'),
('PROP-015','land','Fairview Public Market Lot','Quirino Highway, Fairview, QC','9,100 sqm','OFF-007','TCT No. T-66901','good'),
-- CITY-OWNED BUILDINGS
('PROP-016','building','Quezon City Hall Main Building','Elliptical Road, Diliman, QC','24,500 sqm (GFA)','OFF-007','BLD-REG-2001-001','good'),
('PROP-017','building','Quezon City Hall Annex Building','Elliptical Road, Diliman, QC','8,200 sqm (GFA)','OFF-007','BLD-REG-2005-002','good'),
('PROP-018','building','Quezon City General Hospital Building','Seminary Road, Brgy. Bago Bantay, QC','22,000 sqm (GFA)','OFF-008','BLD-REG-1995-003','fair'),
('PROP-019','building','Novaliches District Hospital Building','Quirino Highway, Novaliches, QC','6,400 sqm (GFA)','OFF-008','BLD-REG-2000-004','good'),
('PROP-020','building','Amoranto Sports Complex — Main Arena','A. Roces Ave., South Triangle, QC','8,500 sqm (GFA)','OFF-003','BLD-REG-1980-005','fair'),
('PROP-021','building','Quezon City Science High School Building','Misamis St., Brgy. Bago Bantay, QC','5,800 sqm (GFA)','OFF-007','BLD-REG-2003-006','good'),
('PROP-022','building','QC Local Government Operations Center','Elliptical Road, Diliman, QC','3,200 sqm (GFA)','OFF-007','BLD-REG-2010-007','good'),
('PROP-023','building','Bagong Silang Multi-Purpose Building','Bagong Silang, Caloocan (QC area)','2,100 sqm (GFA)','OFF-004','BLD-REG-2008-008','good'),
('PROP-024','building','Batasan Complex Legislative Building','Constitution Hills, Batasan, QC','18,500 sqm (GFA)','OFF-007','BLD-REG-1978-009','good'),
('PROP-025','building','CGSD Main Office and Warehouse','BIR Road, Brgy. Pinyahan, QC','1,800 sqm (GFA)','OFF-005','BLD-REG-2002-010','good'),
('PROP-026','building','Quezon City Public Library Main Branch','Elliptical Rd, Diliman, QC','2,400 sqm (GFA)','OFF-007','BLD-REG-2009-011','good'),
('PROP-027','building','Kamuning Public Market Building','Kamuning Road, Quezon City','4,200 sqm (GFA)','OFF-007','BLD-REG-1990-012','fair'),
('PROP-028','building','Commonwealth Market Building','Commonwealth Ave., Quezon City','6,800 sqm (GFA)','OFF-007','BLD-REG-1988-013','fair'),
('PROP-029','building','Social Services Development Center','BIR Road, Quezon City','1,500 sqm (GFA)','OFF-002','BLD-REG-2015-014','good'),
('PROP-030','building','FAMCD Asset Management Building','City Hall Complex, Elliptical Rd, QC','980 sqm (GFA)','OFF-007','BLD-REG-2012-015','excellent');


CREATE TABLE inventory_request (
    inventory_request_id TEXT PRIMARY KEY,
    requesting_office   TEXT REFERENCES government_office(office_id),
    request_doc         TEXT REFERENCES digital_document(document_id),
    date_requested      DATE,
    status              TEXT DEFAULT 'pending',
    inventory_scope     TEXT,
    cycle_type          TEXT
);

INSERT INTO inventory_request VALUES
('INR-001','OFF-007',NULL,'2024-01-10','completed','Annual property inventory — all divisions','annual'),
('INR-002','OFF-004',NULL,'2024-02-01','in_progress','Barangay facility and equipment inventory','semi-annual'),
('INR-003','OFF-005',NULL,'2024-02-15','in_progress','Water utility infrastructure inventory','quarterly'),
('INR-004','OFF-003',NULL,'2024-03-01','pending','Parks and recreation asset inventory','annual'),
('INR-005','OFF-001',NULL,'2024-03-05','pending','Cemetery property and niche inventory','annual');

CREATE TABLE ocular_inspection (
    inspection_id           TEXT PRIMARY KEY,
    property_id             TEXT REFERENCES property(property_id),
    inventory_request_id    TEXT REFERENCES inventory_request(inventory_request_id),
    inspection_date         DATE,
    conducted_by_office     TEXT REFERENCES government_office(office_id),
    physical_condition_notes TEXT,
    usage_verified          BOOLEAN DEFAULT FALSE,
    boundary_verified       BOOLEAN DEFAULT FALSE
);

INSERT INTO ocular_inspection VALUES
('OI-001','PROP-006','INR-005','2024-01-15','OFF-001','QC Public Cemetery No.1 — Kamuning. All boundaries intact. ~82% niche occupancy. Perimeter fencing intact.',TRUE,TRUE),
('OI-002','PROP-007','INR-005','2024-01-16','OFF-001','QC Public Cemetery No.2 — Bagong Silang. Expansion area cleared. Boundary markers verified.',TRUE,TRUE),
('OI-003','PROP-010','INR-003','2024-02-18','OFF-005','CGSD Compound — Pump units operational. Unit 2 showing wear; seal replacement scheduled.',TRUE,FALSE),
('OI-004','PROP-016','INR-001','2024-01-20','OFF-007','QC Hall Main Building — structurally sound. North wing electrical panels require upgrade.',TRUE,TRUE),
('OI-005','PROP-017','INR-001','2024-01-20','OFF-007','QC Hall Annex — good condition. Ground floor tiles need replacement in lobby area.',TRUE,TRUE),
('OI-006','PROP-002','INR-004','2024-03-03','OFF-003','QC Memorial Circle Grounds — grounds well-maintained. Jogging path resurfacing recommended.',TRUE,TRUE),
('OI-007','PROP-020','INR-004','2024-03-04','OFF-003','Amoranto Sports Complex Arena — structural assessment needed for roof. Stands in fair condition.',TRUE,FALSE),
('OI-008','PROP-025','INR-003','2024-02-10','OFF-005','CGSD Main Office and Warehouse — fully operational. Storage capacity at 78%.',TRUE,FALSE),
('OI-009','PROP-018','INR-001','2024-01-22','OFF-007','QC General Hospital Building — east wing renovation completed. ICU refurbishment ongoing.',TRUE,TRUE),
('OI-010','PROP-027','INR-001','2024-01-25','OFF-007','Kamuning Public Market — stall compliance inspected. Fire exits clear. Roof needs repair in Section C.',TRUE,TRUE);


CREATE TABLE inventory_report (
    inventory_report_id TEXT PRIMARY KEY,
    inventory_request_id TEXT REFERENCES inventory_request(inventory_request_id),
    preparation_date    DATE,
    approval_status     TEXT DEFAULT 'pending',
    prepared_by_office  TEXT REFERENCES government_office(office_id),
    digital_report_url  TEXT
);

INSERT INTO inventory_report VALUES
('IRP-001','INR-001','2024-01-28','approved','OFF-007','https://storage.bpm.gov/inventory/IRP-001-annual-2024.pdf'),
('IRP-002','INR-002','2024-02-20','pending','OFF-004','https://storage.bpm.gov/inventory/IRP-002-brgy-2024.pdf'),
('IRP-003','INR-003','2024-03-01','pending','OFF-005','https://storage.bpm.gov/inventory/IRP-003-utility-2024.pdf'),
('IRP-004','INR-004',NULL,'draft','OFF-003',NULL),
('IRP-005','INR-005',NULL,'draft','OFF-001',NULL);

CREATE TABLE approval_record (
    approval_id             TEXT PRIMARY KEY,
    inventory_report_id     TEXT REFERENCES inventory_report(inventory_report_id),
    approved_by_office      TEXT REFERENCES government_office(office_id),
    approved_by_employee    TEXT REFERENCES employee(employee_id),
    approval_date           DATE,
    decision                TEXT,
    remarks                 TEXT
);

INSERT INTO approval_record VALUES
('APR-001','IRP-001','OFF-007','EMP-007','2024-01-29','approved','Annual inventory report complete. All assets accounted for. Submitted to CGSD.'),
('APR-002','IRP-002','OFF-004','EMP-008','2024-02-22','pending','Awaiting final sign-off from Punong Barangay.'),
('APR-003','IRP-003','OFF-005','EMP-005','2024-03-03','pending','Technical verification ongoing.');

CREATE TABLE submission_record (
    submission_id           TEXT PRIMARY KEY,
    inventory_report_id     TEXT REFERENCES inventory_report(inventory_report_id),
    submitted_to            TEXT,
    submission_date         DATE,
    submitted_by_employee   TEXT REFERENCES employee(employee_id),
    notif_id                TEXT
);

INSERT INTO submission_record VALUES
('SUB-001','IRP-001','CGSD Management','2024-01-30','EMP-007','NOTIF-008'),
('SUB-002','IRP-001','FAMCD Office','2024-01-30','EMP-007',NULL),
('SUB-003','IRP-002','Barangay Captain''s Office','2024-02-25','EMP-004',NULL);

-- ══════════════════════════════════════════════════════════════════════
-- ENABLE RLS + OPEN POLICIES ON ALL NEW TABLES
-- ══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    tbl TEXT;
    tbls TEXT[] := ARRAY[
        'person','government_office','employee','citizen_account',
        'digital_document','digital_payment','notification_log',
        'deceased','cemetery','funeral_home','niche_record',
        'indigent_assistance_record','burial_record','online_burial_application',
        'administration_office','park_venue','park_reservation_record','site_usage_log',
        'barangay','barangay_facility','barangay_reservation_record','barangay_reservation_approval',
        'water_connection_request','hcdrd_clearance','technical_assessment',
        'installation_record','leak_report','excavation_clearance','leak_repair_record',
        'drainage_request','drainage_inspection_report','program_of_works','drainage_repair_record',
        'property','inventory_request','ocular_inspection','inventory_report',
        'approval_record','submission_record'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON %I', tbl);
        EXECUTE format('CREATE POLICY "allow_all" ON %I FOR ALL USING (true) WITH CHECK (true)', tbl);
    END LOOP;
END $$;

SELECT 'ERD Supplement complete! 39 tables created, 300+ rows inserted.' AS status;

-- ══════════════════════════════════════════════════════════════════════
-- PERMISSIONS & ACCESS FIXES FOR SUPABASE API
-- ══════════════════════════════════════════════════════════════════════

-- 1. Grant usage on the public schema to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant all privileges on all tables in the public schema to anon and authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- 3. Grant all privileges on all sequences (for auto-incrementing IDs) to anon and authenticated
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 4. Enable Row Level Security (RLS) and allow all access for the citizen_account table
ALTER TABLE citizen_account ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_citizen" ON citizen_account;
CREATE POLICY "allow_all_citizen" ON citizen_account FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Row Level Security (RLS) and allow all access for the person table
ALTER TABLE person ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_person" ON person;
CREATE POLICY "allow_all_person" ON person FOR ALL USING (true) WITH CHECK (true);

-- 6. Ensure default privileges for any future tables you might create
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
