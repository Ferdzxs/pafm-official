/**
 * Utility (Water Supply & Drainage) citizen-facing milestones — aligned with TO-BE DOCUMENT §5.4.
 * Status values live primarily on `service_tickets.status`; Path A fees use `installation_record.payment_id`.
 */

import { UTILITY_TICKET_TYPES } from '@/config/utilityRequest'

export type UtilityPath = 'A' | 'B' | 'C'

export type UtilityCitizenWorkflowStep = {
  label: string
  role: string
  description: string
}

/** Path A — New water connection */
export const UTILITY_PATH_A_STEPS: UtilityCitizenWorkflowStep[] = [
  { label: 'Request submitted', role: 'Citizen', description: 'Your utility request and uploads were received.' },
  { label: 'Classification & documents', role: 'Utility Helpdesk', description: 'Request classified; staff validates your supporting documents.' },
  { label: 'HCDRD clearance', role: 'HCDRD / Helpdesk', description: 'If applicable (socialized housing), clearance is recorded.' },
  { label: 'Site inspection', role: 'Utility Engineering', description: 'Feasibility assessment at your property.' },
  { label: 'Fees & order of payment', role: 'Treasurer', description: 'Connection fees computed; pay when order of payment is issued.' },
  { label: 'Payment & OR', role: 'Treasurer', description: 'Payment posted; digital official receipt issued.' },
  { label: 'Installation', role: 'Utility Engineering', description: 'Meter and service pipe installation.' },
  { label: 'Service activation', role: 'Utility Helpdesk', description: 'Water flow confirmed; request completed.' },
]

/** Path B — Water leak */
export const UTILITY_PATH_B_STEPS: UtilityCitizenWorkflowStep[] = [
  { label: 'Report submitted', role: 'Citizen', description: 'Leak report received.' },
  { label: 'Review & urgency', role: 'Utility Helpdesk', description: 'Staff reviews details and priority.' },
  { label: 'Site validation', role: 'Utility Engineering', description: 'Field validation of the leak.' },
  { label: 'Excavation clearance', role: 'City Engineering', description: 'Only if excavation is required.' },
  { label: 'Repair', role: 'Utility Engineering', description: 'Leak repair executed.' },
  { label: 'Verification & closure', role: 'Utility Helpdesk', description: 'Completion verified; ticket closed.' },
]

/** Path C — Drainage */
export const UTILITY_PATH_C_STEPS: UtilityCitizenWorkflowStep[] = [
  { label: 'Request submitted', role: 'Citizen', description: 'Drainage concern logged.' },
  { label: 'Review', role: 'Utility Helpdesk', description: 'Staff reviews your request.' },
  { label: 'Site inspection', role: 'Utility Engineering', description: 'Inspection and program of work.' },
  { label: 'Materials & scheduling', role: 'Utility Engineering', description: 'Materials secured when needed.' },
  { label: 'Drainage works', role: 'Utility Engineering', description: 'Declogging, desilting, or repair.' },
  { label: 'Completion', role: 'Utility Helpdesk', description: 'Work documented; request closed.' },
]

export const UTILITY_TICKET_TYPE_PATH_A = ['water_connection:new', 'water_connection:additional_meter', 'water_connection'] as const
export const UTILITY_TICKET_TYPE_PATH_B = ['leak:owner', 'leak:representative', 'leak_report'] as const
export const UTILITY_TICKET_TYPE_PATH_C = ['drainage'] as const

export function utilityPathForTicketType(ticketType: string | null | undefined): UtilityPath {
  if (!ticketType) return 'A'
  if ((UTILITY_TICKET_TYPE_PATH_B as readonly string[]).includes(ticketType)) return 'B'
  if ((UTILITY_TICKET_TYPE_PATH_C as readonly string[]).includes(ticketType)) return 'C'
  return 'A'
}

export function utilityCitizenSteps(path: UtilityPath): UtilityCitizenWorkflowStep[] {
  if (path === 'B') return UTILITY_PATH_B_STEPS
  if (path === 'C') return UTILITY_PATH_C_STEPS
  return UTILITY_PATH_A_STEPS
}

/** Highest completed step index (0-based) from ticket status — Path A. */
export function utilityPathAWorkflowStepIndex(status: string | null | undefined): number {
  const s = (status || 'submitted').toLowerCase()
  if (s === 'rejected' || s === 'closed') return -1
  const order = [
    'submitted',
    'open',
    'under_review',
    'triaged',
    'incomplete',
    'documents_validated',
    'hcdrd_pending',
    'hcdrd_cleared',
    'assigned',
    'for_inspection',
    'inspected',
    'awaiting_treasury',
    'order_of_payment_issued',
    'payment_settled',
    'for_installation',
    'in_progress',
    'pending_activation',
    'completed',
    'resolved',
  ]
  const idx = order.indexOf(s)
  if (idx < 0) return 0
  // Map long order to 8 citizen steps (coarse)
  if (idx <= 2) return 0
  if (idx <= 6) return 1
  if (idx === 7) return 2
  if (idx <= 9) return 3
  if (idx === 10) return 4
  if (idx === 11) return 4
  if (idx === 12) return 5
  if (idx <= 14) return 6
  if (idx === 15) return 7
  return 7
}

export function utilityPathBWorkflowStepIndex(status: string | null | undefined): number {
  const s = (status || 'submitted').toLowerCase()
  if (s === 'rejected' || s === 'closed') return -1
  if (['submitted', 'open', 'under_review', 'triaged'].includes(s)) return 0
  if (['assigned', 'for_inspection'].includes(s)) return 1
  if (s === 'inspected' || s === 'excavation_pending') return 2
  if (s === 'excavation_cleared') return 3
  if (s === 'in_progress' || s === 'for_implementation') return 4
  if (['resolved', 'completed', 'pending_activation'].includes(s)) return 5
  return 0
}

export function utilityPathCWorkflowStepIndex(status: string | null | undefined): number {
  const s = (status || 'submitted').toLowerCase()
  if (s === 'rejected' || s === 'closed') return -1
  if (['submitted', 'open', 'under_review', 'triaged'].includes(s)) return 0
  if (['assigned', 'for_inspection'].includes(s)) return 1
  if (s === 'inspected' || s === 'materials_pending') return 2
  if (s === 'materials_ready' || s === 'for_implementation') return 3
  if (s === 'in_progress') return 4
  if (['resolved', 'completed', 'pending_activation'].includes(s)) return 5
  return 0
}

export function utilityCitizenWorkflowStepIndex(
  ticketType: string | null | undefined,
  status: string | null | undefined,
): number {
  const path = utilityPathForTicketType(ticketType)
  if (path === 'B') return utilityPathBWorkflowStepIndex(status)
  if (path === 'C') return utilityPathCWorkflowStepIndex(status)
  return utilityPathAWorkflowStepIndex(status)
}

export function isUtilityTerminalFailure(status: string | null | undefined): boolean {
  const s = (status || '').toLowerCase()
  return s === 'rejected'
}

export function utilityTicketTypeLabel(ticketType: string): string {
  const k = ticketType as keyof typeof UTILITY_TICKET_TYPES
  if (k in UTILITY_TICKET_TYPES) return UTILITY_TICKET_TYPES[k].label
  if (ticketType === 'leak_report') return 'Water Leak'
  if (ticketType === 'water_connection') return 'New Water Connection'
  return ticketType.replace(/_/g, ' ')
}
