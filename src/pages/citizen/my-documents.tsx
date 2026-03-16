import React, { useEffect, useState } from 'react'
import { FileText, ExternalLink, Loader2, DownloadCloud } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

type DigitalDocument = {
  document_id: string
  document_type: string
  reference_no: string
  date_created: string
  status: string
  file_url: string
  // Optional linked payment info (via digital_payment.document_id)
  payment?: {
    payment_id: string
    amount_paid: number | null
    payment_date: string | null
    payment_method: string | null
    payment_status: string | null
    digital_or_no: string | null
  } | null
}

export default function MyDocuments() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<DigitalDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadDocuments = async () => {
      setLoading(true)
      setError(null)

      try {
        let personId = 'UNKNOWN'

        // Find person_id for the current account
        if (user.is_citizen) {
          const { data: citAcc } = await supabase
            .from('citizen_account')
            .select('person_id')
            .eq('account_id', user.id)
            .maybeSingle()

          if (citAcc?.person_id) {
            personId = citAcc.person_id
          }
        }

        // Fetch Digital Documents linked to this person, including any linked payment record
        const { data: docs, error: docError } = await supabase
          .from('digital_document')
          .select(`
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
              digital_or_no
            )
          `)
          .eq('person_id', personId)
          .order('date_created', { ascending: false })

        if (docError) throw docError

        if (!cancelled && docs) {
          const withMeta: DigitalDocument[] = (docs as any[]).map(d => ({
            document_id: d.document_id,
            document_type: d.document_type,
            reference_no: d.reference_no,
            date_created: d.date_created,
            status: d.status,
            file_url: d.file_url,
            payment: d.digital_payment
              ? {
                  payment_id: d.digital_payment.payment_id,
                  amount_paid: d.digital_payment.amount_paid,
                  payment_date: d.digital_payment.payment_date,
                  payment_method: d.digital_payment.payment_method,
                  payment_status: d.digital_payment.payment_status,
                  digital_or_no: d.digital_payment.digital_or_no,
                }
              : null,
          }))

          setDocuments(withMeta)
        }

      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load your documents.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDocuments()

    return () => {
      cancelled = true
    }
  }, [user])

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
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Unified Documents</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Access all your digital permits, approval letters, certificates, and clearances generated across all City departments.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading your documents from the secure vault…
        </div>
      ) : documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle p-8 text-center bg-card">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">No documents available yet.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Once your applications across Burial, Parks, Barangay, or Utility departments are approved, the digitally generated PDFs and permits will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map(doc => (
            <div
              key={doc.document_id}
              className="rounded-xl p-4 flex flex-col justify-between group border border-border-subtle bg-card hover:bg-bg-hover hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="mt-0.5 rounded-xl bg-muted border border-border-subtle p-2.5">
                  <FileText size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h2 className="text-sm font-semibold text-foreground truncate" title={formatDocType(doc.document_type)}>
                      {formatDocType(doc.document_type)}
                    </h2>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-muted border border-border-subtle px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                        {classifyCategory(doc)}
                      </span>
                      <span className="rounded-md bg-state-success-soft border border-state-success/40 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-state-success">
                        {doc.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                    <div className="flex flex-col font-mono">
                      <span className="text-[10px] uppercase font-sans tracking-wide text-muted-foreground">Sys Ref ID</span>
                      <span className="truncate text-primary">{doc.reference_no}</span>
                    </div>

                    {doc.payment && (
                      <>
                        <div className="flex justify-between gap-2">
                          <span className="text-[10px] uppercase font-sans tracking-wide text-muted-foreground">Payment</span>
                          <span className="text-foreground font-medium">
                            {formatPaymentStatus(doc)}{' '}
                            {doc.payment.amount_paid != null && (
                              <span className="text-muted-foreground">
                                · ₱{Number(doc.payment.amount_paid).toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </span>
                        </div>
                        {doc.payment.digital_or_no && (
                          <div className="flex justify-between gap-2">
                            <span className="text-[10px] uppercase font-sans tracking-wide text-muted-foreground">OR No.</span>
                            <span className="text-foreground font-medium truncate">{doc.payment.digital_or_no}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-3 border-t border-border-subtle">
                <div className="text-[11px] text-muted-foreground">
                  Issued:{' '}
                  <span className="text-foreground font-medium">
                    {new Date(doc.date_created).toLocaleDateString('en-PH', {
                      year: 'numeric', month: 'short', day: '2-digit',
                    })}
                  </span>
                </div>
                {doc.file_url ? (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-[11px] font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    <DownloadCloud size={13} />
                    View PDF
                  </a>
                ) : (
                  <button disabled className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-[11px] font-medium text-muted-foreground cursor-not-allowed">
                    <ExternalLink size={13} />
                    Processing
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
