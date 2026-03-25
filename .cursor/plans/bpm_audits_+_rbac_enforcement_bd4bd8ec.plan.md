---
name: BPM audits + RBAC enforcement
overview: Implement end-to-end audit logging (writes + key reads/downloads) and enforce user inactivation across the app, aligning runtime behavior with the `latest.sql` schema and wiring System Admin pages to real, shared services.
todos:
  - id: audit-lib
    content: Create `src/lib/audit.ts` (audit log writer + wrappers) and integrate with `useAuth` for actor enrichment.
    status: completed
  - id: session-enforcement
    content: Harden `AuthContext` + route guards with periodic/on-focus revalidation and pre-mutation `ensureActiveSession()` checks.
    status: completed
  - id: admin-dashboard-real
    content: Replace mock KPIs/activity in `src/pages/system_admin/dashboard.tsx` with real Supabase queries and audit the dashboard view.
    status: completed
  - id: admin-pages-audit-polish
    content: Normalize System Admin pages to use the shared audit wrappers and ensure all actions write consistent audit entries.
    status: completed
  - id: audit-all-modules
    content: Update all non-admin role pages that write data to use audited wrappers; add audited downloads/exports where applicable.
    status: completed
  - id: schema-alignment
    content: Validate tables/columns vs `latest.sql`; optionally update `init_db.sql` for dev parity and document any remaining differences.
    status: completed
isProject: false
---

## Goals

- Ensure **inactive users cannot keep using the system** (system users via `system_users.is_active`, citizens via `citizen_account.verification_status`).
- Make **audit logging comprehensive**: every DB write + important reads/exports/downloads across all roles.
- Make System Admin pages **fully functional + integrated** with the underlying schema and shared helpers.

## What I found in your codebase (current state)

- **DB schema mismatch risk**: UI code reads/writes tables like `audit_logs`, `system_settings`, `system_backups`, and columns like `system_users.password_hash`, but `init_db.sql` currently does not define all of these (while `latest.sql` does define `audit_logs` and more).
- **Inactivation already partially enforced**: `src/contexts/AuthContext.tsx` already blocks login for inactive system users and clears local sessions if `is_active` becomes false (and similarly checks citizen `verification_status`).
- **Audit logging is currently inconsistent**: System Admin flows call `logAudit()` (e.g., user toggle, office upsert, employee upsert/link, settings/backups, migration), but many other role pages update tables without any audit event.
- **System Admin dashboard is still mock**: `src/pages/system_admin/dashboard.tsx` uses hardcoded KPI/activity arrays.

## Architecture to implement

### 1) Centralized audit/event layer

Add a shared module (e.g. `src/lib/audit.ts`) that:

- Provides a **single function** to record an audit row: `auditLog({action,module,status,subject,details})`.
- Provides wrappers for common UI operations so pages don’t forget auditing:
  - `auditedMutation({ action, module, subject, details }, fn)` where `fn` performs the Supabase write.
  - `auditedRead({ action:'view'|'search'|'export', ... }, fn)` for key reads.
  - `auditedDownload({ action:'download', ... }, fn)` for permit/doc downloads.
- Auto-enriches audit entries with: actor (`performed_by`), role, office, and timestamps (and parses/stores JSON details as string if the table uses `text`).

### 2) Stronger “inactive user” enforcement

Enhance `src/contexts/AuthContext.tsx` + routing to prevent “still logged in” users from continuing to operate:

- Add periodic + on-focus **remote revalidation** of the current account status.
- Add a shared helper `ensureActiveSession()` that is called before any audited mutation; if inactive, force logout + show toast.
- Make `ProtectedRoute` show a clear “Session disabled” message when a session is invalidated.

### 3) Replace mock admin dashboard data with real metrics

Update `src/pages/system_admin/dashboard.tsx` to load:

- Total system users + active system users (`system_users`).
- Citizen counts by verification status (`citizen_account`).
- Audit entry counts + recent activity (`audit_logs`).
- “Alerts” derived from recent failed actions (e.g., `login_failed`, failed approvals).
All loads should be audited as **reads** (e.g., `admin_dashboard_view`).

### 4) Wire audits into every role module that writes data

Systematically update pages that perform `.insert/.update/.delete/.upsert` to wrap those operations in the new audit helpers. Based on your repo, key files include:

- Citizen: `src/pages/citizen/BurialApplicationPage.tsx`, `src/pages/citizen/ApplyParkReservationPage.tsx`, `src/pages/citizen/apply-utility_request.tsx`, `src/pages/citizen/apply-barangay.tsx`
- Parks: `src/pages/parks_admin/reservations.tsx`, `src/pages/parks_admin/booking-calendar.tsx`, `src/pages/parks_admin/park-venues.tsx`, `src/pages/parks_admin/usage-logs.tsx`
- Barangay: `src/pages/barangay_secretary/reservation-records.tsx`, `src/pages/barangay_secretary/documents-filing.tsx`, `src/pages/barangay_secretary/ordinance-references.tsx`
- Reservation officer: `src/pages/reservation_officer/approvals.tsx`, `src/pages/reservation_officer/reservation-records.tsx`, `src/pages/reservation_officer/permits-payments.tsx`
- Cemetery/SSDD/Death reg/FAMCD/CGSD: the pages flagged by the same mutation search.

### 5) Align runtime schema expectations with `latest.sql`

Because you chose `latest.sql` as the source of truth:

- Verify `src/lib/admin.ts` table/column names match `latest.sql`.
- Ensure `init_db.sql` is either (a) updated to include the missing admin/audit tables for local/dev parity, or (b) clearly documented as a seed-only subset.

## Verification steps (after implementation)

- Manual flows:
  - Deactivate a system user in `User & Role Management` → that user gets logged out within the revalidation window and cannot perform writes.
  - Create/update office/employee/settings/backup/migration → each produces an `audit_logs` row with correct actor + details.
  - Approve/reject park reservation, submit utility request, file barangay document, etc. → each produces an audit row.
- Audit logs UI (`src/pages/system_admin/audit-logs.tsx`) shows the above entries, including details JSON formatting.

## Risks / constraints

- Client-side enforcement cannot instantly kill a session on another device without realtime; periodic revalidation + pre-mutation checks will reliably prevent further actions.
- For true tamper-proof auditing, DB-level enforcement (RLS + triggers) is ideal; this plan implements **application-level auditing** consistent with your current frontend-only architecture.

