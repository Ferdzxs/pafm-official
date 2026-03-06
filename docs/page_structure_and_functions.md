#Current Page Structure and Functional Responsibilities of a system

This document outlines the current structure of the `src/pages` directory in the system, along with the inferred function and responsibility for each page, grouped by user roles and business modules.


src/pages/
├── DashboardPage.tsx
├── PlaceholderPage.tsx
├── ProfilePage.tsx
├── SettingsPage.tsx
│
├── auth/
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
│
├── barangay_secretary/
│   ├── constituent-records.tsx
│   ├── dashboard.tsx
│   ├── documents-filing.tsx
│   ├── ordinance-references.tsx
│   ├── pending-approvals.tsx
│   ├── reports.tsx
│   ├── reservation-records.tsx
│   └── settings.tsx
│
├── cemetery_office/
│   ├── burial-applications.tsx
│   ├── burial-records.tsx
│   ├── dashboard.tsx
│   ├── deceased-registry.tsx
│   ├── indigent-assistance.tsx
│   ├── niche-management.tsx
│   ├── payments-permits.tsx
│   └── reports.tsx
│
├── cgsd_management/
│   ├── approval-records.tsx
│   ├── dashboard.tsx
│   ├── inventory-assets.tsx
│   ├── inventory-reports.tsx
│   └── ocular-inspections.tsx
│
├── citizen/
│   ├── apply-barangay.tsx
│   ├── apply-burial.tsx
│   ├── apply-park.tsx
│   ├── apply-water.tsx
│   ├── BurialApplicationPage.tsx
│   ├── dashboard.tsx
│   ├── my-applications.tsx
│   ├── my-documents.tsx
│   ├── payment-history.tsx
│   └── report-leak.tsx
│
├── death_registration/
│   ├── approvals-signing.tsx
│   ├── certificate-verification.tsx
│   ├── dashboard.tsx
│   └── received-documents.tsx
│
├── famcd/
│   ├── dashboard.tsx
│   ├── inventory-assets.tsx
│   ├── inventory-reports.tsx
│   ├── ocular-inspections.tsx
│   └── submission-records.tsx
│
├── parks_admin/
│   ├── booking-calendar.tsx
│   ├── dashboard.tsx
│   ├── park-venues.tsx
│   ├── reservations.tsx
│   └── usage-logs.tsx
│
├── punong_barangay/
│   ├── dashboard.tsx
│   ├── ordinance-references.tsx
│   └── pending-approvals.tsx
│
├── reservation_officer/
│   ├── approvals.tsx
│   ├── dashboard.tsx
│   ├── permits-payments.tsx
│   └── reservation-records.tsx
│
├── ssdd/
│   ├── citizen-records.tsx
│   ├── dashboard.tsx
│   ├── death-registration.tsx
│   ├── indigent-assistance.tsx
│   └── reports-analytics.tsx
│
├── system_admin/
│   ├── audit-logs.tsx
│   ├── dashboard.tsx
│   ├── employee-master.tsx
│   ├── legacy-migration.tsx
│   ├── office-management.tsx
│   ├── system-settings.tsx
│   └── user-role-management.tsx
│
├── treasurer/
│   ├── audit-logs.tsx
│   ├── dashboard.tsx
│   ├── official-receipts.tsx
│   ├── payment-transactions.tsx
│   ├── reconciliation-queue.tsx
│   ├── revenue-reports.tsx
│   └── TransactionsPage.tsx
│
├── utility_engineering/
│   ├── assigned-jobs.tsx
│   ├── dashboard.tsx
│   ├── installations.tsx
│   ├── leak-reports.tsx
│   └── service-tickets.tsx
│
└── utility_helpdesk/
    ├── assign-teams.tsx
    ├── connection-status.tsx
    ├── dashboard.tsx
    └── ticket-triage.tsx



## Global / Main Pages
These are high-level pages that apply across different modules or user contexts.

- `DashboardPage.tsx`: The main dynamic landing dashboard, likely routing or rendering different components based on the logged-in user's role.
- `PlaceholderPage.tsx`: A generic placeholder page used for UI elements or routes that are currently under development.
- `ProfilePage.tsx`: Dedicated page for users to view and manage their personal profile details.
- `SettingsPage.tsx`: General interface for users to configure application-wide or account-level settings.

---

## Authentication (`auth/`)
Handles all user identity and access control entry points.

- `LoginPage.tsx`: Interface for existing users to authenticate and access the system.
- `SignupPage.tsx`: Form for new users (e.g., citizens) to register for an account.

---

## Barangay Secretary (`barangay_secretary/`)
Focuses on general barangay administration, constituent records, and document issuance.

- `dashboard.tsx`: The main overview of activities, pending tasks, and stats for the Barangay Secretary.
- `constituent-records.tsx`: Interface to manage, view, and update demographic data of barangay constituents.
- `documents-filing.tsx`: Handles the processing, filing, and issuance of official barangay documents (e.g., clearances, certificates).
- `ordinance-references.tsx`: A searchable library or reference log for barangay ordinances and memos.
- `pending-approvals.tsx`: Dashboard specifically for reviewing and taking action on citizen requests that require the Secretary's approval.
- `reports.tsx`: Module for generating administrative and demographic reports.
- `reservation-records.tsx`: Secondary view/management of facility reservations handled by the barangay.
- `settings.tsx`: Configuration options specific to the Barangay Secretary's workflow.

---

## Cemetery Office (`cemetery_office/`)
Manages the Burial and Cemetery Management module.

- `dashboard.tsx`: High-level metrics on burial applications, niches, and cemetery capacities.
- `burial-applications.tsx`: Processes new applications submitted by citizens for burial services.
- `burial-records.tsx`: A historical log and archive of all past burials.
- `deceased-registry.tsx`: The master database or registry of deceased individuals within the jurisdiction.
- `indigent-assistance.tsx`: Manages applications and subsidies for indigent citizens requiring burial assistance.
- `niche-management.tsx`: Tool for tracking the availability, assignment, and status of cemetery niches or lots.
- `payments-permits.tsx`: Tracks payments corresponding to burial services and the issuance of burial permits.
- `reports.tsx`: Reporting tools specific to cemetery operations and revenue.

---

## CGSD Management (`cgsd_management/`)
City General Services Department - Focuses on asset tracking and physical facility maintenance.

- `dashboard.tsx`: Overview of city physical assets, pending inspections, and request approvals.
- `approval-records.tsx`: Logs and actions regarding the approval of asset requests or structural changes.
- `inventory-assets.tsx`: Management and tracking of physical assets and inventory items.
- `inventory-reports.tsx`: Generation of audit reports on inventory levels and asset depreciation.
- `ocular-inspections.tsx`: Scheduling, logging, and reviewing physical site inspections for assets or buildings.

---

## Citizen (`citizen/`)
The front-facing portal for public users interacting with the system.

- `dashboard.tsx`: The citizen's personal home page, showing the status of their active requests.
- `apply-barangay.tsx`: Form to request barangay clearances or certificates.
- `apply-burial.tsx`: Form to submit a request for cemetery/burial services.
- `apply-park.tsx`: Form to request venue reservations at public parks.
- `apply-water.tsx`: Form to request water supply or drainage-related services.
- `BurialApplicationPage.tsx`: A potentially more detailed multi-step form or specific view for burial applications.
- `my-applications.tsx`: A master list tracking the status of all applications the citizen has submitted.
- `my-documents.tsx`: A repository where the citizen can view and download their approved, issued certificates.
- `payment-history.tsx`: Log of past transactions and payments made by the citizen.
- `report-leak.tsx`: Form to log a report regarding water leaks or drainage issues.

---

## Death Registration (`death_registration/`)
Handles the clinical and civil processing of death certificates.

- `dashboard.tsx`: Overview of pending death registrations and verification statuses.
- `approvals-signing.tsx`: Interface for authorized officials to review and digitally/formally sign death certificates.
- `certificate-verification.tsx`: Tool for validating the details and authenticity of submitted death certificates.
- `received-documents.tsx`: Log of supporting requirements (e.g., medical certificates) submitted for processing.

---

## FAMCD (`famcd/`)
Facility and Asset Management Control Department - Focuses on asset lifecycle.

- `dashboard.tsx`: Overview of facility and asset management operations.
- `inventory-assets.tsx`: System for tracking and managing operational assets.
- `inventory-reports.tsx`: Reports on asset health, audits, and lifecycles.
- `ocular-inspections.tsx`: Management of safety/compliance inspections for facilities.
- `submission-records.tsx`: Logs of facility-related requests or compliance submissions.

---

## Parks Admin (`parks_admin/`)
Manages the Parks & Recreation Scheduling module.

- `dashboard.tsx`: Overview of park usage, upcoming events, and reservation metrics.
- `booking-calendar.tsx`: A visual calendar interface for tracking availability and bookings in park venues.
- `park-venues.tsx`: Management of park locations, defining capacity, amenities, and availability rules.
- `reservations.tsx`: Interface to review, approve, or reject park reservation applications.
- `usage-logs.tsx`: Historical data tracking the actual usage and event histories at park facilities.

---

## Punong Barangay (`punong_barangay/`)
The executive view for the Barangay Captain.

- `dashboard.tsx`: High-level executive dashboard showing core metrics, urgent actions, and overall barangay status.
- `ordinance-references.tsx`: Quick access to barangay ordinances for executive decision-making.
- `pending-approvals.tsx`: Dashboard for documents, payrolls, or critical requests that require the Captain's final sign-off.

---

## Reservation Officer (`reservation_officer/`)
Handles the general Facility Reservation System across different departments.

- `dashboard.tsx`: Overview of pending, active, and completed facility reservations.
- `approvals.tsx`: Dedicated interface for resolving pending reservation requests (approve/deny).
- `permits-payments.tsx`: Verifies payment completion and issues necessary permits for venue usage.
- `reservation-records.tsx`: A comprehensive, searchable audit trail of all reservation transactions.

---

## SSDD (`ssdd/`)
Social Services Development Department - Focuses on public welfare programs.

- `dashboard.tsx`: Overview of social service initiatives, applications, and welfare metrics.
- `citizen-records.tsx`: Database of citizens enrolled in or applying for various social service programs.
- `death-registration.tsx`: Interface handling the social service aspects of death registration (e.g., survivor benefits).
- `indigent-assistance.tsx`: Module specifically for processing and tracking financial/material assistance for indigent families.
- `reports-analytics.tsx`: Analytics on program reach, funds disbursed, and demographic impact.

---

## System Admin (`system_admin/`)
Handles the technical administration and security of the entire platform.

- `dashboard.tsx`: Overall system health and administrative action overview.
- `audit-logs.tsx`: Security and activity logs tracking who did what, and when, across the platform.
- `employee-master.tsx`: Master database of all system users who are employees/staff members.
- `legacy-migration.tsx`: Tools and interfaces for migrating data from older systems into the current platform.
- `office-management.tsx`: Interface for configuring the organizational structure (departments, divisions).
- `system-settings.tsx`: Global configuration variables (e.g., maintenance mode, global constraints).
- `user-role-management.tsx`: Configures role-based access control, user permissions, and account statuses.

---

## Treasurer (`treasurer/`)
Manages financial transactions, receipts, and revenue reconciliation.

- `dashboard.tsx`: Financial overview showing daily collections, pending payments, and revenue targets.
- `audit-logs.tsx`: Finance-specific audit trail for tracking changes to payment statuses and ledgers.
- `official-receipts.tsx`: Interface for generating, logging, and reprinting official electronic receipts.
- `payment-transactions.tsx`: Master list of all incoming payments across all modules (reservations, permits, etc.).
- `reconciliation-queue.tsx`: Tool for matching recorded transactions with physical bank deposits or cash counts.
- `revenue-reports.tsx`: Generation of income statements and financial summaries for executive review.
- `TransactionsPage.tsx`: Potentially a detailed breakdown page for examining individual complex transactions.

---

## Utility Engineering (`utility_engineering/`)
Focuses on the operational execution of water and drainage services.

- `dashboard.tsx`: Overview of ongoing engineering jobs, team statuses, and infrastructure health.
- `assigned-jobs.tsx`: Interface showing specific jobs dispatched to engineering field teams.
- `installations.tsx`: Tracking technical steps and completion status for new utility (water/drainage) installations.
- `leak-reports.tsx`: Map or list view of confirmed leaks that require physical intervention.
- `service-tickets.tsx`: General queue for maintenance, repair, and operational (MRO) engineering tickets.

---

## Utility Helpdesk (`utility_helpdesk/`)
The front-line responders for the Water Supply & Drainage Requests module.

- `dashboard.tsx`: Call center/Helpdesk overview highlighting incoming reports, open tickets, and emergency flags.
- `assign-teams.tsx`: Dispatch interface used to assign technical tickets to specific engineering teams.
- `connection-status.tsx`: Monitoring tool checking the status of active water connections or neighborhood service availability.
- `ticket-triage.tsx`: Interface for reviewing new citizen reports (like leaks), verifying details, and categorizing urgency before dispatch.


