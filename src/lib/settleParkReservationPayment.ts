import type { SupabaseClient } from "@supabase/supabase-js"

export type SettleParkPaymentAuditAction = "PROCESS_PAYMENT" | "CITIZEN_ONLINE_PAYMENT"

/**
 * Marks a park reservation fee as paid: updates `digital_payment`, advances
 * `park_reservation_record` to `payment_settled`, and writes an audit row.
 * Uses a conditional update so only `pending` rows are settled (idempotent).
 */
export async function settleParkReservationPayment(
  client: SupabaseClient,
  params: {
    reservationId: string
    paymentId: string
    amount: number
    paymentMethod: string
    transactionRef: string | null
    performedBy: string
    auditAction: SettleParkPaymentAuditAction
  },
): Promise<{ ok: true; orNo: string } | { ok: false; error: string }> {
  const orNo = `OR-${Date.now().toString().slice(-6)}`
  const today = new Date().toISOString().split("T")[0]
  const ref =
    params.transactionRef?.trim() || `REF-${Date.now().toString().slice(-4)}`

  const { data: updated, error: uErr } = await client
    .from("digital_payment")
    .update({
      payment_status: "settled",
      amount_paid: params.amount,
      payment_date: today,
      payment_method: params.paymentMethod,
      transaction_ref_no: ref,
      digital_or_no: orNo,
    })
    .eq("payment_id", params.paymentId)
    .eq("payment_status", "pending")
    .select("payment_id")
    .maybeSingle()

  if (uErr) return { ok: false, error: uErr.message }
  if (!updated)
    return {
      ok: false,
      error: "This fee was already paid or is no longer pending.",
    }

  const { error: rErr } = await client
    .from("park_reservation_record")
    .update({ status: "payment_settled" })
    .eq("reservation_id", params.reservationId)

  if (rErr) return { ok: false, error: rErr.message }

  const details =
    params.auditAction === "CITIZEN_ONLINE_PAYMENT"
      ? `Citizen portal payment: ₱${params.amount} via ${params.paymentMethod}. OR: ${orNo}.`
      : `Payment processed: ₱${params.amount} via ${params.paymentMethod}. OR No: ${orNo}.`

  await client.from("audit_logs").insert({
    action: params.auditAction,
    subject: params.reservationId,
    module: "parks",
    performed_by: params.performedBy,
    status: "success",
    details,
  })

  return { ok: true, orNo }
}
