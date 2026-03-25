/**
 * Park reservation milestones shown to citizens in My Applications.
 * Each step names the office/role typically responsible at that stage.
 */

export type ParkCitizenWorkflowStep = {
  label: string
  role: string
  description: string
}

/** Ordered pipeline (index = step number when current). */
export const PARK_CITIZEN_WORKFLOW_STEPS: ParkCitizenWorkflowStep[] = [
  { label: 'Letter of intent', role: 'Citizen', description: 'You submitted your LOI.' },
  { label: 'Desk intake & availability', role: 'Reservation Officer', description: 'Officer checks schedule and logs your request.' },
  { label: 'Endorsement', role: 'Reservation Officer', description: 'Forwarded to Parks Administration for decision.' },
  { label: 'Parks approval', role: 'Parks Administrator', description: 'Venue use approved or declined.' },
  { label: 'Application form', role: 'Reservation Officer / Citizen', description: 'Digital form issued; you complete and submit.' },
  { label: 'Form validation', role: 'Reservation Officer', description: 'Officer validates your application.' },
  { label: 'Fees & order of payment', role: 'Treasurer', description: 'Fees computed; pay at Treasury when instructed.' },
  { label: 'Payment & official receipt', role: 'Treasurer', description: 'Payment recorded; digital OR issued.' },
  { label: 'Digital permit', role: 'Reservation Officer', description: 'Official park event permit released.' },
  { label: 'Event / monitoring', role: 'Parks Administration', description: 'Use of venue; monitoring as applicable.' },
]

/** Map normalized status → highest completed step index (0-based). -1 = rejected / failed before completion. */
const NORMALIZE = (s?: string | null) => {
  if (!s) return 'pending_loi'
  if (s === 'pending') return 'pending_loi'
  if (s === 'approved') return 'admin_approved'
  if (s === 'rejected') return 'admin_rejected'
  return s
}

export function parkReservationWorkflowStepIndex(status: string | null | undefined): number {
  const s = NORMALIZE(status)

  if (s === 'admin_rejected' || s === 'availability_failed') return -1

  // Step indices align with PARK_CITIZEN_WORKFLOW_STEPS
  if (s === 'pending_loi') return 0
  if (s === 'desk_logged') return 1
  if (s === 'endorsed_to_admin' || s === 'pending') return 2
  if (s === 'admin_approved') return 3
  if (s === 'application_form_issued' || s === 'application_incomplete') return 4
  if (s === 'application_submitted') return 5
  if (s === 'application_validated') return 6
  if (s === 'order_of_payment_issued' || s === 'payment_pending') return 7
  if (s === 'payment_settled') return 8
  if (s === 'permit_released' || s === 'monitored') return 9
  if (s === 'completed') return 9

  return 0
}

export function isParkReservationTerminalFailure(status: string | null | undefined): boolean {
  const s = NORMALIZE(status)
  return s === 'admin_rejected' || s === 'availability_failed'
}
