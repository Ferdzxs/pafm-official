import React, { useState, useEffect } from 'react'
import {
  Search, Loader2, FileText, CheckCircle2, XCircle, AlertCircle,
  Inbox, ShieldCheck, X, ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'

interface BurialApp {
  application_id: string
  submission_date: string
  document_validation_status: string
  application_status: string
  deceased_id: string
  doc_death_cert_url: string | null
  doc_medical_cert_url: string | null
  doc_embalming_cert_url: string | null
  doc_valid_id_url: string | null
  doc_proof_relationship_url: string | null
  person: { full_name: string; contact_number: string | null }
  deceased: {
    full_name: string
    date_of_death: string
    death_certificate_no: string | null
    place_of_death: string | null
    age_at_death: number | null
    last_name: string | null
    first_name: string | null
    middle_name: string | null
  }
  indigent_assistance_record: { status: string; digital_cert_of_guarantee_url: string | null }[]
}

export default function ReceivedDocuments() {
  const [apps, setApps] = useState<BurialApp[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [validationFilter, setValidationFilter] = useState<'all' | 'pending' | 'validated' | 'rejected'>('all')
  const [selected, setSelected] = useState<BurialApp | null>(null)
  const [validating, setValidating] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { fetchIncomingDocs() }, [])
  useEffect(() => { setCurrentPage(1) }, [searchTerm, validationFilter])

  async function fetchIncomingDocs() {
    setLoading(true)
    try {
      // Query 1: burial applications
      const { data: appData, error: appErr } = await supabase
        .from('online_burial_application')
        .select(`
          application_id, submission_date, document_validation_status, application_status, deceased_id,
          doc_death_cert_url, doc_medical_cert_url, doc_embalming_cert_url, doc_valid_id_url, doc_proof_relationship_url,
          person:person_id(full_name, contact_number),
          deceased:deceased_id(full_name, date_of_death, death_certificate_no, place_of_death, age_at_death, last_name, first_name, middle_name)
        `)
        .order('submission_date', { ascending: false })
      if (appErr) throw appErr

      // Query 2: IAR records (linked to deceased, not application)
      const { data: iarData, error: iarErr } = await supabase
        .from('indigent_assistance_record')
        .select('deceased_id, status, digital_cert_of_guarantee_url')
      if (iarErr) throw iarErr

      // Merge by deceased_id
      const merged = (appData || []).map((app: Record<string, unknown>) => ({
        ...app,
        indigent_assistance_record: (iarData || []).filter(
          (iar: Record<string, unknown>) => iar.deceased_id === app.deceased_id
        ),
      }))

      setApps(merged as unknown as BurialApp[])
    } catch (err: unknown) {
      toast.error('Failed to load incoming documents: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  async function handleValidate(appId: string, status: 'validated' | 'rejected') {
    setValidating(appId)
    try {
      const { error } = await supabase
        .from('online_burial_application')
        .update({
          document_validation_status: status,
          application_status: status === 'validated' ? 'pending' : 'rejected',
        })
        .eq('application_id', appId)
      if (error) throw error
      toast.success(status === 'validated' ? '✅ Documents validated. Forwarded to verification.' : '❌ Documents rejected. Applicant notified.')
      setSelected(null)
      fetchIncomingDocs()
    } catch (err: unknown) {
      toast.error('Validation failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setValidating(null)
    }
  }

  const filtered = apps.filter(a => {
    const matchSearch =
      (a.deceased?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.application_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.person?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchFilter = validationFilter === 'all' || a.document_validation_status === validationFilter
    return matchSearch && matchFilter
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const counts = {
    pending: apps.filter(a => a.document_validation_status === 'pending').length,
    validated: apps.filter(a => a.document_validation_status === 'validated').length,
    rejected: apps.filter(a => a.document_validation_status === 'rejected').length,
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Inbox size={22} className="text-blue-400" /> Document Intake
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Review and validate incoming death registration documents</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search case or deceased…"
            className="input-field pl-9 text-sm w-full sm:w-72"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats + Filter Tabs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { key: 'pending', label: 'Pending Review', value: counts.pending, color: 'text-amber-400' },
          { key: 'validated', label: 'Validated', value: counts.validated, color: 'text-emerald-400' },
          { key: 'rejected', label: 'Rejected', value: counts.rejected, color: 'text-red-400' },
        ].map(({ key, label, value, color }) => (
          <button
            key={key}
            onClick={() => setValidationFilter(validationFilter === key ? 'all' : key as 'pending' | 'validated' | 'rejected')}
            className={`glass rounded-xl p-4 border text-left transition-all ${
              validationFilter === key ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-white/5 hover:border-white/15'
            }`}
          >
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
          <p className="text-slate-500 font-medium font-mono text-xs">Awaiting Intake Stream…</p>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5 bg-white/3">
                    {['App ID', 'Deceased', 'Date of Death', 'Applicant', 'Death Cert #', 'Type', 'Doc Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(app => (
                    <tr
                      key={app.application_id}
                      className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => setSelected(app)}
                    >
                      <td className="px-4 py-3.5 text-xs font-mono text-blue-400">{app.application_id}</td>
                      <td className="px-4 py-3.5 text-sm font-semibold text-white">{app.deceased?.full_name}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-400">
                        {app.deceased?.date_of_death
                          ? new Date(app.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' })
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-300">{app.person?.full_name}</td>
                      <td className="px-4 py-3.5 text-xs font-mono text-slate-500">{app.deceased?.death_certificate_no ?? '—'}</td>
                      <td className="px-4 py-3.5">
                        {app.indigent_assistance_record?.length > 0 ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-[9px]">Indigent</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Regular</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {app.document_validation_status === 'validated' ? (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border text-[9px]">Validated</Badge>
                        ) : app.document_validation_status === 'rejected' ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/20 border text-[9px]">Rejected</Badge>
                        ) : (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 border text-[9px]">Pending</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {app.document_validation_status === 'pending' && (
                          <div className="flex gap-1">
                            <button
                              disabled={validating === app.application_id}
                              onClick={() => handleValidate(app.application_id, 'rejected')}
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                              title="Reject"
                            >
                              <XCircle size={15} />
                            </button>
                            <button
                              disabled={validating === app.application_id}
                              onClick={() => handleValidate(app.application_id, 'validated')}
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                              title="Validate"
                            >
                              {validating === app.application_id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                            </button>
                          </div>
                        )}
                        {app.document_validation_status !== 'pending' && (
                          <button onClick={() => setSelected(app)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                            <ArrowRight size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <AlertCircle className="mx-auto mb-3 text-slate-600" size={32} />
                <p className="text-slate-500">No records match the current filter.</p>
              </div>
            )}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
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
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.deceased?.full_name}</h2>
                  <p className="text-xs font-mono text-slate-500">{selected.application_id}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-3">
              {[
                ['Date of Death', selected.deceased?.date_of_death
                  ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' })
                  : '—'],
                ['Age at Death', selected.deceased?.age_at_death != null ? `${selected.deceased.age_at_death} yrs` : '—'],
                ['Place of Death', selected.deceased?.place_of_death ?? '—'],
                ['Death Certificate #', selected.deceased?.death_certificate_no ?? 'Not provided'],
                ['Applicant', selected.person?.full_name ?? '—'],
                ['Contact', selected.person?.contact_number ?? '—'],
                ['Submitted', new Date(selected.submission_date).toLocaleDateString('en-PH', { dateStyle: 'long' })],
                ['Case Type', selected.indigent_assistance_record?.length > 0 ? 'Indigent Path (SSDD Assisted)' : 'Regular Path'],
                ['Doc Validation', selected.document_validation_status.toUpperCase()],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">{label}</span>
                  <span className="text-sm text-white font-medium text-right max-w-[55%]">{value}</span>
                </div>
              ))}

              {/* Burial Requirements Links */}
              <div className="pt-2">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wide block mb-3">Uploaded Requirements</span>
                <div className="space-y-2">
                  {[
                    { label: 'Certificate of Death', url: selected.doc_death_cert_url },
                    { label: 'Transfer or Entrance Permit', url: selected.doc_medical_cert_url },
                    { label: 'Affidavit of Undertaking', url: selected.doc_embalming_cert_url },
                    { label: 'Valid ID (Informant / Authorized Person)', url: selected.doc_valid_id_url },
                    { label: 'Burial Form (QC Health Dept)', url: selected.doc_proof_relationship_url },
                  ].map(req => req.url ? (
                    <a
                      key={req.label}
                      href={req.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-300 group-hover:text-white transition-colors">
                        <FileText size={16} className="text-blue-400" /> {req.label}
                      </span>
                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded">View</span>
                    </a>
                  ) : (
                    <div key={req.label} className="flex items-center justify-between p-2.5 rounded-lg border border-white/5 bg-transparent opacity-50">
                      <span className="flex items-center gap-2 text-sm text-slate-500">
                        <XCircle size={16} /> {req.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">N/A</span>
                    </div>
                  ))}
                </div>
              </div>

              {selected.indigent_assistance_record?.[0]?.digital_cert_of_guarantee_url && (
                <a
                  href={selected.indigent_assistance_record[0].digital_cert_of_guarantee_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-bold border border-emerald-500/20 justify-center"
                >
                  <ShieldCheck size={14} /> Certificate of Guarantee (SSDD)
                </a>
              )}

              {selected.document_validation_status === 'pending' && (
                <div className="flex gap-2 mt-4 pt-2">
                  <button
                    disabled={!!validating}
                    onClick={() => handleValidate(selected.application_id, 'rejected')}
                    className="flex-1 py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold uppercase"
                  >
                    {validating ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Deny Documents'}
                  </button>
                  <button
                    disabled={!!validating}
                    onClick={() => handleValidate(selected.application_id, 'validated')}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase"
                  >
                    {validating ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Validate & Forward'}
                  </button>
                </div>
              )}
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