import React, { useState } from 'react'
import { Search, User, Phone, MapPin, Eye, CheckCircle } from 'lucide-react'

interface ConstituentRecord {
    id: string
    full_name: string
    purok: string
    contact: string
    registered_voter: boolean
    indigent: boolean
    senior_citizen: boolean
    tags: string[]
}

const MOCK: ConstituentRecord[] = [
    { id: 'CR-001', full_name: 'Juan Santos Dela Cruz', purok: 'Purok 1', contact: '09171234567', registered_voter: true, indigent: false, senior_citizen: false, tags: ['NHTS'] },
    { id: 'CR-002', full_name: 'Maria Isabel Reyes', purok: 'Purok 2', contact: '09281234567', registered_voter: true, indigent: true, senior_citizen: false, tags: ['4Ps', 'Indigent'] },
    { id: 'CR-003', full_name: 'Pedro Santiago Bautista', purok: 'Purok 1', contact: '09501234567', registered_voter: true, indigent: false, senior_citizen: true, tags: ['Senior', 'OSY'] },
    { id: 'CR-004', full_name: 'Lolita Torres Gonzalez', purok: 'Purok 3', contact: '09181234567', registered_voter: false, indigent: true, senior_citizen: false, tags: ['Indigent'] },
    { id: 'CR-005', full_name: 'Roberto Aquino Flores', purok: 'Purok 2', contact: '09271234567', registered_voter: true, indigent: false, senior_citizen: true, tags: ['Senior'] },
    { id: 'CR-006', full_name: 'Ana Clara Villanueva', purok: 'Purok 4', contact: '09361234567', registered_voter: true, indigent: false, senior_citizen: false, tags: [] },
    { id: 'CR-007', full_name: 'Eduardo Marcos Ramos', purok: 'Purok 3', contact: '09451234567', registered_voter: true, indigent: false, senior_citizen: false, tags: ['PWD'] },
    { id: 'CR-008', full_name: 'Rosa Divina Castillo', purok: 'Purok 1', contact: '09561234567', registered_voter: false, indigent: true, senior_citizen: true, tags: ['Indigent', 'Senior'] },
]

const PUROKS = ['All', 'Purok 1', 'Purok 2', 'Purok 3', 'Purok 4']

export default function ConstituentRecords() {
    const [search, setSearch] = useState('')
    const [purok, setPurok] = useState('All')
    const [selected, setSelected] = useState<ConstituentRecord | null>(null)

    const filtered = MOCK.filter(r => {
        const q = search.toLowerCase()
        return (r.full_name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
            && (purok === 'All' || r.purok === purok)
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Constituent Records</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Barangay database of registered constituents</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                    { label: 'Total Constituents', value: MOCK.length, color: '#e879f9' },
                    { label: 'Registered Voters', value: MOCK.filter(r => r.registered_voter).length, color: '#60a5fa' },
                    { label: 'Indigent Households', value: MOCK.filter(r => r.indigent).length, color: '#fbbf24' },
                    { label: 'Senior Citizens', value: MOCK.filter(r => r.senior_citizen).length, color: '#34d399' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input className="input-field pl-9" placeholder="Search by name or record ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={purok} onChange={e => setPurok(e.target.value)}>
                    {PUROKS.map(p => <option key={p}>{p}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-hover)' }}>
                            {['Constituent', 'Purok', 'Contact', 'Voter', 'Tags', 'Actions'].map(h => (
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
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">{rec.full_name.charAt(0)}</div>
                                        <div>
                                            <div className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{rec.full_name}</div>
                                            <div className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>{rec.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                                    <div className="flex items-center gap-1"><MapPin size={11} />{rec.purok}</div>
                                </td>
                                <td className="px-4 py-3 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                                    <div className="flex items-center gap-1"><Phone size={11} />{rec.contact}</div>
                                </td>
                                <td className="px-4 py-3">
                                    {rec.registered_voter
                                        ? <CheckCircle size={14} className="text-emerald-400" />
                                        : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex flex-wrap gap-1">
                                        {rec.indigent && <span className="text-[10px] px-1.5 py-0.5 rounded-full badge-pending">Indigent</span>}
                                        {rec.senior_citizen && <span className="text-[10px] px-1.5 py-0.5 rounded-full badge-completed">Senior</span>}
                                        {rec.tags.filter(t => t !== 'Indigent' && t !== 'Senior').map(t => (
                                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-bg-hover)', color: 'var(--color-text-muted)' }}>{t}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={() => setSelected(rec)}><Eye size={14} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-md animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selected.id}</h2>
                            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }} className="text-xl">✕</button>
                        </div>
                        <div className="flex items-center gap-4 mb-5">
                            <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center text-white text-2xl font-bold">{selected.full_name.charAt(0)}</div>
                            <div>
                                <div className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{selected.full_name}</div>
                                <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{selected.purok}</div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Contact', selected.contact],
                                ['Registered Voter', selected.registered_voter ? 'Yes' : 'No'],
                                ['Indigent', selected.indigent ? 'Yes' : 'No'],
                                ['Senior Citizen', selected.senior_citizen ? 'Yes' : 'No'],
                                ['Tags', selected.tags.join(', ') || 'None'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                                    <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <button className="btn-secondary w-full justify-center mt-5" onClick={() => setSelected(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    )
}
