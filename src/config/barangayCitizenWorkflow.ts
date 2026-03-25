/**
 * Barangay facility reservation — BPMN-aligned milestones (Facility Reservation System, TO-BE).
 * Status values live on `barangay_reservation_record.status` (text).
 */

export type BarangayCitizenWorkflowStep = {
  label: string
  role: string
  description: string
}

/** Ordered pipeline shown to citizens in My Applications (index = active step when current). */
export const BARANGAY_CITIZEN_WORKFLOW_STEPS: BarangayCitizenWorkflowStep[] = [
  { label: 'Submit reservation', role: 'Citizen', description: 'Facility, schedule, purpose, and valid ID uploaded.' },
  { label: 'Intake & validation', role: 'Barangay Secretary', description: 'Request logged; completeness verified.' },
  { label: 'Availability check', role: 'Barangay Secretary', description: 'Facility calendar checked for conflicts.' },
  { label: 'Order of payment', role: 'Treasurer', description: 'Rental fee computed; OOP issued when required.' },
  { label: 'Payment & official receipt', role: 'Treasurer / Citizen', description: 'Fees paid; digital OR issued when applicable.' },
  { label: 'Punong Barangay approval', role: 'Punong Barangay', description: 'Reservation reviewed and approved or declined.' },
  { label: 'Digital permit', role: 'Barangay Secretary', description: 'Facility reservation permit issued; schedule locked.' },
  { label: 'Confirmation', role: 'Notifications', description: 'Approval and usage reminders sent.' },
]

/** Canonical status vocabulary */
export const BARANGAY_RESERVATION_STATUS = {
  submitted: 'submitted',
  returnedIncomplete: 'returned_incomplete',
  availabilityFailed: 'availability_failed',
  awaitingTreasury: 'awaiting_treasury',
  orderOfPaymentIssued: 'order_of_payment_issued',
  paymentPending: 'payment_pending',
  pendingPbApproval: 'pending_pb_approval',
  pbRejected: 'pb_rejected',
  pbApproved: 'pb_approved',
  permitIssued: 'permit_issued',
  completed: 'completed',
} as const

function normalizeStatus(s?: string | null): string {
  if (!s) return 'submitted'
  const x = s.trim().toLowerCase()
  // Legacy mappings
  if (x === 'pending') return 'submitted'
  if (x === 'confirmed') return 'permit_issued'
  if (x === 'rejected') return 'pb_rejected'
  return s
}

/**
 * Highest completed step index (0-based). Conditional treasury steps (3–4) collapse when no fee.
 * -1 = terminal failure before completion.
 */
export function barangayReservationWorkflowStepIndex(status: string | null | undefined): number {
  const s = normalizeStatus(status)

  if (s === 'returned_incomplete' || s === 'availability_failed' || s === 'pb_rejected') return -1

  if (s === 'submitted') return 0
  if (s === 'awaiting_treasury') return 3
  if (s === 'order_of_payment_issued' || s === 'payment_pending') return 4
  if (s === 'pending_pb_approval') return 5
  if (s === 'pb_approved') return 6
  if (s === 'permit_issued' || s === 'completed') return 7

  return 0
}

export function isBarangayReservationTerminalFailure(status: string | null | undefined): boolean {
  const s = normalizeStatus(status)
  return s === 'returned_incomplete' || s === 'availability_failed' || s === 'pb_rejected'
}

/** Statuses that block another reservation for the same facility + date + time_slot. */
export const BARANGAY_SCHEDULE_BLOCKING_STATUSES: string[] = [
  'submitted',
  'awaiting_treasury',
  'order_of_payment_issued',
  'payment_pending',
  'pending_pb_approval',
  'pb_approved',
  'permit_issued',
  'completed',
  'pending',
  'confirmed',
]

export function formatBarangayReservationStatus(status: string | null | undefined): string {
  const s = normalizeStatus(status)
  const map: Record<string, string> = {
    submitted: 'Submitted',
    returned_incomplete: 'Returned — incomplete requirements',
    availability_failed: 'Unavailable — schedule conflict',
    awaiting_treasury: 'Awaiting order of payment',
    order_of_payment_issued: 'Order of payment issued',
    payment_pending: 'Payment pending',
    pending_pb_approval: 'Pending Punong Barangay approval',
    pb_rejected: 'Declined by Punong Barangay',
    pb_approved: 'Approved — permit in progress',
    permit_issued: 'Permit issued',
    completed: 'Completed',
    pending: 'Submitted',
    confirmed: 'Permit issued',
    rejected: 'Declined',
  }
  return map[s] ?? status ?? '—'
}
