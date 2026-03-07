import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

// ─── Layout ──────────────────────────────────────────────────────────────────
import AppLayout from '@/components/layout/AppLayout'

// ─── Auth Pages ──────────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage'
import SignupPage from '@/pages/auth/SignupPage'

// ─── Core Pages ──────────────────────────────────────────────────────────────
import ProfilePage from '@/pages/ProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import PlaceholderPage from '@/pages/PlaceholderPage'

// ─── Cemetery Office (Burial) ────────────────────────────────────────────────
import BurialApplicationsPage from '@/pages/cemetery_office/burial-applications'
import NicheManagementPage from '@/pages/cemetery_office/niche-management'
import CemeteryAssetRequestsPage from '@/pages/cemetery_office/asset-requests'

// ─── Barangay Secretary ──────────────────────────────────────────────────────
import BarangaySecretaryDashboard from '@/pages/barangay_secretary/dashboard'
import BarangayReservationsPage from '@/pages/barangay_secretary/reservation-records'
import BarangayOrdinancesPage from '@/pages/barangay_secretary/ordinance-references'
import BarangayDocumentsPage from '@/pages/barangay_secretary/documents-filing'
import BarangayRecordsPage from '@/pages/barangay_secretary/constituent-records'
import PunongBarangayAssetRequestsPage from '@/pages/punong_barangay/asset-requests'

// ─── Role Dashboards ─────────────────────────────────────────────────────────
import CemeteryOfficeDashboard from '@/pages/cemetery_office/dashboard'
import CitizenDashboard from '@/pages/citizen/dashboard'
import SsddDashboard from '@/pages/ssdd/dashboard'
import DeathRegistrationDashboard from '@/pages/death_registration/dashboard'
import ParksAdminDashboard from '@/pages/parks_admin/dashboard'
import ParksAssetRequestsPage from '@/pages/parks_admin/asset-requests'
import ReservationOfficerDashboard from '@/pages/reservation_officer/dashboard'
import ReservationApprovalsPage from '@/pages/reservation_officer/approvals'
import ReservationRecordsPage from '@/pages/reservation_officer/reservation-records'
import PermitsPaymentsPage from '@/pages/reservation_officer/permits-payments'
import PunongBarangayDashboard from '@/pages/punong_barangay/dashboard'
import FamcdDashboard from '@/pages/famcd/dashboard'
import CgsdManagementDashboard from '@/pages/cgsd_management/dashboard'
import TreasurerDashboard from '@/pages/treasurer/dashboard'
import SystemAdminDashboard from '@/pages/system_admin/dashboard'
import UtilityEngineeringDashboard from '@/pages/utility_engineering/dashboard'
import UtilityHelpdeskDashboard from '@/pages/utility_helpdesk/dashboard'

// ─── Citizen Module ──────────────────────────────────────────────────────────
import CitizenBurialApplicationPage from '@/pages/citizen/BurialApplicationPage'
import ApplyWaterPage from '@/pages/citizen/apply-utility_request'

// ─── Utility Engineering & Helpdesk ─────────────────────────────────────────
import ServiceTicketsPage from '@/pages/utility_engineering/service-tickets'
import AssignedJobsPage from '@/pages/utility_engineering/assigned-jobs'
import InstallationsPage from '@/pages/utility_engineering/installations'
import LeakReportsPage from '@/pages/utility_engineering/leak-reports'
import AssignTeamsPage from '@/pages/utility_helpdesk/assign-teams'
import ConnectionStatusPage from '@/pages/utility_helpdesk/connection-status'
import TicketTriagePage from '@/pages/utility_helpdesk/ticket-triage'

// ─── Treasurer Module ────────────────────────────────────────────────────────
import TreasurerTransactionsPage from '@/pages/treasurer/TransactionsPage'

// ─── System Admin ────────────────────────────────────────────────────────────
import UserManagementPage from '@/pages/system_admin/user-role-management'
import LegacyMigrationPage from '@/pages/system_admin/legacy-migration'

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function DashboardRedirect() {
  const { user } = useAuth()
  if (!user) return null
  return <Navigate to={`/${user.role}/dashboard`} replace />
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected — wrapped in AppLayout */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* ── Role Dashboards ── */}
        <Route path="cemetery_office/dashboard" element={<CemeteryOfficeDashboard />} />
        <Route path="citizen/dashboard" element={<CitizenDashboard />} />
        <Route path="ssdd/dashboard" element={<SsddDashboard />} />
        <Route path="death_registration/dashboard" element={<DeathRegistrationDashboard />} />
        <Route path="parks_admin/dashboard" element={<ParksAdminDashboard />} />
        <Route path="reservation_officer/dashboard" element={<ReservationOfficerDashboard />} />
        <Route path="punong_barangay/dashboard" element={<PunongBarangayDashboard />} />
        <Route path="barangay_secretary/dashboard" element={<BarangaySecretaryDashboard />} />
        <Route path="famcd/dashboard" element={<FamcdDashboard />} />
        <Route path="cgsd_management/dashboard" element={<CgsdManagementDashboard />} />
        <Route path="treasurer/dashboard" element={<TreasurerDashboard />} />
        <Route path="system_admin/dashboard" element={<SystemAdminDashboard />} />
        <Route path="utility_engineering/dashboard" element={<UtilityEngineeringDashboard />} />
        <Route path="utility_helpdesk/dashboard" element={<UtilityHelpdeskDashboard />} />

        {/* ── Cemetery & Burial ── */}
        <Route path="burial/applications" element={<BurialApplicationsPage />} />
        <Route path="burial/deceased" element={<PlaceholderPage title="Deceased Registry" description="Full deceased registry with search across all records." />} />
        <Route path="burial/niches" element={<NicheManagementPage />} />
        <Route path="burial/records" element={<PlaceholderPage title="Burial Records" description="Complete burial record ledger with filtering and export." />} />
        <Route path="burial/indigent" element={<PlaceholderPage title="Indigent Assistance" description="Indigent assistance case management portal." />} />
        <Route path="burial/asset-requests" element={<CemeteryAssetRequestsPage />} />

        {/* ── SSDD ── */}
        <Route path="ssdd/indigent" element={<PlaceholderPage title="Indigent Assistance Cases" />} />
        <Route path="ssdd/citizens" element={<PlaceholderPage title="Citizen Records" />} />
        <Route path="ssdd/coordination" element={<PlaceholderPage title="Death Registration Coordination" />} />

        {/* ── Death Registration ── */}
        <Route path="death/verify" element={<PlaceholderPage title="Certificate Verification" />} />
        <Route path="death/documents" element={<PlaceholderPage title="Received Documents" />} />
        <Route path="death/approvals" element={<PlaceholderPage title="Approvals & Signing" />} />

        {/* ── Citizen ── */}
        <Route path="citizen/applications" element={<PlaceholderPage title="My Applications" description="Track all your submitted applications and their status." />} />
        <Route path="citizen/apply/burial" element={<CitizenBurialApplicationPage />} />
        <Route path="citizen/apply/park" element={<PlaceholderPage title="Apply: Park Reservation" />} />
        <Route path="citizen/apply/barangay" element={<PlaceholderPage title="Apply: Barangay Facility" />} />
        <Route path="citizen/apply/water" element={<ApplyWaterPage />} />
        <Route path="citizen/apply/leak" element={<Navigate to="/citizen/apply/water" replace />} />
        <Route path="citizen/payments" element={<PlaceholderPage title="Payment History" />} />
        <Route path="citizen/documents" element={<PlaceholderPage title="My Documents" />} />

        {/* ── Parks ── */}
        <Route path="parks/venues" element={<PlaceholderPage title="Park Venues" />} />
        <Route path="parks/reservations" element={<PlaceholderPage title="Park Reservation Applications" />} />
        <Route path="parks/usage-logs" element={<PlaceholderPage title="Site Usage Logs" />} />
        <Route path="parks/calendar" element={<PlaceholderPage title="Booking Calendar" />} />
        <Route path="parks/asset-requests" element={<ParksAssetRequestsPage />} />

        {/* ── Parks (Reservation Desk) ── */}
        <Route path="parks/desk-reservations" element={<ReservationRecordsPage />} />
        <Route path="parks/desk-approvals" element={<ReservationApprovalsPage />} />
        <Route path="parks/desk-permits" element={<PermitsPaymentsPage />} />

        {/* ── Barangay (shared) ── */}
        <Route path="barangay/pending" element={<PlaceholderPage title="Pending Approvals" description="Pending barangay requests forwarded for approval." />} />
        <Route path="barangay/ordinances" element={<PlaceholderPage title="Ordinance References" />} />
        <Route path="barangay/asset-requests" element={<PunongBarangayAssetRequestsPage />} />

        {/* ── Barangay Secretary ── */}
        <Route path="barangay/secretary/reservations" element={<BarangayReservationsPage />} />
        <Route path="barangay/secretary/records" element={<BarangayRecordsPage />} />
        <Route path="barangay/secretary/documents" element={<BarangayDocumentsPage />} />
        <Route path="barangay/secretary/ordinances" element={<BarangayOrdinancesPage />} />
        <Route path="barangay/secretary/reports" element={<PlaceholderPage title="Barangay Reports" description="Monthly and annual reports for the barangay secretariat." />} />
        <Route path="barangay/records" element={<BarangayRecordsPage />} />
        <Route path="barangay/documents" element={<BarangayDocumentsPage />} />
        <Route path="barangay/reports" element={<PlaceholderPage title="Barangay Reports" />} />
        <Route path="barangay/requests" element={<PlaceholderPage title="Barangay Requests" />} />

        {/* ── Utility ── */}
        <Route path="utility/tickets" element={<ServiceTicketsPage />} />
        <Route path="utility/triage" element={<TicketTriagePage />} />
        <Route path="utility/leaks" element={<LeakReportsPage />} />
        <Route path="utility/jobs" element={<AssignedJobsPage />} />
        <Route path="utility/installations" element={<InstallationsPage />} />
        <Route path="utility/assign" element={<AssignTeamsPage />} />
        <Route path="utility/connections" element={<ConnectionStatusPage />} />

        {/* ── Assets ── */}
        <Route path="assets/requests" element={<Navigate to="/dashboard" replace />} />
        <Route path="assets/inventory" element={<PlaceholderPage title="Inventory & Assets" />} />
        <Route path="assets/inspections" element={<PlaceholderPage title="Ocular Inspections" />} />
        <Route path="assets/reports" element={<PlaceholderPage title="Inventory Reports" />} />
        <Route path="assets/approvals" element={<PlaceholderPage title="Approval Records" />} />
        <Route path="assets/submissions" element={<PlaceholderPage title="Submission Records" />} />

        {/* ── Payments / Treasurer ── */}
        <Route path="payments" element={<TreasurerTransactionsPage />} />
        <Route path="treasurer/transactions" element={<TreasurerTransactionsPage />} />
        <Route path="treasurer/reconciliation" element={<PlaceholderPage title="Reconciliation Queue" />} />
        <Route path="treasurer/receipts" element={<PlaceholderPage title="Official Receipts Management" />} />
        <Route path="treasurer/revenue" element={<PlaceholderPage title="Revenue Reports" />} />
        <Route path="treasurer/audit" element={<PlaceholderPage title="Audit Logs" />} />

        {/* ── Reports ── */}
        <Route path="reports" element={<PlaceholderPage title="Reports & Analytics" description="Aggregate reporting across all modules." />} />

        {/* ── Admin ── */}
        <Route path="admin/users" element={<UserManagementPage />} />
        <Route path="admin/audit" element={<PlaceholderPage title="Audit Logs" description="System-wide audit log of all key data changes." />} />
        <Route path="admin/settings" element={<SettingsPage />} />
        <Route path="admin/offices" element={<PlaceholderPage title="Office Management" />} />
        <Route path="admin/employees" element={<PlaceholderPage title="Employee Master List" />} />
        <Route path="admin/migration" element={<LegacyMigrationPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Root redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'var(--color-card)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '12px' },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
