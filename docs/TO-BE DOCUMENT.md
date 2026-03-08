**TO-BE PROCESS DOCUMENT (FINAL & UPDATED)**

**Public Assets & Facilities Management Sub-System**

**Government Service Management System**

**Client: Quezon City Municipal Government**

**1\. Introduction**

Based on the completed **As-Is process analysis** of Quezon City Municipal Government, several inefficiencies were identified in the management of public assets and facilities. These include manual processing, fragmented coordination among offices, redundant validation steps, and delays caused by physical documentation and in-person transactions.

To address these issues, a **To-Be (Future State) Process Model** is proposed through the implementation of the **Public Assets & Facilities Management Sub-System**, which forms part of the **Government Service Management System**. The To-Be model aims to streamline workflows, reduce manual intervention, and improve transparency and service delivery.

**2\. Design Strategy of the To-Be Model**

The To-Be model follows a **hybrid strategy**:

- **Most Complex To-Be BPMNs** are used for:
  - Water Supply & Drainage Requests
  - Asset Inventory Tracker  
        (due to operational complexity, multiple conditional paths, and audit requirements)
- **Simplified To-Be BPMNs** are used for:
  - Cemetery & Burial Management
  - Parks & Recreation Scheduling
  - Facility Reservation System  
        (to minimize inter-sub-system dependency and implementation risk)

This approach ensures both **realism** and **feasibility**.

**3\. Sub-Systems Integrated in the To-Be Model**

Only sub-systems that are **easy to integrate and reusable** are included across all modules.

**3.1 Citizen Information & Engagement**

**Modules Used:**

- Notification & Alert System
- Citizen Registry System

**Purpose:**

- Automated status updates and completion notifications
- Basic identity and contact validation

**3.2 Revenue Collection & Treasury Services**

**Module Used:**

- Digital Payment Integration

**Purpose:**

- Online payment processing
- Issuance of Digital Official Receipts (OR)

**3.3 Conditionally Integrated Sub-Systems**

_(Used only in complex workflows)_

- **HCDRD (Housing & Community Development)**  
  - For socialized housing clearance (Water Connection)
- **City Engineering / LGU**  
  - For excavation clearance (Water Leak Repair)

These are included **only when required by the process**, not as constant dependencies.

**3.4 Explicitly Excluded Sub-Systems**

The following sub-systems are intentionally excluded to avoid dependency risks:

- DRRM
- Urban Planning, Zoning & Housing
- Health & Sanitation Management
- Social Services Management
- Education & Scholarship Management
- Transport & Mobility Management

Their functions are either conditional, exception-based, or outside the core scope.

**4\. Scope of the Public Assets & Facilities Management Sub-System**

The To-Be model covers the following modules:

- Cemetery & Burial Management
- Parks & Recreation Scheduling
- Facility Reservation System
- Water Supply & Drainage Requests
- Asset Inventory Tracker

**5\. Cemetery & Burial Management - To-Be Process**

**Process Overview:**  
The burial permit process is digitized to reduce manual handling and physical visits.

**To-Be Process Flow:**

- Citizen submits burial permit request online.
- System validates completeness of submitted documents.
- System generates Order of Payment (if applicable).
- Payment is processed via Digital Payment Integration.
- Cemetery Office checks plot availability and schedules burial.
- System sends burial schedule and approval notification.
- Burial records are updated digitally.

**Indigent Burial Assistance - To-Be Process**

**Process Overview:**

The indigent burial assistance process is improved by digitizing application, evaluation, guarantee issuance, and coordination with funeral homes while maintaining the same service structure.

**To-Be Process Flow:**

- The bereaved family submits initial notification through hotline or online portal, and the case is logged digitally.
- SSDD coordinates with an accredited funeral home through the system for retrieval of remains.
- The informant uploads required documents (Indigency Certificate, Death Certificate) via the portal.
- A Social Worker conducts digital intake evaluation (virtual or scheduled interview).
- Upon approval, the system generates a Digital Certificate of Guarantee covering funeral costs.
- The funeral home provides services, and SSDD processes digital settlement with the provider.

This version:  
✔ Keeps the exact structure of your As-Is  
✔ Only improves through digitization and automation  
✔ Does not add new steps  
✔ Keeps burial and assistance clearly connected

**5.2 Parks & Recreation Scheduling - To-Be Process**

**Process Overview:**  
Event reservation is streamlined through digital submission and automated availability checking.

**To-Be Process Flow:**

- Client submits park or facility reservation request online.
- System checks venue availability.
- Authorized personnel reviews and approves the request.
- System computes fees and processes payment (if required).
- Digital permit is issued.
- Notification system sends confirmation and reminders.
- Event is conducted and recorded.

**Key Improvements:**

- Reduced processing time
- Improved scheduling visibility
- Automated reminders

**5.3 Facility Reservation System - To-Be Process**

**Process Overview:**  
Barangay facility reservations are managed through a centralized digital workflow.

**To-Be Process Flow:**

- Client submits facility reservation request online.
- System validates request details and availability.
- Approval authority reviews and approves the request.
- Rental fees are computed and paid digitally (if applicable).
- Digital reservation permit is issued.
- Notification system sends approval and usage reminders.

**Key Improvements:**

- Centralized reservation tracking
- Reduced paperwork
- Transparent approval process

**5.4 Water Supply & Drainage Requests - To-Be Process (Most Complex)**

**Process Overview**

The To-Be process for **Water Supply & Drainage Requests** provides a fully digitized yet operationally realistic workflow that supports **new water connections, water leak management, and drainage requests**. The process integrates conditional clearances, engineering inspections, payment handling, and automated notifications while maintaining accountability among involved units.

**To-Be Process Flow**

- The process starts when a **citizen identifies a water or drainage service need** and submits a **digital utility service request** specifying whether the concern is a new connection, water leak, or drainage issue.
- The **Utility Business Area / Helpdesk** logs the request and automatically generates a **service ticket** for tracking and monitoring purposes.
- The Helpdesk classifies the request type, triggering one of three process paths:

**Path A - New Water Service Connection**

- The citizen submits the required **supporting documents** such as proof of ownership or tenancy.
- The Helpdesk validates the submitted documents digitally and checks whether the property falls under **socialized housing**.
- If the property is classified as socialized housing, the request is forwarded to **HCDRD**, which issues a **digital Water Connection Clearance**. If not, the process proceeds without clearance.
- The **Utility Engineering / Maintenance Team** conducts a **site inspection and feasibility assessment**.
- If the connection is deemed **not feasible**, the applicant is notified and the request is rejected. If feasible, the process continues.
- The Helpdesk generates the **quotation and Order of Payment**, which is sent to the citizen.
- The citizen pays the connection fees online, and the **Revenue Collection & Treasury Services - Digital Payment Integration** processes the payment and issues a **Digital Official Receipt**.
- The Utility Engineering Team schedules and performs the **water connection installation**, including meter and service pipe installation.
- The Helpdesk confirms service activation, updates the system, and proceeds to notification.

**Path B - Water Leak Management**

- The Helpdesk reviews the reported leak and assesses its urgency.
- The Utility Engineering Team conducts **site validation** of the leak.
- If excavation is **not required**, the leak is repaired immediately.  
    If excavation **is required**, the request is forwarded to **City Engineering / LGU** for excavation clearance.
- After clearance, the Utility Engineering Team performs the repair, verifies completion, and returns the request to the Helpdesk.
- The Helpdesk closes the service ticket and proceeds to notification.

**Path C - Drainage Request Management**

- The Helpdesk logs the drainage request and forwards it to the Utility Engineering Team.
- The Utility Engineering Team conducts a **site inspection** and prepares a **program of works and materials plan**.
- If materials are unavailable, the process waits for procurement before continuing.
- Once materials are available, drainage works such as declogging or repair are executed.
- The Helpdesk documents the completed work and proceeds to closure.

**Finalization**

- Upon completion of any service path, the **Notification & Alert System** sends a **service completion notification** to the applicant.
- The process ends with the service request marked as **completed**.

**Key Improvements**

- Clear separation of service types
- Conditional involvement of HCDRD and City Engineering
- Centralized ticketing and monitoring
- Reduced manual coordination
- Automated notifications and payment handling

**5.5 Asset Inventory Tracker - To-Be Process (Land & Buildings Only)**

**Process Overview**

The revised To-Be process for the **Asset Inventory Tracker** focuses exclusively on the inventory of **land and building assets** owned or managed by the Quezon City Municipal Government.  
This scoped approach ensures alignment with the **Public Assets & Facilities Management Sub-System** while maintaining audit compliance and operational feasibility.

The process incorporates inspection, validation, management approval, and formal submission to oversight offices.

**To-Be Process Flow**

- The inventory process is triggered by the **Records Management & Control Division (RMCD)** on an **annual, semi-annual, or on-demand** basis.
- RMCD determines the **inventory scope and coverage**, specifically identifying land and building assets for review.
- The **End-User / Accountable Office** submits a request for land or building inventory.
- RMCD schedules a **physical or ocular inspection** of the identified assets.
- The **Inventory / Operations Team** conducts the inspection, verifying:
  - physical condition
  - usage
  - boundaries
  - asset identification details
- Ownership, registry records, and asset documentation are validated against existing records.
- A **digital land and building inventory report** is prepared by the Inventory / Operations Team.
- The report is forwarded to the **Management / Approving Authority** for review.
- If the report is **not approved**, it is returned to the Inventory Team for correction.  
    If **approved**, RMCD releases the finalized inventory documents.

**Submission and Closure**

- RMCD transmits the finalized inventory report to:
  - **Commission on Audit (COA)**
  - **City Accounting**
  - **Office of the City Mayor (OCM)**
- The **Notification & Alert System** sends inventory completion notifications to concerned offices.
- Inventory records are archived digitally, and the inventory cycle is formally closed.

**Key Improvements**

- Clear focus on **land and building assets**
- Reduced process complexity
- Improved audit readiness
- Strong alignment with facilities management objectives
- Elimination of unnecessary inventory categories

**6\. Summary of Improvements (As-Is vs To-Be)**

| **Aspect** | **As-Is** | **To-Be** |
| --- | --- | --- |
| Processing | Manual | Digital |
| Coordination | Fragmented | Centralized |
| Payments | In-person | Online |
| Notifications | Manual | Automated |
| Dependency | High | Controlled |
| Audit Readiness | Low | High |

**7\. Justification for the To-Be Design**

The To-Be design balances **process realism and implementation feasibility**. Complex workflows are fully modeled where operationally required, while simpler services are streamlined to reduce dependency risks. This approach ensures that the proposed system is practical, scalable, and defensible.

**8\. Conclusion**

The updated To-Be model for the **Public Assets & Facilities Management Sub-System** presents an improved future state for Quezon City Municipal Government. By combining simplified workflows with detailed modeling for complex services, the system addresses current inefficiencies while remaining feasible and resilient to external development limitations.