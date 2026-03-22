import React, { useState } from 'react'
import { Search, Plus, FileText, Download, Upload, Eye, User, Filter } from 'lucide-react'

interface BrgyDocument {
    id: string
    doc_no: string
    title: string
    type: 'resolution' | 'certificate' | 'permit' | 'clearance' | 'memo' | 'letter'
    for_name?: string
    filed_date: string
    filed_by: string
    status: 'draft' | 'filed' | 'released'
}

const DOC_TYPES = ['All', 'resolution', 'certificate', 'permit', 'clearance', 'memo', 'letter']
const DOC_COLOR: Record<string, string> = {
    resolution: '#a78bfa', certificate: '#34d399', permit: '#60a5fa',
    clearance: '#fbbf24', memo: '#fb923c', letter: '#e879f9',
}

const MOCK: BrgyDocument[] = [
    { id: 'DOC-041', doc_no: 'Res. No. 22-2024', title: 'Resolution Approving Community Hall Reservation', type: 'resolution', filed_date: '2024-03-05', filed_by: 'Sec. Reyes', status: 'filed' },
    { id: 'DOC-040', doc_no: 'CERT-0289', title: 'Barangay Clearance', type: 'clearance', for_name: 'Juan Santos', filed_date: '2024-03-05', filed_by: 'Sec. Reyes', status: 'released' },
    { id: 'DOC-039', doc_no: 'CERT-0288', title: 'Certificate of Residency', type: 'certificate', for_name: 'Maria Dela Cruz', filed_date: '2024-03-04', filed_by: 'Sec. Reyes', status: 'released' },
    { id: 'DOC-038', doc_no: 'PER-0045', title: 'Permit to Renovate — Blk 5 Lot 3', type: 'permit', for_name: 'Pedro Bautista', filed_date: '2024-03-04', filed_by: 'Sec. Reyes', status: 'filed' },
    { id: 'DOC-037', doc_no: 'MEMO-019', title: 'Memorandum on Prohibited Burning of Garbage', type: 'memo', filed_date: '2024-03-03', filed_by: 'Sec. Reyes', status: 'filed' },
    { id: 'DOC-036', doc_no: 'LTR-008', title: 'Letter to DSWD Re: Indigent Assistance Funding', type: 'letter', filed_date: '2024-03-02', filed_by: 'Sec. Reyes', status: 'draft' },
    { id: 'DOC-035', doc_no: 'Res. No. 21-2024', title: 'Resolution Endorsing Youth Leadership Program', type: 'resolution', filed_date: '2024-03-01', filed_by: 'Sec. Reyes', status: 'filed' },
    { id: 'DOC-034', doc_no: 'CERT-0287', title: 'Certificate of Indigency', type: 'certificate', for_name: 'Dolores Torres', filed_date: '2024-02-28', filed_by: 'Sec. Reyes', status: 'released' },
]

const STATUS_BADGE: Record<string, string> = {
    draft: 'badge-pending', filed: 'badge-completed', released: 'badge-approved',
}

export default function DocumentsFiling() {
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('All')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<BrgyDocument | null>(null)

    const filtered = MOCK.filter(d => {
        const q = search.toLowerCase()
        return (d.title.toLowerCase().includes(q) || d.doc_no.toLowerCase().includes(q) || (d.for_name ?? '').toLowerCase().includes(q))
            && (typeFilter === 'All' || d.type === typeFilter)
            && (statusFilter === 'all' || d.status === statusFilter)
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Barangay Documents</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Official records, certificates, permits & resolutions</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary"><Upload size={15} /> Upload</button>
                    <button className="btn-primary"><Plus size={15} /> New Document</button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                    { label: 'Draft', count: MOCK.filter(d => d.status === 'draft').length, color: '#fbbf24' },
                    { label: 'Filed', count: MOCK.filter(d => d.status === 'filed').length, color: '#93c5fd' },
                    { label: 'Released', count: MOCK.filter(d => d.status === 'released').length, color: '#34d399' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input className="input-field pl-9" placeholder="Search by title, doc no., or recipient…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="filed">Filed</option>
                    <option value="released">Released</option>
                </select>
            </div>

            {/* List */}
            <div className="space-y-2">
                {filtered.map(doc => (
                    <div
                        key={doc.id}
                        onClick={() => setSelected(doc)}
                        className="rounded-xl p-4 cursor-pointer transition-all card-hover flex items-center gap-4"
                        style={{ background: 'var(--color-card)', border: `1px solid ${DOC_COLOR[doc.type]}22` }}
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${DOC_COLOR[doc.type]}15` }}>
                            <FileText size={18} style={{ color: DOC_COLOR[doc.type] }} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-muted)' }}>{doc.doc_no}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${DOC_COLOR[doc.type]}18`, color: DOC_COLOR[doc.type] }}>{doc.type}</span>
                            </div>
                            <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.title}</div>
                            {doc.for_name && (
                                <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                    <User size={10} /> For: {doc.for_name}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[doc.status]}`}>{doc.status}</span>
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(doc.filed_date).toLocaleDateString('en-PH')}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={() => setSelected(doc)} title="View"><Eye size={14} /></button>
                            <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} title="Download"><Download size={14} /></button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selected.doc_no}</h2>
                            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }} className="text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Title', selected.title],
                                ['Type', selected.type],
                                ['Status', selected.status],
                                ...(selected.for_name ? [['For', selected.for_name]] : []),
                                ['Filed By', selected.filed_by],
                                ['Filed Date', new Date(selected.filed_date).toLocaleDateString('en-PH')],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                                    <span className="text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button className="btn-primary flex-1 justify-center"><Download size={14} /> Download</button>
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
