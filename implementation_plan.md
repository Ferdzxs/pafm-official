# TO-BE Gap Implementation

Implementing 4 missing features identified by comparing the BPMN TO-BE diagram against the current system. The core workflow (FAMCD inspect → submit → CGSD approve) already exists; these features add the RMCD bookend steps and improve feedback loops.

## Proposed Changes

---

### 1. RMCD — Request Routing Page

#### [NEW] [routing.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/rmcd/routing.tsx)

A functional page replacing the existing `PlaceholderPage` at `/rmcd/routing`.

- Fetches all `inventory_request` records with `status = 'pending'`
- Displays: Request ID, Scope, Requesting Office, Date Requested
- **"Endorse to FAMCD" button** — updates `inventory_request.status` to `'in_progress'` and inserts a log note
- Shows already-endorsed requests with a green "Endorsed" badge

---

### 2. RMCD — Document Releases Page

#### [NEW] [releases.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/rmcd/releases.tsx)

A functional page replacing the existing `PlaceholderPage` at `/rmcd/releases`.

- Fetches all `inventory_report` records with `approval_status = 'approved'`
- Displays: Report ID, Scope, Prepared By Office, Approval Date, Release Status
- **"Mark as Released" button** — inserts a row in `approval_record` with `decision = 'released'` and a timestamp remark
- Already-released items show a "Released ✓" badge (detected by existence of an `approval_record` with `decision = 'released'` for that report)

---

### 3. CGSD Approvals — Post-Approval Forward Notice

#### [MODIFY] [approvals.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/cgsd_management/approvals.tsx)

When a report is `approved`, the modal footer currently shows only "Generate COA Report". Add:

- An info banner: *"This report has been approved. RMCD has been notified and will handle document release."*
- Keeps the existing "Generate COA Report" button

No new DB columns needed — this is a UI-only addition.

---

### 4. FAMCD Ocular Inspections — Revision Notes Visibility

#### [MODIFY] [ocular-inspections.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/famcd/ocular-inspections.tsx)

When FAMCD opens a request that was `returned_for_revision`:

- Fetch the latest `approval_record` row for that request (via `inventory_report`) where `decision = 'rejected'`
- Display a red alert banner at the top of the inspection form:  
  *"⚠️ CGSD returned this report: [remarks from approval_record]"*

---

### App.tsx — Route Wiring

#### [MODIFY] [App.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/App.tsx)

- Import `RmcdRoutingPage` and `RmcdReleasesPage`
- Replace the two `PlaceholderPage` routes for `rmcd/routing` and `rmcd/releases`

---

## Verification Plan

### Manual Verification Steps

**Feature 1 — RMCD Request Routing:**
1. Log in as `rmcd@bpm.qc.gov.ph` / `admin123`
2. Navigate to **Request Routing** in the sidebar
3. Verify pending `inventory_request` rows appear in the table
4. Click **"Endorse to FAMCD"** on one row → confirm status changes to `in_progress` and the row shows "Endorsed ✓"
5. Log in as `famcd@bpm.qc.gov.ph` / `admin123` → go to **Ocular Inspections** → the endorsed request should appear in the queue

**Feature 2 — RMCD Document Releases:**
1. Log in as `rmcd@bpm.qc.gov.ph` / `admin123`
2. Navigate to **Document Releases** in the sidebar
3. Verify CGSD-approved `inventory_report` rows appear
4. Click **"Mark as Released"** → row shows "Released ✓" badge
5. Check Supabase `approval_record` table for a new row with `decision = 'released'`

**Feature 3 — CGSD Post-Approval Banner:**
1. Log in as `cgsd@bpm.qc.gov.ph` / `admin123`
2. Navigate to **Approvals**
3. Open any approved report → confirm the info banner is visible below the document section

**Feature 4 — FAMCD Revision Notes:**
1. As CGSD, return a pending report with a reason (e.g., *"Photos are blurry"*)
2. Log in as `famcd@bpm.qc.gov.ph` / `admin123`
3. Go to **Ocular Inspections** → click "Start Inspection" on the returned request
4. Confirm a red banner appears at the top showing: *"⚠️ CGSD returned this report: Photos are blurry"*
