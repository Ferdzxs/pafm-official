import type { UserRole } from '@/types'
import type { FC } from 'react'
import {
    LayoutDashboard, Users, FileText, Building2, Calendar,
    Wrench, ClipboardList, Package, CreditCard, ShieldCheck,
    HelpCircle, Bell, Search, ChevronRight,
    Heart, Droplets, TreePine, Home, Skull, MapPin, Receipt,
    BarChart3, UserCog, Database, Hammer,
    Ticket, CheckSquare, AlertTriangle, Eye, BookOpen,
    FolderOpen, DollarSign, RefreshCw, FileCheck,
    Microscope, Send, LogOut, User
} from 'lucide-react'

export interface NavItem {
    id: string
    label: string
    icon: FC<{ size?: number; className?: string }>
    path: string
    badgeKey?: string
    children?: NavItem[]
}

// ─── RBAC — which nav items each role can see ────────────────────────────────
export const ROLE_NAV: Record<UserRole, NavItem[]> = {
    cemetery_office: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'burial-apps', label: 'Burial Applications', icon: ClipboardList, path: '/burial/applications', badgeKey: 'pending_burials' },
        { id: 'deceased', label: 'Deceased Registry', icon: Skull, path: '/burial/deceased' },
        { id: 'niches', label: 'Niche Management', icon: MapPin, path: '/burial/niches' },
        { id: 'burial-records', label: 'Burial Records', icon: BookOpen, path: '/burial/records' },
        { id: 'indigent', label: 'Indigent Assistance', icon: Heart, path: '/burial/indigent' },
        { id: 'payments', label: 'Payments & Permits', icon: CreditCard, path: '/payments' },
        { id: 'asset-requests', label: 'Asset Requests', icon: Package, path: '/burial/asset-requests' },
    ],
    ssdd: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'indigent-cases', label: 'Indigent Assistance', icon: Heart, path: '/ssdd/indigent', badgeKey: 'pending_assistance' },
        { id: 'citizens', label: 'Citizen Records', icon: Users, path: '/ssdd/citizens' },
        { id: 'coordination', label: 'Death Registration', icon: FileText, path: '/ssdd/coordination' },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, path: '/reports' },
    ],
    death_registration: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'cert-verify', label: 'Certificate Verification', icon: FileCheck, path: '/death/verify', badgeKey: 'pending_certs' },
        { id: 'received-docs', label: 'Received Documents', icon: FolderOpen, path: '/death/documents' },
        { id: 'approvals', label: 'Approvals & Signing', icon: CheckSquare, path: '/death/approvals' },
    ],
    citizen: [
        { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'my-apps', label: 'My Applications', icon: ClipboardList, path: '/citizen/applications' },
        { id: 'apply-burial', label: 'Apply: Burial', icon: Skull, path: '/citizen/apply/burial' },
        { id: 'apply-park', label: 'Apply: Park Reservation', icon: TreePine, path: '/citizen/apply/park' },
        { id: 'apply-barangay', label: 'Apply: Barangay Facility', icon: Home, path: '/citizen/apply/barangay' },
        { id: 'apply-water', label: 'Water Supply & Drainage', icon: Droplets, path: '/citizen/apply/water' },
        { id: 'payments', label: 'Payment History', icon: CreditCard, path: '/citizen/payments' },
        { id: 'my-docs', label: 'My Documents', icon: FolderOpen, path: '/citizen/documents' },
    ],
    parks_admin: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'venues', label: 'Park Venues', icon: TreePine, path: '/parks/venues' },
        { id: 'reservations', label: 'Reservations', icon: Calendar, path: '/parks/reservations', badgeKey: 'pending_park_res' },
        { id: 'usage-logs', label: 'Site Usage Logs', icon: ClipboardList, path: '/parks/usage-logs' },
        { id: 'calendar', label: 'Booking Calendar', icon: Calendar, path: '/parks/calendar' },
        { id: 'asset-requests', label: 'Asset Requests', icon: Package, path: '/parks/asset-requests' },
    ],
    reservation_officer: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'reservations', label: 'Reservation Records', icon: Building2, path: '/parks/desk-reservations', badgeKey: 'pending_park_res' },
        { id: 'approvals', label: 'Approvals', icon: CheckSquare, path: '/parks/desk-approvals' },
        { id: 'permits', label: 'Permits & Payments', icon: FileText, path: '/parks/desk-permits' },
        { id: 'usage-logs', label: 'Event Monitoring', icon: ClipboardList, path: '/parks/usage-logs' },
    ],
    punong_barangay: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'pending-approvals', label: 'Pending Approvals', icon: CheckSquare, path: '/barangay/pb/pending', badgeKey: 'pending_bar_res' },
        { id: 'facilities', label: 'Facility management', icon: Building2, path: '/barangay/pb/facilities' },
        { id: 'asset-requests', label: 'Asset Requests', icon: Package, path: '/barangay/pb/asset-requests' },
    ],
    barangay_secretary: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'sec-intake', label: 'Intake & availability', icon: CheckSquare, path: '/barangay/secretary/intake', badgeKey: 'barangay_intake_queue' },
        { id: 'sec-calendar', label: 'Booking calendar', icon: Calendar, path: '/barangay/secretary/calendar' },
        { id: 'sec-reservations', label: 'Reservation records', icon: Building2, path: '/barangay/secretary/reservations' },
    ],
    utility_engineering: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'tickets', label: 'Service Tickets', icon: Ticket, path: '/utility/tickets', badgeKey: 'assigned_tickets' },
        { id: 'leaks', label: 'Leak Reports', icon: AlertTriangle, path: '/utility/leaks' },
        { id: 'jobs', label: 'Assigned Jobs', icon: Hammer, path: '/utility/jobs' },
        { id: 'installations', label: 'Installations', icon: Wrench, path: '/utility/installations' },
    ],
    utility_helpdesk: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'triage', label: 'Ticket Triage', icon: Ticket, path: '/utility/triage', badgeKey: 'open_tickets' },
        { id: 'assign', label: 'Assign to Teams', icon: Users, path: '/utility/assign' },
        { id: 'connections', label: 'Connection Status', icon: Droplets, path: '/utility/connections' },
    ],
    cgsd_management: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'asset-requests', label: 'Asset Requests', icon: ClipboardList, path: '/assets/requests' },
        { id: 'assets', label: 'Inventory & Assets', icon: Package, path: '/assets/inventory' },
        { id: 'inspections', label: 'Ocular Inspections', icon: Microscope, path: '/assets/inspections' },
        { id: 'reports', label: 'Inventory Reports', icon: BarChart3, path: '/assets/reports' },
        { id: 'approvals', label: 'Approval Records', icon: CheckSquare, path: '/assets/approvals' },
    ],
    famcd: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'asset-requests', label: 'Asset Requests', icon: ClipboardList, path: '/assets/requests' },
        { id: 'assets', label: 'Inventory & Assets', icon: Package, path: '/assets/inventory' },
        { id: 'inspections', label: 'Ocular Inspections', icon: Microscope, path: '/assets/inspections' },
        { id: 'reports', label: 'Inventory Reports', icon: BarChart3, path: '/assets/reports' },
        { id: 'submissions', label: 'Submission Records', icon: Send, path: '/assets/submissions' },
    ],
    rmcd: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'routing', label: 'Request Routing', icon: Send, path: '/rmcd/routing' },
        { id: 'releases', label: 'Document Releases', icon: FileCheck, path: '/rmcd/releases' },
    ],
    treasurer: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'collections', label: 'Collections & Payments', icon: CreditCard, path: '/treasurer/collections', badgeKey: 'pending_payments' },
        { id: 'receipts', label: 'Official Receipts', icon: Receipt, path: '/treasurer/receipts' },
        { id: 'audit', label: 'Audit Logs', icon: Eye, path: '/treasurer/audit' },
    ],
    system_admin: [
        { id: 'dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { id: 'users', label: 'User & Role Management', icon: UserCog, path: '/admin/users' },
        { id: 'audit', label: 'Audit Logs', icon: Eye, path: '/admin/audit' },
        { id: 'offices', label: 'Office Management', icon: Building2, path: '/admin/offices' },
        { id: 'employees', label: 'Government Directory', icon: Users, path: '/admin/employees' },
        { id: 'migration', label: 'Backups', icon: Database, path: '/admin/migration' },
    ],
}

// ─── Role display names & colors ─────────────────────────────────────────────
export const ROLE_META: Record<UserRole, { label: string; color: string; bgColor: string }> = {
    cemetery_office: { label: 'Cemetery Office', color: '#a78bfa', bgColor: 'rgba(167,139,250,0.12)' },
    ssdd: { label: 'SSDD', color: '#34d399', bgColor: 'rgba(52,211,153,0.12)' },
    death_registration: { label: 'Death Registration', color: '#f87171', bgColor: 'rgba(248,113,113,0.12)' },
    citizen: { label: 'Citizen / Informant', color: '#60a5fa', bgColor: 'rgba(96,165,250,0.12)' },
    parks_admin: { label: 'Parks Administrator', color: '#4ade80', bgColor: 'rgba(74,222,128,0.12)' },
    reservation_officer: { label: 'Reservation Officer', color: '#fbbf24', bgColor: 'rgba(251,191,36,0.12)' },
    punong_barangay: { label: 'Punong Barangay', color: '#fb923c', bgColor: 'rgba(251,146,60,0.12)' },
    barangay_secretary: { label: 'Barangay Secretary', color: '#e879f9', bgColor: 'rgba(232,121,249,0.12)' },
    utility_engineering: { label: 'Utility Engineering', color: '#22d3ee', bgColor: 'rgba(34,211,238,0.12)' },
    utility_helpdesk: { label: 'Utility Helpdesk', color: '#38bdf8', bgColor: 'rgba(56,189,248,0.12)' },
    cgsd_management: { label: 'CGSD Management', color: '#f472b6', bgColor: 'rgba(244,114,182,0.12)' },
    famcd: { label: 'FAMCD', color: '#a3e635', bgColor: 'rgba(163,230,53,0.12)' },
    rmcd: { label: 'RMCD', color: '#22c55e', bgColor: 'rgba(34,197,94,0.12)' },
    treasurer: { label: 'Treasurer Officer', color: '#fcd34d', bgColor: 'rgba(252,211,77,0.12)' },
    system_admin: { label: 'System Administrator', color: '#94a3b8', bgColor: 'rgba(148,163,184,0.12)' },
}

export {
    LayoutDashboard, Users, FileText, Building2, Calendar, Wrench,
    ClipboardList, Package, CreditCard, ShieldCheck, HelpCircle,
    Search, ChevronRight, Heart, Droplets, TreePine, Home, Skull, MapPin,
    Receipt, BarChart3, UserCog, Database, Hammer, Ticket, CheckSquare,
    AlertTriangle, Eye, BookOpen, FolderOpen, DollarSign, RefreshCw,
    FileCheck, Microscope, Send, LogOut, User, Bell
}
