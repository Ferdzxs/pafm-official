-- External Citizen System Schema (integration reference)
-- Source basis: provided table list + integration behavior in app.
-- NOTE: This is a compatibility schema for integration planning.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  account_id uuid,
  email text unique not null,
  full_name text,
  name text,
  first_name text,
  middle_name text,
  last_name text,
  suffix text,
  birth_date date,
  date_of_birth date,
  birthday date,
  sex text,
  gender text,
  civil_status text,
  marital_status text,
  address text,
  full_address text,
  residential_address text,
  barangay text,
  barangay_name text,
  city text,
  municipality text,
  province text,
  postal_code text,
  zip_code text,
  contact_number text,
  contact_no text,
  phone_number text,
  mobile_number text,
  mobile_no text,
  phone text,
  contact text,
  telephone text,
  tel_no text,
  cp_number text,
  cellphone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  citizen_id uuid,
  role text,
  user_role text,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  citizen_id uuid,
  title text,
  message text not null,
  notif_type text,
  type text default 'info',
  is_read boolean default false,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create table if not exists public.certificate_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  citizen_id uuid,
  profile_id uuid references public.profiles(id) on delete set null,
  certificate_type text not null,
  purpose text,
  status text default 'pending',
  attachment_url text,
  document_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  citizen_id uuid,
  category text,
  rating integer check (rating between 1 and 5),
  message text,
  feedback_text text,
  created_at timestamptz default now()
);

create table if not exists public.surveys (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_text text not null,
  question_type text default 'text',
  required boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  user_id uuid,
  account_id uuid,
  citizen_id uuid,
  submitted_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  answer_value text,
  created_at timestamptz default now()
);

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_user_roles_user_id on public.user_roles(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_certificate_requests_user_id on public.certificate_requests(user_id);
create index if not exists idx_feedback_user_id on public.feedback(user_id);
create index if not exists idx_survey_responses_user_id on public.survey_responses(user_id);
