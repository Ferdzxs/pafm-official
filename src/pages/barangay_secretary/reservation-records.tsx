import React, { useState } from 'react'
import { Search, Plus, CheckCircle, XCircle, Clock, Eye, Building2, Calendar } from 'lucide-react'
import { Link } from 'react-router-dom'

interface ReservationRecord {
    id: string
    facility: string
    applicant: string
    purpose: string
    event_date: string
    status: 'pending' | 'forwarded' | 'approved' | 'rejected' | 'completed'
    filed_by: string
    created_at: string
    notes?: string
}

const MOCK: ReservationRecord[] = [
    { id: 'REC-2024-028', facility: 'Multi-Purpose Hall A', applicant: 'Juan dela Cruz', purpose: 'Community Association Meeting', event_date: '2024-03-10', status: 'pending', filed_by: 'Brgy. Secretary', created_at: '2024-03-05T08:00:00Z' },
    { id: 'REC-2024-027', facility: 'Covered Court', applicant: 'Maria Santos', purpose: 'School Graduation Practice', event_date: '2024-03-08', status: 'approved', filed_by: 'Brgy. Secretary', created_at: '2024-03-03T14:00:00Z' },
    { id: 'REC-2024-026', facility: 'Basketball Court', applicant: 'PNP QC District 5', purpose: 'Basketball Tournament', event_date: '2024-03-15', status: 'forwarded', filed_by: 'Brgy. Secretary', created_at: '2024-03-02T10:00:00Z' },
    { id: 'REC-2024-025', facility: 'Barangay Center Stage', applicant: 'QC Cultural Affairs', purpose: 'Cultural Festival', event_date: '2024-03-20', status: 'approved', filed_by: 'Brgy. Secretary', created_at: '2024-03-01T09:00:00Z' },
    { id: 'REC-2024-024', facility: 'Multi-Purpose Hall B', applicant: 'Senior Citizens Assoc.', purpose: 'Monthly General Assembly', event_date: '2024-03-07', status: 'completed', filed_by: 'Brgy. Secretary', created_at: '2024-02-28T11:00:00Z' },
    { id: 'REC-2024-023', facility: 'Covered Court', applicant: 'Brgy. Youth Council', purpose: 'Youth Sports Festival', event_date: '2024-02-25', status: 'rejected', filed_by: 'Brgy. Secretary', created_at: '2024-02-22T08:00:00Z', notes: 'Conflict with existing booking' },
]

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-pending', forwarded: 'badge-pending', approved: 'badge-approved',
    rejected: 'badge-rejected', completed: 'badge-completed',
}

const STATUS_OPTIONS = ['all', 'pending', 'forwarded', 'approved', 'rejected', 'completed']

export default function BarangaySecretaryReservationRecords() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<ReservationRecord | null>(null)

    const filtered = MOCK.filter(r => {
        const q = search.toLowerCase()
        return (r.id.toLowerCase().includes(q) || r.applicant.toLowerCase().includes(q) || r.facility.toLowerCase().includes(q))
            && (statusFilter === 'all' || r.status === statusFilter)
    })

    return (
        <div className="p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Barangay Reservations</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Barangay_Reservation_Record — Filed & forwarded requests</p>
                </div>
                <button className="btn-primary"><Plus size={15} /> New Record</button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                    { label: 'Pending Approval', count: MOCK.filter(r => r.status === 'pending').length, color: '#fbbf24' },
                    { label: 'Forwarded', count: MOCK.filter(r => r.status === 'forwarded').length, color: '#60a5fa' },
                    { label: 'Approved', count: MOCK.filter(r => r.status === 'approved').length, color: '#34d399' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input className="input-field pl-9" placeholder="Search by ID, applicant or facility…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-hover)' }}>
                                {['Rec. ID', 'Facility', 'Applicant', 'Purpose', 'Event Date', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(rec => (
                                <tr key={rec.id} className="transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--color-border)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-hover)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    onClick={() => setSelected(rec)}>
                                    <td className="px-4 py-3 text-sm font-mono" style={{ color: '#e879f9' }}>{rec.id}</td>
                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-primary)' }}>
                                        <div className="flex items-center gap-2"><Building2 size={13} style={{ color: 'var(--color-text-muted)' }} /> {rec.facility}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{rec.applicant}</td>
                                    <td className="px-4 py-3 text-sm max-w-[180px] truncate" style={{ color: 'var(--color-text-muted)' }}>{rec.purpose}</td>
                                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                        <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(rec.event_date).toLocaleDateString('en-PH')}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[rec.status]}`}>{rec.status}</span>
                                    </td>
                                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center gap-1">
                                            <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={() => setSelected(rec)} title="View"><Eye size={14} /></button>
                                            {(rec.status === 'pending') && <>
                                                <button className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors" title="Forward to PB"><CheckCircle size={14} /></button>
                                                <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors" title="Reject"><XCircle size={14} /></button>
                                            </>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>No records match your search.</div>
                )}
            </div>

            {/* Detail Modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selected.id}</h2>
                            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }} className="text-xl hover:opacity-80">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Facility', selected.facility],
                                ['Applicant', selected.applicant],
                                ['Purpose', selected.purpose],
                                ['Event Date', new Date(selected.event_date).toLocaleDateString('en-PH')],
                                ['Status', selected.status],
                                ['Filed By', selected.filed_by],
                                ['Submitted', new Date(selected.created_at).toLocaleString('en-PH')],
                                ...(selected.notes ? [['Notes', selected.notes]] : []),
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                                    <span className="text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            {selected.status === 'pending' && <>
                                <button className="btn-success flex-1 justify-center"><CheckCircle size={14} /> Forward to PB</button>
                                <button className="btn-danger flex-1 justify-center"><XCircle size={14} /> Reject</button>
                            </>}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
