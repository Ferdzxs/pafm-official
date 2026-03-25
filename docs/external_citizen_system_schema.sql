-- External Citizen System Schema (fetched from live Supabase OpenAPI)
-- Source: https://tjcwwocpkpmhtdtlsiuc.supabase.co/rest/v1/
-- Note: enum formats (public.certificate_type, public.request_status, public.id_verification_status, public.app_role)
-- are represented as text here for portability.

CREATE TABLE IF NOT EXISTS public.certificate_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  certificate_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  purpose text NOT NULL,
  requestor_name text NOT NULL,
  requestor_address text,
  requestor_contact text,
  child_name text,
  child_birth_date date,
  child_birth_place text,
  father_name text,
  mother_name text,
  husband_name text,
  wife_name text,
  marriage_date date,
  marriage_place text,
  deceased_name text,
  death_date date,
  death_place text,
  cause_of_death text,
  remarks text,
  processed_by uuid,
  processed_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  certificate_number text,
  supporting_documents text[],
  certificate_file_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attachment_url text,
  CONSTRAINT certificate_requests_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  priority text DEFAULT 'normal',
  assigned_to uuid,
  response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attachment_url text,
  CONSTRAINT feedback_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  target_audience text NOT NULL DEFAULT 'all',
  target_user_ids uuid[],
  is_read_by uuid[],
  created_by uuid NOT NULL,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  suffix text,
  email text,
  phone text,
  address text,
  barangay text,
  city text,
  province text,
  zip_code text,
  birth_date date,
  gender text,
  civil_status text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  id_document_url text,
  id_verification_status text DEFAULT 'pending',
  id_type text,
  id_number text,
  id_expiry_date date,
  id_verified_by uuid,
  id_verified_at timestamptz,
  id_rejection_reason text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.survey_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL,
  question_id uuid NOT NULL,
  answer_text text,
  answer_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_answers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL,
  options jsonb,
  required boolean DEFAULT true,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_questions_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  survey_id uuid NOT NULL,
  user_id uuid NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_responses_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.surveys (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',
  start_date timestamptz,
  end_date timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT surveys_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'resident',
  assigned_by uuid,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id)
);
