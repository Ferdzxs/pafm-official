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
