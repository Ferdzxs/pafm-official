# QC Asset Inventory — Process Reference Document
**System:** BPM Public Assets & Facilities Management  
**Module:** Inventory of City-Owned Land & Building  
**Reference:** Citizens' Charter PDF + BPMN TO-BE Figure 1.5

---

## 1. Requirements Checklist (Requesting Offices)

The following offices submit asset inventory requests:
- **Cemetery Office**
- **Parks & Recreation Administration**
- **Punong Barangay / Barangay Secretariat**

### What They Submit

| Requirement | Who Provides It | Notes |
|---|---|---|
| **Formal Request Letter** | Requesting Office | Must state what property needs to be inventoried |
| **Inventory Form QCG-GSD-FAIS-RA-16** | FAMCD provides blank form | Requesting office fills this out |
| **Inventory Form QCG-GSD-FAIS-NR-15** | FAMCD provides blank form | Requesting office fills this out |

### Documents Gathered by FAMCD During Inspection
*(Not required from requesting office — sourced from government archives)*

| Document | Source |
|---|---|
| Photocopy of TCT (Transfer Certificate of Title) | City Government Records / RMCD |
| Approved Plan | City Engineer's Office |
| Tax Map | Assessor's Office |
| Tax Declaration | Assessor's Office |
| Structural Map | City Engineer's Office |
| Building Plan | City Engineer's Office |

> **Note:** In the current system, the requesting office only needs to submit a digital request. FAMCD gathers registry documents during the ocular inspection step.

---

## 2. End-to-End Workflow (TO-BE)

```
┌─────────────────────────────────────────────────────────────┐
│  REQUESTING PARTY (Cemetery Office / Parks Admin / Barangay) │
│  ➤ Submits Digital Request Letter                           │
│    → inventory_request created (status: pending)            │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  RMCD — Request Routing                                      │
│  ➤ Receives and validates incoming request                  │
│  ➤ Clicks "Endorse to FAMCD"                               │
│    → status updated to: in_progress                         │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  FAMCD — Ocular Inspection                                   │
│  ➤ Sees request in Inspection Findings queue                │
│  ➤ Conducts physical inspection of property                 │
│  ➤ Validates findings vs. registry records                  │
│  ➤ Captures photos as evidence                              │
│  ➤ Submits Inventory Report to CGSD                         │
│    → inventory_report created (status: pending)             │
└──────────────────────────┬──────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  CGSD — Approvals                                            │
│  ➤ Reviews submitted inventory report                       │
│  ➤ Decision:                                                │
│    ✅ Approve → report status: approved                     │
│       Banner shown: "Forwarded to RMCD for release"         │
│    ↩ Return → report status: returned_for_revision          │
│       FAMCD sees red banner with CGSD's reason              │
└──────────────────────────┬──────────────────────────────────┘
                           ↓ (if Approved)
┌─────────────────────────────────────────────────────────────┐
│  RMCD — Document Releases                                    │
│  ➤ Sees approved report in releases queue                   │
│  ➤ Clicks "Mark as Released"                               │
│    → approval_record logged (decision: released)            │
│  ➤ Document officially released to requesting office        │
└─────────────────────────────────────────────────────────────┘
                           ↓
                     🏁 END OF PROCESS
```

---

## 3. Gap Analysis — TO-BE vs. Current Implementation

### ✅ Implemented (Covers TO-BE Requirements)

| TO-BE Requirement | Implementation | File |
|---|---|---|
| RMCD receives and endorses requests | Request Routing page — "Endorse to FAMCD" button | [rmcd/routing.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/rmcd/routing.tsx) |
| FAMCD conducts ocular inspection | Inspection Findings page with photo upload and findings form | [famcd/ocular-inspections.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/famcd/ocular-inspections.tsx) |
| FAMCD submits report to CGSD | Submit button creates `inventory_report` linked to request | [famcd/ocular-inspections.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/famcd/ocular-inspections.tsx) |
| CGSD approves or returns for revision | Approvals page with Approve / Return actions | [cgsd_management/approvals.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/cgsd_management/approvals.tsx) |
| CGSD post-approval notice to RMCD | Teal info banner shown after approval | [cgsd_management/approvals.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/cgsd_management/approvals.tsx) |
| FAMCD sees revision reason from CGSD | Red alert banner with CGSD's rejection remarks | [famcd/ocular-inspections.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/famcd/ocular-inspections.tsx) |
| RMCD releases approved documents | Document Releases page — "Mark as Released" button | [rmcd/releases.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/rmcd/releases.tsx) |
| Routing gate enforced | FAMCD only sees `in_progress` + `completed` requests | [famcd/ocular-inspections.tsx](file:///c:/Users/clare/Downloads/pafm-official-main/pafm-official-main/src/pages/famcd/ocular-inspections.tsx) |

### ❌ Not in TO-BE (Simplified Out)

| AS-IS PDF Step | Status | Reason |
|---|---|---|
| 1.3 – Assign to FAMCD section (LIS/BIIS) | Not required | TO-BE treats FAMCD as a single lane |
| 1.7/1.8 – FAMCD Head sign-off before CGSD | Not required | TO-BE removes intermediate FAMCD review |
| 1.9 – Asst. Dept Head two-level approval | Not required | TO-BE simplifies CGSD to single approval |
| Document checklist validation at submission | Not required | TO-BE uses "Digital Request Letter" only |
