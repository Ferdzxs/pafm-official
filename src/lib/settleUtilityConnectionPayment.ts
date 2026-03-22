import type { SupabaseClient } from '@supabase/supabase-js'

export type SettleUtilityPaymentAuditAction = 'PROCESS_PAYMENT' | 'CITIZEN_ONLINE_PAYMENT'

/**
 * Path A: marks water connection fee as paid — updates `digital_payment`,
 * advances `service_tickets` and `water_connection_request`, and writes audit.
 */
export async function settleUtilityConnectionPayment(
  client: SupabaseClient,
  params: {
    ticketId: string
    waterRequestId: string
    installationId: string
    paymentId: string
    amount: number
    paymentMethod: string
    transactionRef: string | null
    performedBy: string
    auditAction: SettleUtilityPaymentAuditAction
  },
): Promise<{ ok: true; orNo: string } | { ok: false; error: string }> {
  const orNo = `OR-${Date.now().toString().slice(-6)}`
  const today = new Date().toISOString().split('T')[0]
  const ref =
    params.transactionRef?.trim() || `REF-${Date.now().toString().slice(-4)}`

  const { data: updated, error: uErr } = await client
    .from('digital_payment')
    .update({
      payment_status: 'settled',
      amount_paid: params.amount,
      payment_date: today,
      payment_method: params.paymentMethod,
      transaction_ref_no: ref,
      digital_or_no: orNo,
    })
    .eq('payment_id', params.paymentId)
    .eq('payment_status', 'pending')
    .select('payment_id')
    .maybeSingle()

  if (uErr) return { ok: false, error: uErr.message }
  if (!updated)
    return {
      ok: false,
      error: 'This fee was already paid or is no longer pending.',
    }

  const { error: tErr } = await client
    .from('service_tickets')
    .update({ status: 'for_installation' })
    .eq('ticket_id', params.ticketId)

  if (tErr) return { ok: false, error: tErr.message }

  const { error: wErr } = await client
    .from('water_connection_request')
    .update({ status: 'payment_received' })
    .eq('water_request_id', params.waterRequestId)

  if (wErr) return { ok: false, error: wErr.message }

  const details =
    params.auditAction === 'CITIZEN_ONLINE_PAYMENT'
      ? `Citizen portal payment (utility connection): ₱${params.amount} via ${params.paymentMethod}. OR: ${orNo}.`
      : `Utility connection payment processed: ₱${params.amount} via ${params.paymentMethod}. OR No: ${orNo}.`

  await client.from('audit_logs').insert({
    action: params.auditAction,
    subject: params.ticketId,
    module: 'utility',
    performed_by: params.performedBy,
    status: 'success',
    details,
  })

  await client.from('notification_log').insert({
    notif_id: `NLOG-${Date.now()}`,
    account_id: null,
    module_reference: 'utility',
    reference_id: params.ticketId,
    notif_type: 'payment_settled',
    message: `Payment recorded for water connection request ${params.ticketId}. Official receipt ${orNo}.`,
  })

  return { ok: true, orNo }
}
