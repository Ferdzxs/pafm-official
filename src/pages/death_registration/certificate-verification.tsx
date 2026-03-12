import React, { useState, useEffect } from 'react'
import {
  Search, Loader2, CheckCircle2, X, Eye,
  AlertCircle, Stamp, Info, ListChecks
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'

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

      {/* Verification Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl w-full max-w-xl animate-fade-in border border-white/10 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Stamp size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.deceased?.full_name}</h2>
                  <p className="text-xs font-mono text-slate-500">{selected.application_id}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Details */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-6">
                {[
                  ['Date of Death', selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'],
                  ['Place of Death', selected.deceased?.place_of_death ?? '—'],
                  ['Death Cert #', selected.deceased?.death_certificate_no ?? 'Not provided'],
                  ['Applicant', selected.person?.full_name ?? '—'],
                  ['Contact', selected.person?.contact_number ?? '—'],
                ].map(([label, value]) => (
                  <div key={label} className="flex flex-col">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">{label}</span>
                    <span className="text-sm text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Verification Checklist */}
              <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-4 mb-4">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <ListChecks size={13} /> Verification Checklist
                </p>
                <div className="space-y-2.5">
                  {CHECKLIST.map(item => (
                    <label key={item.id} className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={!!checks[item.id]}
                        onChange={e => setChecks(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        className="w-4 h-4 rounded accent-indigo-500"
                      />
                      <span className={`text-sm transition-colors ${checks[item.id] ? 'text-white' : 'text-slate-500 group-hover:text-slate-400'}`}>
                        {item.label}
                      </span>
                      {checks[item.id] && <CheckCircle2 size={14} className="text-emerald-400 ml-auto shrink-0" />}
                    </label>
                  ))}
                </div>

                <div className={`mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                  allChecked ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}>
                  {allChecked ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {allChecked ? 'All items verified — ready to approve.' : `${CHECKLIST.filter(c => !checks[c.id]).length} items remaining.`}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-0 flex gap-2 shrink-0 border-t border-white/5">
              <button
                disabled={!!verifying}
                onClick={() => handleVerify(selected.application_id, 'rejected')}
                className="flex-1 py-2.5 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold uppercase"
              >
                Reject
              </button>
              <button
                disabled={!!verifying || !allChecked}
                onClick={() => handleVerify(selected.application_id, 'verified')}
                className="flex-1 py-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all disabled:opacity-40 text-xs font-bold uppercase"
              >
                {verifying ? <Loader2 size={14} className="animate-spin mx-auto" /> : '✓ Approve Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
