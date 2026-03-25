-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.administration_office (
  admin_office_id text NOT NULL,
  office_name text NOT NULL,
  parent_department text,
  location text,
  CONSTRAINT administration_office_pkey PRIMARY KEY (admin_office_id)
);
CREATE TABLE public.approval_record (
  approval_id text NOT NULL,
  inventory_report_id text,
  approved_by_office text,
  approved_by_employee text,
  approval_date date,
  decision text,
  remarks text,
  CONSTRAINT approval_record_pkey PRIMARY KEY (approval_id),
  CONSTRAINT approval_record_inventory_report_id_fkey FOREIGN KEY (inventory_report_id) REFERENCES public.inventory_report(inventory_report_id),
  CONSTRAINT approval_record_approved_by_office_fkey FOREIGN KEY (approved_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT approval_record_approved_by_employee_fkey FOREIGN KEY (approved_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.asset_inventory (
  asset_id text NOT NULL,
  asset_name text NOT NULL,
  asset_type text,
  category text,
  serial_no text,
  acquisition_date date,
  acquisition_cost numeric,
  current_value numeric,
  condition text DEFAULT 'good'::text,
  location text,
  assigned_to text,
  last_maintenance date,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT asset_inventory_pkey PRIMARY KEY (asset_id)
);
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  action text NOT NULL,
  subject text,
  performed_by text,
  timestamp timestamp with time zone DEFAULT now(),
  status text NOT NULL DEFAULT 'success'::text,
  module text NOT NULL,
  ip_address text,
  details text,
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.barangay (
  barangay_id text NOT NULL,
  barangay_name text NOT NULL,
  office_id text,
  CONSTRAINT barangay_pkey PRIMARY KEY (barangay_id),
  CONSTRAINT barangay_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.government_office(office_id)
);
CREATE TABLE public.barangay_documents (
  document_id text NOT NULL,
  document_no text UNIQUE,
  document_type text NOT NULL,
  title text NOT NULL,
  issued_to text,
  purpose text,
  status text DEFAULT 'filed'::text,
  issued_by text,
  document_date date,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT barangay_documents_pkey PRIMARY KEY (document_id)
);
CREATE TABLE public.barangay_facility (
  barangay_facility_id text NOT NULL,
  barangay_id text,
  facility_name text NOT NULL,
  facility_type text,
  rental_rate numeric DEFAULT 0,
  ordinance_reference text,
  availability_status text DEFAULT 'available'::text,
  CONSTRAINT barangay_facility_pkey PRIMARY KEY (barangay_facility_id),
  CONSTRAINT barangay_facility_barangay_id_fkey FOREIGN KEY (barangay_id) REFERENCES public.barangay(barangay_id)
);
CREATE TABLE public.barangay_ordinances (
  ordinance_id text NOT NULL,
  ordinance_no text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text,
  date_enacted date,
  date_effective date,
  status text DEFAULT 'active'::text,
  enacted_by text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT barangay_ordinances_pkey PRIMARY KEY (ordinance_id)
);
CREATE TABLE public.barangay_reservation_approval (
  approval_id text NOT NULL,
  reservation_id text,
  approved_by_office text,
  approved_by_employee text,
  approval_date date,
  decision text,
  remarks text,
  CONSTRAINT barangay_reservation_approval_pkey PRIMARY KEY (approval_id),
  CONSTRAINT barangay_reservation_approval_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.barangay_reservation_record(reservation_id),
  CONSTRAINT barangay_reservation_approval_approved_by_office_fkey FOREIGN KEY (approved_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT barangay_reservation_approval_approved_by_employee_fkey FOREIGN KEY (approved_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.barangay_reservation_record (
  reservation_id text NOT NULL,
  barangay_facility_id text,
  applicant_person_id text,
  request_slip_doc text,
  reservation_date date NOT NULL,
  time_slot text,
  status text DEFAULT 'pending'::text,
  approved_by_office text,
  received_by_employee text,
  payment_id text,
  digital_permit_url text,
  purpose text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT barangay_reservation_record_pkey PRIMARY KEY (reservation_id),
  CONSTRAINT barangay_reservation_record_barangay_facility_id_fkey FOREIGN KEY (barangay_facility_id) REFERENCES public.barangay_facility(barangay_facility_id),
  CONSTRAINT barangay_reservation_record_applicant_person_id_fkey FOREIGN KEY (applicant_person_id) REFERENCES public.person(person_id),
  CONSTRAINT barangay_reservation_record_request_slip_doc_fkey FOREIGN KEY (request_slip_doc) REFERENCES public.digital_document(document_id),
  CONSTRAINT barangay_reservation_record_approved_by_office_fkey FOREIGN KEY (approved_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT barangay_reservation_record_received_by_employee_fkey FOREIGN KEY (received_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT barangay_reservation_record_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.digital_payment(payment_id)
);
CREATE TABLE public.burial_applications (
  application_id text NOT NULL,
  applicant_name text NOT NULL,
  applicant_contact text,
  applicant_address text,
  deceased_name text NOT NULL,
  deceased_age integer,
  date_of_death date NOT NULL,
  cause_of_death text,
  death_certificate_no text,
  relationship text,
  niche_requested text,
  status text DEFAULT 'pending'::text,
  notes text,
  reviewed_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT burial_applications_pkey PRIMARY KEY (application_id)
);
CREATE TABLE public.burial_record (
  burial_id text NOT NULL,
  deceased_id text,
  cemetery_id text,
  niche_id text,
  burial_date date,
  burial_permit_doc text,
  funeral_home_id text,
  indigent_assistance_id text,
  payment_id text,
  CONSTRAINT burial_record_pkey PRIMARY KEY (burial_id),
  CONSTRAINT burial_record_deceased_id_fkey FOREIGN KEY (deceased_id) REFERENCES public.deceased(deceased_id),
  CONSTRAINT burial_record_cemetery_id_fkey FOREIGN KEY (cemetery_id) REFERENCES public.cemetery(cemetery_id),
  CONSTRAINT burial_record_niche_id_fkey FOREIGN KEY (niche_id) REFERENCES public.niche_record(niche_id),
  CONSTRAINT burial_record_burial_permit_doc_fkey FOREIGN KEY (burial_permit_doc) REFERENCES public.digital_document(document_id),
  CONSTRAINT burial_record_funeral_home_id_fkey FOREIGN KEY (funeral_home_id) REFERENCES public.funeral_home(funeral_home_id),
  CONSTRAINT burial_record_indigent_assistance_id_fkey FOREIGN KEY (indigent_assistance_id) REFERENCES public.indigent_assistance_record(assistance_id),
  CONSTRAINT burial_record_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.digital_payment(payment_id)
);
CREATE TABLE public.cemetery (
  cemetery_id text NOT NULL,
  cemetery_name text NOT NULL,
  location text,
  administered_by text,
  CONSTRAINT cemetery_pkey PRIMARY KEY (cemetery_id),
  CONSTRAINT cemetery_administered_by_fkey FOREIGN KEY (administered_by) REFERENCES public.government_office(office_id)
);
CREATE TABLE public.citizen_account (
  account_id text NOT NULL,
  person_id text,
  email text NOT NULL UNIQUE,
  password_hash text,
  verification_status text DEFAULT 'pending'::text,
  registered_date date,
  registry_ref_no text,
  CONSTRAINT citizen_account_pkey PRIMARY KEY (account_id),
  CONSTRAINT citizen_account_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id)
);
CREATE TABLE public.constituent_records (
  record_id text NOT NULL,
  full_name text NOT NULL,
  birthdate date,
  gender text,
  civil_status text,
  purok text,
  address text,
  contact_no text,
  registered_voter boolean DEFAULT false,
  indigent boolean DEFAULT false,
  senior_citizen boolean DEFAULT false,
  pwd boolean DEFAULT false,
  solo_parent boolean DEFAULT false,
  tags ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT constituent_records_pkey PRIMARY KEY (record_id)
);
CREATE TABLE public.deceased (
  deceased_id text NOT NULL,
  full_name text NOT NULL,
  date_of_death date NOT NULL,
  place_of_death text,
  death_certificate_no text,
  CONSTRAINT deceased_pkey PRIMARY KEY (deceased_id)
);
CREATE TABLE public.digital_document (
  document_id text NOT NULL,
  document_type text NOT NULL,
  reference_no text UNIQUE,
  date_created date,
  status text DEFAULT 'active'::text,
  created_by_office text,
  received_by_employee text,
  person_id text,
  file_url text,
  CONSTRAINT digital_document_pkey PRIMARY KEY (document_id),
  CONSTRAINT digital_document_created_by_office_fkey FOREIGN KEY (created_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT digital_document_received_by_employee_fkey FOREIGN KEY (received_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT digital_document_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id)
);
CREATE TABLE public.digital_payment (
  payment_id text NOT NULL,
  document_id text,
  amount_paid numeric NOT NULL,
  payment_date date,
  payment_method text,
  transaction_ref_no text,
  digital_or_no text,
  payment_status text DEFAULT 'pending'::text,
  CONSTRAINT digital_payment_pkey PRIMARY KEY (payment_id),
  CONSTRAINT digital_payment_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.digital_document(document_id)
);
CREATE TABLE public.drainage_inspection_report (
  inspection_id text NOT NULL,
  drainage_request_id text,
  findings text,
  inspected_by_office text,
  inspected_by_employee text,
  CONSTRAINT drainage_inspection_report_pkey PRIMARY KEY (inspection_id),
  CONSTRAINT drainage_inspection_report_drainage_request_id_fkey FOREIGN KEY (drainage_request_id) REFERENCES public.drainage_request(drainage_request_id),
  CONSTRAINT drainage_inspection_report_inspected_by_office_fkey FOREIGN KEY (inspected_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT drainage_inspection_report_inspected_by_employee_fkey FOREIGN KEY (inspected_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.drainage_repair_record (
  repair_id text NOT NULL,
  drainage_request_id text,
  completion_date date,
  executed_by_office text,
  executed_by_employee text,
  completion_status text DEFAULT 'pending'::text,
  CONSTRAINT drainage_repair_record_pkey PRIMARY KEY (repair_id),
  CONSTRAINT drainage_repair_record_drainage_request_id_fkey FOREIGN KEY (drainage_request_id) REFERENCES public.drainage_request(drainage_request_id),
  CONSTRAINT drainage_repair_record_executed_by_office_fkey FOREIGN KEY (executed_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT drainage_repair_record_executed_by_employee_fkey FOREIGN KEY (executed_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.drainage_request (
  drainage_request_id text NOT NULL,
  ticket_id text,
  person_id text,
  request_doc text,
  issue_description text,
  date_reported date,
  status text DEFAULT 'open'::text,
  CONSTRAINT drainage_request_pkey PRIMARY KEY (drainage_request_id),
  CONSTRAINT drainage_request_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT drainage_request_request_doc_fkey FOREIGN KEY (request_doc) REFERENCES public.digital_document(document_id)
);
CREATE TABLE public.employee (
  employee_id text NOT NULL,
  office_id text,
  full_name text NOT NULL,
  position_title text,
  department text,
  employee_no text,
  contact_number text,
  is_active boolean DEFAULT true,
  email text,
  system_user_id uuid,
  CONSTRAINT employee_pkey PRIMARY KEY (employee_id),
  CONSTRAINT employee_office_id_fkey FOREIGN KEY (office_id) REFERENCES public.government_office(office_id),
  CONSTRAINT employee_system_user_id_fkey FOREIGN KEY (system_user_id) REFERENCES public.system_users(user_id)
);
CREATE TABLE public.excavation_clearance (
  excav_clearance_id text NOT NULL,
  leak_report_id text,
  issued_by_office text,
  clearance_type text,
  issue_date date,
  digital_clearance_url text,
  CONSTRAINT excavation_clearance_pkey PRIMARY KEY (excav_clearance_id),
  CONSTRAINT excavation_clearance_leak_report_id_fkey FOREIGN KEY (leak_report_id) REFERENCES public.leak_report(leak_report_id),
  CONSTRAINT excavation_clearance_issued_by_office_fkey FOREIGN KEY (issued_by_office) REFERENCES public.government_office(office_id)
);
CREATE TABLE public.funeral_home (
  funeral_home_id text NOT NULL,
  name text NOT NULL,
  accreditation_status text DEFAULT 'accredited'::text,
  contact_person text,
  system_registered boolean DEFAULT false,
  CONSTRAINT funeral_home_pkey PRIMARY KEY (funeral_home_id)
);
CREATE TABLE public.government_office (
  office_id text NOT NULL,
  office_name text NOT NULL,
  office_type text,
  location text,
  CONSTRAINT government_office_pkey PRIMARY KEY (office_id)
);
CREATE TABLE public.hcdrd_clearance (
  clearance_id text NOT NULL,
  water_request_id text,
  issued_by_office text,
  clearance_type text,
  issue_date date,
  digital_clearance_url text,
  CONSTRAINT hcdrd_clearance_pkey PRIMARY KEY (clearance_id),
  CONSTRAINT hcdrd_clearance_water_request_id_fkey FOREIGN KEY (water_request_id) REFERENCES public.water_connection_request(water_request_id),
  CONSTRAINT hcdrd_clearance_issued_by_office_fkey FOREIGN KEY (issued_by_office) REFERENCES public.government_office(office_id)
);
CREATE TABLE public.indigent_assistance_record (
  assistance_id text NOT NULL,
  deceased_id text,
  issued_by_office text,
  digital_cert_of_guarantee_url text,
  social_worker_employee_id text,
  social_worker_eval_date date,
  status text DEFAULT 'pending'::text,
  CONSTRAINT indigent_assistance_record_pkey PRIMARY KEY (assistance_id),
  CONSTRAINT indigent_assistance_record_deceased_id_fkey FOREIGN KEY (deceased_id) REFERENCES public.deceased(deceased_id),
  CONSTRAINT indigent_assistance_record_issued_by_office_fkey FOREIGN KEY (issued_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT indigent_assistance_record_social_worker_employee_id_fkey FOREIGN KEY (social_worker_employee_id) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.installation_record (
  installation_id text NOT NULL,
  water_request_id text,
  installation_date date,
  executed_by_office text,
  executed_by_employee text,
  payment_id text,
  activation_confirmed boolean DEFAULT false,
  CONSTRAINT installation_record_pkey PRIMARY KEY (installation_id),
  CONSTRAINT installation_record_water_request_id_fkey FOREIGN KEY (water_request_id) REFERENCES public.water_connection_request(water_request_id),
  CONSTRAINT installation_record_executed_by_office_fkey FOREIGN KEY (executed_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT installation_record_executed_by_employee_fkey FOREIGN KEY (executed_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT installation_record_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.digital_payment(payment_id)
);
CREATE TABLE public.inventory_report (
  inventory_report_id text NOT NULL,
  inventory_request_id text,
  preparation_date date,
  approval_status text DEFAULT 'pending'::text,
  prepared_by_office text,
  digital_report_url text,
  prepared_by_employee text,
  CONSTRAINT inventory_report_pkey PRIMARY KEY (inventory_report_id),
  CONSTRAINT inventory_report_inventory_request_id_fkey FOREIGN KEY (inventory_request_id) REFERENCES public.inventory_request(inventory_request_id),
  CONSTRAINT inventory_report_prepared_by_office_fkey FOREIGN KEY (prepared_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT inventory_report_prepared_by_employee_fkey FOREIGN KEY (prepared_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.inventory_request (
  inventory_request_id text NOT NULL,
  requesting_office text,
  request_doc text,
  date_requested date,
  status text DEFAULT 'pending'::text,
  inventory_scope text,
  cycle_type text,
  property_id text,
  CONSTRAINT inventory_request_pkey PRIMARY KEY (inventory_request_id),
  CONSTRAINT inventory_request_requesting_office_fkey FOREIGN KEY (requesting_office) REFERENCES public.government_office(office_id),
  CONSTRAINT inventory_request_request_doc_fkey FOREIGN KEY (request_doc) REFERENCES public.digital_document(document_id),
  CONSTRAINT inventory_request_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.property(property_id)
);
CREATE TABLE public.leak_repair_record (
  repair_id text NOT NULL,
  leak_report_id text,
  completion_date date,
  executed_by_office text,
  executed_by_employee text,
  completion_status text DEFAULT 'pending'::text,
  excavation_required boolean DEFAULT false,
  CONSTRAINT leak_repair_record_pkey PRIMARY KEY (repair_id),
  CONSTRAINT leak_repair_record_leak_report_id_fkey FOREIGN KEY (leak_report_id) REFERENCES public.leak_report(leak_report_id),
  CONSTRAINT leak_repair_record_executed_by_office_fkey FOREIGN KEY (executed_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT leak_repair_record_executed_by_employee_fkey FOREIGN KEY (executed_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.leak_report (
  leak_report_id text NOT NULL,
  ticket_id text,
  person_id text,
  report_doc text,
  urgency_classification text DEFAULT 'medium'::text,
  status text DEFAULT 'open'::text,
  CONSTRAINT leak_report_pkey PRIMARY KEY (leak_report_id),
  CONSTRAINT leak_report_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT leak_report_report_doc_fkey FOREIGN KEY (report_doc) REFERENCES public.digital_document(document_id)
);
CREATE TABLE public.niche_record (
  niche_id text NOT NULL,
  cemetery_id text,
  niche_number text NOT NULL,
  status text DEFAULT 'available'::text,
  burial_schedule_date date,
  assigned_document text,
  CONSTRAINT niche_record_pkey PRIMARY KEY (niche_id),
  CONSTRAINT niche_record_cemetery_id_fkey FOREIGN KEY (cemetery_id) REFERENCES public.cemetery(cemetery_id),
  CONSTRAINT niche_record_assigned_document_fkey FOREIGN KEY (assigned_document) REFERENCES public.digital_document(document_id)
);
CREATE TABLE public.notification_log (
  notif_id text NOT NULL,
  account_id text,
  module_reference text,
  reference_id text,
  notif_type text,
  message text,
  sent_at timestamp with time zone DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT notification_log_pkey PRIMARY KEY (notif_id),
  CONSTRAINT notification_log_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.citizen_account(account_id)
);
CREATE TABLE public.ocular_inspection (
  inspection_id text NOT NULL,
  property_id text,
  inventory_request_id text,
  inspection_date date,
  conducted_by_office text,
  physical_condition_notes text,
  usage_verified boolean DEFAULT false,
  boundary_verified boolean DEFAULT false,
  conducted_by_employee text,
  CONSTRAINT ocular_inspection_pkey PRIMARY KEY (inspection_id),
  CONSTRAINT ocular_inspection_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.property(property_id),
  CONSTRAINT ocular_inspection_inventory_request_id_fkey FOREIGN KEY (inventory_request_id) REFERENCES public.inventory_request(inventory_request_id),
  CONSTRAINT ocular_inspection_conducted_by_office_fkey FOREIGN KEY (conducted_by_office) REFERENCES public.government_office(office_id),
  CONSTRAINT ocular_inspection_conducted_by_employee_fkey FOREIGN KEY (conducted_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.online_burial_application (
  application_id text NOT NULL,
  person_id text,
  deceased_id text,
  submission_date date,
  document_validation_status text DEFAULT 'pending'::text,
  application_status text DEFAULT 'pending'::text,
  payment_id text,
  received_by_employee text,
  approved_by_employee text,
  CONSTRAINT online_burial_application_pkey PRIMARY KEY (application_id),
  CONSTRAINT online_burial_application_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT online_burial_application_deceased_id_fkey FOREIGN KEY (deceased_id) REFERENCES public.deceased(deceased_id),
  CONSTRAINT online_burial_application_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.digital_payment(payment_id),
  CONSTRAINT online_burial_application_received_by_employee_fkey FOREIGN KEY (received_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT online_burial_application_approved_by_employee_fkey FOREIGN KEY (approved_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.park_reservation_record (
  reservation_id text NOT NULL,
  park_venue_id text,
  applicant_person_id text,
  letter_of_intent_doc text,
  application_form_doc text,
  reservation_date date NOT NULL,
  time_slot text,
  status text DEFAULT 'pending'::text,
  processed_by_admin text,
  received_by_employee text,
  approved_by_employee text,
  payment_id text,
  digital_permit_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT park_reservation_record_pkey PRIMARY KEY (reservation_id),
  CONSTRAINT park_reservation_record_park_venue_id_fkey FOREIGN KEY (park_venue_id) REFERENCES public.park_venue(park_venue_id),
  CONSTRAINT park_reservation_record_applicant_person_id_fkey FOREIGN KEY (applicant_person_id) REFERENCES public.person(person_id),
  CONSTRAINT park_reservation_record_letter_of_intent_doc_fkey FOREIGN KEY (letter_of_intent_doc) REFERENCES public.digital_document(document_id),
  CONSTRAINT park_reservation_record_application_form_doc_fkey FOREIGN KEY (application_form_doc) REFERENCES public.digital_document(document_id),
  CONSTRAINT park_reservation_record_processed_by_admin_fkey FOREIGN KEY (processed_by_admin) REFERENCES public.administration_office(admin_office_id),
  CONSTRAINT park_reservation_record_received_by_employee_fkey FOREIGN KEY (received_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT park_reservation_record_approved_by_employee_fkey FOREIGN KEY (approved_by_employee) REFERENCES public.employee(employee_id),
  CONSTRAINT park_reservation_record_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.digital_payment(payment_id)
);
CREATE TABLE public.park_venue (
  park_venue_id text NOT NULL,
  park_venue_name text NOT NULL,
  location text,
  venue_type text,
  admin_office_id text,
  availability_status text DEFAULT 'available'::text,
  CONSTRAINT park_venue_pkey PRIMARY KEY (park_venue_id),
  CONSTRAINT park_venue_admin_office_id_fkey FOREIGN KEY (admin_office_id) REFERENCES public.administration_office(admin_office_id)
);
CREATE TABLE public.person (
  person_id text NOT NULL,
  full_name text NOT NULL,
  address text,
  contact_number text,
  valid_id_type text,
  valid_id_number text,
  account_id text,
  CONSTRAINT person_pkey PRIMARY KEY (person_id)
);
CREATE TABLE public.program_of_works (
  pow_id text NOT NULL,
  inspection_id text,
  description text,
  estimated_cost numeric,
  materials_available boolean DEFAULT false,
  prepared_by_employee text,
  CONSTRAINT program_of_works_pkey PRIMARY KEY (pow_id),
  CONSTRAINT program_of_works_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.drainage_inspection_report(inspection_id),
  CONSTRAINT program_of_works_prepared_by_employee_fkey FOREIGN KEY (prepared_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.property (
  property_id text NOT NULL,
  property_type text,
  property_name text NOT NULL,
  location text,
  area_size text,
  managing_office text,
  registry_ref_no text,
  asset_condition text DEFAULT 'good'::text,
  acquisition_date date,
  CONSTRAINT property_pkey PRIMARY KEY (property_id),
  CONSTRAINT property_managing_office_fkey FOREIGN KEY (managing_office) REFERENCES public.government_office(office_id)
);
CREATE TABLE public.service_tickets (
  ticket_id text NOT NULL,
  ticket_type text NOT NULL,
  requester_name text NOT NULL,
  requester_contact text,
  description text NOT NULL,
  location text NOT NULL,
  priority text DEFAULT 'medium'::text,
  status text DEFAULT 'open'::text,
  assigned_to text,
  assigned_at timestamp with time zone,
  resolved_at timestamp with time zone,
  resolution_note text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  person_id text,
  assigned_by text,
  resolved_by text,
  validated_by text,
  completion_proof_url text,
  completion_proof_uploaded_by text,
  completion_proof_uploaded_at timestamp with time zone,
  CONSTRAINT service_tickets_pkey PRIMARY KEY (ticket_id),
  CONSTRAINT fk_service_tickets_person FOREIGN KEY (person_id) REFERENCES public.person(person_id)
);
CREATE TABLE public.site_usage_log (
  usage_id text NOT NULL,
  reservation_id text,
  permit_document text,
  monitored_by_office text,
  remarks text,
  event_conducted_flag boolean DEFAULT false,
  CONSTRAINT site_usage_log_pkey PRIMARY KEY (usage_id),
  CONSTRAINT site_usage_log_reservation_id_fkey FOREIGN KEY (reservation_id) REFERENCES public.park_reservation_record(reservation_id),
  CONSTRAINT site_usage_log_permit_document_fkey FOREIGN KEY (permit_document) REFERENCES public.digital_document(document_id),
  CONSTRAINT site_usage_log_monitored_by_office_fkey FOREIGN KEY (monitored_by_office) REFERENCES public.administration_office(admin_office_id)
);
CREATE TABLE public.submission_record (
  submission_id text NOT NULL,
  inventory_report_id text,
  submitted_to text,
  submission_date date,
  submitted_by_employee text,
  notif_id text,
  CONSTRAINT submission_record_pkey PRIMARY KEY (submission_id),
  CONSTRAINT submission_record_inventory_report_id_fkey FOREIGN KEY (inventory_report_id) REFERENCES public.inventory_report(inventory_report_id),
  CONSTRAINT submission_record_submitted_by_employee_fkey FOREIGN KEY (submitted_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.system_backups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  filename text NOT NULL,
  date timestamp with time zone DEFAULT now(),
  type text NOT NULL DEFAULT 'Manual'::text,
  size text,
  status text NOT NULL DEFAULT 'Completed'::text,
  CONSTRAINT system_backups_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_settings (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.system_users (
  user_id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  department text,
  contact_no text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  password_hash text,
  CONSTRAINT system_users_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.technical_assessment (
  assessment_id text NOT NULL,
  water_request_id text,
  findings text,
  meter_type text,
  feasibility_status text,
  quotation_amount numeric,
  assessed_by_employee text,
  CONSTRAINT technical_assessment_pkey PRIMARY KEY (assessment_id),
  CONSTRAINT technical_assessment_water_request_id_fkey FOREIGN KEY (water_request_id) REFERENCES public.water_connection_request(water_request_id),
  CONSTRAINT technical_assessment_assessed_by_employee_fkey FOREIGN KEY (assessed_by_employee) REFERENCES public.employee(employee_id)
);
CREATE TABLE public.user_settings (
  account_id text NOT NULL,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  in_app_notifications boolean DEFAULT true,
  weekly_digest boolean DEFAULT true,
  system_alerts boolean DEFAULT true,
  show_full_name boolean DEFAULT true,
  show_office boolean DEFAULT true,
  show_contact boolean DEFAULT false,
  language text DEFAULT 'en-PH'::text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_settings_pkey PRIMARY KEY (account_id),
  CONSTRAINT user_settings_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.citizen_account(account_id)
);
CREATE TABLE public.utility_request_document (
  id text NOT NULL,
  ticket_id text NOT NULL,
  requirement_key text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamp with time zone DEFAULT now(),
  verified_at timestamp with time zone,
  verified_by text,
  CONSTRAINT utility_request_document_pkey PRIMARY KEY (id),
  CONSTRAINT utility_request_document_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.service_tickets(ticket_id)
);
CREATE TABLE public.water_connection_request (
  water_request_id text NOT NULL,
  ticket_id text,
  person_id text,
  application_doc text,
  property_type text,
  status text DEFAULT 'pending'::text,
  CONSTRAINT water_connection_request_pkey PRIMARY KEY (water_request_id),
  CONSTRAINT water_connection_request_person_id_fkey FOREIGN KEY (person_id) REFERENCES public.person(person_id),
  CONSTRAINT water_connection_request_application_doc_fkey FOREIGN KEY (application_doc) REFERENCES public.digital_document(document_id)
);