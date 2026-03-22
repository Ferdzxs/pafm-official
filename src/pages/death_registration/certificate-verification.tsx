import React, { useState, useEffect } from 'react'
import {
  Search, Loader2, CheckCircle2, Eye,
  AlertCircle, Stamp, Info, ListChecks
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { DialogPremiumInner, premiumDialogShellClasses } from '@/components/ui/dialog-premium'

interface VerifyApp {
  application_id: string
  submission_date: string
  application_status: string
  person: { full_name: string; address: string | null; contact_number: string | null }
  deceased: {
    full_name: string
    date_of_death: string
    death_certificate_no: string | null
    place_of_death: string | null
  }
}

const CHECKLIST = [
  { id: 'cert', label: 'Death Certificate properly filled and signed' },
  { id: 'physician', label: 'Attending physician information verified' },
  { id: 'cause', label: 'Cause of death clearly stated' },
  { id: 'identity', label: 'Deceased identity confirmed' },
  { id: 'date', label: 'Date and place of death matching records' },
  { id: 'applicant', label: 'Applicant is a verified relative / representative' },
]

export default function CertificateVerification() {
  const [apps, setApps] = useState<VerifyApp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<VerifyApp | null>(null)
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const [verifying, setVerifying] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { fetchApps() }, [])
  useEffect(() => { setCurrentPage(1) }, [search])

  async function fetchApps() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('online_burial_application')
        .select(`
          *,
          person:person_id(full_name, address, contact_number),
          deceased:deceased_id(full_name, date_of_death, death_certificate_no, place_of_death)
        `)
        .eq('document_validation_status', 'validated')
        .neq('application_status', 'verified')
        .neq('application_status', 'approved')
        .neq('application_status', 'rejected')
        .order('submission_date', { ascending: false })
      if (error) throw error
      setApps((data as any) || [])
    } catch (err: any) {
      toast.error('Failed to load verification queue: ' + (err?.message ?? String(err)))
    } finally {
      setLoading(false)
    }
  }

  function openSelected(app: VerifyApp) {
    setSelected(app)
    setChecks({})
  }

  async function handleVerify(appId: string, verdict: 'verified' | 'rejected') {
    const allChecked = CHECKLIST.every(c => checks[c.id])
    if (verdict === 'verified' && !allChecked) {
      toast.error('Please complete all checklist items before approving.')
      return
    }
    setVerifying(appId)
    try {
      const { error } = await supabase
        .from('online_burial_application')
        .update({ application_status: verdict })
        .eq('application_id', appId)
      if (error) throw error
      toast.success(verdict === 'verified'
        ? '✅ Application verified. Forwarded for final signing.'
        : '❌ Application rejected.')
      setSelected(null)
      fetchApps()
    } catch (err: any) {
      toast.error('Action failed: ' + err.message)
    } finally {
      setVerifying(null)
    }
  }

  const allChecked = CHECKLIST.every(c => checks[c.id])

  const filtered = apps.filter(a =>
    (a.deceased?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    a.application_id.toLowerCase().includes(search.toLowerCase()) ||
    (a.person?.full_name ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Stamp size={22} className="text-indigo-400" /> Certificate Verification
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and certify validated death registration applications</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search case or deceased…"
            className="input-field pl-9 text-sm w-full sm:w-72"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Queue Summary */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/15 mb-6">
        <Info size={18} className="text-indigo-400 shrink-0" />
        <p className="text-sm text-slate-300">
          Showing applications where documents have been <strong className="text-white">validated</strong> and are 
          awaiting final <strong className="text-white">technical verification</strong> by a CCRD officer.
        </p>
        <div className="ml-auto shrink-0">
          <span className="px-3 py-1 rounded-full text-sm font-bold bg-indigo-500/20 text-indigo-400">{apps.length} in queue</span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={32} />
          <p className="text-slate-500">Loading verification queue…</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/3">
                    {['App ID', 'Deceased', 'Date of Death', 'Applicant', 'Physician', 'Type', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(app => (
                    <tr
                      key={app.application_id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => openSelected(app)}
                    >
                      <td className="px-4 py-3.5 text-xs font-mono text-blue-400">{app.application_id}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{app.deceased?.full_name}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">
                        {app.deceased?.date_of_death
                          ? new Date(app.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-300">{app.person?.full_name}</td>
                      <td className="px-4 py-3.5">
                        {app.deceased?.death_certificate_no ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-[9px]">On File</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-[9px]">Missing</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="secondary" className="text-[9px]">Awaiting Eval</Badge>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <button
                          className="p-1.5 rounded-lg text-indigo-400 hover:bg-indigo-400/10 transition-colors"
                          onClick={() => openSelected(app)}
                          title="Verify"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <CheckCircle2 className="mx-auto mb-3 text-emerald-500/20" size={48} />
                <p className="text-slate-500 font-medium">No applications in the verification queue.</p>
              </div>
            )}
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Verification Modal — premium card (centered via shared Dialog) */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className={premiumDialogShellClasses('max-w-xl')}>
          <DialogPremiumInner className="flex max-h-[min(92vh,880px)] flex-col overflow-hidden p-0">
            <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/30 px-6 pb-4 pt-2 pr-12">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <Stamp size={24} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-foreground">{selected?.deceased?.full_name}</h2>
                  <p className="font-mono text-xs text-muted-foreground">{selected?.application_id}</p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sidebar-scrollbar">
              {selected && (
                <>
                  <div className="mb-6 grid grid-cols-2 gap-x-4 gap-y-3">
                    {[
                      [
                        'Date of Death',
                        selected.deceased?.date_of_death
                          ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                          : '—',
                      ],
                      ['Place of Death', selected.deceased?.place_of_death ?? '—'],
                      ['Death Cert #', selected.deceased?.death_certificate_no ?? 'Not provided'],
                      ['Applicant', selected.person?.full_name ?? '—'],
                      ['Contact', selected.person?.contact_number ?? '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
                        <span className="text-sm font-medium text-foreground">{value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4 rounded-xl border border-indigo-500/25 bg-muted/30 p-4 dark:border-indigo-500/20">
                    <p className="mb-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                      <ListChecks size={13} /> Verification Checklist
                    </p>
                    <div className="space-y-2.5">
                      {CHECKLIST.map(item => (
                        <label key={item.id} className="group flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={!!checks[item.id]}
                            onChange={e => setChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                            className="h-4 w-4 rounded accent-indigo-600 dark:accent-indigo-500"
                          />
                          <span
                            className={`text-sm transition-colors ${checks[item.id] ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80'}`}
                          >
                            {item.label}
                          </span>
                          {checks[item.id] && (
                            <CheckCircle2 size={14} className="ml-auto shrink-0 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </label>
                      ))}
                    </div>

                    <div
                      className={`mt-3 flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition-all ${
                        allChecked
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400'
                      }`}
                    >
                      {allChecked ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                      {allChecked
                        ? 'All items verified — ready to approve.'
                        : `${CHECKLIST.filter(c => !checks[c.id]).length} items remaining.`}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex shrink-0 gap-2 border-t border-border/60 bg-muted/20 px-6 py-4">
              <button
                type="button"
                disabled={!!verifying}
                onClick={() => selected && handleVerify(selected.application_id, 'rejected')}
                className="flex-1 rounded-xl border border-red-500/30 py-2.5 text-xs font-bold uppercase text-red-600 transition-all hover:bg-red-500/10 dark:text-red-400"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={!!verifying || !allChecked}
                onClick={() => selected && handleVerify(selected.application_id, 'verified')}
                className="flex-1 rounded-xl border border-indigo-500/30 bg-indigo-500/10 py-2.5 text-xs font-bold uppercase text-indigo-700 transition-all hover:bg-indigo-500/15 disabled:opacity-40 dark:text-indigo-300"
              >
                {verifying ? <Loader2 size={14} className="mx-auto animate-spin" /> : '✓ Approve Verification'}
              </button>
            </div>
          </DialogPremiumInner>
        </DialogContent>
      </Dialog>
    </div>
  )
}