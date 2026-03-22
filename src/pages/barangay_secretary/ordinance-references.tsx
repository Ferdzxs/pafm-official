import React, { useState } from 'react'
import { Search, Plus, FileText, Download, Eye, Tag } from 'lucide-react'

interface Ordinance {
    id: string
    ordinance_no: string
    title: string
    category: string
    date_enacted: string
    status: 'active' | 'amended' | 'repealed'
    summary: string
}

const CATEGORIES = ['All', 'Public Order', 'Health & Sanitation', 'Environment', 'Finance', 'Social Welfare', 'Zoning', 'Youth & Sports']

const MOCK_ORDINANCES: Ordinance[] = [
    { id: 'ORD-001', ordinance_no: 'Ord. No. 34 s.2024', title: 'Anti-Noise Pollution Ordinance', category: 'Public Order', date_enacted: '2024-01-15', status: 'active', summary: 'Regulates noise levels in residential and commercial areas from 10PM to 6AM.' },
    { id: 'ORD-002', ordinance_no: 'Ord. No. 33 s.2023', title: 'Solid Waste Segregation Ordinance', category: 'Environment', date_enacted: '2023-09-01', status: 'active', summary: 'Mandates waste segregation at source for all households and establishments.' },
    { id: 'ORD-003', ordinance_no: 'Ord. No. 32 s.2023', title: 'Senior Citizens Welfare Ordinance Amendment', category: 'Social Welfare', date_enacted: '2023-07-20', status: 'amended', summary: 'Amendment to Ord. 28 expanding benefits to include monthly stipend increase.' },
    { id: 'ORD-004', ordinance_no: 'Ord. No. 31 s.2023', title: 'Youth Sports Development Fund Ordinance', category: 'Youth & Sports', date_enacted: '2023-05-10', status: 'active', summary: 'Allocates 5% of barangay budget to youth sports programs and equipment.' },
    { id: 'ORD-005', ordinance_no: 'Ord. No. 30 s.2023', title: 'Mobile Vendor Regulation Ordinance', category: 'Public Order', date_enacted: '2023-03-15', status: 'active', summary: 'Designates specific zones and hours for ambulant vendors within the barangay.' },
    { id: 'ORD-006', ordinance_no: 'Ord. No. 29 s.2022', title: 'COVID-19 Community Health Protocol', category: 'Health & Sanitation', date_enacted: '2022-11-20', status: 'repealed', summary: 'Repealed following the lifting of the public health emergency declaration.' },
    { id: 'ORD-007', ordinance_no: 'Ord. No. 28 s.2022', title: 'Senior Citizens Welfare Ordinance', category: 'Social Welfare', date_enacted: '2022-08-05', status: 'amended', summary: 'Original ordinance for senior citizen assistance programs and privileges.' },
    { id: 'ORD-008', ordinance_no: 'Ord. No. 27 s.2022', title: 'Barangay Income Generation Ordinance', category: 'Finance', date_enacted: '2022-06-10', status: 'active', summary: 'Authorizes fee collection for barangay facilities and services.' },
]

const STATUS_BADGE: Record<string, string> = {
    active: 'badge-active', amended: 'badge-pending', repealed: 'badge-rejected',
}
const STATUS_COLOR: Record<string, string> = {
    active: '#34d399', amended: '#fbbf24', repealed: '#f87171',
}

export default function OrdinanceReferences() {
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('All')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<Ordinance | null>(null)

    const filtered = MOCK_ORDINANCES.filter(o => {
        const q = search.toLowerCase()
        return (o.title.toLowerCase().includes(q) || o.ordinance_no.toLowerCase().includes(q))
            && (category === 'All' || o.category === category)
            && (statusFilter === 'all' || o.status === statusFilter)
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Ordinance References</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Brgy. Ordinances — Complete legislative reference</p>
                </div>
                <button className="btn-primary"><Plus size={15} /> Add Ordinance</button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                    { label: 'Active', count: MOCK_ORDINANCES.filter(o => o.status === 'active').length, color: '#34d399' },
                    { label: 'Amended', count: MOCK_ORDINANCES.filter(o => o.status === 'amended').length, color: '#fbbf24' },
                    { label: 'Repealed', count: MOCK_ORDINANCES.filter(o => o.status === 'repealed').length, color: '#f87171' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label} Ordinances</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input className="input-field pl-9" placeholder="Search ordinances…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={category} onChange={e => setCategory(e.target.value)}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="amended">Amended</option>
                    <option value="repealed">Repealed</option>
                </select>
            </div>

            {/* Card grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(ord => (
                    <div
                        key={ord.id}
                        className="rounded-xl p-5 cursor-pointer transition-all card-hover"
                        style={{ background: 'var(--color-card)', border: `1px solid ${STATUS_COLOR[ord.status]}22` }}
                        onClick={() => setSelected(ord)}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${STATUS_COLOR[ord.status]}15` }}>
                                    <FileText size={14} style={{ color: STATUS_COLOR[ord.status] }} />
                                </div>
                                <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-muted)' }}>{ord.ordinance_no}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[ord.status]}`}>{ord.status}</span>
                        </div>
                        <h3 className="text-sm font-semibold mb-2 leading-snug" style={{ color: 'var(--color-text-primary)' }}>{ord.title}</h3>
                        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{ord.summary}</p>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>
                                <Tag size={9} className="inline mr-1" />{ord.category}
                            </span>
                            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>Enacted: {new Date(ord.date_enacted).toLocaleDateString('en-PH')}</span>
                        </div>
                    </div>
                ))}
            </div>
            {filtered.length === 0 && (
                <div className="py-16 text-center" style={{ color: 'var(--color-text-muted)' }}>No ordinances match your search.</div>
            )}

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selected.ordinance_no}</h2>
                            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }} className="text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Title', selected.title],
                                ['Category', selected.category],
                                ['Status', selected.status],
                                ['Date Enacted', new Date(selected.date_enacted).toLocaleDateString('en-PH')],
                                ['Summary', selected.summary],
                            ].map(([l, v]) => (
                                <div key={l} className="py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>{l}</div>
                                    <div className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{v}</div>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button className="btn-primary flex-1 justify-center"><Download size={14} /> Download PDF</button>
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
