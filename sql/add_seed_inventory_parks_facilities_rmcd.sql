-- Add more seed data for:
-- 1) Inventory inspections
-- 2) Park venues
-- 3) Barangay facilities
-- 4) RMCD account/office/employee
--
-- Safe to re-run (uses ON CONFLICT upserts where possible).

BEGIN;

-- -------------------------------------------------------------------
-- A. RMCD OFFICE + ACCOUNT
-- -------------------------------------------------------------------

INSERT INTO government_office (office_id, office_name, office_type, location)
VALUES ('OFF-011', 'RMCD Records Management', 'Division Office', 'City Hall, Records Wing')
ON CONFLICT (office_id) DO UPDATE
SET office_name = EXCLUDED.office_name,
    office_type = EXCLUDED.office_type,
    location = EXCLUDED.location;

INSERT INTO system_users (full_name, email, role, department, contact_no, is_active, password_hash)
VALUES (
    'RMCD Officer A. Dela Cruz',
    'rmcd@bpm.qc.gov.ph',
    'rmcd',
    'Records Management and Compliance Division',
    '09170000014',
    TRUE,
    'admin123'
)
ON CONFLICT (email) DO UPDATE
SET full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    department = EXCLUDED.department,
    contact_no = EXCLUDED.contact_no,
    is_active = EXCLUDED.is_active,
    password_hash = EXCLUDED.password_hash;

INSERT INTO employee (
    employee_id, office_id, full_name, position_title, department,
    employee_no, contact_number, is_active, email, system_user_id
)
VALUES (
    'EMP-013',
    'OFF-011',
    'RMCD Officer A. Dela Cruz',
    'Records Management Officer III',
    'RMCD',
    'EMP-2026-013',
    '09170000014',
    TRUE,
    'rmcd@bpm.qc.gov.ph',
    (SELECT user_id FROM system_users WHERE email = 'rmcd@bpm.qc.gov.ph' LIMIT 1)
)
ON CONFLICT (employee_id) DO UPDATE
SET office_id = EXCLUDED.office_id,
    full_name = EXCLUDED.full_name,
    position_title = EXCLUDED.position_title,
    department = EXCLUDED.department,
    employee_no = EXCLUDED.employee_no,
    contact_number = EXCLUDED.contact_number,
    is_active = EXCLUDED.is_active,
    email = EXCLUDED.email,
    system_user_id = (SELECT user_id FROM system_users WHERE email = 'rmcd@bpm.qc.gov.ph' LIMIT 1);

-- -------------------------------------------------------------------
-- B. MORE PARK VENUES
-- -------------------------------------------------------------------

INSERT INTO park_venue (park_venue_id, park_venue_name, location, venue_type, admin_office_id, availability_status)
VALUES
('PV-009', 'Quezon Memorial Circle - Open Amphitheater', 'Elliptical Rd, QC', 'amphitheater', 'ADM-001', 'available'),
('PV-010', 'La Mesa Eco Park - Pavilion B', 'Commonwealth Ave, QC', 'pavilion', 'ADM-002', 'available'),
('PV-011', 'Ninoy Aquino Parks - Picnic Grove North', 'North Ave, QC', 'picnic_area', 'ADM-001', 'available'),
('PV-012', 'Eastwood City Park - Activity Lawn', 'Eastwood Ave, Libis', 'open_field', 'ADM-001', 'available')
ON CONFLICT (park_venue_id) DO UPDATE
SET park_venue_name = EXCLUDED.park_venue_name,
    location = EXCLUDED.location,
    venue_type = EXCLUDED.venue_type,
    admin_office_id = EXCLUDED.admin_office_id,
    availability_status = EXCLUDED.availability_status;

-- -------------------------------------------------------------------
-- C. MORE BARANGAY FACILITIES
-- -------------------------------------------------------------------

INSERT INTO barangay_facility (
    barangay_facility_id, barangay_id, facility_name, facility_type,
    rental_rate, ordinance_reference, availability_status
)
VALUES
('BF-009', 'BRY-002', 'Barangay 456 Senior Activity Hall', 'hall', 250, 'Ord. No. 32 s.2023', 'available'),
('BF-010', 'BRY-003', 'Holy Spirit Community Function Room', 'room', 350, 'Ord. No. 34 s.2024', 'available'),
('BF-011', 'BRY-004', 'Bagong Silang Covered Court', 'court', 0, NULL, 'available'),
('BF-012', 'BRY-005', 'Tandang Sora Training Pavilion', 'multipurpose', 300, 'Ord. No. 31 s.2023', 'available')
ON CONFLICT (barangay_facility_id) DO UPDATE
SET barangay_id = EXCLUDED.barangay_id,
    facility_name = EXCLUDED.facility_name,
    facility_type = EXCLUDED.facility_type,
    rental_rate = EXCLUDED.rental_rate,
    ordinance_reference = EXCLUDED.ordinance_reference,
    availability_status = EXCLUDED.availability_status;

-- -------------------------------------------------------------------
-- D. MORE INVENTORY REQUESTS + OCULAR INSPECTIONS
-- -------------------------------------------------------------------

INSERT INTO inventory_request (
    inventory_request_id, requesting_office, request_doc, date_requested, status, inventory_scope, cycle_type
)
VALUES
('INR-006', 'OFF-007', NULL, CURRENT_DATE - INTERVAL '14 days', 'in_progress', 'FAMCD monthly verification - market buildings', 'monthly'),
('INR-007', 'OFF-003', NULL, CURRENT_DATE - INTERVAL '12 days', 'in_progress', 'Parks venue usability and safety sweep', 'monthly'),
('INR-008', 'OFF-001', NULL, CURRENT_DATE - INTERVAL '10 days', 'in_progress', 'Cemetery grounds and support facility inspection', 'monthly'),
('INR-009', 'OFF-005', NULL, CURRENT_DATE - INTERVAL '8 days', 'pending', 'Utility infrastructure risk-based inspection cycle', 'monthly'),
('INR-010', 'OFF-007', NULL, CURRENT_DATE - INTERVAL '6 days', 'pending', 'City-owned buildings compliance cross-check', 'monthly')
ON CONFLICT (inventory_request_id) DO UPDATE
SET requesting_office = EXCLUDED.requesting_office,
    request_doc = EXCLUDED.request_doc,
    date_requested = EXCLUDED.date_requested,
    status = EXCLUDED.status,
    inventory_scope = EXCLUDED.inventory_scope,
    cycle_type = EXCLUDED.cycle_type;

INSERT INTO ocular_inspection (
    inspection_id, property_id, inventory_request_id, inspection_date, conducted_by_office,
    physical_condition_notes, usage_verified, boundary_verified
)
VALUES
('OI-011', 'PROP-014', 'INR-006', CURRENT_DATE - INTERVAL '13 days', 'OFF-007', 'Anonas Public Market perimeter and loading bay checked. Minor wall cracks seen at rear section.', TRUE, TRUE),
('OI-012', 'PROP-015', 'INR-006', CURRENT_DATE - INTERVAL '12 days', 'OFF-007', 'Fairview Public Market drainage in good condition. Stall electrical lines require preventive maintenance.', TRUE, TRUE),
('OI-013', 'PROP-002', 'INR-007', CURRENT_DATE - INTERVAL '11 days', 'OFF-003', 'Quezon Memorial Circle grounds pass visual safety checks. Wayfinding signage needs repainting.', TRUE, TRUE),
('OI-014', 'PROP-008', 'INR-007', CURRENT_DATE - INTERVAL '10 days', 'OFF-003', 'NAPWC pathways cleared. One lighting cluster near lagoon has intermittent faults.', TRUE, TRUE),
('OI-015', 'PROP-009', 'INR-007', CURRENT_DATE - INTERVAL '9 days', 'OFF-003', 'La Mesa Eco Park section fencing stable. Two benches damaged and tagged for replacement.', TRUE, FALSE),
('OI-016', 'PROP-006', 'INR-008', CURRENT_DATE - INTERVAL '9 days', 'OFF-001', 'Kamuning cemetery interior roads remain passable. Northwest gate hinge requires repair.', TRUE, TRUE),
('OI-017', 'PROP-007', 'INR-008', CURRENT_DATE - INTERVAL '8 days', 'OFF-001', 'Bagong Silang cemetery utility shed shows roof wear. Boundary markers remain visible.', TRUE, TRUE),
('OI-018', 'PROP-010', 'INR-009', CURRENT_DATE - INTERVAL '7 days', 'OFF-005', 'Depot pump rack inspected. Unit housing vibration noted under peak load.', TRUE, FALSE),
('OI-019', 'PROP-016', 'INR-010', CURRENT_DATE - INTERVAL '6 days', 'OFF-007', 'City Hall main building fire exits verified clear. Two emergency lights non-functional.', TRUE, TRUE),
('OI-020', 'PROP-022', 'INR-010', CURRENT_DATE - INTERVAL '5 days', 'OFF-007', 'Operations center backup power tested. UPS battery replacement recommended this quarter.', TRUE, TRUE)
ON CONFLICT (inspection_id) DO UPDATE
SET property_id = EXCLUDED.property_id,
    inventory_request_id = EXCLUDED.inventory_request_id,
    inspection_date = EXCLUDED.inspection_date,
    conducted_by_office = EXCLUDED.conducted_by_office,
    physical_condition_notes = EXCLUDED.physical_condition_notes,
    usage_verified = EXCLUDED.usage_verified,
    boundary_verified = EXCLUDED.boundary_verified;

INSERT INTO inventory_report (
    inventory_report_id, inventory_request_id, preparation_date, approval_status, prepared_by_office, digital_report_url
)
VALUES
('IRP-006', 'INR-006', CURRENT_DATE - INTERVAL '4 days', 'pending', 'OFF-007', 'https://storage.bpm.gov/inventory/IRP-006-market-sweep.pdf'),
('IRP-007', 'INR-007', CURRENT_DATE - INTERVAL '3 days', 'pending', 'OFF-003', 'https://storage.bpm.gov/inventory/IRP-007-parks-sweep.pdf'),
('IRP-008', 'INR-008', CURRENT_DATE - INTERVAL '3 days', 'pending', 'OFF-001', 'https://storage.bpm.gov/inventory/IRP-008-cemetery-sweep.pdf'),
('IRP-009', 'INR-009', CURRENT_DATE - INTERVAL '2 days', 'draft', 'OFF-005', NULL),
('IRP-010', 'INR-010', CURRENT_DATE - INTERVAL '1 day', 'draft', 'OFF-007', NULL)
ON CONFLICT (inventory_report_id) DO UPDATE
SET inventory_request_id = EXCLUDED.inventory_request_id,
    preparation_date = EXCLUDED.preparation_date,
    approval_status = EXCLUDED.approval_status,
    prepared_by_office = EXCLUDED.prepared_by_office,
    digital_report_url = EXCLUDED.digital_report_url;

COMMIT;

