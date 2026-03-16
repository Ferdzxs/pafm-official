import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

// ─── Layout ──────────────────────────────────────────────────────────────────
import AppLayout from "@/components/layout/AppLayout";

// ─── Auth Pages ──────────────────────────────────────────────────────────────
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";

// ─── Core Pages ──────────────────────────────────────────────────────────────
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import PlaceholderPage from "@/pages/PlaceholderPage";

// ─── Cemetery Office (Burial) ────────────────────────────────────────────────
import BurialApplicationsPage from "@/pages/cemetery_office/burial-applications";
import NicheManagementPage from "@/pages/cemetery_office/niche-management";
import CemeteryAssetRequestsPage from "@/pages/cemetery_office/asset-requests";

// ─── Barangay Secretary ──────────────────────────────────────────────────────
import BarangaySecretaryDashboard from "@/pages/barangay_secretary/dashboard";
import BarangayReservationsPage from "@/pages/barangay_secretary/reservation-records";
import BarangayOrdinancesPage from "@/pages/barangay_secretary/ordinance-references";
import BarangayDocumentsPage from "@/pages/barangay_secretary/documents-filing";
import BarangayRecordsPage from "@/pages/barangay_secretary/constituent-records";
import BarangaySecretaryReports from "@/pages/barangay_secretary/reports";
import PunongBarangayAssetRequestsPage from "@/pages/punong_barangay/asset-requests";

// ─── Punong Barangay ─────────────────────────────────────────────────────────
import PunongBarangayPendingApprovals from "@/pages/punong_barangay/pending-approvals";
import PBOrdinanceReferences from "@/pages/punong_barangay/ordinance-references";

// ─── Role Dashboards ─────────────────────────────────────────────────────────
import CemeteryOfficeDashboard from "@/pages/cemetery_office/dashboard";
import CitizenDashboard from "@/pages/citizen/dashboard";
import SsddDashboard from "@/pages/ssdd/dashboard";
import DeathRegistrationDashboard from "@/pages/death_registration/dashboard";
import ParksAdminDashboard from "@/pages/parks_admin/dashboard";
import ParksAssetRequestsPage from "@/pages/parks_admin/asset-requests";
import ReservationOfficerDashboard from "@/pages/reservation_officer/dashboard";
import ReservationApprovalsPage from "@/pages/reservation_officer/approvals";
import ReservationRecordsPage from "@/pages/reservation_officer/reservation-records";
import PermitsPaymentsPage from "@/pages/reservation_officer/permits-payments";
import PunongBarangayDashboard from "@/pages/punong_barangay/dashboard";
import FamcdDashboard from "@/pages/famcd/dashboard";
import CgsdManagementDashboard from "@/pages/cgsd_management/dashboard";
import TreasurerDashboard from "@/pages/treasurer/dashboard";
import SystemAdminDashboard from "@/pages/system_admin/dashboard";
import UtilityEngineeringDashboard from "@/pages/utility_engineering/dashboard";
import UtilityHelpdeskDashboard from "@/pages/utility_helpdesk/dashboard";

// ─── Citizen Module ──────────────────────────────────────────────────────────
import CitizenBurialApplicationPage from "@/pages/citizen/BurialApplicationPage";
import ApplyWaterPage from "@/pages/citizen/apply-utility_request";
import ApplyBarangayFacilityPage from "@/pages/citizen/apply-barangay";
import MyApplicationsPage from "@/pages/citizen/my-applications";
import ApplyPark from "@/pages/citizen/apply-park";

// ─── Utility Engineering & Helpdesk ─────────────────────────────────────────
import ServiceTicketsPage from "@/pages/utility_engineering/service-tickets";
import AssignedJobsPage from "@/pages/utility_engineering/assigned-jobs";
import InstallationsPage from "@/pages/utility_engineering/installations";
import LeakReportsPage from "@/pages/utility_engineering/leak-reports";
import AssignTeamsPage from "@/pages/utility_helpdesk/assign-teams";
import ConnectionStatusPage from "@/pages/utility_helpdesk/connection-status";
import TicketTriagePage from "@/pages/utility_helpdesk/ticket-triage";

// ─── Treasurer Module ────────────────────────────────────────────────────────
import TreasurerTransactionsPage from "@/pages/treasurer/TransactionsPage";

// ─── System Admin ────────────────────────────────────────────────────────────
import UserManagementPage from "@/pages/system_admin/user-role-management";
import LegacyMigrationPage from "@/pages/system_admin/legacy-migration";
import MyDocumentsPage from "./pages/citizen/my-documents";

// ─── Parks Admin (detailed pages) ────────────────────────────────────────────
import ParkVenues from "@/pages/parks_admin/park-venues";
import Reservations from "@/pages/parks_admin/reservations";
import SiteUsageLogs from "@/pages/parks_admin/usage-logs";
import BookingCalendar from "@/pages/parks_admin/booking-calendar";

// ─── Assets / Inventory (CGSD, FAMCD, cross-office) ─────────────────────────
import AssetsRequestsPage from "@/pages/assets/requests";
import FamcdInventoryAssets from "@/pages/famcd/inventory-assets";
import FamcdInventoryReports from "@/pages/famcd/inventory-reports";
import FamcdOcularInspectionsPage from "@/pages/famcd/ocular-inspections";
import FamcdSubmissionRecords from "@/pages/famcd/submission-records";
import CgsdInventoryAssetsPage from "@/pages/cgsd_management/inventory-assets";
import CgsdInventoryReportsPage from "@/pages/cgsd_management/inventory-reports";
import CgsdApprovalRecordsPage from "@/pages/cgsd_management/approval-records";
import CgsdOcularInspectionsPage from "@/pages/cgsd_management/ocular-inspections";

// ─── Cemetery Office detailed pages ─────────────────────────────────────────
import DeceasedRegistryPage from "@/pages/cemetery_office/deceased-registry";
import BurialRecordsPage from "@/pages/cemetery_office/burial-records";
import IndigentAssistancePage from "@/pages/cemetery_office/indigent-assistance";

// ─── SSDD detailed pages ─────────────────────────────────────────────────────
import SsddIndigentPage from "@/pages/ssdd/indigent-assistance";
import SsddCitizenRecordsPage from "@/pages/ssdd/citizen-records";
import SsddDeathRegistrationPage from "@/pages/ssdd/death-registration";

// ─── Death Registration detailed pages ───────────────────────────────────────
import DeathCertificateVerificationPage from "@/pages/death_registration/certificate-verification";
import DeathReceivedDocumentsPage from "@/pages/death_registration/received-documents";
import DeathApprovalsSigningPage from "@/pages/death_registration/approvals-signing";

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading)
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--color-bg)" }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user } = useAuth();
  if (!user) return null;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

// ─── Role-aware Assets routes (CGSD / FAMCD) ─────────────────────────────────
function AssetsInventoryRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "cgsd_management") return <CgsdInventoryAssetsPage />;
  if (user.role === "famcd") return <FamcdInventoryAssets />;
  return (
    <PlaceholderPage
      title="Inventory & Assets"
      description="Central inventory view for city assets."
    />
  );
}

function AssetsInspectionsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "famcd") return <FamcdOcularInspectionsPage />;
  if (user.role === "cgsd_management") return <CgsdOcularInspectionsPage />;
  return (
    <PlaceholderPage
      title="Ocular Inspections"
      description="Ocular inspection queue for asset validation."
    />
  );
}

function AssetsReportsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "cgsd_management") return <CgsdInventoryReportsPage />;
  if (user.role === "famcd") return <FamcdInventoryReports />;
  return (
    <PlaceholderPage
      title="Inventory Reports"
      description="Inventory reporting workspace."
    />
  );
}

function AssetsApprovalsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "cgsd_management") return <CgsdApprovalRecordsPage />;
  return (
    <PlaceholderPage
      title="Approval Records"
      description="Records of approvals for land and building inventory."
    />
  );
}

function AssetsSubmissionsRoute() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "famcd") return <FamcdSubmissionRecords />;
  return (
    <PlaceholderPage
      title="Submission Records"
      description="Submission tracking for finalized inventory reports."
    />
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Protected — wrapped in AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardRedirect />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* ── Role Dashboards ── */}
        <Route
          path="cemetery_office/dashboard"
          element={<CemeteryOfficeDashboard />}
        />
        <Route path="citizen/dashboard" element={<CitizenDashboard />} />
        <Route path="ssdd/dashboard" element={<SsddDashboard />} />
        <Route
          path="death_registration/dashboard"
          element={<DeathRegistrationDashboard />}
        />
        <Route path="parks_admin/dashboard" element={<ParksAdminDashboard />} />
        <Route
          path="reservation_officer/dashboard"
          element={<ReservationOfficerDashboard />}
        />
        <Route
          path="punong_barangay/dashboard"
          element={<PunongBarangayDashboard />}
        />
        <Route
          path="barangay_secretary/dashboard"
          element={<BarangaySecretaryDashboard />}
        />
        <Route path="famcd/dashboard" element={<FamcdDashboard />} />
        <Route
          path="cgsd_management/dashboard"
          element={<CgsdManagementDashboard />}
        />
        <Route path="treasurer/dashboard" element={<TreasurerDashboard />} />
        <Route
          path="system_admin/dashboard"
          element={<SystemAdminDashboard />}
        />
        <Route
          path="utility_engineering/dashboard"
          element={<UtilityEngineeringDashboard />}
        />
        <Route
          path="utility_helpdesk/dashboard"
          element={<UtilityHelpdeskDashboard />}
        />

        {/* ── Cemetery & Burial ── */}
        <Route
          path="burial/applications"
          element={<BurialApplicationsPage />}
        />
        <Route path="burial/deceased" element={<DeceasedRegistryPage />} />
        <Route path="burial/niches" element={<NicheManagementPage />} />
        <Route path="burial/records" element={<BurialRecordsPage />} />
        <Route path="burial/indigent" element={<IndigentAssistancePage />} />
        <Route
          path="burial/asset-requests"
          element={<CemeteryAssetRequestsPage />}
        />

        {/* ── SSDD ── */}
        <Route path="ssdd/indigent" element={<SsddIndigentPage />} />
        <Route
          path="ssdd/citizens"
          element={<SsddCitizenRecordsPage />}
        />
        <Route
          path="ssdd/coordination"
          element={<SsddDeathRegistrationPage />}
        />

        {/* ── Death Registration ── */}
        <Route path="death/verify" element={<DeathCertificateVerificationPage />} />
        <Route path="death/documents" element={<DeathReceivedDocumentsPage />} />
        <Route path="death/approvals" element={<DeathApprovalsSigningPage />} />

        {/* ── Citizen ── */}
        <Route path="citizen/applications" element={<MyApplicationsPage />} />
        <Route
          path="citizen/apply/burial"
          element={<CitizenBurialApplicationPage />}
        />
        <Route
          path="citizen/apply/park"
          element={<ApplyPark />}
        />
        <Route
          path="citizen/apply/barangay"
          element={<ApplyBarangayFacilityPage />}
        />
        <Route path="citizen/apply/water" element={<ApplyWaterPage />} />
        <Route
          path="citizen/apply/leak"
          element={<Navigate to="/citizen/apply/water" replace />}
        />
        <Route
          path="citizen/payments"
          element={<PlaceholderPage title="Payment History" />}
        />
        <Route path="citizen/documents" element={<MyDocumentsPage />} />

        {/* ── Parks ── */}
        <Route
          path="parks/venues"
          element={<ParkVenues />}
        />
        <Route
          path="parks/reservations"
          element={<Reservations />}
        />
        <Route
          path="parks/usage-logs"
          element={<SiteUsageLogs />}
        />
        <Route
          path="parks/calendar"
          element={<BookingCalendar />}
        />
        <Route
          path="parks/asset-requests"
          element={<ParksAssetRequestsPage />}
        />

        {/* ── Parks (Reservation Desk) ── */}
        <Route
          path="parks/desk-reservations"
          element={<ReservationRecordsPage />}
        />
        <Route
          path="parks/desk-approvals"
          element={<ReservationApprovalsPage />}
        />
        <Route path="parks/desk-permits" element={<PermitsPaymentsPage />} />

        {/* ── Barangay (shared) ── */}
        <Route
          path="barangay/pending"
          element={<PunongBarangayPendingApprovals />}
        />
        <Route
          path="barangay/ordinances"
          element={<PBOrdinanceReferences />}
        />
        <Route
          path="barangay/asset-requests"
          element={<PunongBarangayAssetRequestsPage />}
        />

        {/* ── Barangay Secretary ── */}
        <Route
          path="barangay/secretary/reservations"
          element={<BarangayReservationsPage />}
        />
        <Route
          path="barangay/secretary/records"
          element={<BarangayRecordsPage />}
        />
        <Route
          path="barangay/secretary/documents"
          element={<BarangayDocumentsPage />}
        />
        <Route
          path="barangay/secretary/ordinances"
          element={<BarangayOrdinancesPage />}
        />
        <Route
          path="barangay/secretary/reports"
          element={<BarangaySecretaryReports />}
        />
        <Route path="barangay/records" element={<BarangayRecordsPage />} />
        <Route path="barangay/documents" element={<BarangayDocumentsPage />} />
        <Route
          path="barangay/reports"
          element={<PlaceholderPage title="Barangay Reports" />}
        />
        <Route
          path="barangay/requests"
          element={<PlaceholderPage title="Barangay Requests" />}
        />

        {/* ── Utility ── */}
        <Route path="utility/tickets" element={<ServiceTicketsPage />} />
        <Route path="utility/triage" element={<TicketTriagePage />} />
        <Route path="utility/leaks" element={<LeakReportsPage />} />
        <Route path="utility/jobs" element={<AssignedJobsPage />} />
        <Route path="utility/installations" element={<InstallationsPage />} />
        <Route path="utility/assign" element={<AssignTeamsPage />} />
        <Route path="utility/connections" element={<ConnectionStatusPage />} />

        {/* ── Assets ── */}
        <Route path="assets/requests" element={<AssetsRequestsPage />} />
        <Route path="assets/inventory" element={<AssetsInventoryRoute />} />
        <Route path="assets/inspections" element={<AssetsInspectionsRoute />} />
        <Route path="assets/reports" element={<AssetsReportsRoute />} />
        <Route path="assets/approvals" element={<AssetsApprovalsRoute />} />
        <Route path="assets/submissions" element={<AssetsSubmissionsRoute />} />

        {/* ── Payments / Treasurer ── */}
        <Route path="payments" element={<TreasurerTransactionsPage />} />
        <Route
          path="treasurer/transactions"
          element={<TreasurerTransactionsPage />}
        />
        <Route
          path="treasurer/reconciliation"
          element={<PlaceholderPage title="Reconciliation Queue" />}
        />
        <Route
          path="treasurer/receipts"
          element={<PlaceholderPage title="Official Receipts Management" />}
        />
        <Route
          path="treasurer/revenue"
          element={<PlaceholderPage title="Revenue Reports" />}
        />
        <Route
          path="treasurer/audit"
          element={<PlaceholderPage title="Audit Logs" />}
        />

        {/* ── Reports ── */}
        <Route
          path="reports"
          element={
            <PlaceholderPage
              title="Reports & Analytics"
              description="Aggregate reporting across all modules."
            />
          }
        />

        {/* ── Admin ── */}
        <Route path="admin/users" element={<UserManagementPage />} />
        <Route
          path="admin/audit"
          element={
            <PlaceholderPage
              title="Audit Logs"
              description="System-wide audit log of all key data changes."
            />
          }
        />
        <Route path="admin/settings" element={<SettingsPage />} />
        <Route
          path="admin/offices"
          element={<PlaceholderPage title="Office Management" />}
        />
        <Route
          path="admin/employees"
          element={<PlaceholderPage title="Employee Master List" />}
        />
        <Route path="admin/migration" element={<LegacyMigrationPage />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Root redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
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
              style: {
                background: "var(--color-card)",
                color: "var(--color-text-primary)",
                border: "1px solid var(--color-border)",
                borderRadius: "12px",
              },
            }}
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
