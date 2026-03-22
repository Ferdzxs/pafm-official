# Citizen Integration Table Relationship Map

This document compares **our BPM tables** with the **external citizen system tables** and lists related attributes.

> Note: External table attributes are based on currently observed integration usage and common Supabase patterns. Confirm exact columns directly in the external project.

## 1) Identity and Account (Most Important)

### Our table: `person`
- `person_id`
- `full_name`
- `address`
- `contact_number`
- `valid_id_type`
- `valid_id_number`
- `account_id`

### Our table: `citizen_account`
- `account_id`
- `person_id`
- `email`
- `password_hash`
- `verification_status`
- `registered_date`
- `registry_ref_no`

### Their table: `profiles` (related)
- `id` (or `user_id`)
- `email`
- `full_name` / `name`
- `first_name`
- `middle_name`
- `last_name`
- `suffix`
- `birth_date` / `date_of_birth` / `birthday`
- `sex` / `gender`
- `civil_status` / `marital_status`
- `address` / `full_address` / `residential_address`
- `barangay`
- `city` / `municipality`
- `province`
- `postal_code` / `zip_code`
- `contact_number` / `contact_no` / `phone_number` / `mobile_number`

### Their table: `user_roles` (related)
- `id`
- `user_id` / `account_id` / `citizen_id`
- `role` / `user_role`

### Relationship
- `person.valid_id_number` <-> `profiles.id` (or `profiles.user_id`)
- `citizen_account.email` <-> `profiles.email`
- `citizen_account.account_id` (format `EXT-<external_user_id>`) <-> external auth/profile user id

---

## 2) Notifications

### Our table: `notification_log`
- `notif_id`
- `account_id`
- `module_reference`
- `reference_id`
- `notif_type`
- `message`
- `sent_at`
- `is_read`

### Their table: `notifications`
- `id`
- `user_id` / `account_id` / `citizen_id`
- `title` (if present)
- `message`
- `type` / `notif_type`
- `created_at` / `sent_at`
- `is_read` (if present)

### Relationship
- `notification_log.account_id` <-> `notifications.user_id` (or equivalent user column)
- `notification_log.message` <-> `notifications.message`
- `notification_log.notif_type` <-> `notifications.type`

---

## 3) Certificate Requests

### Our related tables
- `digital_document`
  - `document_id`, `document_type`, `reference_no`, `date_created`, `status`, `person_id`, `file_url`
- `service_tickets` (depending on implementation)
  - `ticket_id`, `ticket_type`, `status`, `person_id`, `created_at`

### Their table: `certificate_requests`
- `id`
- `user_id` / `account_id` / `citizen_id` / `profile_id`
- `certificate_type`
- `purpose`
- `status`
- `created_at`
- `updated_at`
- `attachment_url` / `document_url`

### Relationship
- External request owner (`user_id`/`profile_id`) <-> local citizen (`citizen_account` + `person`)
- External certificate metadata <-> local `digital_document` (if mirrored)

---

## 4) Feedback

### Our related tables
- `audit_logs` (for actions/logs)
- optional module-specific records where feedback can be attached

### Their table: `feedback`
- `id`
- `user_id` / `account_id` / `citizen_id`
- `message` / `feedback_text`
- `rating`
- `category`
- `created_at`

### Relationship
- Feedback owner link via external user id -> local citizen mapping

---

## 5) Survey Data

### Our current situation
- No direct one-to-one survey tables found in local BPM schema.
- Data is currently consumed from external citizen system.

### Their tables
- `surveys`
  - `id`, `title`, `description`, `status`, `created_at`
- `survey_questions`
  - `id`, `survey_id`, `question_text`, `question_type`, `required`
- `survey_responses`
  - `id`, `survey_id`, `user_id` / `account_id`, `created_at`
- `survey_answers`
  - `id`, `response_id`, `question_id`, `answer_value`

### Relationship
- `survey_responses.user_id` <-> external citizen id mapped to local citizen account/person

---

## Recommended Conflict-Safe Mapping Keys

Use these stable keys in your integration logic:

1. `external_user_id` (from external auth/profile)
2. `local_account_id` (`citizen_account.account_id`)
3. `local_person_id` (`person.person_id`)
4. `email` (fallback only, not primary key)

---

## Minimal Mapping Table to Add (Suggested)

Create one local table to avoid conflicts:

- `citizen_identity_map`
  - `local_account_id`
  - `local_person_id`
  - `external_user_id`
  - `external_profile_id`
  - `source_system` (default: `citizen_portal`)
  - `last_synced_at`

This table becomes the single source for joining our records with theirs.
