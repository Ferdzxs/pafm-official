---

## Current Modules and Roles in the system Summary

Based on the directory structure and responsibilities mapped earlier, here is the consolidated list of system modules and their associated user roles:

⚰️ Cemetery & Burial Management
    ⚰️ Cemetery Office
        Burial Applications (review/approve)
        Deceased Registry
        Niche Management
        Burial Records
        Indigent Assistance (coordination)
        Payments & Permits
        Reports
    💚 SSDD
        Indigent Assistance (own cases only)
        Death Registration coordination
        Citizen Records (welfare-linked)
    🔴 Death Registration
        Certificate Verification
        Received Documents
        Approvals & Signing
    👤 Citizen
        Submit Burial Application
        View own application status
        Upload required documents
🌳 Parks & Recreation Scheduling
    🌿 Parks Admin
        Park Venues (manage)
        Reservations (approve/reject)
        Site Usage Logs
        Booking Calendar
    👤 Citizen
        Apply for Park Reservation
        View own reservation status
🏘️ Facility Reservation System (Barangay)
    💜 Barangay Secretary
        Pending Approvals
        Reservation Records (all)
        Constituent Records
        Documents & Filing
        Ordinance References
        Reports
    🟠 Punong Barangay
        Pending Approvals (sign-off)
        Ordinance References (read)
    🟡 Reservation Desk
        Reservation Records (receive/process)
        Approvals (forward to PB)
        Permits & Payments
    👤 Citizen
        Apply for Facility Reservation
        View own reservation status
💧 Water Supply & Drainage Requests
    🔵 Utility Engineer
        Service Tickets (assigned)
        Leak Reports (repair/resolve)
        Assigned Jobs (field work)
        Installations (water connections)
        🩵 Utility Helpdesk
        Ticket Triage (receive & classify)
        Assign to Teams
        Connection Status (monitor)
    👤 Citizen
        Apply for Water Connection
        Report a Leak
        Track ticket status
📦 Asset Inventory Tracker
        🩷 CGSD Management
        Inventory & Assets (review)
        Ocular Inspections (schedule/conduct)
        Inventory Reports (prepare/submit)
        Approval Records (approve reports)
    🟢 FAMCD
        Inventory & Assets (manage)
        Ocular Inspections (conduct)
        Inventory Reports (submit)
        Submission Records (file to office)


| Directory Sub-path | Module / Domain Area | Primary User Role |
| :--- | :--- | :--- |
| `auth/` | General Authentication | All Users |
| `barangay_secretary/` | Barangay Affairs & Records Management | Barangay Secretary |
| `cemetery_office/` | Burial & Cemetery Management | Cemetery Admin / Officer |
| `cgsd_management/` | City General Services & Assets | CGSD Management / Inspector |
| `citizen/` | Citizen Portal (Front-end) | Public Citizen / Constituent |
| `death_registration/` | Civil Registry - Death Validation | Death Registration Officer |
| `famcd/` | Facility & Asset Management (FAMCD) | FAMCD Admin / Inspector |
| `parks_admin/` | Parks & Recreation Scheduling | Parks Administrator |
| `punong_barangay/` | Executive Approval & Affairs | Punong Barangay (Captain) |
| `reservation_officer/` | Facility Reservation System | Reservation Officer |
| `ssdd/` | Social Services & Development | SSDD Officer / Admin |
| `system_admin/` | System Administration & Settings | System Administrator |
| `treasurer/` | Financial Management & Treasury | Treasurer / Financial Officer |
| `utility_engineering/` | Water/Drainage Engineering Execution | Utility Engineer / Field Head |
| `utility_helpdesk/` | Water/Drainage Customer Support | Utility Helpdesk / Dispatcher |

This matrix establishes the foundational role-based access control (RBAC) boundaries across the platform.