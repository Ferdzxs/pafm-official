## System Admin Operations Guide

This document describes what the `system_admin` role can do in the BPM app, which database tables are touched by each backoffice module, and how backup configuration is expected to work in production.

### 1. Responsibilities of the System Admin

- **User & Role Management**
  - Maintain `system_users` (creation, activation/deactivation, role changes).
  - Ensure there is always at least one active `system_admin` account.
  - Link employees to system users where appropriate so audit trails can be resolved back to people.
- **Office Management**
  - Maintain the catalog of government offices in `government_office` (create, edit, retire).
  - Keep office metadata aligned with the actual organizational structure so routing and dashboards remain accurate.
- **Employee Master Data**
  - Maintain employee records in `employee` (name, contact, position, office, active flag).
  - Link/unlink employees to `system_users` to ensure meaningful audit logs.
- **System Settings**
  - Configure platform-wide behavior using `system_settings` and `user_settings` (e.g. feature toggles, notification behavior, backup schedules).
- **Audit & Compliance**
  - Review `audit_logs` for sensitive actions (approvals, payments, migrations, impersonation).
  - Ensure suspicious activity is investigated in coordination with the relevant office.
- **Backups & Data Safety**
  - Monitor entries in `system_backups` and make sure infra is running real backups according to the configured schedule.
  - Trigger on-demand backups before large configuration or migration changes when needed.
- **Legacy Data Migration**
  - Use the Legacy Migration wizard to onboard historical cemetery/burial records into `person`, `deceased`, and `burial_record`.
  - Confirm that migrations complete successfully and store/download migration logs for audit purposes.

### 2. Key Tables Touched by Admin Modules

- **`system_users`**
  - Source of truth for all internal users (system admin, park admin, barangay secretary, etc.).
  - Fields used heavily by the admin UI: `user_id`, `full_name`, `email`, `role`, `department`, `contact_no`, `is_active`, `password_hash`.
- **`employee`**
  - Master list of city employees.
  - Linked to `system_users` via `system_user_id` and to offices via `office_id`.
  - Used for ownership and routing in various domain modules.
- **`government_office`**
  - Registry of all participating government offices.
  - Drives filtering, routing, and high-level dashboards.
- **`system_settings`**
  - Generic key/value store (JSON-capable) used for platform-wide settings, such as:
    - `notifications.global` – notification defaults.
    - `backups.schedule` – backup schedule configuration.
    - `security.password_policy` – password length/complexity hints for internal users.
- **`user_settings`**
  - Per-user preferences (e.g. theme, language, dashboard defaults) layered on top of `system_settings` defaults.
- **`audit_logs`**
  - Central record of high-value actions taken in the system.
  - Populated via the shared `logAudit` helper in `src/lib/admin.ts` and used by the System Admin Audit Logs page.
  - Typical fields: `action`, `module`, `status`, `subject`, `performed_by`, `ip_address`, `details` (JSON).
- **`system_backups`**
  - Catalog of backup events and their metadata (`filename`, `date`, `size`, `type`, `status`).
  - Acts as a bridge between infra-managed backup jobs and the web UI.
- **`person`, `deceased`, `burial_record`, `digital_document`**
  - Domain tables used by the Legacy Migration wizard and cemetery modules.
  - `person` and `deceased` hold core identity and death information.
  - `burial_record` links a deceased person to a specific burial event.
  - `digital_document` can be used for linked permit documents and, optionally, stored migration logs.

### 3. Backup Configuration & Expectations

- **Where backup configuration lives**
  - Backup-related configuration is stored in `system_settings`, typically under a namespaced key such as `backups.schedule`.
  - Example value: `{"cron": "0 2 * * *"}` (nightly at 2 AM server time).
  - The admin UI exposes this as a schedule editor; infra should read the value and configure a real job accordingly.
- **How `system_backups` is used**
  - Infra (or a backend job) should insert a row into `system_backups` each time a backup is taken, recording at minimum:
    - `filename` – stable reference to the backup artifact.
    - `date` – when it was taken.
    - `type` – `Scheduled` or `Manual`.
    - `size` – optional human-readable size.
    - `status` – `Pending`, `Running`, `Completed`, or `Failed`.
  - The System Admin UI reads from this table to show the backup history and current state.
- **"Run backup now" behavior**
  - From the front end, the "Run backup now" button simply:
    - Inserts a new `system_backups` row with `type = 'Manual'` and initial `status` (for example `Pending`).
    - Optionally calls a future RPC/endpoint that infra provides to trigger the actual backup.
  - Infra should:
    - Observe these rows and perform a backup when a new `Pending`/`Requested` entry appears.
    - Update the row’s `status` to `Running` and then to `Completed` or `Failed` with an error note.

### 4. Legacy Migration Wizard – Operational Notes

- **Data flow**
  - The wizard ingests a CSV export of legacy cemetery/burial records.
  - It performs a dry-run duplicate check against `deceased.death_certificate_no` before executing.
  - Rows with missing core data (full name, date of death, death certificate number) are treated as warnings and skipped during execution.
  - Non-duplicate, complete rows result in new records in:
    - `person` – basic identity and contact/address.
    - `deceased` – death details including `death_certificate_no`.
    - `burial_record` – burial date and linkage back to the deceased person.
- **Audit logging**
  - Each execution of the migration writes an entry to `audit_logs` via `logAudit` with:
    - A high-level `summary` of imported/duplicate/warning/error counts.
    - A detailed JSON `log` of per-row outcomes.
  - This gives an auditable trail of when migrations occurred and what they changed.
- **Migration logs**
  - After execution, the UI exposes a "Download Migration Log" button that downloads the in-memory JSON log.
  - Infra teams that require a durable copy can either:
    - Store the downloaded log in a document management system, or
    - Extend the back end later to persist the log as a `digital_document` entry linked from the audit record.

### 5. Deployment Readiness Checklist

- **Before go-live**
  - Verify at least one active `system_admin` user exists in `system_users` and can log in with a known password.
  - Confirm office and employee records are loaded and correctly linked to `system_users` where needed.
  - Review `system_settings` defaults (notifications, backup schedule, security) and adjust to production policy.
  - Run through the System Admin pages (User & Role Management, Office Management, Employee Master, Settings, Audit Logs, Backups, Legacy Migration) with a test account.
  - Perform at least one test migration in a staging environment and review the resulting `audit_logs` and downloaded migration log.
  - Coordinate with infra so that:
    - Real backup jobs are configured according to `backups.schedule`.
    - Backup artifacts are stored in a secure, redundant location and can be restored.

