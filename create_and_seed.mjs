// BPM Supabase Schema Creator + Seeder
// Run with: node create_and_seed.mjs

const PROJECT_REF = 'bzzoqzqmpxsyrerzthxx'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ6em9xenFtcHhzeXJlcnp0aHh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTAxNzMsImV4cCI6MjA4ODIyNjE3M30.AGatDBe1k8-97RfOM7huNav0gnoJDpi9v9cplHTyByM'
const BASE = `https://${PROJECT_REF}.supabase.co/rest/v1`
const HEADERS = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
}

async function insert(table, rows) {
    const r = await fetch(`${BASE}/${table}`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(rows),
    })
    if (r.ok || r.status === 201) {
        console.log(`✅ ${table}: ${rows.length} rows inserted`)
    } else {
        const err = await r.text()
        // If table doesn't exist, report it
        if (err.includes('does not exist') || err.includes('relation')) {
            console.log(`⚠️  ${table}: Table not found in Supabase — you need to run the schema SQL first.`)
        } else {
            console.log(`⚠️  ${table}: ${r.status} — ${err.slice(0, 200)}`)
        }
    }
}

// Test connection first
console.log('🔌 Testing Supabase connection...')
const test = await fetch(`${BASE}/`, { headers: HEADERS })
console.log(`Connection status: ${test.status} ${test.statusText}`)

// ── burial_applications ──────────────────────────────────────────────
await insert('burial_applications', [
    { application_id: 'BA-2024-050', applicant_name: 'Pedro Bautista', applicant_contact: '09171111111', applicant_address: 'Blk 4 Lot 2, Brgy 123', deceased_name: 'Maria Bautista', deceased_age: 72, date_of_death: '2024-03-01', cause_of_death: 'Cardiac Arrest', death_certificate_no: 'DC-2024-0901', relationship: 'Son', niche_requested: 'Standard Niche', status: 'pending' },
    { application_id: 'BA-2024-049', applicant_name: 'Jose Santos', applicant_contact: '09182222222', applicant_address: 'Purok 3, Brgy 456', deceased_name: 'Lolita Santos', deceased_age: 68, date_of_death: '2024-02-28', cause_of_death: 'Pneumonia', death_certificate_no: 'DC-2024-0899', relationship: 'Husband', niche_requested: 'Economy Niche', status: 'approved', reviewed_by: 'Jose Makabayan' },
    { application_id: 'BA-2024-048', applicant_name: 'Ana Reyes', applicant_contact: '09193333333', applicant_address: 'Lot 12, Blk 7', deceased_name: 'Ramon Reyes', deceased_age: 80, date_of_death: '2024-02-26', cause_of_death: 'Old Age', death_certificate_no: 'DC-2024-0895', relationship: 'Daughter', niche_requested: 'Premium Niche', status: 'under_review' },
    { application_id: 'BA-2024-047', applicant_name: 'Carlos Flores', applicant_contact: '09154444444', applicant_address: 'Street 5, QC', deceased_name: 'Gloria Flores', deceased_age: 65, date_of_death: '2024-02-24', cause_of_death: 'Hypertension', death_certificate_no: 'DC-2024-0891', relationship: 'Son', niche_requested: 'Standard Niche', status: 'completed', reviewed_by: 'Jose Makabayan' },
    { application_id: 'BA-2024-046', applicant_name: 'Maria Torres', applicant_contact: '09165555555', applicant_address: 'P. Florentino St.', deceased_name: 'Eduardo Torres', deceased_age: 74, date_of_death: '2024-02-22', cause_of_death: 'Stroke', death_certificate_no: 'DC-2024-0888', relationship: 'Wife', niche_requested: 'Standard Niche', status: 'rejected', notes: 'Incomplete documents' },
    { application_id: 'BA-2024-045', applicant_name: 'Roberto Gonzalez', applicant_contact: '09176666666', applicant_address: 'Scout Area, QC', deceased_name: 'Perla Gonzalez', deceased_age: 70, date_of_death: '2024-02-20', cause_of_death: 'Cancer', death_certificate_no: 'DC-2024-0885', relationship: 'Son', niche_requested: 'Economy Niche', status: 'pending' },
    { application_id: 'BA-2024-044', applicant_name: 'Luisa Hernandez', applicant_contact: '09187777777', applicant_address: 'Brgy 789 Phase 2', deceased_name: 'Andres Hernandez', deceased_age: 88, date_of_death: '2024-02-18', cause_of_death: 'Natural Causes', death_certificate_no: 'DC-2024-0880', relationship: 'Daughter', niche_requested: 'Premium Niche', status: 'approved', reviewed_by: 'Jose Makabayan' },
    { application_id: 'BA-2024-043', applicant_name: 'Diego Miranda', applicant_contact: '09198888888', applicant_address: 'Lot 3 Blk 9, Pasig', deceased_name: 'Rosario Miranda', deceased_age: 75, date_of_death: '2024-02-15', cause_of_death: 'Heart Failure', death_certificate_no: 'DC-2024-0876', relationship: 'Son', niche_requested: 'Standard Niche', status: 'completed', reviewed_by: 'Jose Makabayan' },
    { application_id: 'BA-2024-042', applicant_name: 'Elena Castro', applicant_contact: '09109999999', applicant_address: 'Unit 4, Dela Paz', deceased_name: 'Benjamin Castro', deceased_age: 82, date_of_death: '2024-02-12', cause_of_death: 'COPD', death_certificate_no: 'DC-2024-0871', relationship: 'Daughter', niche_requested: 'Economy Niche', status: 'under_review' },
    { application_id: 'BA-2024-041', applicant_name: 'Fernando Ramos', applicant_contact: '09121010101', applicant_address: 'Brgy Bagong Silang', deceased_name: 'Consuelo Ramos', deceased_age: 77, date_of_death: '2024-02-10', cause_of_death: 'Kidney Failure', death_certificate_no: 'DC-2024-0868', relationship: 'Son', niche_requested: 'Standard Niche', status: 'approved', reviewed_by: 'Jose Makabayan' },
])

// ── cemetery_niches ──────────────────────────────────────────────────
await insert('cemetery_niches', [
    { niche_id: 'N-A-01-001', block_no: 'A', row_no: 1, niche_no: 1, niche_type: 'premium', status: 'occupied', floor_level: 1 },
    { niche_id: 'N-A-01-002', block_no: 'A', row_no: 1, niche_no: 2, niche_type: 'premium', status: 'occupied', floor_level: 1 },
    { niche_id: 'N-A-01-003', block_no: 'A', row_no: 1, niche_no: 3, niche_type: 'premium', status: 'available', floor_level: 1 },
    { niche_id: 'N-A-01-004', block_no: 'A', row_no: 1, niche_no: 4, niche_type: 'premium', status: 'reserved', floor_level: 1 },
    { niche_id: 'N-A-02-001', block_no: 'A', row_no: 2, niche_no: 1, niche_type: 'standard', status: 'occupied', floor_level: 1 },
    { niche_id: 'N-A-02-002', block_no: 'A', row_no: 2, niche_no: 2, niche_type: 'standard', status: 'available', floor_level: 1 },
    { niche_id: 'N-B-01-001', block_no: 'B', row_no: 1, niche_no: 1, niche_type: 'economy', status: 'available', floor_level: 1 },
    { niche_id: 'N-B-01-002', block_no: 'B', row_no: 1, niche_no: 2, niche_type: 'economy', status: 'occupied', floor_level: 1 },
    { niche_id: 'N-B-02-001', block_no: 'B', row_no: 2, niche_no: 1, niche_type: 'standard', status: 'available', floor_level: 2 },
    { niche_id: 'N-B-02-002', block_no: 'B', row_no: 2, niche_no: 2, niche_type: 'standard', status: 'maintenance', floor_level: 2 },
])

// ── parks ────────────────────────────────────────────────────────────
await insert('parks', [
    { park_id: 'PARK-001', park_name: 'Quezon Memorial Circle Park', location: 'Elliptical Rd, Quezon City', area_sqm: 14700, amenities: ['Jogging Path', 'Playground', 'Picnic Area', 'Basketball Court'], status: 'open' },
    { park_id: 'PARK-002', park_name: 'Ninoy Aquino Parks & Wildlife', location: 'North Ave, Quezon City', area_sqm: 22000, amenities: ['Zoo', 'Picnic Area', 'Open Field'], status: 'open' },
    { park_id: 'PARK-003', park_name: 'La Mesa Eco Park', location: 'Commonwealth Ave, QC', area_sqm: 3300, amenities: ['Swimming Pool', 'Bike Trail', 'Picnic Area'], status: 'open' },
    { park_id: 'PARK-004', park_name: 'Eastwood City Park', location: 'Eastwood Ave, Libis', area_sqm: 5000, amenities: ['Jogging Path', 'Food Court', 'Events Ground'], status: 'open' },
    { park_id: 'PARK-005', park_name: 'Brgy 123 Mini Park', location: 'P. Florentino St, QC', area_sqm: 800, amenities: ['Playground', 'Basketball Half Court'], status: 'maintenance' },
])

// ── park_reservations ────────────────────────────────────────────────
await insert('park_reservations', [
    { reservation_id: 'PR-2024-020', park_id: 'PARK-001', requester_name: 'Maria Santos', requester_contact: '09171234560', event_name: 'Santos Family Reunion', event_type: 'community', event_date: '2024-03-15', start_time: '09:00', end_time: '17:00', expected_guests: 80, area_section: 'Zone B', status: 'approved', fee_amount: 2500, payment_status: 'paid' },
    { reservation_id: 'PR-2024-019', park_id: 'PARK-002', requester_name: 'Joven Dela Vega', requester_contact: '09182345671', event_name: 'QC Basketball Tournament', event_type: 'sports', event_date: '2024-03-10', start_time: '06:00', end_time: '20:00', expected_guests: 200, area_section: 'Main Court', status: 'approved', fee_amount: 5000, payment_status: 'paid' },
    { reservation_id: 'PR-2024-018', park_id: 'PARK-001', requester_name: 'Ana Cruz', requester_contact: '09193456782', event_name: 'Birthday Celebration', event_type: 'birthday', event_date: '2024-03-08', start_time: '14:00', end_time: '19:00', expected_guests: 50, area_section: 'Pavilion C', status: 'completed', fee_amount: 1500, payment_status: 'paid' },
    { reservation_id: 'PR-2024-017', park_id: 'PARK-003', requester_name: 'Global Corp Inc.', requester_contact: '09104567893', event_name: 'Annual Team Building', event_type: 'corporate', event_date: '2024-03-05', start_time: '08:00', end_time: '17:00', expected_guests: 120, area_section: 'Full Campsite', status: 'approved', fee_amount: 8000, payment_status: 'paid' },
    { reservation_id: 'PR-2024-016', park_id: 'PARK-004', requester_name: 'Eduardo Marquez', requester_contact: '09126789015', event_name: 'Wedding Reception', event_type: 'wedding', event_date: '2024-04-20', start_time: '15:00', end_time: '22:00', expected_guests: 150, area_section: 'Events Grounds', status: 'pending', fee_amount: 12000, payment_status: 'unpaid' },
    { reservation_id: 'PR-2024-015', park_id: 'PARK-002', requester_name: 'Christina Moran', requester_contact: '09137890126', event_name: 'Fun Run 5K', event_type: 'sports', event_date: '2024-04-14', start_time: '05:00', end_time: '09:00', expected_guests: 300, area_section: 'Main Loop Road', status: 'pending', fee_amount: 3000, payment_status: 'unpaid' },
    { reservation_id: 'PR-2024-014', park_id: 'PARK-003', requester_name: 'BRR Community Assoc.', requester_contact: '09148901237', event_name: 'Barangay Day Celebration', event_type: 'community', event_date: '2024-04-07', start_time: '08:00', end_time: '22:00', expected_guests: 500, area_section: 'Multiple Areas', status: 'approved', fee_amount: 0, payment_status: 'paid' },
    { reservation_id: 'PR-2024-013', park_id: 'PARK-005', requester_name: 'Kids League QC', requester_contact: '09159012348', event_name: 'Mini Olympics - Kids', event_type: 'sports', event_date: '2024-03-22', start_time: '08:00', end_time: '16:00', expected_guests: 100, area_section: 'Full Park', status: 'rejected', fee_amount: 1000, payment_status: 'unpaid', notes: 'Facility under maintenance' },
])

// ── barangay_facilities ──────────────────────────────────────────────
await insert('barangay_facilities', [
    { facility_id: 'FAC-001', facility_name: 'Barangay 123 Multi-Purpose Hall', facility_type: 'hall', capacity: 300, location: 'Ground Floor, Brgy 123 Hall', hourly_rate: 500, status: 'available', amenities: ['Projector', 'Sound System', 'Tables & Chairs', 'AC'] },
    { facility_id: 'FAC-002', facility_name: 'Barangay Basketball Court', facility_type: 'court', capacity: 500, location: 'Beside Brgy Hall', hourly_rate: 0, status: 'available', amenities: ['Bleachers', 'Scoreboard', 'Lights'] },
    { facility_id: 'FAC-003', facility_name: 'Barangay Function Room', facility_type: 'room', capacity: 50, location: '2nd Floor, Brgy Building', hourly_rate: 300, status: 'available', amenities: ['Projector', 'Whiteboard', 'AC', 'WiFi'] },
    { facility_id: 'FAC-004', facility_name: 'Livelihood Training Center', facility_type: 'multipurpose', capacity: 80, location: '3rd Floor, Brgy Annex', hourly_rate: 200, status: 'available', amenities: ['Sewing Machines', 'Tables', 'AC'] },
    { facility_id: 'FAC-005', facility_name: 'Senior Citizens Hall', facility_type: 'hall', capacity: 100, location: 'Annex Building', hourly_rate: 0, status: 'available', amenities: ['Tables', 'Chairs', 'Fan'] },
])

// ── barangay_reservations ────────────────────────────────────────────
await insert('barangay_reservations', [
    { reservation_id: 'BR-2024-030', facility_id: 'FAC-001', requester_name: 'Juan Santos', requester_contact: '09171234000', event_name: 'Santos Family Reunion', event_date: '2024-03-20', start_time: '10:00', end_time: '18:00', expected_guests: 150, purpose: 'Family reunion', status: 'confirmed', fee_amount: 2500, payment_status: 'paid', approved_by: 'Sec. Maribel Reyes' },
    { reservation_id: 'BR-2024-029', facility_id: 'FAC-002', requester_name: 'Brgy Basketball League', requester_contact: '09182345001', event_name: 'Season Finals', event_date: '2024-03-18', start_time: '06:00', end_time: '22:00', expected_guests: 400, purpose: 'Basketball tournament', status: 'confirmed', fee_amount: 0, payment_status: 'paid', approved_by: 'Sec. Maribel Reyes' },
    { reservation_id: 'BR-2024-028', facility_id: 'FAC-003', requester_name: 'QC MSME Summit', requester_contact: '09193456002', event_name: 'MSME Orientation Seminar', event_date: '2024-03-15', start_time: '08:00', end_time: '17:00', expected_guests: 45, purpose: 'Government seminar', status: 'confirmed', fee_amount: 0, payment_status: 'paid', approved_by: 'Sec. Maribel Reyes' },
    { reservation_id: 'BR-2024-027', facility_id: 'FAC-001', requester_name: 'Sta. Ana Family', requester_contact: '09104567003', event_name: 'Graduation Celebration', event_date: '2024-03-12', start_time: '15:00', end_time: '21:00', expected_guests: 200, purpose: 'Private celebration', status: 'completed', fee_amount: 2500, payment_status: 'paid', approved_by: 'Sec. Maribel Reyes' },
    { reservation_id: 'BR-2024-026', facility_id: 'FAC-004', requester_name: 'TESDA QC Branch', requester_contact: '09115678004', event_name: 'Free Livelihood Training', event_date: '2024-03-10', start_time: '08:00', end_time: '17:00', expected_guests: 60, purpose: 'Livelihood program', status: 'completed', fee_amount: 0, payment_status: 'paid', approved_by: 'Sec. Maribel Reyes' },
    { reservation_id: 'BR-2024-025', facility_id: 'FAC-001', requester_name: 'Arlene Pascual', requester_contact: '09137890006', event_name: 'Birthday Party — 18th', event_date: '2024-04-25', start_time: '16:00', end_time: '22:00', expected_guests: 250, purpose: 'Birthday debut', status: 'pending', fee_amount: 3000, payment_status: 'unpaid' },
    { reservation_id: 'BR-2024-024', facility_id: 'FAC-003', requester_name: 'DOH QC District', requester_contact: '09148901007', event_name: 'Health Seminar', event_date: '2024-04-18', start_time: '08:00', end_time: '12:00', expected_guests: 40, purpose: 'Health awareness', status: 'pending', fee_amount: 0, payment_status: 'unpaid' },
    { reservation_id: 'BR-2024-023', facility_id: 'FAC-001', requester_name: 'NPC Electoral Division', requester_contact: '09160123009', event_name: 'Voter Registration Drive', event_date: '2024-04-08', start_time: '08:00', end_time: '17:00', expected_guests: 100, purpose: 'Government activity', status: 'pending', fee_amount: 0, payment_status: 'unpaid' },
    { reservation_id: 'BR-2024-022', facility_id: 'FAC-004', requester_name: 'Maabilidad Coop', requester_contact: '09171234010', event_name: 'Handicraft Fair', event_date: '2024-03-28', start_time: '08:00', end_time: '18:00', expected_guests: 70, purpose: 'Cooperative event', status: 'rejected', fee_amount: 1000, payment_status: 'unpaid' },
])

// ── service_tickets ──────────────────────────────────────────────────
await insert('service_tickets', [
    { ticket_id: 'ST-2024-100', ticket_type: 'water_connection', requester_name: 'Luisa Hernandez', requester_contact: '09171111100', description: 'Requesting new water connection for residential unit', location: 'Blk 4 Lot 12, Brgy. 123', priority: 'medium', status: 'open' },
    { ticket_id: 'ST-2024-099', ticket_type: 'leak_report', requester_name: 'Ricardo Castillo', requester_contact: '09182222100', description: 'Major pipe burst near main road causing flooding', location: 'Q.C. Ave, near EDSA', priority: 'critical', status: 'in_progress', assigned_to: 'Engr. Cruz Dagatan' },
    { ticket_id: 'ST-2024-098', ticket_type: 'drainage', requester_name: 'Norma Dela Vega', requester_contact: '09193333100', description: 'Drainage clogged causing water backup in street', location: 'P. Florentino St.', priority: 'high', status: 'assigned', assigned_to: 'Team B' },
    { ticket_id: 'ST-2024-097', ticket_type: 'general', requester_name: 'Eduardo Marquez', requester_contact: '09104444100', description: 'Inquiry about water bill discrepancy', location: 'Pasig District Office', priority: 'low', status: 'open' },
    { ticket_id: 'ST-2024-096', ticket_type: 'leak_report', requester_name: 'Christina Moran', requester_contact: '09115555100', description: 'Underground pipe leak detected in alley', location: 'Brgy. 456 — Alley 7', priority: 'high', status: 'assigned', assigned_to: 'Engr. Cruz Dagatan' },
    { ticket_id: 'ST-2024-095', ticket_type: 'water_connection', requester_name: 'Manuel Soriano', requester_contact: '09126666100', description: 'Water connection for new commercial establishment', location: 'Scout Barrio, QC', priority: 'medium', status: 'resolved', assigned_to: 'Engr. Cruz Dagatan', resolution_note: 'New connection installed and tested' },
    { ticket_id: 'ST-2024-094', ticket_type: 'drainage', requester_name: 'Rosa Garcia', requester_contact: '09137777100', description: 'Drainage overflow during heavy rain', location: 'Sampaguita St.', priority: 'high', status: 'in_progress', assigned_to: 'Team C' },
    { ticket_id: 'ST-2024-093', ticket_type: 'water_connection', requester_name: 'Aurelio Pascual', requester_contact: '09148888100', description: 'Request for water meter replacement', location: 'Unit 12, Brgy 789', priority: 'medium', status: 'resolved', assigned_to: 'Team A', resolution_note: 'Meter replaced and calibrated' },
    { ticket_id: 'ST-2024-092', ticket_type: 'leak_report', requester_name: 'Teresita Lim', requester_contact: '09159999100', description: 'Water pressure extremely low for 5 days', location: 'Block 2 Purok 3', priority: 'medium', status: 'closed', assigned_to: 'Engr. Cruz Dagatan', resolution_note: 'Main valve adjusted' },
    { ticket_id: 'ST-2024-091', ticket_type: 'drainage', requester_name: 'Gina Soriano', requester_contact: '09171000101', description: 'Storm drain overflowing with solid waste near school', location: 'School Zone, Matandang Balara', priority: 'critical', status: 'open' },
    { ticket_id: 'ST-2024-090', ticket_type: 'water_connection', requester_name: 'Arturo Navarro', requester_contact: '09182000102', description: 'Water service disconnected without notice', location: 'Brgy Holy Spirit, QC', priority: 'critical', status: 'assigned', assigned_to: 'Engr. Cruz Dagatan' },
])

// ── payment_transactions ─────────────────────────────────────────────
await insert('payment_transactions', [
    { transaction_id: 'TXN-2024-550', bill_reference_no: 'BILL-BA-049', module_source: 'Burial', gateway_provider: 'gcash', amount_settled: 2500, digital_hash: 'sha256:a1b2c3d4', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-549', bill_reference_no: 'BILL-PR-020', module_source: 'Parks', gateway_provider: 'maya', amount_settled: 2500, digital_hash: 'sha256:b2c3d4e5', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-548', bill_reference_no: 'BILL-BR-030', module_source: 'Barangay', gateway_provider: 'landbank', amount_settled: 2500, digital_hash: 'sha256:c3d4e5f6', settlement_status: 'settled', reconciled: false },
    { transaction_id: 'TXN-2024-547', bill_reference_no: 'BILL-ST-099', module_source: 'Utility', gateway_provider: 'credit_card', amount_settled: 3200, digital_hash: 'sha256:d4e5f6a1', settlement_status: 'failed', reconciled: false },
    { transaction_id: 'TXN-2024-546', bill_reference_no: 'BILL-BA-048', module_source: 'Burial', gateway_provider: 'gcash', amount_settled: 2500, digital_hash: 'sha256:e5f6a1b2', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-545', bill_reference_no: 'BILL-PR-019', module_source: 'Parks', gateway_provider: 'maya', amount_settled: 5000, digital_hash: 'sha256:f6a1b2c3', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-544', bill_reference_no: 'BILL-BA-047', module_source: 'Burial', gateway_provider: 'gcash', amount_settled: 2500, digital_hash: 'sha256:a1f2e3d4', settlement_status: 'reversed', reconciled: false },
    { transaction_id: 'TXN-2024-543', bill_reference_no: 'BILL-BR-029', module_source: 'Barangay', gateway_provider: 'landbank', amount_settled: 0, digital_hash: 'sha256:b1a2f3e4', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-542', bill_reference_no: 'BILL-PR-018', module_source: 'Parks', gateway_provider: 'gcash', amount_settled: 1500, digital_hash: 'sha256:c1b2a3f4', settlement_status: 'settled', reconciled: false },
    { transaction_id: 'TXN-2024-541', bill_reference_no: 'BILL-BA-046', module_source: 'Burial', gateway_provider: 'credit_card', amount_settled: 2500, digital_hash: 'sha256:d1c2b3a4', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-540', bill_reference_no: 'BILL-ST-095', module_source: 'Utility', gateway_provider: 'gcash', amount_settled: 500, digital_hash: 'sha256:e1d2c3b4', settlement_status: 'settled', reconciled: true, reconciled_by: 'Tres. Gloria Santos' },
    { transaction_id: 'TXN-2024-539', bill_reference_no: 'BILL-BA-045', module_source: 'Burial', gateway_provider: 'gcash', amount_settled: 2500, digital_hash: 'sha256:f1e2d3c4', settlement_status: 'pending', reconciled: false },
])

// ── constituent_records ──────────────────────────────────────────────
await insert('constituent_records', [
    { record_id: 'CR-001', full_name: 'Juan Santos Dela Cruz', birthdate: '1980-05-15', gender: 'Male', civil_status: 'Married', purok: 'Purok 1', address: 'Blk 4 Lot 2', contact_no: '09171234567', registered_voter: true, indigent: false, senior_citizen: false, pwd: false, solo_parent: false, tags: ['NHTS'] },
    { record_id: 'CR-002', full_name: 'Maria Isabel Reyes', birthdate: '1990-08-22', gender: 'Female', civil_status: 'Single', purok: 'Purok 2', address: 'Blk 7 Lot 5', contact_no: '09281234567', registered_voter: true, indigent: true, senior_citizen: false, pwd: false, solo_parent: true, tags: ['4Ps', 'Indigent'] },
    { record_id: 'CR-003', full_name: 'Pedro Santiago Bautista', birthdate: '1955-12-01', gender: 'Male', civil_status: 'Married', purok: 'Purok 1', address: 'Corner P. Florentino', contact_no: '09501234567', registered_voter: true, indigent: false, senior_citizen: true, pwd: false, solo_parent: false, tags: ['Senior', 'OSY'] },
    { record_id: 'CR-004', full_name: 'Lolita Torres Gonzalez', birthdate: '1985-03-18', gender: 'Female', civil_status: 'Widowed', purok: 'Purok 3', address: 'Phase 2 Brgy 456', contact_no: '09181234567', registered_voter: false, indigent: true, senior_citizen: false, pwd: false, solo_parent: false, tags: ['Indigent'] },
    { record_id: 'CR-005', full_name: 'Roberto Aquino Flores', birthdate: '1948-11-30', gender: 'Male', civil_status: 'Married', purok: 'Purok 2', address: 'Sampaguita St.', contact_no: '09271234567', registered_voter: true, indigent: false, senior_citizen: true, pwd: false, solo_parent: false, tags: ['Senior'] },
    { record_id: 'CR-006', full_name: 'Ana Clara Villanueva', birthdate: '1995-07-04', gender: 'Female', civil_status: 'Single', purok: 'Purok 4', address: 'Purok 4 Sitio A', contact_no: '09361234567', registered_voter: true, indigent: false, senior_citizen: false, pwd: false, solo_parent: false, tags: [] },
    { record_id: 'CR-007', full_name: 'Eduardo Marcos Ramos', birthdate: '1975-09-12', gender: 'Male', civil_status: 'Married', purok: 'Purok 3', address: 'Unit 3 Lot B', contact_no: '09451234567', registered_voter: true, indigent: false, senior_citizen: false, pwd: true, solo_parent: false, tags: ['PWD'] },
    { record_id: 'CR-008', full_name: 'Rosa Divina Castillo', birthdate: '1945-01-25', gender: 'Female', civil_status: 'Widowed', purok: 'Purok 1', address: 'Blk 1 Lot 1', contact_no: '09561234567', registered_voter: false, indigent: true, senior_citizen: true, pwd: false, solo_parent: false, tags: ['Indigent', 'Senior'] },
    { record_id: 'CR-009', full_name: 'Fernando Javier Morales', birthdate: '2000-04-14', gender: 'Male', civil_status: 'Single', purok: 'Purok 2', address: 'Phase 1 Housing', contact_no: '09671234567', registered_voter: false, indigent: false, senior_citizen: false, pwd: false, solo_parent: false, tags: ['OSY'] },
    { record_id: 'CR-010', full_name: 'Gloria Esperanza Tan', birthdate: '1960-06-30', gender: 'Female', civil_status: 'Married', purok: 'Purok 1', address: 'Lot 10 Blk 2', contact_no: '09781234567', registered_voter: true, indigent: false, senior_citizen: true, pwd: false, solo_parent: false, tags: ['Senior'] },
    { record_id: 'CR-011', full_name: 'Marites Ocampo Reyes', birthdate: '1988-10-05', gender: 'Female', civil_status: 'Married', purok: 'Purok 3', address: 'Sitio Bagong Buhay', contact_no: '09901234567', registered_voter: true, indigent: true, senior_citizen: false, pwd: true, solo_parent: false, tags: ['Indigent', 'PWD'] },
    { record_id: 'CR-012', full_name: 'Elena Castro Buenaventura', birthdate: '1982-08-08', gender: 'Female', civil_status: 'Married', purok: 'Purok 1', address: 'Corner Rosa St.', contact_no: '09341234567', registered_voter: true, indigent: false, senior_citizen: false, pwd: false, solo_parent: true, tags: ['Solo Parent'] },
    { record_id: 'CR-013', full_name: 'Crisanto Manalo Vergara', birthdate: '1940-12-25', gender: 'Male', civil_status: 'Widowed', purok: 'Purok 2', address: 'Old Compound', contact_no: '09451234560', registered_voter: true, indigent: true, senior_citizen: true, pwd: false, solo_parent: false, tags: ['Indigent', 'Senior', 'NHTS'] },
    { record_id: 'CR-014', full_name: 'Patricia Dela Torre Lim', birthdate: '1978-05-05', gender: 'Female', civil_status: 'Married', purok: 'Purok 3', address: 'Blk 8 Lot 4', contact_no: '09561234560', registered_voter: true, indigent: false, senior_citizen: false, pwd: false, solo_parent: false, tags: [] },
    { record_id: 'CR-015', full_name: 'Romulo Aguilar Navarro', birthdate: '2002-09-09', gender: 'Male', civil_status: 'Single', purok: 'Purok 4', address: 'Youth Compound', contact_no: '09671234560', registered_voter: false, indigent: false, senior_citizen: false, pwd: false, solo_parent: false, tags: ['OSY'] },
])

// ── barangay_ordinances ──────────────────────────────────────────────
await insert('barangay_ordinances', [
    { ordinance_id: 'ORD-001', ordinance_no: 'Ord. No. 34 s.2024', title: 'Anti-Noise Pollution Ordinance', description: 'Regulates noise levels in residential areas from 10PM to 6AM.', category: 'Public Order', date_enacted: '2024-01-15', date_effective: '2024-01-22', status: 'active', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-002', ordinance_no: 'Ord. No. 33 s.2023', title: 'Solid Waste Segregation Ordinance', description: 'Mandates waste segregation at source for all households.', category: 'Environment', date_enacted: '2023-09-01', date_effective: '2023-09-15', status: 'active', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-003', ordinance_no: 'Ord. No. 32 s.2023', title: 'Senior Citizens Welfare Ordinance Amendment', description: 'Amendment expanding stipend by ₱500 for qualifying senior citizens.', category: 'Social Welfare', date_enacted: '2023-07-20', date_effective: '2023-08-01', status: 'amended', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-004', ordinance_no: 'Ord. No. 31 s.2023', title: 'Youth Sports Development Fund Ordinance', description: 'Allocates 5% of barangay budget to youth sports programs.', category: 'Youth & Sports', date_enacted: '2023-05-10', date_effective: '2023-06-01', status: 'active', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-005', ordinance_no: 'Ord. No. 30 s.2023', title: 'Anti-Littering and Clean Sidewalk Ordinance', description: 'Prohibits littering and sidewalk obstruction. Fine ₱500-₱2,000.', category: 'Environment', date_enacted: '2023-03-14', date_effective: '2023-04-01', status: 'active', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-006', ordinance_no: 'Ord. No. 29 s.2022', title: 'Barangay Health Emergency Response Ordinance', description: 'Establishes health emergency protocols and community response team.', category: 'Health', date_enacted: '2022-11-20', date_effective: '2022-12-01', status: 'active', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-007', ordinance_no: 'Ord. No. 28 s.2022', title: 'Senior Citizens Benefits Ordinance', description: 'Monthly cash assistance and medicine subsidies for senior citizens.', category: 'Social Welfare', date_enacted: '2022-08-05', date_effective: '2022-09-01', status: 'amended', enacted_by: 'Capt. Rodrigo Lim' },
    { ordinance_id: 'ORD-008', ordinance_no: 'Ord. No. 27 s.2022', title: 'Curfew Ordinance for Minors', description: 'Curfew hours for minors below 18: 10PM to 5AM on school days.', category: 'Public Order', date_enacted: '2022-05-01', date_effective: '2022-05-15', status: 'active', enacted_by: 'Capt. Jose Manalac' },
    { ordinance_id: 'ORD-009', ordinance_no: 'Ord. No. 26 s.2021', title: 'Anti-Stray Animals Ordinance', description: 'Requires pet registration and prohibits free-roaming animals.', category: 'Public Order', date_enacted: '2021-12-10', date_effective: '2022-01-01', status: 'active', enacted_by: 'Capt. Jose Manalac' },
    { ordinance_id: 'ORD-010', ordinance_no: 'Ord. No. 25 s.2021', title: 'DRRM Ordinance', description: 'Establishes BDRRMC structure and evacuation protocols.', category: 'Infrastructure', date_enacted: '2021-07-15', date_effective: '2021-08-01', status: 'repealed', enacted_by: 'Capt. Jose Manalac' },
])

// ── barangay_documents ───────────────────────────────────────────────
await insert('barangay_documents', [
    { document_id: 'DOC-001', document_no: 'RES-001-2024', document_type: 'resolution', title: 'Resolution Endorsing Youth Leadership Program', issued_to: 'N/A', purpose: 'For submission to City Youth Office', status: 'filed', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-01' },
    { document_id: 'DOC-002', document_no: 'CERT-0290', document_type: 'clearance', title: 'Barangay Clearance', issued_to: 'Anna Santos', purpose: 'For employment application', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-05' },
    { document_id: 'DOC-003', document_no: 'CERT-0289', document_type: 'clearance', title: 'Barangay Clearance', issued_to: 'Juan Santos', purpose: 'For NBI Clearance renewal', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-05' },
    { document_id: 'DOC-004', document_no: 'CERT-0288', document_type: 'certificate', title: 'Certificate of Residency', issued_to: 'Maria Dela Cruz', purpose: 'For school enrollment', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-04' },
    { document_id: 'DOC-005', document_no: 'PER-0045', document_type: 'permit', title: 'Permit to Renovate — Blk 5 Lot 3', issued_to: 'Pedro Bautista', purpose: 'Renovation permit', status: 'filed', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-04' },
    { document_id: 'DOC-006', document_no: 'MEMO-019', document_type: 'memo', title: 'Memorandum on Prohibited Burning of Garbage', issued_to: 'All Purok Leaders', purpose: 'DENR compliance directive', status: 'filed', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-03' },
    { document_id: 'DOC-007', document_no: 'LTR-008', document_type: 'letter', title: 'Letter to DSWD Re: Indigent Assistance Funding', issued_to: 'DSWD QC Division', purpose: 'Request for funding', status: 'draft', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-02' },
    { document_id: 'DOC-008', document_no: 'CERT-0287', document_type: 'certificate', title: 'Certificate of Indigency', issued_to: 'Dolores Torres', purpose: 'For medical assistance', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-02-28' },
    { document_id: 'DOC-009', document_no: 'CERT-0286', document_type: 'certificate', title: 'Certificate of Residency', issued_to: 'Rodrigo Beltran', purpose: 'For business permit renewal', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-02-27' },
    { document_id: 'DOC-010', document_no: 'RES-021-2024', document_type: 'resolution', title: 'Resolution Approving Community Hall Reservation', issued_to: 'N/A', purpose: 'Official record keeping', status: 'filed', issued_by: 'Sec. Maribel Reyes', document_date: '2024-03-05' },
    { document_id: 'DOC-011', document_no: 'LTR-007', document_type: 'letter', title: 'Letter of Recommendation — Scholarship', issued_to: 'QC Science High School', purpose: 'Scholarship endorsement', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-02-25' },
    { document_id: 'DOC-012', document_no: 'CERT-0285', document_type: 'clearance', title: 'Barangay Clearance', issued_to: 'Eduardo Ramos', purpose: 'For driver license renewal', status: 'released', issued_by: 'Sec. Maribel Reyes', document_date: '2024-02-24' },
])

// ── asset_inventory ──────────────────────────────────────────────────
await insert('asset_inventory', [
    { asset_id: 'ASSET-001', asset_name: 'Dump Truck — Unit 1', asset_type: 'vehicle', category: 'Heavy Equipment', serial_no: 'DT-QC-2021-001', acquisition_date: '2021-03-15', acquisition_cost: 3500000, current_value: 2800000, condition: 'good', location: 'Equipment Pool, QC', assigned_to: 'Engr. Division' },
    { asset_id: 'ASSET-002', asset_name: 'Water Pump — 10HP', asset_type: 'equipment', category: 'Water Supply', serial_no: 'WP-2020-004', acquisition_date: '2020-07-01', acquisition_cost: 85000, current_value: 62000, condition: 'fair', location: 'Pumping Station A', assigned_to: 'Utility Division', last_maintenance: '2023-11-01', notes: 'Needs seal replacement' },
    { asset_id: 'ASSET-003', asset_name: 'Backhoe Loader', asset_type: 'vehicle', category: 'Heavy Equipment', serial_no: 'BH-QC-2019-001', acquisition_date: '2019-05-20', acquisition_cost: 5200000, current_value: 3100000, condition: 'good', location: 'Equipment Pool, QC', assigned_to: 'Engr. Division', last_maintenance: '2024-01-15' },
    { asset_id: 'ASSET-004', asset_name: 'Desktop Computer — Admin 1', asset_type: 'it_equipment', category: 'IT Equipment', serial_no: 'PC-ADMIN-001', acquisition_date: '2022-01-10', acquisition_cost: 45000, current_value: 32000, condition: 'excellent', location: 'Admin Office', assigned_to: 'IT Department' },
    { asset_id: 'ASSET-005', asset_name: 'Emergency Generator — 50KVA', asset_type: 'equipment', category: 'Power Equipment', serial_no: 'GEN-50KVA-001', acquisition_date: '2020-09-01', acquisition_cost: 380000, current_value: 290000, condition: 'good', location: 'Brgy Hall Basement', assigned_to: 'Maintenance' },
    { asset_id: 'ASSET-006', asset_name: 'CCTV System — 16 Channel', asset_type: 'it_equipment', category: 'Security Equipment', serial_no: 'CCTV-16CH-001', acquisition_date: '2023-01-15', acquisition_cost: 180000, current_value: 165000, condition: 'excellent', location: 'Security Office', assigned_to: 'IT Department' },
    { asset_id: 'ASSET-007', asset_name: 'Patrol Motorcycle — Unit 3', asset_type: 'vehicle', category: 'Light Vehicle', serial_no: 'MOTO-BRY-003', acquisition_date: '2022-08-01', acquisition_cost: 145000, current_value: 105000, condition: 'good', location: 'Motorpool', assigned_to: 'BDRRMC' },
    { asset_id: 'ASSET-008', asset_name: 'Sound System — Outdoor', asset_type: 'equipment', category: 'Audio Equipment', serial_no: 'SS-OUTDOOR-001', acquisition_date: '2021-04-01', acquisition_cost: 75000, current_value: 55000, condition: 'fair', location: 'Storage Room B', assigned_to: 'Events Office', last_maintenance: '2023-08-01', notes: 'Speaker cone replacement needed' },
    { asset_id: 'ASSET-009', asset_name: 'Ride-On Grass Cutter', asset_type: 'equipment', category: 'Grounds Equipment', serial_no: 'GC-TORO-001', acquisition_date: '2021-08-15', acquisition_cost: 98000, current_value: 72000, condition: 'fair', location: 'Parks Storage', assigned_to: 'Parks Division', last_maintenance: '2023-12-01' },
    { asset_id: 'ASSET-010', asset_name: 'Meeting Room Projector', asset_type: 'it_equipment', category: 'IT Equipment', serial_no: 'PROJ-MEET-001', acquisition_date: '2022-05-01', acquisition_cost: 35000, current_value: 28000, condition: 'excellent', location: 'Meeting Room', assigned_to: 'IT Department' },
    { asset_id: 'ASSET-011', asset_name: 'Filing Cabinet — 4 Drawer', asset_type: 'furniture', category: 'Office Furniture', serial_no: 'FC-BRGY-005', acquisition_date: '2020-01-15', acquisition_cost: 12000, current_value: 8000, condition: 'good', location: 'Records Room', assigned_to: 'Secretary' },
    { asset_id: 'ASSET-012', asset_name: 'Laptop — Records Officer', asset_type: 'it_equipment', category: 'IT Equipment', serial_no: 'LT-REC-001', acquisition_date: '2023-04-01', acquisition_cost: 55000, current_value: 50000, condition: 'excellent', location: 'Records Office', assigned_to: 'Secretary' },
])

// ── notifications ────────────────────────────────────────────────────
await insert('notifications', [
    { notif_id: 'NOTIF-001', user_role: 'cemetery_office', title: 'New Burial Application', message: 'BA-2024-050 submitted by Pedro Bautista — requires review.', type: 'info', is_read: false, link_path: '/burial/applications' },
    { notif_id: 'NOTIF-002', user_role: 'barangay_secretary', title: 'Reservation Confirmed', message: 'Facility reservation BR-2024-030 for Juan Santos confirmed.', type: 'success', is_read: false, link_path: '/barangay/reservations' },
    { notif_id: 'NOTIF-003', user_role: 'utility_engineer', title: 'Critical Ticket Assigned', message: 'ST-2024-099 (Major pipe burst) — CRITICAL PRIORITY.', type: 'error', is_read: false, link_path: '/utility/tickets' },
    { notif_id: 'NOTIF-004', user_role: 'treasurer', title: 'Pending Reconciliation', message: '3 transactions need reconciliation: TXN-2024-548, TXN-2024-542.', type: 'warning', is_read: false, link_path: '/treasurer/transactions' },
    { notif_id: 'NOTIF-005', user_role: 'parks_admin', title: 'New Park Reservation', message: 'PR-2024-016 (Wedding Reception) pending approval.', type: 'info', is_read: false, link_path: '/parks/reservations' },
    { notif_id: 'NOTIF-006', user_role: 'barangay_secretary', title: 'Document Requested', message: 'Certificate of Residency — CERT-0288 for Maria Dela Cruz.', type: 'info', is_read: false, link_path: '/barangay/documents' },
    { notif_id: 'NOTIF-007', user_role: 'punong_barangay', title: 'Ordinance Review Required', message: 'Ord. No. 33 s.2023 due for annual review.', type: 'warning', is_read: false, link_path: '/barangay/ordinances' },
    { notif_id: 'NOTIF-008', user_role: 'treasurer', title: 'Failed Transaction Alert', message: 'TXN-2024-547 failed via credit_card — ₱3,200 needs follow-up.', type: 'error', is_read: false, link_path: '/treasurer/transactions' },
])

console.log('\n🎉 BPM Supabase seeding complete!')
