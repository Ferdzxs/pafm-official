import React, { useEffect, useState, useCallback } from 'react'
import { FileText, ExternalLink, Loader2, DownloadCloud } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import {
  downloadParkOrderOfPaymentPdf,
  downloadParkOfficialReceiptPdf,
  formatReceiptModuleLabel,
} from '@/lib/parkTreasuryDocumentsPdf'

type PaymentRow = {
  payment_id: string
  amount_paid: number | null
  payment_date: string | null
  payment_method: string | null
  payment_status: string | null
  digital_or_no: string | null
  transaction_ref_no: string | null
}

type DigitalDocument = {
  document_id: string
  document_type: string
  reference_no: string
  date_created: string
  status: string
  file_url: string
  payment?: PaymentRow | null
}

type ParkMeta = {
  venueLabel: string | null
  reservationDate: string | null
  timeSlot: string | null
}

function normalizePayment(raw: unknown): PaymentRow | null {
  if (!raw) return null
  const p = Array.isArray(raw) ? raw[0] : raw
  if (!p || typeof p !== 'object') return null
  const row = p as Record<string, unknown>
  const id = row.payment_id
  if (typeof id !== 'string') return null
  return {
    payment_id: id,
    amount_paid: row.amount_paid != null ? Number(row.amount_paid) : null,
    payment_date: typeof row.payment_date === 'string' ? row.payment_date : null,
    payment_method: typeof row.payment_method === 'string' ? row.payment_method : null,
    payment_status: typeof row.payment_status === 'string' ? row.payment_status : null,
    digital_or_no: typeof row.digital_or_no === 'string' ? row.digital_or_no : null,
    transaction_ref_no: typeof row.transaction_ref_no === 'string' ? row.transaction_ref_no : null,
  }
}

function fmtPdfDate(d: string | null | undefined): string {
  if (!d) return '—'
  const t = Date.parse(d)
  if (!Number.isFinite(t)) return d
  return new Date(t).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function isParkOrderOfPayment(doc: DigitalDocument): boolean {
  return doc.document_type === 'order_of_payment_park'
}

function canDownloadOrderOfPaymentPdf(doc: DigitalDocument): boolean {
  return isParkOrderOfPayment(doc) && !!doc.payment
}

function canDownloadOfficialReceiptPdf(doc: DigitalDocument): boolean {
  const p = doc.payment
  if (!p) return false
  return String(p.payment_status || '').toLowerCase() === 'settled' && !!p.digital_or_no?.trim()
}

/** Same pill treatment as “View PDF” on document cards */
const docActionClass =
  'inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground'

export default function MyDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DigitalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parkMetaByPaymentId, setParkMetaByPaymentId] = useState<Record<string, ParkMeta>>({})

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadDocuments = async () => {
      setLoading(true)
      setError(null)

      try {
        if (!user.is_citizen) {
          setDocuments([])
          return
        }

        const personId = await getCitizenPersonIdForSession(supabase, user)
        if (!personId) {
          setDocuments([])
          setError(null)
          return
        }

        const { data: docs, error: docError } = await supabase
          .from('digital_document')
          .select(
            `
            document_id,
            document_type,
            reference_no,
            date_created,
            status,
            file_url,
            digital_payment!document_id (
              payment_id,
              amount_paid,
              payment_date,
              payment_method,
              payment_status,
              digital_or_no,
              transaction_ref_no
            )
            `,
          )
          .eq('person_id', personId)
          .order('date_created', { ascending: false })

        if (docError) throw docError

        if (!cancelled && docs) {
          const withMeta: DigitalDocument[] = (docs as Record<string, unknown>[]).map(d => ({
            document_id: String(d.document_id),
            document_type: String(d.document_type ?? ''),
            reference_no: String(d.reference_no ?? ''),
            date_created: String(d.date_created ?? ''),
            status: String(d.status ?? ''),
            file_url: String(d.file_url ?? ''),
            payment: normalizePayment(d.digital_payment),
          }))
          withMeta.sort((a, b) => {
            const da = (b.date_created || '').localeCompare(a.date_created || '')
            if (da !== 0) return da
            return (b.document_id || '').localeCompare(a.document_id || '')
          })
          setDocuments(withMeta)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your documents.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDocuments()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!documents.length) {
      setParkMetaByPaymentId({})
      return
    }

    let cancelled = false

    const loadParkMeta = async () => {
      const targets = documents.filter(d => isParkOrderOfPayment(d) && d.payment?.payment_id)
      if (!targets.length) {
        setParkMetaByPaymentId({})
        return
      }

      const next: Record<string, ParkMeta> = {}

      await Promise.all(
        targets.map(async doc => {
          const pid = doc.payment!.payment_id
          const { data: byPay } = await supabase
            .from('park_reservation_record')
            .select(
              `
              reservation_id,
              reservation_date,
              time_slot,
              park_venue ( park_venue_name )
            `,
            )
            .eq('payment_id', pid)
            .maybeSingle()

          let row = byPay

          if (!row && doc.reference_no) {
            const { data: byRef } = await supabase
              .from('park_reservation_record')
              .select(
                `
                reservation_id,
                reservation_date,
                time_slot,
                park_venue ( park_venue_name )
              `,
              )
              .eq('reservation_id', doc.reference_no)
              .maybeSingle()
            row = byRef
          }

          if (cancelled || !row) return

          const pv = (row as { park_venue?: { park_venue_name?: string } | null }).park_venue
          next[pid] = {
            venueLabel: pv?.park_venue_name ?? null,
            reservationDate: (row as { reservation_date?: string }).reservation_date ?? null,
            timeSlot: (row as { time_slot?: string }).time_slot ?? null,
          }
        }),
      )

      if (!cancelled) {
        setParkMetaByPaymentId(next)
      }
    }

    void loadParkMeta()

    return () => {
      cancelled = true
    }
  }, [documents])

  const payorName = user?.full_name?.trim() || user?.email || 'Applicant'

  const handleDownloadOp = useCallback(
    (doc: DigitalDocument) => {
      const pay = doc.payment
      if (!pay || !canDownloadOrderOfPaymentPdf(doc)) return
      const meta = parkMetaByPaymentId[pay.payment_id]
      downloadParkOrderOfPaymentPdf({
        documentNo: doc.document_id,
        reservationRef: doc.reference_no,
        opDate: fmtPdfDate(doc.date_created),
        payorName,
        venueLabel: meta?.venueLabel ?? null,
        eventDate: meta?.reservationDate ?? null,
        timeSlot: meta?.timeSlot ?? null,
        amountDue: Number(pay.amount_paid ?? 0),
        paymentRecordId: pay.payment_id,
        feeStatus: pay.payment_status || 'pending',
      })
    },
    [payorName, parkMetaByPaymentId],
  )

  const handleDownloadOr = useCallback(
    (doc: DigitalDocument) => {
      const pay = doc.payment
      if (!pay || !canDownloadOfficialReceiptPdf(doc)) return
      downloadParkOfficialReceiptPdf({
        orNo: pay.digital_or_no!,
        payorName,
        amountPaid: Number(pay.amount_paid ?? 0),
        paymentDate: pay.payment_date,
        paymentMethod: pay.payment_method,
        transactionRef: pay.transaction_ref_no,
        documentRef: doc.reference_no,
        moduleLabel: formatReceiptModuleLabel(doc.document_type),
        paymentRecordId: pay.payment_id,
      })
    },
    [payorName],
  )

  const formatDocType = (type: string) => {
    return type
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
  }

  const classifyCategory = (doc: DigitalDocument): 'Permit' | 'Receipt' | 'Other' => {
    if (doc.document_type?.toLowerCase().includes('permit')) return 'Permit'
    if (doc.payment) return 'Receipt'
    return 'Other'
  }

  const formatPaymentStatus = (doc: DigitalDocument): 'Paid' | 'Pending' | 'Unpaid' => {
    if (!doc.payment) return 'Unpaid'
    if (doc.payment.payment_status === 'settled') return 'Paid'
    return 'Pending'
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl animate-fade-in px-4 py-4 pb-12 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Unified Documents</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Access all your digital permits, approval letters, certificates, and clearances generated across all City
          departments.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading your documents from the secure vault…
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-card p-8 text-center">
          <FileText size={32} className="mx-auto mb-3 text-muted-foreground" />
          <p className="mb-1 text-sm font-semibold text-foreground">No documents available yet.</p>
          <p className="mx-auto max-w-md text-xs text-muted-foreground">
            Once your applications across Burial, Parks, Barangay, or Utility departments are approved, the digitally
            generated PDFs and permits will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => {
            const showOp = canDownloadOrderOfPaymentPdf(doc)
            const showOr = canDownloadOfficialReceiptPdf(doc)
            const hasVaultPdf = !!doc.file_url
            const hasTreasuryActions = showOp || showOr
            const hasAnyDownload = hasVaultPdf || hasTreasuryActions

            return (
              <div
                key={doc.document_id}
                className="group flex flex-col justify-between rounded-xl border border-border-subtle bg-card p-4 transition-all hover:bg-bg-hover hover:shadow-md"
              >
                <div className="mb-4 flex items-start gap-4">
                  <div className="mt-0.5 rounded-xl border border-border-subtle bg-muted p-2.5">
                    <FileText size={20} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <h2
                        className="truncate text-sm font-semibold text-foreground"
                        title={formatDocType(doc.document_type)}
                      >
                        {formatDocType(doc.document_type)}
                      </h2>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-border-subtle bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                          {classifyCategory(doc)}
                        </span>
                        <span className="rounded-md border border-state-success/40 bg-state-success-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-state-success">
                          {doc.status}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                      <div className="flex flex-col font-mono">
                        <span className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                          Sys Ref ID
                        </span>
                        <span className="truncate text-primary">{doc.reference_no}</span>
                      </div>

                      {doc.payment && (
                        <>
                          <div className="flex justify-between gap-2">
                            <span className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                              Payment
                            </span>
                            <span className="font-medium text-foreground">
                              {formatPaymentStatus(doc)}{' '}
                              {doc.payment.amount_paid != null && (
                                <span className="text-muted-foreground">
                                  · ₱
                                  {Number(doc.payment.amount_paid).toLocaleString('en-PH', {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              )}
                            </span>
                          </div>
                          {doc.payment.digital_or_no && (
                            <div className="flex justify-between gap-2">
                              <span className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                                OR No.
                              </span>
                              <span className="truncate font-medium text-foreground">{doc.payment.digital_or_no}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex flex-col gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="shrink-0 text-[11px] text-muted-foreground">
                    Issued:{' '}
                    <span className="font-medium text-foreground">
                      {new Date(doc.date_created).toLocaleDateString('en-PH', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {showOp && (
                      <button type="button" className={docActionClass} onClick={() => handleDownloadOp(doc)}>
                        <DownloadCloud size={13} aria-hidden />
                        Order of payment
                      </button>
                    )}
                    {showOr && (
                      <button type="button" className={docActionClass} onClick={() => handleDownloadOr(doc)}>
                        <DownloadCloud size={13} aria-hidden />
                        Official receipt
                      </button>
                    )}
                    {hasVaultPdf ? (
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={docActionClass}
                      >
                        <DownloadCloud size={13} />
                        View PDF
                      </a>
                    ) : null}
                    {!hasAnyDownload ? (
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
                      >
                        <ExternalLink size={13} />
                        Processing
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
