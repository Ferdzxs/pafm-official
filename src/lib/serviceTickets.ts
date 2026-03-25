import { supabase } from './supabase'
import type { ServiceTicket, TicketStatus, TicketPriority } from '@/types'

type ListTicketFilters = {
  assigned_to?: string
}

export type TicketsByTypeStat = {
  ticket_type: string
  count: number
}

/**
 * Fetch utility-related service tickets with optional filters.
 * This is a thin wrapper around the `service_tickets` table.
 */
export async function listTickets(
  filters: ListTicketFilters = {},
): Promise<ServiceTicket[]> {
  let query = supabase
    .from('service_tickets')
    .select(
      'ticket_id, ticket_type, requester_name, description, location, priority, status, assigned_to, created_at, resolved_at, image_url',
    )
    .order('created_at', { ascending: false })

  if (filters.assigned_to) {
    query = query.eq('assigned_to', filters.assigned_to)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as unknown as ServiceTicket[]
}

/**
 * Update a single ticket by ID.
 */
export async function updateTicket(
  ticketId: string,
  patch: Partial<ServiceTicket> & Record<string, any>,
): Promise<void> {
  const { error } = await supabase
    .from('service_tickets')
    .update(patch)
    .eq('ticket_id', ticketId)

  if (error) {
    throw new Error(error.message)
  }
}

type TicketEventPayload = {
  ticket_id: string
  event: string
  message: string
  account_id?: string | null
}

/**
 * Log a ticket-related event into `notification_log` so dashboards
 * and recent-activity feeds can surface it.
 */
export async function logTicketEvent(payload: TicketEventPayload): Promise<void> {
  const notifId = `NLOG-${Date.now()}`

  const { error } = await supabase.from('notification_log').insert({
    notif_id: notifId,
    account_id: payload.account_id ?? null,
    module_reference: 'utility',
    reference_id: payload.ticket_id,
    notif_type: payload.event,
    message: payload.message,
  })

  if (error) {
    throw new Error(error.message)
  }
}

type HelpdeskKpis = {
  openCount: number
  triagedToday: number
  pendingAssignment: number
}

type HelpdeskStats = {
  kpis: HelpdeskKpis
  byType: TicketsByTypeStat[]
}

/**
 * Aggregate KPIs and type breakdown for the Helpdesk dashboard.
 */
export async function getHelpdeskStats(): Promise<HelpdeskStats> {
  // Open = early lifecycle states before triage/assignment
  const openStatuses = [
    'submitted',
    'open',
    'under_review',
    'incomplete',
    'documents_validated',
    'hcdrd_pending',
  ]

  const [{ count: openCount }, { count: triagedToday }, { count: pendingAssign }, byTypeRows] =
    await Promise.all([
      supabase
        .from('service_tickets')
        .select('ticket_id', { count: 'exact', head: true })
        .in('status', openStatuses),
      // Triaged today
      supabase
        .from('service_tickets')
        .select('ticket_id', { count: 'exact', head: true })
        .eq('status', 'triaged')
        .gte('created_at', new Date().toISOString().slice(0, 10)),
      // Pending assignment = triaged but not yet assigned
      supabase
        .from('service_tickets')
        .select('ticket_id', { count: 'exact', head: true })
        .eq('status', 'triaged'),
      // Type breakdown – fetch ticket_type and aggregate client-side
      supabase
        .from('service_tickets')
        .select('ticket_type')
        .in('ticket_type', [
          'water_connection',
          'water_connection:new',
          'water_connection:additional_meter',
          'leak_report',
          'leak:owner',
          'leak:representative',
          'drainage',
          'general',
        ]),
    ])

  const rawTypes = (byTypeRows.data ?? []) as { ticket_type: string }[]
  const counts: Record<string, number> = {}

  for (const row of rawTypes) {
    const t = normalizeTicketType(row.ticket_type)
    counts[t] = (counts[t] ?? 0) + 1
  }

  const byType: TicketsByTypeStat[] = Object.entries(counts).map(([ticket_type, count]) => ({
    ticket_type,
    count,
  }))

  return {
    kpis: {
      openCount: openCount ?? 0,
      triagedToday: triagedToday ?? 0,
      pendingAssignment: pendingAssign ?? 0,
    },
    byType,
  }
}

function normalizeTicketType(raw: string): string {
  if (raw.startsWith('water_connection')) return 'water_connection'
  if (raw.startsWith('leak')) return 'leak_report'
  if (raw === 'drainage') return 'drainage'
  return 'general'
}

type UtilityActivityItem = {
  reference_id: string
  message: string
  sent_at: string
  notif_type: string
}

/**
 * Recent utility-related activity, for dashboards.
 * Reads from `notification_log` where module_reference = 'utility'.
 */
export async function getRecentUtilityActivity(
  limit = 20,
): Promise<UtilityActivityItem[]> {
  const { data, error } = await supabase
    .from('notification_log')
    .select('reference_id, message, sent_at, notif_type')
    .eq('module_reference', 'utility')
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UtilityActivityItem[]
}

