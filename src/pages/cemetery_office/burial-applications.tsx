import React, { useState } from 'react'
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, Plus } from 'lucide-react'
import type { OnlineBurialApplication } from '@/types'
import { clsx } from 'clsx'

const MOCK_APPLICATIONS: OnlineBurialApplication[] = [
    { application_id: 'BA-2024-045', applicant_person_id: 'p1', applicant_name: 'Pedro Bautista', deceased_name: 'Maria Bautista', date_of_death: '2024-02-28', death_certificate_no: 'DC-2024-0891', status: 'pending', created_at: '2024-02-28T10:00:00Z' },
    { application_id: 'BA-2024-044', applicant_person_id: 'p2', applicant_name: 'Jose Santos', deceased_name: 'Lolita Santos', date_of_death: '2024-02-25', death_certificate_no: 'DC-2024-0887', status: 'approved', created_at: '2024-02-25T14:00:00Z' },
    { application_id: 'BA-2024-043', applicant_person_id: 'p3', applicant_name: 'Ana Reyes', deceased_name: 'Ramon Reyes', date_of_death: '2024-02-22', death_certificate_no: 'DC-2024-0880', status: 'under_review', created_at: '2024-02-22T09:00:00Z' },
    { application_id: 'BA-2024-042', applicant_person_id: 'p4', applicant_name: 'Carlos Flores', deceased_name: 'Gloria Flores', date_of_death: '2024-02-20', death_certificate_no: 'DC-2024-0876', status: 'completed', created_at: '2024-02-20T11:00:00Z' },
    { application_id: 'BA-2024-041', applicant_person_id: 'p5', applicant_name: 'Maria Torres', deceased_name: 'Eduardo Torres', date_of_death: '2024-02-18', death_certificate_no: 'DC-2024-0872', status: 'rejected', created_at: '2024-02-18T08:00:00Z', notes: 'Incomplete documents' },
    { application_id: 'BA-2024-040', applicant_person_id: 'p6', applicant_name: 'Roberto Gonzalez', deceased_name: 'Perla Gonzalez', date_of_death: '2024-02-15', death_certificate_no: 'DC-2024-0868', status: 'pending', created_at: '2024-02-15T15:00:00Z' },
]

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-pending', under_review: 'badge-pending', approved: 'badge-approved',
    rejected: 'badge-rejected', completed: 'badge-completed',
}

export default function BurialApplications() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<OnlineBurialApplication | null>(null)

    const filtered = MOCK_APPLICATIONS.filter(a => {
        const matchSearch = a.applicant_name.toLowerCase().includes(search.toLowerCase())
            || a.deceased_name.toLowerCase().includes(search.toLowerCase())
            || a.application_id.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || a.status === statusFilter
        return matchSearch && matchStatus
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Burial Applications</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Online_Burial_Application — Incoming requests</p>
                </div>
                <button className="btn-primary self-start sm:self-auto">
                    <Plus size={15} /> New Application
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by applicant, deceased, or ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            {['Application ID', 'Applicant', 'Deceased', 'Date of Death', 'Death Cert. No.', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(app => (
                            <tr key={app.application_id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelected(app)}>
                                <td className="px-4 py-3 text-sm font-mono text-blue-400">{app.application_id}</td>
                                <td className="px-4 py-3 text-sm text-white">{app.applicant_name}</td>
                                <td className="px-4 py-3 text-sm text-slate-300">{app.deceased_name}</td>
                                <td className="px-4 py-3 text-sm text-slate-400">{new Date(app.date_of_death).toLocaleDateString('en-PH')}</td>
                                <td className="px-4 py-3 text-sm font-mono text-slate-400">{app.death_certificate_no ?? '—'}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[app.status]}`}>{app.status.replace('_', ' ')}</span>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="View"><Eye size={14} /></button>
                                        {app.status === 'pending' || app.status === 'under_review' ? (
                                            <>
                                                <button className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Approve"><CheckCircle size={14} /></button>
                                                <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors" title="Reject"><XCircle size={14} /></button>
                                            </>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-16 text-center text-slate-500">No records match your search.</div>
                )}
            </div>

            {/* Detail panel */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ border: '1px solid rgba(148,163,184,0.15)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-white text-lg">{selected.application_id}</h2>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Applicant', selected.applicant_name],
                                ['Deceased', selected.deceased_name],
                                ['Date of Death', new Date(selected.date_of_death).toLocaleDateString('en-PH')],
                                ['Death Certificate #', selected.death_certificate_no ?? '—'],
                                ['Status', selected.status],
                                ['Submitted', new Date(selected.created_at).toLocaleString('en-PH')],
                                ...(selected.notes ? [['Notes', selected.notes]] : []),
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</span>
                                    <span className="text-sm text-white">{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            {(selected.status === 'pending' || selected.status === 'under_review') && (
                                <>
                                    <button className="btn-success flex-1 justify-center"><CheckCircle size={14} /> Approve</button>
                                    <button className="btn-danger flex-1 justify-center"><XCircle size={14} /> Reject</button>
                                </>
                            )}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
