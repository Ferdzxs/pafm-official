import React, { useState } from 'react'
import type { NicheRecord } from '@/types'
import { clsx } from 'clsx'

type NicheStatus = 'available' | 'occupied' | 'reserved' | 'maintenance'

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']
const NICHES_PER_SECTION = 20

function generateNiches(): NicheRecord[] {
    const niches: NicheRecord[] = []
    const statuses: NicheStatus[] = ['available', 'available', 'available', 'occupied', 'occupied', 'reserved', 'maintenance']
    SECTIONS.forEach(sec => {
        for (let i = 1; i <= NICHES_PER_SECTION; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)]
            niches.push({
                niche_id: `N-${sec}-${String(i).padStart(2, '0')}`,
                cemetery_id: 'CEM-001',
                niche_number: String(i).padStart(2, '0'),
                section: sec,
                status,
                occupant_name: status === 'occupied' ? 'Deceased Record' : undefined,
            })
        }
    })
    return niches
}

const NICHES = generateNiches()

const STATUS_COLOR: Record<NicheStatus, string> = {
    available: '#34d399',
    occupied: '#f87171',
    reserved: '#fbbf24',
    maintenance: '#94a3b8',
}

export default function NicheManagement() {
    const [selectedSection, setSelectedSection] = useState('A')
    const [selected, setSelected] = useState<NicheRecord | null>(null)

    const sectionNiches = NICHES.filter(n => n.section === selectedSection)
    const counts = {
        available: NICHES.filter(n => n.status === 'available').length,
        occupied: NICHES.filter(n => n.status === 'occupied').length,
        reserved: NICHES.filter(n => n.status === 'reserved').length,
        maintenance: NICHES.filter(n => n.status === 'maintenance').length,
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Niche Management</h1>
                <p className="text-slate-400 text-sm mt-0.5">Niche_Record — Cemetery occupancy overview</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {(Object.entries(counts) as [NicheStatus, number][]).map(([status, count]) => (
                    <div key={status} className="glass rounded-xl p-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                            <span className="text-xs text-slate-400 capitalize font-medium">{status}</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{count}</div>
                    </div>
                ))}
            </div>

            {/* Section selector */}
            <div className="flex gap-2 mb-5">
                {SECTIONS.map(sec => (
                    <button
                        key={sec}
                        onClick={() => setSelectedSection(sec)}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                            selectedSection === sec ? 'gradient-primary text-white' : 'glass text-slate-400 hover:text-white'
                        )}
                    >
                        Section {sec}
                    </button>
                ))}
            </div>

            {/* Grid */}
            <div className="glass rounded-2xl p-5" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <h2 className="font-semibold text-white mb-4 text-sm">Section {selectedSection} — {NICHES_PER_SECTION} Niches</h2>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                    {sectionNiches.map(niche => (
                        <button
                            key={niche.niche_id}
                            onClick={() => setSelected(niche)}
                            title={`${niche.niche_id} — ${niche.status}`}
                            className="aspect-square rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:scale-110 hover:z-10"
                            style={{
                                background: `${STATUS_COLOR[niche.status]}22`,
                                border: `1px solid ${STATUS_COLOR[niche.status]}44`,
                                color: STATUS_COLOR[niche.status],
                            }}
                        >
                            {niche.niche_number}
                        </button>
                    ))}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-5 pt-5" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                    {(Object.entries(STATUS_COLOR) as [NicheStatus, string][]).map(([status, color]) => (
                        <div key={status} className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-sm" style={{ background: `${color}33`, border: `1px solid ${color}88` }} />
                            <span className="text-xs text-slate-400 capitalize">{status}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail popup */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass rounded-2xl p-6 w-full max-w-sm animate-fade-in" style={{ border: '1px solid rgba(148,163,184,0.15)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-bold text-white">Niche {selected.niche_id}</h2>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Section', selected.section],
                                ['Number', selected.niche_number],
                                ['Status', selected.status],
                                ['Occupant', selected.occupant_name ?? '—'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide">{l}</span>
                                    <span className="text-sm text-white capitalize">{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-5">
                            {selected.status === 'available' && <button className="btn-primary flex-1 justify-center">Assign Niche</button>}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
