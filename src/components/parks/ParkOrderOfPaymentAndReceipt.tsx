import React, { useCallback, type ReactNode } from 'react'
import { FileText, Receipt, Building2, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  downloadParkOrderOfPaymentPdf,
  downloadParkOfficialReceiptPdf,
} from '@/lib/parkTreasuryDocumentsPdf'

const LGU_LINE = 'Quezon City Municipal Government'
const TREASURY_LINE = 'Revenue Collection & Treasury Services'

export type ParkFeePaymentSnapshot = {
  payment_id: string
  payment_status: string | null
  amount_paid: number | null
  digital_or_no: string | null
  payment_date: string | null
  payment_method: string | null
  transaction_ref_no: string | null
  document_id: string | null
}

export type ParkOpDocumentSnapshot = {
  document_id: string
  document_type: string | null
  reference_no: string | null
  date_created: string | null
  status: string | null
} | null

export type ParkFeeDocViewMode = 'full' | 'order_only' | 'receipt_only'

type Props = {
  payorName: string
  reservationId: string
  venueLabel?: string | null
  reservationDate?: string | null
  timeSlot?: string | null
  payment: ParkFeePaymentSnapshot | null
  opDocument: ParkOpDocumentSnapshot
  opDocumentLoading?: boolean
  showOrderOfPayment?: boolean
  viewMode?: ParkFeeDocViewMode
  showPdfActions?: boolean
  orModuleLabel?: string
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  const t = Date.parse(d)
  if (!Number.isFinite(t)) return d
  return new Date(t).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatTile({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors group/tile hover:border-primary/25',
        className,
      )}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="break-words text-sm font-bold text-foreground">{value}</div>
    </div>
  )
}

export function ParkOrderOfPaymentAndReceipt({
  payorName,
  reservationId,
  venueLabel,
  reservationDate,
  timeSlot,
  payment,
  opDocument,
  opDocumentLoading,
  showOrderOfPayment = true,
  viewMode = 'full',
  showPdfActions = true,
  orModuleLabel = 'Parks & Recreation',
}: Props) {
  const handleDownloadOpPdf = useCallback(() => {
    if (!payment) return
    downloadParkOrderOfPaymentPdf({
      documentNo: opDocument?.document_id ?? payment.document_id ?? '—',
      reservationRef: opDocument?.reference_no ?? reservationId,
      opDate: fmtDate(opDocument?.date_created),
      payorName,
      venueLabel: venueLabel ?? null,
      eventDate: reservationDate ?? null,
      timeSlot: timeSlot ?? null,
      amountDue: Number(payment.amount_paid ?? 0),
      paymentRecordId: payment.payment_id,
      feeStatus: payment.payment_status || 'pending',
    })
  }, [payment, opDocument, reservationId, payorName, venueLabel, reservationDate, timeSlot])

  const handleDownloadOrPdf = useCallback(() => {
    if (!payment) return
    const ok =
      String(payment.payment_status || '').toLowerCase() === 'settled' &&
      !!payment.digital_or_no?.trim()
    if (!ok) return
    downloadParkOfficialReceiptPdf({
      orNo: payment.digital_or_no!,
      payorName,
      amountPaid: Number(payment.amount_paid ?? 0),
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      transactionRef: payment.transaction_ref_no,
      documentRef: opDocument?.reference_no ?? reservationId,
      moduleLabel: orModuleLabel,
      paymentRecordId: payment.payment_id,
    })
  }, [payment, payorName, reservationId, opDocument, orModuleLabel])

  const showOpBlock =
    viewMode === 'order_only' || (viewMode === 'full' && showOrderOfPayment)
  const showReceiptBlock = viewMode === 'receipt_only' || viewMode === 'full'

  const settled =
    payment &&
    String(payment.payment_status || '').toLowerCase() === 'settled' &&
    !!payment.digital_or_no

  const amountDue = payment?.amount_paid ?? null
  const payStatus = payment ? String(payment.payment_status || 'pending').toLowerCase() : '—'

  return (
    <div className="space-y-5">
      {showOpBlock && (
        <div
          className={cn(
            'admin-box group relative overflow-hidden border-amber-500/25 shadow-[inset_0_1px_0_0_rgba(251,191,36,0.08)]',
            'dark:border-amber-500/20',
          )}
        >
          <FileText
            className="pointer-events-none absolute right-4 top-4 h-14 w-14 text-amber-500/[0.08] transition-transform duration-500 group-hover:scale-105 dark:text-amber-400/[0.07]"
            aria-hidden
          />
          <div className="relative mb-5 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 shadow-inner dark:text-amber-300">
              <FileText className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                  Digital OP
                </Badge>
                <Badge className="border border-amber-500/35 bg-amber-500/15 text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-100">
                  Treasury
                </Badge>
              </div>
              <p className="font-display text-base font-extrabold leading-tight tracking-tight text-foreground">
                Order of payment
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-foreground">{LGU_LINE}</p>
              <p className="text-[10px] text-muted-foreground">{TREASURY_LINE}</p>
            </div>
          </div>

          {opDocumentLoading ? (
            <p className="relative text-center text-sm text-muted-foreground">Loading order details…</p>
          ) : (
            <>
              <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatTile
                  label="OP document no."
                  value={<span className="font-mono text-xs font-semibold">{opDocument?.document_id ?? payment?.document_id ?? '—'}</span>}
                />
                <StatTile
                  label="Reservation ref."
                  value={<span className="font-mono text-xs font-semibold">{opDocument?.reference_no ?? reservationId}</span>}
                />
                <StatTile label="OP date" value={fmtDate(opDocument?.date_created)} />
                <StatTile label="Payor" value={payorName} />
                {venueLabel ? (
                  <div className="sm:col-span-2">
                    <StatTile
                      label="Venue / purpose"
                      value={
                        <span className="flex items-start gap-2">
                          <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" aria-hidden />
                          {venueLabel}
                        </span>
                      }
                    />
                  </div>
                ) : null}
                {(reservationDate || timeSlot) && (
                  <div className="sm:col-span-2">
                    <StatTile
                      label="Event"
                      value={
                        <span className="font-medium">{[reservationDate, timeSlot].filter(Boolean).join(' · ') || '—'}</span>
                      }
                    />
                  </div>
                )}
              </div>

              <div className="sep relative border-border/10 dark:border-white/[0.06]">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount due</p>
                    <p className="font-display text-2xl font-black tabular-nums tracking-tight text-foreground">
                      ₱{(amountDue ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Fee status</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">{payStatus}</p>
                  </div>
                </div>
                {payment?.payment_id ? (
                  <p className="mt-3 text-[10px] text-muted-foreground">
                    Payment record <span className="font-mono font-semibold text-foreground/80">{payment.payment_id}</span>
                  </p>
                ) : null}
              </div>

              {showPdfActions ? (
                <div className="relative mt-6 flex items-center justify-end border-t border-border/10 pt-6 dark:border-white/[0.06]">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-11 gap-2 rounded-xl px-6 text-[10px] font-extrabold uppercase tracking-widest shadow-md"
                    disabled={opDocumentLoading}
                    onClick={handleDownloadOpPdf}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Download PDF
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}

      {showReceiptBlock ? (
        <div
          className={cn(
            'admin-box group relative overflow-hidden shadow-[inset_0_1px_0_0_rgba(16,185,129,0.1)]',
            settled
              ? 'border-emerald-500/30 dark:border-emerald-500/25'
              : 'border-dashed border-border/60 bg-muted/20',
          )}
        >
          <Receipt
            className={cn(
              'pointer-events-none absolute right-4 top-4 h-14 w-14 transition-transform duration-500 group-hover:scale-105',
              settled ? 'text-emerald-500/[0.08] dark:text-emerald-400/[0.07]' : 'text-muted-foreground/10',
            )}
            aria-hidden
          />
          <div className="relative mb-5 flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-inner',
                settled
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <Receipt className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">
                  Digital OR
                </Badge>
                {settled ? (
                  <Badge className="border border-emerald-500/25 bg-emerald-500/15 text-[9px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                    Settled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-widest">
                    Pending
                  </Badge>
                )}
              </div>
              <p className="font-display text-base font-extrabold leading-tight tracking-tight text-foreground">
                Official receipt
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-foreground">{LGU_LINE}</p>
              <p className="text-[10px] text-muted-foreground">{TREASURY_LINE}</p>
            </div>
          </div>

          {settled && payment ? (
            <>
              <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatTile
                  label="OR number"
                  value={<span className="font-mono text-sm font-bold text-primary">{payment.digital_or_no}</span>}
                />
                <StatTile
                  label="Amount paid"
                  value={
                    <span className="font-display text-lg font-black tabular-nums text-foreground">
                      ₱{(payment.amount_paid ?? 0).toLocaleString()}
                    </span>
                  }
                />
                <StatTile label="Payment date" value={fmtDate(payment.payment_date)} />
                <StatTile
                  label="Method"
                  value={<span className="uppercase">{(payment.payment_method || '—').replace(/_/g, ' ')}</span>}
                />
                <div className="sm:col-span-2">
                  <StatTile label="Reference no." value={<span className="font-mono text-xs">{payment.transaction_ref_no ?? '—'}</span>} />
                </div>
              </div>

              {showPdfActions ? (
                <div className="relative mt-6 flex items-center justify-end border-t border-border/10 pt-6 dark:border-white/[0.06]">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="h-11 gap-2 rounded-xl px-6 text-[10px] font-extrabold uppercase tracking-widest shadow-md"
                    onClick={handleDownloadOrPdf}
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    Download PDF
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="relative text-center text-sm leading-relaxed text-muted-foreground">
              The official receipt is generated when the fee is marked{' '}
              <span className="font-semibold text-foreground">settled</span> (treasury counter or citizen online payment).
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
