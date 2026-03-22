/**
 * official-receipts.tsx — Treasurer: Browse all issued Digital Official Receipts
 * Source: digital_payment (settled + digital_or_no populated)
 * Joined with: digital_document → module type, person → applicant name
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import {
  Search, RefreshCw, Receipt as ReceiptIcon, X, AlertCircle,
  Calendar, User, Package, ChevronRight, Download,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
  downloadParkOfficialReceiptPdf,
  formatReceiptModuleLabel,
} from '@/lib/parkTreasuryDocumentsPdf'

// ─── Types ────────────────────────────────────────────────────────────────────
type OR = {
  payment_id: string
  digital_or_no: string
  amount_paid: number
  payment_date: string | null
  payment_method: string | null
  transaction_ref_no: string | null
  document_type: string | null
  person_name: string | null
  document_ref_no: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const MODULE_COLOR: Record<string, string> = {
  Burial: '#a78bfa',
  'Parks & Recreation': '#4ade80',
  Barangay: '#fb923c',
  Utility: '#22d3ee',
  General: '#94a3b8',
}

function MethodBadge({ method }: { method: string | null }) {
  const m = method?.toLowerCase()
  const label = m === 'gcash' ? 'GCash' : m === 'maya' ? 'Maya' : m === 'bank_transfer' ? 'Bank Transfer' : 'Cash'
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground">
      {label}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OfficialReceiptsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [rows, setRows] = useState<OR[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [selected, setSelected] = useState<OR | null>(null)

  useEffect(() => { void loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Fetch settled payments with OR numbers
      const { data: payments, error: pErr } = await supabase
        .from('digital_payment')
        .select('payment_id, digital_or_no, amount_paid, payment_date, payment_method, transaction_ref_no, document_id')
        .eq('payment_status', 'settled')
        .not('digital_or_no', 'is', null)
        .order('payment_date', { ascending: false })
        .limit(200)

      if (pErr) throw new Error(pErr.message)

      const docIds = [...new Set((payments ?? []).map((p: any) => p.document_id).filter(Boolean))]

      const [{ data: docs }, ] = await Promise.all([
        docIds.length
          ? supabase.from('digital_document').select('document_id, document_type, reference_no, person_id').in('document_id', docIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const personIds = [...new Set((docs ?? []).map((d: any) => d.person_id).filter(Boolean))]
      const { data: persons } = personIds.length
        ? await supabase.from('person').select('person_id, full_name').in('person_id', personIds)
        : { data: [] as any[] }

      const docMap: Record<string, any> = {}
      const personMap: Record<string, string> = {}
      ;(docs ?? []).forEach((d: any) => (docMap[d.document_id] = d))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p.full_name))

      const merged: OR[] = (payments ?? []).map((p: any) => {
        const doc = p.document_id ? docMap[p.document_id] : null
        return {
          payment_id: p.payment_id,
          digital_or_no: p.digital_or_no,
          amount_paid: p.amount_paid ?? 0,
          payment_date: p.payment_date,
          payment_method: p.payment_method,
          transaction_ref_no: p.transaction_ref_no,
          document_type: doc?.document_type ?? null,
          person_name: doc?.person_id ? personMap[doc.person_id] ?? null : null,
          document_ref_no: doc?.reference_no ?? null,
        }
      })

      setRows(merged)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load Official Receipts.')
    } finally {
      setLoading(false)
    }
  }

  const modules = useMemo(() => {
    const set = new Set(rows.map(r => formatReceiptModuleLabel(r.document_type)))
    return ['all', ...Array.from(set)]
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      const mod = formatReceiptModuleLabel(r.document_type)
      if (moduleFilter !== 'all' && mod !== moduleFilter) return false
      if (!q) return true
      return [r.digital_or_no, r.person_name ?? '', r.document_ref_no ?? '', r.payment_method ?? ''].join(' ').toLowerCase().includes(q)
    })
  }, [rows, search, moduleFilter])

  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-6 py-16">
        <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-50" aria-hidden />
      </div>
    )
  }
  if (!user) return null
  const meta = ROLE_META[user.role] ?? ROLE_META.treasurer

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
              {meta.label.toUpperCase()}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <ReceiptIcon className="h-3.5 w-3.5 text-primary" /> Official receipts
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Official receipts</h1>
          <p className="text-muted-foreground text-sm max-w-[600px]">All issued digital official receipts across modules.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="shadow-xs border-border self-start md:self-center">
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive items-center">
          <AlertCircle size={16} className="shrink-0" />
          <p className="font-medium">{error}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto hover:bg-destructive/10 text-destructive" onClick={() => setError(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input className="pl-10 h-10 border-border/50" placeholder="Search OR no., name, or reference…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="flex h-10 rounded-xl border border-border/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m}</option>)}
        </select>
      </div>

      {/* Table card */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <ReceiptIcon size={18} className="text-primary" />
            Issued Receipts
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>Click a row to view full receipt details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-40" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <p className="font-bold text-foreground">No receipts found</p>
              <p className="text-xs text-muted-foreground">No settled payments with issued OR numbers match your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map(r => {
                const mod = formatReceiptModuleLabel(r.document_type)
                const color = MODULE_COLOR[mod] ?? '#94a3b8'
                return (
                  <div
                    key={r.payment_id}
                    className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/40 gap-4 cursor-pointer transition-colors"
                    onClick={() => setSelected(r)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                        <ReceiptIcon size={16} style={{ color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-bold text-foreground">{r.digital_or_no}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground mt-0.5">
                          {r.person_name && <span className="flex items-center gap-1"><User size={11} />{r.person_name}</span>}
                          {r.payment_date && <span className="flex items-center gap-1"><Calendar size={11} />{r.payment_date}</span>}
                          <span className="flex items-center gap-1">
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: `${color}18`, color }}>{mod}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-bold text-foreground text-sm">₱{r.amount_paid.toLocaleString()}</span>
                      <MethodBadge method={r.payment_method} />
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal — premium card (see docs/premium-card-template.md) */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg border-none bg-transparent p-0 shadow-none sm:max-w-xl">
          {selected && (
            <div className="card-premium mx-auto w-full max-h-[min(90vh,720px)] max-w-full animate-in zoom-in-95 duration-300 overflow-y-auto sidebar-scrollbar">
              <div className="mb-6 space-y-2 pr-8 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {meta.label}
                  </Badge>
                  <Badge className="border border-emerald-500/25 bg-emerald-500/15 text-[9px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-100">
                    Digital OR
                  </Badge>
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                  Official receipt
                </DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {selected.digital_or_no}
                </DialogDescription>
              </div>

              <div className="admin-box group relative mb-6 overflow-hidden border-emerald-500/25 dark:border-emerald-500/20">
                <ReceiptIcon
                  className="pointer-events-none absolute right-4 top-4 h-14 w-14 text-emerald-500/[0.08] transition-transform duration-500 group-hover:scale-105 dark:text-emerald-400/[0.07]"
                  aria-hidden
                />
                <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ['OR number', selected.digital_or_no],
                    ['Applicant', selected.person_name ?? '—'],
                    ['Amount paid', `₱${selected.amount_paid.toLocaleString()}`],
                    ['Payment date', selected.payment_date ?? '—'],
                    ['Payment method', selected.payment_method ?? '—'],
                    ['Transaction ref', selected.transaction_ref_no ?? '—'],
                    ['Document ref', selected.document_ref_no ?? '—'],
                    ['Module', formatReceiptModuleLabel(selected.document_type)],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className={cn(
                        'rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-primary/25',
                        k === 'Document ref' || k === 'Module' ? 'sm:col-span-2' : '',
                      )}
                    >
                      <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{k}</p>
                      <div className="break-words text-sm font-bold text-foreground">{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/10 pt-6 dark:border-white/[0.06]">
                <Button
                  variant="secondary"
                  onClick={() => setSelected(null)}
                  className="h-11 rounded-xl px-8 text-[11px] font-extrabold uppercase tracking-widest"
                >
                  Close
                </Button>
                <Button
                  className="h-11 rounded-xl bg-primary px-8 text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground shadow-lg"
                  onClick={() => {
                    if (!selected) return
                    downloadParkOfficialReceiptPdf({
                      orNo: selected.digital_or_no,
                      payorName: selected.person_name ?? '—',
                      amountPaid: selected.amount_paid,
                      paymentDate: selected.payment_date,
                      paymentMethod: selected.payment_method,
                      transactionRef: selected.transaction_ref_no,
                      documentRef: selected.document_ref_no,
                      moduleLabel: formatReceiptModuleLabel(selected.document_type),
                      paymentRecordId: selected.payment_id,
                    })
                  }}
                >
                  <Download size={14} className="mr-2" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
