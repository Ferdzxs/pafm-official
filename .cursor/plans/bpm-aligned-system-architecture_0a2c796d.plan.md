---
name: bpm-aligned-system-architecture
overview: Refactor the Public Assets & Facilities Management system architecture so that roles, modules, pages, and permissions strictly follow the To-Be BPMN processes as source of truth.
todos:
  - id: extract-bpmn-roles-tasks
    content: Extract BPMN swimlane roles and detailed tasks per module from BPMN and To-Be docs.
    status: completed
  - id: map-bpmn-tasks-to-system
    content: Map BPMN tasks to modules, roles, pages, and actions, ensuring process order is preserved.
    status: completed
  - id: detect-misalignments
    content: Compare BPMN-derived responsibilities with current role–module matrix and page structure to find misalignments.
    status: completed
  - id: define-corrected-architecture
    content: Define corrected module → role → page → action architecture that is BPMN-aligned.
    status: completed
  - id: generate-access-matrix-json
    content: Generate corrected Role × Module access matrix and implementation-ready JSON structures for modules, roles, pages, actions, and permissions.
    status: completed
  - id: summarize-structural-problems
    content: Enumerate structural problems and provide final BPMN-to-system mapping for implementation.
    status: completed
isProject: false
---

### Objective

Refactor the existing Government Service Management System so that roles, modules, pages, and permissions are strictly derived from the To-Be BPMN models, resolving misalignments in the current role–module matrix and page structure and producing implementation-ready structures (including JSON definitions).

### 1. Extract BPMN Roles, Responsibilities, and Tasks

- **Collect swimlane roles per process** from `[docs/BPMN TO-BE.md](docs/BPMN TO-BE.md)` and summarize them by module:
  - Cemetery & Burial Management
  - Parks & Recreation Scheduling
  - Facility Reservation System (Barangay)
  - Water Supply & Drainage Requests
  - Asset Inventory Tracker
- **For each role**, list:
  - High-level responsibilities (from `[docs/TO-BE DOCUMENT.md](docs/TO-BE DOCUMENT.md)` and BPMN narrative sections)
  - Ordered process steps / user tasks / service tasks they perform.
- **Deliverable:** A concise catalog of roles and their BPMN-defined responsibilities (STEP 1 & STEP 2).

### 2. Derive Canonical BPMN Task → System Function Mapping

- **For each BPMN process**, enumerate all tasks per lane (user tasks, service tasks, gateways outcomes that imply decisions) and normalize them into implementation-level operations.
- **Map each task** into one of:
  - A dedicated page/view (e.g., "Verify Burial Requirements" → `burial-application-review` page)
  - An action within an existing page (e.g., approve/deny, schedule, assign team) where grouping is natural.
- **Preserve process order** in the mapping so the UI flow can be reconstructed directly from BPMN.
- **Deliverable:** A BPMN task → `module / role / page / action` mapping table (STEP 3).

### 3. Compare BPMN-Derived Responsibilities vs Current Implementation

- **Cross-check roles and modules** using:
  - Role × module matrix `[docs/current_role_module_matrix.md.resolved](docs/current_role_module_matrix.md.resolved)`
  - Current page structure `[docs/page_structure_and_functions.md](docs/page_structure_and_functions.md)`
  - Role summary `[docs/current modules and role.md](docs/current modules and role.md)`
- **Identify mismatches**, including:
  - Pages owned by the wrong role (e.g., death registration responsibilities in `ssdd/` vs BPMN CCRD lane).
  - Extra roles or cross-cutting roles not in BPMN (e.g., `reservation_officer/` vs BPMN Reservation Desk Officer / Barangay Secretary).
  - Missing pages implied by BPMN but not present in `src/pages` (e.g., explicit burial requirement review task vs generic page).
  - Roles that have access to modules where they do not appear as swimlanes.
- **Deliverable:** A structured list of discrepancies grouped by module and role (STEP 4 & STEP 8).

### 4. Propose Corrected Module → Role → Page Architecture

- **For each module**, define:
  - **Module name and scope** aligned to BPMN pools (e.g., Cemetery & Burial, Parks & Recreation, Barangay Facility, Water & Drainage, Asset Inventory).
  - **Roles in the module** (swimlane-derived only; any other roles limited to integrations like Payments, Notifications, or explicitly-scoped internal offices).
  - **For each role**, the pages and major actions derived from BPMN tasks and grouped for UX coherence:
    - Example: Cemetery module / Cemetery Office → `burial-applications`, `plot-availability`, `burial-schedule`, `burial-records`, each with actions like review, approve, schedule, record.
- **Minimize structural changes** while fixing correctness:
  - Do not remove roles unless BPMN clearly shows they should not perform any core tasks.
  - Do not merge modules beyond what the BPMN pools imply.
- Where helpful, **illustrate module–role–page relationships** with a simple mermaid diagram for each module, using node IDs without spaces.
- **Deliverable:** Corrected architecture spec for each module (STEP 5 & STEP 9: modules, roles, pages, actions).

### 5. Rebuild Role × Module Access Matrix from BPMN

- **Start from BPMN swimlanes** as the authoritative list of actors per process and:
  - Mark **Full** access when a role performs multiple core tasks in a module.
  - Mark **Partial** access when a role only performs a narrow or conditional subset (e.g., SSDD only for indigent burial assistance, Treasurer only via Digital Payment Integration).
  - Mark **Apply only** for citizens where they only initiate/track requests.
- **Include cross-cutting services** (Payments, System Admin, Notification) but ensure they remain scoped to their technical role in the flow.
- **Deliverable:** Updated Role × Module matrix table, explicitly replacing or correcting the one in `[docs/current_role_module_matrix.md.resolved](docs/current_role_module_matrix.md.resolved)` (STEP 6).

### 6. Define Code-Friendly JSON Structures

- **Design normalized JSON structures** suitable for implementation (TypeScript/DB seeding), covering:
  - `modules`: id, name, description, related BPMN pool.
  - `roles`: id, name, description, related swimlane(s).
  - `pages`: id, path (e.g., `cemetery_office/burial-applications`), module, owning role.
  - `actions`: id, label, type (view/submit/approve/schedule/assign/etc.), associated page, required permission.
  - `permissions` / `rolePermissions`: mapping roles → modules/pages/actions.
- **Ensure JSON is derived from the corrected architecture**, not from the current (possibly incorrect) implementation.
- **Deliverable:** A coherent set of JSON examples ready to back system configuration or seed data (STEP 7).

### 7. Enumerate Structural Problems and Final Mapping

- **Summarize key structural problems** found (e.g., SSDD performing death registration tasks, Reservation Officer duplicating Barangay Secretary duties, any citizen pages that do not correspond to BPMN tasks).
- **For each problem**, document:
  - The incorrect current state (role/module/page).
  - The BPMN-aligned correction (who should own the responsibility and in which module/page).
- **Produce a final mapping** from BPMN tasks → system functions (module/role/page/action) for every process so implementers can trace each system feature back to its BPMN origin.
- **Deliverable:** Problem list plus final end-to-end mapping and confirmation that every BPMN task has a system function and every function corresponds to a BPMN task.

### 8. Implementation-facing Notes

- Highlight how the corrected architecture maps to the existing `src/pages` structure (referencing `[docs/page_structure_and_functions.md](docs/page_structure_and_functions.md)`), including:
  - Which pages can be reused as-is.
  - Which pages require renaming, splitting, or repurposing.
  - Which new pages (or sub-views) must be introduced.
- Provide guidance suitable for refactoring the actual codebase later (e.g., consolidating SSDD death-registration responsibilities into the proper Death Registration module, ensuring water leak vs new connection flows align with `utility_helpdesk/` and `utility_engineering/` pages).

### High-Level Todos

- Extract BPMN roles and detailed tasks per module.
- Build BPMN task → system page/action mapping.
- Identify and document misalignments between BPMN, role–module matrix, and current pages.
- Specify corrected module/role/page/action architecture per module.
- Regenerate Role × Module matrix and code-friendly JSON structures based on the corrected design.
- List structural problems and provide final BPMN-to-system mapping for implementation.

