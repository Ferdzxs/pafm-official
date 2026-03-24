# Asset Inventory & Request Workflow (CGSD/FAMCD/RMCD)

This document describes the end-to-end workflow for asset requests and inventory assets in the pafm system. It is based on implementation in the app: `src/pages/famcd/ocular-inspections.tsx`, `src/pages/cgsd_management/approvals.tsx`, `src/pages/cgsd_management/inventory-assets.tsx`, and RMCD/FAMCD routes.

---

## Part A: Asset Request Flow (from requester to approval)

### STEP 1: Request Submission (Punong Barangay / Cemetery / Parks)

- Routes:
  - `/barangay/asset-requests` (Punong Barangay)
  - `/burial/asset-requests` (Cemetery)
  - `/parks/asset-requests` (Parks Admin)

- Database table: `inventory_request`
  - `inventory_request_id`:
    - `REQ-BR-{timestamp}`, `REQ-CO-{timestamp}`, or `REQ-PK-{timestamp}`
  - `status`: `pending`
  - `requesting_office`: FK to `government_office.office_id`
  - Other fields: `inventory_scope`, `date_requested`, `cycle_type`, etc.

- Optional: `digital_document` store supporting documents
  - `reference_no` = request id
  - `file_url` = attachment link

- Result: request enters queues used by RMCD/FAMCD/CGSD path.

### STEP 2: RMCD Endorsement (Optional)

- Route: `/rmcd/routing`
- Path:
  - RMCD loads pending requests: `.from('inventory_request').in('status', ['pending', 'in_progress'])`
  - Approve to forward: `.update({ status: 'in_progress' })`

- Note: if this step is skipped (direct FAMCD), request may remain `pending`.

### STEP 3: FAMCD Ocular Inspection

- Route: `/assets/inspections` (FAMCD UI)
- Queue selection (in `famcd/ocular-inspections.tsx`):
  - `.from('inventory_request').in('status', ['pending', 'in_progress'])`

- Inspection write operations:
  1. Insert into `ocular_inspection`:
     - `inspection_id` = `INSP-{timestamp}`
     - `inventory_request_id`, `property_id`, `inspection_date`
     - `physical_condition_notes`, `new_condition`, `usage_verified`, `boundary_verified`
  2. Insert into `inventory_report`:
     - `inventory_report_id` = `IRP-{timestamp}`
     - `inventory_request_id`, `preparation_date`, `prepared_by_office`, `prepared_by_employee`
     - `approval_status` = `pending`
     - `digital_report_url` optional
  3. Update `inventory_request.status = 'completed'`

- Optional: upload photos to `inspection_photo_evidence`.

### STEP 4: CGSD Approval/Review

- Route: `/assets/approvals`
- Main query in `cgsd_management/approvals.tsx`:
  - `inventory_report` where `.in('approval_status',['pending','approved','returned_for_revision'])`
  - Modal loads document details via `digital_document` for both report and request IDs

- Approve path:
  - `inventory_report.approval_status = 'approved'`
  - `approval_record` insert:
    - `decision = 'approved'`, `approved_by_office`, `approved_by_employee`, `approval_date`
  - Update `property.asset_condition` based on linked `ocular_inspection.new_condition`

- Return path:
  - `inventory_report.approval_status = 'returned_for_revision'`
  - `approval_record` insert with `decision = 'rejected'` and `remarks`

### STEP 5: RMCD Document Release

- Route: `/rmcd/releases`
- RMCD reviews final approvals and creates `approval_record` with `decision = 'released'`.

---

## Part B: Inventory & Assets Management (CGSD tab)

### Route: `/assets/inventory` (CGSD roles as per RBAC config)
- File: `src/pages/cgsd_management/inventory-assets.tsx`

### Behavior

- Loads `property` registry with fields and office join:
  - Selected columns: `property_id`, `property_name`, `location`, `asset_condition`, `acquisition_date`, `property_type`, joined `government_office.office_name`
- Table UI supports searching by name/location and row view.
- Property edit flows:
  - Modal shows editable fields for `property_name`, `location`, `asset_condition`, `area_size`
  - Save updates `property` table via `.update().eq('property_id', selected)`
  - Updates responsible for master data correction from CGSD side.

### Asset status colors
- Land: green
- Building: blue
- Facility: purple
- Other: gray

### System integration
- `property.asset_condition` can be auto-updated by CGSD approval actions (ocular workflow).
- `inventory_request` workflow uses same domain with `inventory_scope` values.

---

## Tables used (summary)
- `inventory_request`
- `digital_document`
- `ocular_inspection`
- `inventory_report`
- `approval_record`
- `inspection_photo_evidence`
- `property`
- `government_office`
- `employee`

---

## Notes
- The user-side requested example is now implemented as this document.
- This file can be committed to repo and used as reference for operations and testing.
