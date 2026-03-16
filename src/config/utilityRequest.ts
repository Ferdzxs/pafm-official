/**
 * Utility module: request types, subtypes, and status lifecycle.
 * Aligned with To-Be BPMN (Water Supply & Drainage Requests).
 */

export type ServiceCategory = 'water_connection' | 'leak_report' | 'drainage'

export type WaterSubtype = 'no_existing_water' | 'additional_meter'
export type LeakSubtype = 'owner' | 'representative'

/**
 * Canonical ticket_type values for utility service_tickets.
 *
 * These strings are stored in service_tickets.ticket_type so that
 * helpdesk / engineering / citizen tracker can reliably distinguish:
 *  - Path A: New water connection (no existing vs additional meter)
 *  - Path B: Leak reports (owner vs representative)
 *  - Path C: Drainage / declogging / repair
 */
export const UTILITY_TICKET_TYPES = {
  'water_connection:new': {
    category: 'water_connection' as ServiceCategory,
    subtype: 'no_existing_water' as WaterSubtype,
    label: 'New Water Connection – No Existing Account',
    path: 'A' as const,
  },
  'water_connection:additional_meter': {
    category: 'water_connection' as ServiceCategory,
    subtype: 'additional_meter' as WaterSubtype,
    label: 'New Water Connection – Additional Meter',
    path: 'A' as const,
  },
  'leak:owner': {
    category: 'leak_report' as ServiceCategory,
    subtype: 'owner' as LeakSubtype,
    label: 'Water Leak – Owner',
    path: 'B' as const,
  },
  'leak:representative': {
    category: 'leak_report' as ServiceCategory,
    subtype: 'representative' as LeakSubtype,
    label: 'Water Leak – Representative',
    path: 'B' as const,
  },
  drainage: {
    category: 'drainage' as ServiceCategory,
    subtype: undefined,
    label: 'Drainage / Declogging / Repair',
    path: 'C' as const,
  },
} as const

export const UTILITY_REQUEST_TYPES = {
  water_connection: {
    label: 'New Water Supply',
    subtypes: [
      { id: 'no_existing_water' as const, label: 'No existing water account' },
      { id: 'additional_meter' as const, label: 'Existing account, need additional meter' },
    ],
    fields: ['property_type', 'address', 'contact', 'name'],
    extraFields: {
      additional_meter: ['existing_account_ref', 'latest_bill_ref', 'permission_note'],
    },
  },
  leak_report: {
    label: 'Report a Leak',
    subtypes: [
      { id: 'owner' as const, label: 'I am the account owner' },
      { id: 'representative' as const, label: 'I am a representative/relative' },
    ],
    fields: ['leak_type', 'address', 'contact', 'owner_name'],
    extraFields: {
      representative: ['relationship', 'representative_name'],
    },
  },
  drainage: {
    label: 'Drainage / Declogging / Repair',
    subtypes: [] as { id: string; label: string }[],
    fields: ['issue_description', 'address', 'contact', 'name'],
    extraFields: {} as Record<string, string[]>,
  },
} as const

export const SERVICE_TICKET_STATUSES = [
  'submitted',
  'open',
  'under_review',
  'incomplete',
  'validated',
  'assigned',
  'for_inspection',
  'inspected',
  'for_implementation',
  'for_payment',
  'in_progress',
  'resolved',
  'completed',
  'closed',
  'rejected',
] as const

export type ServiceTicketStatus = (typeof SERVICE_TICKET_STATUSES)[number]

/** Map internal status to citizen-facing timeline step (0–3). */
export const CITIZEN_STEP_MAP: Record<string, number> = {
  submitted: 0,
  open: 0,
  under_review: 1,
  incomplete: 1,
  validated: 1,
  assigned: 1,
  for_inspection: 2,
  inspected: 2,
  for_implementation: 2,
  for_payment: 2,
  in_progress: 2,
  resolved: 3,
  completed: 3,
  closed: 3,
  rejected: 3,
}

export const LEAK_TYPES = [
  { id: 'meter', label: 'Leak on the water meter (fittings, gate valve, vertical leg)' },
  { id: 'service_pipe', label: 'Leak on the service pipe before the meter' },
  { id: 'street', label: 'Leaks along the street / main road' },
] as const

export const PROPERTY_TYPES = [
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'industrial', label: 'Industrial' },
] as const

export const PRIORITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  critical: 'critical',
}
