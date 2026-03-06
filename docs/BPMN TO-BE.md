🏛️ POOL

Cemetery & Burial Management – To-Be BPMN

🟩 SWIM LANES (Top → Bottom)

Citizen / Informant

Funeral Home

Death Registration Division (CCRD)

Revenue Collection & Treasury Services – Digital Payment Integration

Social Services Development Department (SSDD)

Cemetery Office

Citizen Information & Engagement – Notification & Alert System

🟢 START EVENT
Lane: Citizen / Informant

Start Event (None)
Label:
“Death Occurred and Burial Process Initiated”

🟦 STEP 1 – Funeral Arrangement
Lane: Citizen

User Task:
“Coordinate Funeral Arrangement”

⬇️ Sequence Flow

Lane: Funeral Home

Manual Task:
“Prepare Remains for Burial”

⬇️ Sequence Flow

🟦 STEP 2 – Submit Burial Permit Application
Lane: Citizen

User Task:
“Submit Digital Burial Permit Application and Required Documents”

⬇️ Sequence Flow

🟦 STEP 3 – Review Requirements
Lane: Death Registration Division (CCRD)

User Task:
“Review and Verify Completeness of Burial Permit Requirements”

⬇️

🔶 EXCLUSIVE GATEWAY
Lane: CCRD

Label:
“Are Burial Permit Requirements Complete?”

❌ IF NO
Lane: Notification & Alert System

Service Task:
“Notify Applicant to Complete Missing Requirements”

🔴 End Event:
“Application Terminated – Incomplete Requirements”

✅ IF YES → Continue

⬇️ Sequence Flow

🔶 EXCLUSIVE GATEWAY
Lane: CCRD

Label:
“Is Applicant Requesting Indigent Burial Assistance?”


🟢 PATH A – REGULAR BURIAL FLOW

🟦 A1 – Register Certificate of Death

Lane: CCRD
User Task:
“Register Certificate of Death in Civil Registry System”

⬇️

🟦 A2 – Generate Order of Payment

Lane: CCRD
Service Task:
“Generate Digital Order of Payment for Burial and Interment Fees”

⬇️ Message Flow

🟦 A3 – Pay Burial Fees

Lane: Citizen
User Task:
“Pay Burial and Interment Fees Online”

⬇️ Message Flow

🟦 A4 – Process Payment & Issue Digital OR

Lane: Revenue Collection & Treasury Services
Service Task:
“Process Payment and Issue Digital Official Receipt”

⬇️ Message Flow

🟦 A5 – Validate OR & Issue Burial Permit

Lane: CCRD
Service Task:
“Validate Digital Official Receipt and Issue Burial Permit”

⬇️

➡️ Proceed to COMMON FLOW


🟢 PATH B – INDIGENT BURIAL FLOW

🟦 B1 – Submit Indigency Certificate

Lane: Citizen
User Task:
“Upload Barangay Indigency Certificate and Supporting Documents”

⬇️

🟦 B2 – Evaluate Indigent Eligibility

Lane: SSDD
User Task:
“Assess Eligibility for Indigent Burial Assistance”

⬇️

🔶 EXCLUSIVE GATEWAY
Lane: SSDD

Label:
“Is Applicant Qualified?”

❌ IF NO
Lane: Notification & Alert System

Service Task:
“Notify Applicant of Indigent Disapproval”

➡️ Sequence Flow back to
A2 – Generate Order of Payment (Regular Flow)

✅ IF YES

⬇️

🟦 B3 – Issue Certificate of Guarantee

Lane: SSDD
Service Task:
“Generate Digital Certificate of Guarantee”

⬇️

🟦 B4 – Waive Fees & Issue Burial Permit

Lane: CCRD
Service Task:
“Waive Burial Fees and Issue Burial Permit”

⬇️

➡️ Proceed to COMMON FLOW


🪦 COMMON FLOW (BOTH PATHS)

🟦 C1 – Verify Burial Plot Availability

Lane: Cemetery Office
User Task:
“Verify Burial Plot / Niche Availability”

⬇️

🔶 EXCLUSIVE GATEWAY
Lane: Cemetery Office

Label:
“Is Burial Plot Available?”

❌ IF NO
Lane: Notification & Alert System

Service Task:
“Notify Applicant of Plot Unavailability”

🔴 End Event:
“Burial Process Terminated – No Available Plot”

✅ IF YES

⬇️

🟦 C2 – Schedule Burial Date

Lane: Cemetery Office
User Task:
“Schedule Burial Date and Assign Burial Plot”

⬇️ Message Flow

🟦 C3 – Send Burial Schedule Notification

Lane: Notification & Alert System
Service Task:
“Send Burial Schedule Confirmation to Applicant and Funeral Home”

⬇️

🟦 C4 – Transport Remains

Lane: Funeral Home
Manual Task:
“Transport Remains to Cemetery”

⬇️

🟦 C5 – Conduct Burial & Update Records

Lane: Cemetery Office
Manual Task:
“Perform Burial and Interment Service”

⬇️

Service Task:
“Update Digital Burial Records and Cemetery Database”

⬇️

🔴 END EVENT
Lane: Cemetery Office

End Event:
“Burial Process Completed and Recorded”


================================================

TO-BE BPMN (SIMPLIFIED)
Parks & Recreation Scheduling – Future State
🟦 POOL

Parks & Recreation Scheduling (To-Be)

🟩 SWIM LANES (Top → Bottom)

Client / Citizen

Reservation Desk Officer

Parks Administrator

Revenue Collection & Treasury Services – Digital Payment Integration

Citizen Information & Engagement – Notification & Alert System

Event Monitoring Team

✅ Only easy-to-integrate sub-systems are included
❌ No DRRM, Zoning, or GIS dependencies

🟢 START EVENT

Lane: Client / Citizen
Start Event:

Need to Reserve Park / Recreation Facility

📝 STEP 1 – Submit Digital Letter of Intent

Lane: Client / Citizen
User Task:
Submit Digital Letter of Intent
(includes date, time, venue, event details)

⬇️

🔧 STEP 2 – Log & Pre-Check Request (SYSTEM)

Lane: Reservation Desk Officer
Service Task:
Log request and validate basic details

⬇️

🔧 STEP 3 – Check Venue Availability (SYSTEM)

Lane: Reservation Desk Officer
Service Task:
Check real-time venue availability

⬇️

🔶 EXCLUSIVE GATEWAY

Venue Available?

❌ NO

Service Task: Notify client – venue unavailable

🔴 End Event: Request Denied

✅ YES
⬇️

🧑‍💼 STEP 4 – Endorse Request

Lane: Reservation Desk Officer
User Task:
Endorse request to Parks Administrator

⬇️

🏛️ STEP 5 – Review & Decide

Lane: Parks Administrator
User Task:
Review request details

⬇️

🔶 EXCLUSIVE GATEWAY

Approved?

❌ NO

Service Task: Notify client – request disapproved

🔴 End Event: Process Terminated

✅ YES
⬇️

📣 STEP 6 – Notify Approval

Lane: Citizen Information & Engagement – Notification & Alert System
Service Task:
Send approval notification to client

⬇️

📄 STEP 7 – Issue Digital Application Form

Lane: Reservation Desk Officer
Service Task:
Release digital application form

⬇️

✍️ STEP 8 – Complete & Submit Application

Lane: Client / Citizen
User Task:
Fill out and submit application form

⬇️

🔍 STEP 9 – Validate Application (SYSTEM)

Lane: Reservation Desk Officer
Service Task:
Check application completeness

⬇️

🔶 EXCLUSIVE GATEWAY

Application Complete?

❌ NO

Service Task: Return application for correction

🔁 Loop back to “Fill out and submit application form”

✅ YES
⬇️

💰 STEP 10 – Compute Fees

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Compute fees and generate Order of Payment

⬇️

💵 STEP 11 – Pay Fees

Lane: Client / Citizen
User Task:
Pay required fees online

⬇️

🧾 STEP 12 – Process Payment

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Process payment and issue Digital Official Receipt

⬇️

📜 STEP 13 – Release Permit (SYSTEM)

Lane: Reservation Desk Officer
Service Task:
Release Digital Event Permit
and display usage rules

⬇️

🎪 STEP 14 – Conduct Event

Lane: Client / Citizen
User Task:
Use park / facility as scheduled

⬇️

👀 STEP 15 – Monitor Event

Lane: Event Monitoring Team
User Task:
Monitor event compliance

⬇️

🔔 STEP 16 – Send Completion Notice

Lane: Citizen Information & Engagement – Notification & Alert System
Service Task:
Send event completion notice

⬇️

🔴 END EVENT

Lane: Event Monitoring Team
End Event:

Event Completed and Recorded

====================================

TO-BE BPMN (SIMPLIFIED)
Facility Reservation System – Future State
🟦 POOL

Facility Reservation System (To-Be)

🟩 SWIM LANES (Top → Bottom)

Client / Requestor

Barangay Secretary

Punong Barangay

Revenue Collection & Treasury Services – Digital Payment Integration

Citizen Information & Engagement – Notification & Alert System

✅ Only lightweight, reusable sub-systems
❌ No zoning, DRRM, or infrastructure dependencies

🟢 START EVENT

Lane: Client / Requestor
Start Event:

Need to Reserve Barangay Facility

📝 STEP 1 – Submit Digital Reservation Request

Lane: Client / Requestor
User Task:
Submit Facility Reservation Request
(select facility, date, purpose, upload ID)

⬇️

🔧 STEP 2 – Log & Validate Request (SYSTEM)

Lane: Barangay Secretary
Service Task:
Log request and validate completeness

⬇️

🔶 EXCLUSIVE GATEWAY

Request Complete?

❌ NO

Service Task: Notify client to complete requirements

🔴 End Event: Request Incomplete

✅ YES
⬇️

🔧 STEP 3 – Check Facility Availability (SYSTEM)

Lane: Barangay Secretary
Service Task:
Check facility availability calendar

⬇️

🔶 EXCLUSIVE GATEWAY

Facility Available?

❌ NO

Service Task: Notify client – facility unavailable

🔴 End Event: Request Rejected

✅ YES
⬇️

💰 STEP 4 – Determine Rental Fee Requirement

Lane: Barangay Secretary
Exclusive Gateway:

Rental Fee Required?

✅ YES – Payment Required

⬇️

💵 STEP 5 – Compute Fees

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Compute rental fee and generate Order of Payment

⬇️

💳 STEP 6 – Pay Rental Fee

Lane: Client / Requestor
User Task:
Pay rental fee online

⬇️

🧾 STEP 7 – Process Payment

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Process payment and issue Digital Official Receipt

⬇️

➡️ Continue to Approval

❌ NO – No Payment Required

➡️ Skip payment and proceed to approval

🏛️ STEP 8 – Review & Approve Request

Lane: Punong Barangay
User Task:
Review and approve reservation request

⬇️

📜 STEP 9 – Issue Digital Reservation Permit (SYSTEM)

Lane: Barangay Secretary
Service Task:
Issue Digital Facility Reservation Permit
and lock schedule

⬇️

🔔 STEP 10 – Send Confirmation

Lane: Citizen Information & Engagement – Notification & Alert System
Service Task:
Send reservation approval and usage reminder

⬇️

🏁 END EVENT

Lane: Client / Requestor
End Event:

Facility Reservation Approved & Scheduled

===================================================

TO-BE BPMN (SIMPLIFIED)
Water Supply & Drainage Requests – Future State
🟦 POOL

Water Supply & Drainage Requests (To-Be)

🟩 SWIM LANES (Top → Bottom)

Citizen / Applicant

Utility Business Area / Helpdesk

Utility Engineering / Maintenance Team

Revenue Collection & Treasury Services – Digital Payment Integration

Citizen Information & Engagement – Notification & Alert System

✅ Only shared, lightweight sub-systems
❌ No DRRM, GIS, Urban Planning, or Health systems

🟢 START EVENT

Lane: Citizen / Applicant
Start Event:

Water Supply or Drainage Service Needed

📝 STEP 1 – Submit Digital Service Request

Lane: Citizen / Applicant
User Task:
Submit Utility Service Request
(select type: new connection / leak / drainage, upload photo & location)

⬇️

🔧 STEP 2 – Log & Create Service Ticket (SYSTEM)

Lane: Utility Business Area / Helpdesk
Service Task:
Log request and generate service ticket number

⬇️

🔍 STEP 3 – Classify Request Type

Lane: Utility Business Area / Helpdesk
User Task:
Classify utility request

⬇️

🔶 EXCLUSIVE GATEWAY

Type of Request?

➡️ A – New Water Connection
➡️ B – Water Leak
➡️ C – Drainage Request

🅰 PATH A – NEW WATER SERVICE CONNECTION (SIMPLIFIED)
STEP A1 – Submit Supporting Documents

Lane: Citizen / Applicant
User Task:
Upload proof of ownership or tenancy

⬇️

STEP A2 – Validate Application (SYSTEM)

Lane: Utility Business Area / Helpdesk
Service Task:
Validate application documents

⬇️

STEP A3 – Conduct Site Inspection

Lane: Utility Engineering / Maintenance Team
User Task:
Conduct site inspection and feasibility assessment

⬇️

🔶 EXCLUSIVE GATEWAY

Connection Feasible?

❌ NO

Service Task: Notify applicant – request not feasible

🔴 End Event: Request Rejected

✅ YES
⬇️

STEP A4 – Generate Fees (SYSTEM)

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Generate connection fees and Order of Payment

⬇️

STEP A5 – Pay Connection Fees

Lane: Citizen / Applicant
User Task:
Pay connection fees online

⬇️

STEP A6 – Process Payment

Lane: Revenue Collection & Treasury Services – Digital Payment Integration
Service Task:
Process payment and issue Digital Official Receipt

⬇️

STEP A7 – Install Connection

Lane: Utility Engineering / Maintenance Team
User Task:
Install water meter and service pipe

⬇️

STEP A8 – Confirm Service Activation (SYSTEM)

Lane: Utility Business Area / Helpdesk
Service Task:
Confirm water flow and update request status

⬇️

➡️ Proceed to Final End

🅱 PATH B – WATER LEAK MANAGEMENT (SIMPLIFIED)
STEP B1 – Review Leak Report

Lane: Utility Business Area / Helpdesk
User Task:
Review leak details and urgency

⬇️

STEP B2 – Inspect Leak Site

Lane: Utility Engineering / Maintenance Team
User Task:
Inspect leak location

⬇️

STEP B3 – Repair Leak

Lane: Utility Engineering / Maintenance Team
User Task:
Repair water leak

⬇️

STEP B4 – Verify Repair (SYSTEM)

Lane: Utility Business Area / Helpdesk
Service Task:
Verify completion and close ticket

⬇️

➡️ Proceed to Final End

🅲 PATH C – DRAINAGE REQUEST MANAGEMENT (SIMPLIFIED)
STEP C1 – Review Drainage Concern

Lane: Utility Business Area / Helpdesk
User Task:
Review drainage request

⬇️

STEP C2 – Conduct Site Inspection

Lane: Utility Engineering / Maintenance Team
User Task:
Inspect drainage issue

⬇️

STEP C3 – Execute Drainage Work

Lane: Utility Engineering / Maintenance Team
User Task:
Perform declogging / desilting / minor repair

⬇️

STEP C4 – Document Completion (SYSTEM)

Lane: Utility Business Area / Helpdesk
Service Task:
Update request status and attach completion record

⬇️

➡️ Proceed to Final End

🔔 FINAL STEP – Notify Citizen

Lane: Citizen Information & Engagement – Notification & Alert System
Service Task:
Send service completion notification

⬇️

🔴 END EVENT

Lane: Utility Business Area / Helpdesk
End Event:

Utility Service Request Completed

========================================================================

TO-BE BPMN (SIMPLIFIED)
Asset Inventory Tracker – Future State
🟦 POOL

Asset Inventory Tracker (To-Be)

🟩 SWIM LANES (Top → Bottom)

End-User / Requesting Office

Records Management & Control Division (RMCD)

Inventory / Operations Team

Management / Approving Authority

Citizen Information & Engagement – Notification & Alert System

✅ Only internal offices + notification
❌ No COA system, no Urban Planning, no Accounting integrations

🟢 START EVENT

Lane: RMCD
Start Event:

Inventory Requirement Triggered
(Annual / Semi-Annual / On-Demand)

🔍 STEP 1 – Identify Inventory Type

Lane: RMCD
User Task:
Determine inventory type

⬇️

🔶 EXCLUSIVE GATEWAY

Inventory Type?

➡️ A – Movable Assets
➡️ B – Land & Buildings
➡️ C – Supplies

🅰 PATH A – MOVABLE ASSET INVENTORY (SIMPLIFIED)
STEP A1 – Issue Inventory Schedule (SYSTEM)

Lane: RMCD
Service Task:
Issue digital inventory memorandum and schedule

⬇️

STEP A2 – Assign Inventory Team

Lane: Inventory / Operations Team
User Task:
Form inventory team

⬇️

STEP A3 – Conduct Physical Inventory

Lane: Inventory / Operations Team
User Task:
Conduct physical inventory of movable assets

⬇️

STEP A4 – Validate Inventory Results (SYSTEM)

Lane: Inventory / Operations Team
Service Task:
Compare physical count with records

⬇️

🔶 EXCLUSIVE GATEWAY

Discrepancy Found?

❌ NO
⬇️ Continue

✅ YES
⬇️

STEP A5 – Reconcile Discrepancies

Lane: Inventory / Operations Team
User Task:
Reconcile discrepancies and update records

⬇️

STEP A6 – Prepare Inventory Report (SYSTEM)

Lane: Inventory / Operations Team
Service Task:
Generate digital inventory report

⬇️

STEP A7 – End-User Confirmation

Lane: End-User / Requesting Office
User Task:
Review and acknowledge inventory results

⬇️

➡️ Proceed to Final End

🅱 PATH B – LAND & BUILDINGS INVENTORY (SIMPLIFIED)
STEP B1 – Submit Inventory Request

Lane: End-User / Requesting Office
User Task:
Submit land / building inventory request

⬇️

STEP B2 – Schedule Inspection (SYSTEM)

Lane: RMCD
Service Task:
Schedule physical inspection

⬇️

STEP B3 – Conduct Ocular Inspection

Lane: Inventory / Operations Team
User Task:
Conduct physical / ocular inspection

⬇️

STEP B4 – Prepare Inventory Report (SYSTEM)

Lane: Inventory / Operations Team
Service Task:
Prepare digital land / building inventory report

⬇️

STEP B5 – Review & Approve

Lane: Management / Approving Authority
User Task:
Review and approve inventory report

⬇️

➡️ Proceed to Final End

🅲 PATH C – SUPPLIES INVENTORY (SIMPLIFIED)
STEP C1 – Submit RPCI

Lane: End-User / Requesting Office
User Task:
Submit Report on Physical Count of Inventory (RPCI)

⬇️

STEP C2 – Review RPCI (SYSTEM)

Lane: RMCD
Service Task:
Validate RPCI completeness

⬇️

🔶 EXCLUSIVE GATEWAY

RPCI Complete?

❌ NO

Service Task: Notify office for correction

🔴 End Event: Correction Required

✅ YES
⬇️

STEP C3 – Conduct Physical Inventory

Lane: Inventory / Operations Team
User Task:
Conduct physical inventory of supplies

⬇️

STEP C4 – Consolidate Inventory Results (SYSTEM)

Lane: Inventory / Operations Team
Service Task:
Consolidate inventory data

⬇️

STEP C5 – Management Review

Lane: Management / Approving Authority
User Task:
Review inventory results

⬇️

➡️ Proceed to Final End

🔔 FINAL STEP – Notify Completion

Lane: Citizen Information & Engagement – Notification & Alert System
Service Task:
Send inventory completion notification

⬇️

🔴 END EVENT

Lane: RMCD
End Event:

Asset Inventory Completed and Recorded
