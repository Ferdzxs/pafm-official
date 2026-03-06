// ─── Auth & Users ────────────────────────────────────────────────────────────
export type UserRole =
    | 'cemetery_office'
    | 'ssdd'
    | 'death_registration'
    | 'citizen'
    | 'parks_admin'
    | 'reservation_officer'
    | 'punong_barangay'
    | 'barangay_secretary'
    | 'utility_engineering'
    | 'utility_helpdesk'
    | 'cgsd_management'
    | 'famcd'
    | 'treasurer'
    | 'system_admin'

export interface AuthUser {
    id: string
    email: string
    role: UserRole
    full_name: string
    avatar_url?: string
    office?: string
    employee_id?: string
    is_citizen: boolean
}

// ─── Person & Account ─────────────────────────────────────────────────────────
export interface Person {
    person_id: string
    account_id?: string
    full_name: string
    date_of_birth?: string
    address?: string
    contact_number?: string
    valid_id_number?: string
    created_at: string
}

// ─── Cemetery & Burial ───────────────────────────────────────────────────────
export type ApplicationStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed'

export interface OnlineBurialApplication {
    application_id: string
    applicant_person_id: string
    applicant_name: string
    deceased_name: string
    date_of_death: string
    death_certificate_no?: string
    document_id?: string
    status: ApplicationStatus
    notes?: string
    created_at: string
}

export interface Deceased {
    deceased_id: string
    full_name: string
    date_of_death: string
    death_certificate_no?: string
    person_id?: string
    created_at: string
}

export interface NicheRecord {
    niche_id: string
    cemetery_id: string
    niche_number: string
    section: string
    status: 'available' | 'occupied' | 'reserved' | 'maintenance'
    occupant_name?: string
}

export interface BurialRecord {
    burial_id: string
    deceased_id: string
    niche_id: string
    burial_date: string
    payment_id?: string
    funeral_home_id?: string
    approved_by?: string
    status: ApplicationStatus
    created_at: string
}

export interface IndigentAssistanceRecord {
    assistance_id: string
    person_id: string
    deceased_id?: string
    assistance_type: string
    status: ApplicationStatus
    social_worker?: string
    created_at: string
}

// ─── Parks & Recreation ──────────────────────────────────────────────────────
export interface ParkVenue {
    venue_id: string
    venue_name: string
    location: string
    capacity: number
    amenities?: string
    status: 'active' | 'maintenance' | 'closed'
}

export interface ParkReservationRecord {
    reservation_id: string
    venue_id: string
    venue_name: string
    applicant_name: string
    event_date: string
    start_time: string
    end_time: string
    purpose: string
    status: ApplicationStatus
    digital_permit_url?: string
    created_at: string
}

// ─── Barangay Facility ───────────────────────────────────────────────────────
export interface BarangayFacility {
    facility_id: string
    barangay_id: string
    facility_name: string
    location: string
    capacity?: number
    status: 'active' | 'maintenance' | 'closed'
}

export interface BarangayReservationRecord {
    reservation_id: string
    facility_id: string
    facility_name: string
    applicant_name: string
    event_date: string
    purpose: string
    status: ApplicationStatus
    approved_by?: string
    created_at: string
}

// ─── Water & Drainage ────────────────────────────────────────────────────────
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed'

export interface ServiceTicket {
    ticket_id: string
    ticket_type: 'water_connection' | 'leak_report' | 'drainage' | 'general'
    requester_name: string
    description: string
    location: string
    priority: TicketPriority
    status: TicketStatus
    assigned_to?: string
    created_at: string
    resolved_at?: string
}

export interface LeakReport {
    report_id: string
    ticket_id: string
    location: string
    severity: 'minor' | 'moderate' | 'severe'
    reported_by: string
    status: 'reported' | 'assessed' | 'in_repair' | 'repaired'
    created_at: string
}

export interface WaterConnectionRequest {
    request_id: string
    ticket_id?: string
    applicant_name: string
    address: string
    connection_type: string
    status: ApplicationStatus
    created_at: string
}

// ─── Asset Inventory ────────────────────────────────────────────────────────
export interface Property {
    property_id: string
    property_name: string
    property_type: string
    location: string
    acquisition_date?: string
    condition: 'excellent' | 'good' | 'fair' | 'poor'
    assigned_office?: string
    estimated_value?: number
}

export interface InventoryRequest {
    request_id: string
    requested_by: string
    office: string
    request_date: string
    status: 'pending' | 'scheduled' | 'completed'
    notes?: string
}

export interface OcularInspection {
    inspection_id: string
    property_id: string
    inspector_name: string
    inspection_date: string
    findings: string
    condition: string
}

export interface InventoryReport {
    report_id: string
    request_id: string
    prepared_by: string
    report_date: string
    status: 'draft' | 'submitted' | 'approved'
    total_items: number
}

// ─── Payments ───────────────────────────────────────────────────────────────
export type PaymentStatus = 'pending' | 'settled' | 'failed' | 'reversed'
export type GatewayProvider = 'gcash' | 'maya' | 'landbank' | 'credit_card'

export interface DigitalPayment {
    payment_id: string
    transaction_ref_no: string
    amount: number
    payment_status: PaymentStatus
    payment_date?: string
    digital_or_no?: string
    module_source: string
}

export interface IntegratedPaymentTransaction {
    transaction_id: string
    bill_reference_no: string
    gateway_provider_id: GatewayProvider
    transaction_timestamp: string
    amount_settled: number
    digital_hash_verification?: string
    settlement_status: PaymentStatus
    reconciled_flag: boolean
    reconciled_by?: string
    reconciled_date?: string
    module_source: string
}

// ─── Notifications ───────────────────────────────────────────────────────────
export interface NotificationLog {
    notif_id: string
    user_id: string
    title: string
    message: string
    is_read: boolean
    notif_type: 'info' | 'success' | 'warning' | 'error'
    created_at: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export interface DashboardStats {
    label: string
    value: number | string
    change?: number
    changeType?: 'increase' | 'decrease'
    icon?: string
    color?: string
}
