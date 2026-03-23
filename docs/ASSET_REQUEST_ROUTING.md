# Asset / inventory request routing (detailed)

This document specifies **exact app routes**, **database tables and fields**, and **status transitions** for inventory-related asset requests involving **Punong Barangay**, **Cemetery Office**, **Parks Admin**, **FAMCD**, and **CGSD Management**. **RMCD** is included where the code touches the same records.

**Main functions (whole flow):** the five steps in **§9** are the canonical sequence—submit → RMCD endorse (optional) → FAMCD inspection & report → CGSD approve or return → RMCD release.

---

## 1. Role → URL map (what each role opens in the browser)

| Role (`user.role` in app) | Asset request (submit / list own) | Shared asset module (inventory, inspections, reports) |
|---------------------------|-----------------------------------|---------------------------------------------------------|
| `punong_barangay` | **`/barangay/asset-requests`** | **`/assets/inventory`**, **`/assets/reports`** (see `src/config/rbac.ts`) |
| `cemetery_office` | **`/burial/asset-requests`** | **`/assets/inventory`**, **`/assets/reports`** |
| `parks_admin` | **`/parks/asset-requests`** | **`/assets/inventory`**, **`/assets/reports`** |
| `famcd` | *(no dedicated submit page; can use global list)* **`/assets/requests`** | **`/assets/inventory`**, **`/assets/inspections`**, **`/assets/reports`**, **`/assets/submissions`** |
| `cgsd_management` | **`/assets/requests`** (all offices’ requests) | **`/assets/inventory`**, **`/assets/inspections`**, **`/assets/reports`**, **`/assets/approvals`** |
| `rmcd` | — | **`/rmcd/routing`**, **`/rmcd/releases`** |

**Router wiring:** `src/App.tsx` maps `/assets/inspections` → `src/pages/famcd/ocular-inspections.tsx` (FAMCD field/queue UI). The CGSD **review** UI for ocular jobs is implemented in **`src/pages/cgsd_management/ocular-inspections.tsx`** but is **not** given a separate path in `App.tsx` today—only the FAMCD component is mounted at `/assets/inspections`.

---

## 2. `government_office.office_name` values (must match seed data)

| UI label | Exact string used in code when inserting `inventory_request.requesting_office` |
|----------|----------------------------------------------------------------------------------|
| Punong Barangay flow | **`Barangay Secretariat`** (`src/pages/punong_barangay/asset-requests.tsx`, constant `OFFICE_NAME`) |
| Cemetery Office | **`Cemetery Office`** (`src/pages/cemetery_office/asset-requests.tsx`) |
| Parks Admin | **`Parks & Recreation Administration`** (`src/pages/parks_admin/asset-requests.tsx`) |

Each page resolves `government_office.office_id` with `.eq('office_name', OFFICE_NAME)` before insert.

---

## 3. Request ID prefixes (new rows)

| Office page | `inventory_request_id` pattern |
|-------------|--------------------------------|
| Punong Barangay | `REQ-BR-{timestamp}` |
| Cemetery Office | `REQ-CO-{timestamp}` |
| Parks Admin | `REQ-PK-{timestamp}` |

---

## 4. Forward path: requesting office → RMCD → FAMCD → CGSD → release

### Step A — Requesting office creates the request

**Who:** Punong Barangay, Cemetery Office, or Parks Admin.  
**Route:** See §1.  
**Source files:**

- `src/pages/punong_barangay/asset-requests.tsx`
- `src/pages/cemetery_office/asset-requests.tsx`
- `src/pages/parks_admin/asset-requests.tsx`

**Database:**

| Table | Fields set |
|-------|------------|
| `inventory_request` | `inventory_request_id`, `requesting_office` (FK → `government_office.office_id`), `inventory_scope`, **`status: 'pending'`**, `date_requested`, `cycle_type` (Low/Medium/High used as priority) |
| `digital_document` (optional) | `document_id`, `document_type` e.g. `asset_request_letter`, `reference_no` = request id, `file_url`, `created_by_office` |

**Effect:** One row appears in Supabase for **all** consumers that query `inventory_request` without filtering by office.

---

### Step B — RMCD endorsement (optional in business process, implemented)

**Who:** RMCD.  
**Route:** **`/rmcd/routing`**.  
**Source:** `src/pages/rmcd/routing.tsx`.

**Query:** Loads `inventory_request` where `status` **in** `('pending', 'in_progress')`.

**Action “Endorse to FAMCD”:**

| Table | Update |
|-------|--------|
| `inventory_request` | `status` = **`'in_progress'`** where `inventory_request_id` = selected row |

---

### Step C — FAMCD ocular inspection and hand-off to CGSD

**Who:** FAMCD.  
**Route:** **`/assets/inspections`**.  
**Source:** `src/pages/famcd/ocular-inspections.tsx`.

**Queue query:** `inventory_request` where **`status` = `'pending'`** only (`.eq('status', 'pending')`).

**Important:** If RMCD has already set **`in_progress`**, those rows **do not** appear in this FAMCD queue unless the query is changed. See §8.

**On “Submit” inspection report (success path), three writes:**

| Order | Table | Action |
|-------|--------|--------|
| 1 | `ocular_inspection` | Insert: `inspection_id` (`INSP-{timestamp}`), `inventory_request_id`, `property_id`, `inspection_date`, `conducted_by_office` / `conducted_by_employee`, `asset_condition_notes` |
| 2 | `inventory_report` | Insert: `inventory_report_id` (`IRP-{timestamp}`), `inventory_request_id`, `preparation_date`, `prepared_by_office` / `prepared_by_employee`, **`approval_status: 'pending'`** (CGSD) |
| 3 | `inventory_request` | **Update** `status` → **`'completed'`** |

---

### Step D — CGSD approves or returns (ocular path)

**Intended UI:** `src/pages/cgsd_management/ocular-inspections.tsx` (lists rows tied to `ocular_inspection` and linked `inventory_report`).

**Approve** (`handleApprove`):

| Table | Change |
|-------|--------|
| `inventory_report` | `approval_status` → **`'approved'`** |
| `approval_record` | Insert: `decision: 'approved'`, `inventory_report_id`, `approved_by_office` / `approved_by_employee`, `remarks` |
| `property` (if applicable) | `asset_condition` updated from inspection |

**Return for revision** (`handleReturn`):

| Table | Change |
|-------|--------|
| `inventory_report` | `approval_status` → **`'returned_for_revision'`** |
| `approval_record` | Insert: `decision: 'rejected'` (code uses this label for return), `remarks` = reason |

---

### Step E — RMCD document release (after CGSD approval)

**Who:** RMCD.  
**Route:** **`/rmcd/releases`**.  
**Source:** `src/pages/rmcd/releases.tsx`.

**Reads:** `inventory_report` where `approval_status` = **`'approved'`**; then checks `approval_record` for rows already marked **`decision: 'released'`**.

**Release action:** Inserts **`approval_record`** with **`decision: 'released'`** for that `inventory_report_id`.

---

## 5. CGSD “other path” — `/assets/approvals` (non-ocular reports)

**Source:** `src/pages/cgsd_management/approvals.tsx`.

**Logic:** Loads `inventory_report` with pending/returned/approved filters, then **excludes** any report whose `inventory_request_id` appears in **`ocular_inspection`**. So **FAMCD ocular-backed reports are not approved on this page**; they are handled in the ocular inspection module (§4 Step D).

---

## 6. Consolidated view — `/assets/requests`

**Source:** `src/pages/assets/requests.tsx`.  
**Who:** CGSD (and any role that can open this route).

**Query:** `inventory_request` with joined `government_office`, `property`.

**Can update:** `inventory_request.status` via `handleUpdateStatus` (manual status changes for testing or operations).

---

## 7. How requesting offices see “vice versa” (status only)

**Source:** Same three `asset-requests` pages; each **filters** `inventory_request` where joined `government_office.office_name` equals **that page’s `OFFICE_NAME`**.

**Display mapping (UI):**

| DB `inventory_request.status` | Shown label |
|---------------------------------|-------------|
| `pending` | Pending |
| `in_progress` | In Progress |
| `approved` / `completed` | Approved |
| `rejected` | Rejected |

There is **no** separate screen where FAMCD “sends a message” back to Punong Barangay / Cemetery / Parks; the loop is **data on the same `inventory_request` row** plus eventual **report approval** visible through inventory/report flows if exposed to that role.

---

## 8. Implementation gaps (specific)

1. **RMCD vs FAMCD queue:** RMCD sets **`in_progress`**; FAMCD ocular list loads **`pending`** only—endorsed requests may disappear from FAMCD’s queue unless queries are aligned.
2. **CGSD `/assets/inspections`:** Routes to **FAMCD** `ocular-inspections.tsx`, not `cgsd_management/ocular-inspections.tsx`—CGSD users may not see the correct review UI until a separate route is added.
3. **`/assets/requests` origin labels:** TypeScript types use names like `Punong Barangay` / `Parks Admin`, but DB stores **Barangay Secretariat** | **Parks & Recreation Administration**—filters may not match unless normalized.

---

## 9. Main functions (end-to-end sequence)

These five steps are the **main functions** of this workflow (to‑be / intended order). Step-by-step tables and file references are in **§4**.

1. **Punong Barangay / Cemetery / Parks** submits → `inventory_request` **`pending`** (+ optional `digital_document`).
2. **RMCD** may set **`in_progress`** on `/rmcd/routing` (endorse toward FAMCD).
3. **FAMCD** works **`/assets/inspections`**: load queue → write **`ocular_inspection`**, **`inventory_report`** (`approval_status: pending`) → set `inventory_request` **`completed`**.
4. **CGSD** approves (`approval_status: approved`) or returns (`returned_for_revision`) on the **ocular review** UI; vice versa, FAMCD addresses returns and resubmits (see §4 Step D, §8).
5. **RMCD** marks CGSD-approved report **released** on `/rmcd/releases` (`approval_record`, `decision: released`).

**Code note:** Step 3’s queue today filters **`pending`** only; if step 2 always runs first, align FAMCD’s query with **`in_progress`** (or skip endorsement)—see **§8**.

---

## Related files

| Concern | Path |
|---------|------|
| Routes | `src/App.tsx` |
| Sidebar per role | `src/config/rbac.ts` |
| BPMN narrative | `docs/BPMN TO-BE.md` (Asset Inventory Tracker section) |

---

*Update this document when `App.tsx` or the ocular/approval queries change.*
