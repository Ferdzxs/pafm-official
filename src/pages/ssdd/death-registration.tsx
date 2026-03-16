import React, { useState, useEffect } from 'react'
import {
  Search, Loader2, Activity, CheckCircle, Clock,
  AlertCircle, ExternalLink, X, ArrowRight, Shield, FileText
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface CoordRecord {
  application_id: string
  application_status: string
  submission_date: string
  deceased_id: string
  deceased: { full_name: string; date_of_death: string; death_certificate_no: string | null }
  person: { full_name: string }
  indigent_assistance_record: { assistance_id: string; status: string }[]
}

const STAGE_MAP: Record<string, { label: string; step: number; color: string }> = {
  pending: { label: 'Awaiting SSDD Eval', step: 1, color: 'text-amber-400' },
  ssdd_evaluated: { label: 'SSDD Approved → CCRD', step: 2, color: 'text-blue-400' },
  verified: { label: 'CCRD Verified', step: 3, color: 'text-indigo-400' },
  approved: { label: 'Permit Issued', step: 4, color: 'text-emerald-400' },
  completed: { label: 'Completed', step: 5, color: 'text-emerald-500' },
  rejected: { label: 'Rejected', step: 0, color: 'text-red-400' },
}

export default function DeathRegistrationInfoForSSDD() {
  const [records, setRecords] = useState<CoordRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selected, setSelected] = useState<CoordRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 10

  useEffect(() => { fetchCoordinationRecords() }, [])

  async function fetchCoordinationRecords() {
    setLoading(true)
    try {
      // Query 1: all burial applications with person + deceased
      const { data: appData, error: appErr } = await supabase
        .from('online_burial_application')
        .select(`
          application_id, application_status, submission_date, deceased_id,
          deceased:deceased_id(full_name, date_of_death, death_certificate_no),
          person:person_id(full_name)
        `)
        .order('submission_date', { ascending: false })
      if (appErr) throw appErr

      // Query 2: all IAR records (linked to deceased, not burial app)
      const { data: iarData, error: iarErr } = await supabase
        .from('indigent_assistance_record')
        .select('assistance_id, deceased_id, status')
      if (iarErr) throw iarErr

      // Merge by deceased_id
      const merged = (appData || []).map((app: any) => ({
        ...app,
        indigent_assistance_record: (iarData || []).filter(
          (iar: any) => iar.deceased_id === app.deceased_id
        ),
      }))

      setRecords(merged as any)
    } catch (err: any) {
      toast.error('Failed to load coordination data: ' + (err?.message ?? String(err)))
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(r =>
    (r.deceased?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.person?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const inProgress = records.filter(r => !['completed', 'rejected', 'approved'].includes(r.application_status)).length
  const completed = records.filter(r => ['completed', 'approved'].includes(r.application_status)).length
  const rejected = records.filter(r => r.application_status === 'rejected').length

  function StageTracker({ status }: { status: string }) {
    const stages = [
      { step: 1, label: 'SSDD Eval' },
      { step: 2, label: 'CCRD Intake' },
      { step: 3, label: 'Verification' },
      { step: 4, label: 'Permit Issued' },
    ]
    const current = STAGE_MAP[status]?.step ?? 0
    return (
      <div className="flex items-center gap-0">
        {stages.map((s, i) => (
          <React.Fragment key={s.step}>
            <div className={`flex flex-col items-center ${i > 0 ? '' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border transition-colors ${
                current >= s.step
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-600'
              }`}>
                {current > s.step ? '✓' : s.step}
              </div>
              <span className={`text-[9px] mt-1 font-bold ${current >= s.step ? 'text-blue-400' : 'text-slate-600'}`}>{s.label}</span>
            </div>
            {i < stages.length - 1 && (
              <div className={`h-px w-8 mb-3 mx-1 transition-colors ${current > s.step ? 'bg-blue-500' : 'bg-slate-700'}`} />
            )}
          </React.Fragment>
        ))}
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Shield size={22} className="text-blue-400" /> CCRD Coordination
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Track indigent burial cases through the Death Registration Division workflow</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search by case ID or name…"
            className="input-field pl-9 text-sm w-full sm:w-72"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'In Progress', value: inProgress, icon: Clock, color: 'text-blue-400' },
          { label: 'Completed', value: completed, icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Rejected', value: rejected, icon: AlertCircle, color: 'text-red-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={14} className={color} />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
            </div>
            <div className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</div>
          </div>
        ))}
      </div>

      {/* Cases */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-blue-500" size={32} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 glass rounded-2xl border border-slate-800">
          <Activity className="mx-auto mb-4 text-slate-700" size={40} />
          <p className="text-slate-500">No cases to coordinate.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {paginatedItems.map(r => {
            const stage = STAGE_MAP[r.application_status] ?? { label: r.application_status, color: 'text-slate-400' }
            const iar = r.indigent_assistance_record?.[0]
            return (
              <Card key={r.application_id} className="bg-slate-900/40 border-slate-800/50 card-hover">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-white font-bold text-base">{r.deceased?.full_name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500">{r.application_id}</span>
                            {r.indigent_assistance_record?.length > 0 && (
                              <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 border text-[9px]">Indigent</Badge>
                            )}
                          </div>
                        </div>
                        <span className={`text-xs font-bold ${stage.color}`}>{stage.label}</span>
                      </div>

                      <StageTracker status={r.application_status} />

                      <div className="mt-4 pt-4 border-t border-slate-800/50 grid grid-cols-2 gap-3 text-xs text-slate-400">
                        <div><span className="text-slate-500">Applicant: </span>{r.person?.full_name}</div>
                        <div><span className="text-slate-500">DOD: </span>{r.deceased?.date_of_death}</div>
                        <div><span className="text-slate-500">Submitted: </span>{r.submission_date}</div>
                        {iar && <div><span className="text-slate-500">IAR: </span><span className="text-emerald-400">{iar.assistance_id}</span></div>}
                      </div>
                    </div>

                    <div className="w-full md:w-48 bg-slate-900/60 border-t md:border-t-0 md:border-l border-slate-800/50 p-5 flex flex-col items-center justify-center gap-2">
                      {r.deceased?.death_certificate_no && (
                        <div className="text-center mb-2">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-0.5">Cert. #</p>
                          <p className="text-xs font-mono text-blue-400">{r.deceased.death_certificate_no}</p>
                        </div>
                      )}
                      <button onClick={() => setSelected(r)} className="btn-secondary py-1.5 text-xs w-full justify-center">
                        Details <ArrowRight size={12} className="ml-1" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-1">
          <p className="text-xs text-slate-500">
            Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} records
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-400 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-xs">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p as number)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                      safePage === p
                        ? 'gradient-primary text-white shadow'
                        : 'border border-white/10 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-slate-400 hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl w-full max-w-lg animate-fade-in border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.deceased?.full_name}</h2>
                <p className="text-xs font-mono text-slate-500">{selected.application_id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Applicant', selected.person?.full_name ?? '—'],
                ['Date of Death', selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'],
                ['Death Certificate #', selected.deceased?.death_certificate_no ?? 'Pending'],
                ['Submitted', new Date(selected.submission_date).toLocaleDateString('en-PH', { dateStyle: 'long' })],
                ['Application Status', (STAGE_MAP[selected.application_status]?.label ?? selected.application_status)],
                ['IAR ID', selected.indigent_assistance_record?.[0]?.assistance_id ?? 'Not created'],
                ['IAR Status', selected.indigent_assistance_record?.[0]?.status ?? 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">{label}</span>
                  <span className="text-sm text-white font-medium text-right max-w-[55%]">{value}</span>
                </div>
              ))}
              <div className="mt-4">
                <StageTracker status={selected.application_status} />
              </div>
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setSelected(null)} className="btn-secondary w-full justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
