import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Loader2, Plus } from 'lucide-react'
import { clsx } from 'clsx'

const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F']

const STATUS_COLOR: Record<string, string> = {
    available: '#34d399',
    occupied: '#f87171',
    reserved: '#fbbf24',
    maintenance: '#94a3b8',
}

const CEMETERIES = [
    { id: 'CEM-001', name: 'Bagbag Public Cemetery' },
    { id: 'CEM-002', name: 'Novaliches Public Cemetery' },
]

export default function NicheManagement() {
    const [selectedSection, setSelectedSection] = useState('A')
    const [selected, setSelected] = useState<any | null>(null)
    const [niches, setNiches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAssignModal, setShowAssignModal] = useState(false)
    const [deceasedOptions, setDeceasedOptions] = useState<{ deceased_id: string; full_name: string }[]>([])
    const [formData, setFormData] = useState({
        deceased_id: '',
        burial_date: new Date().toISOString().split('T')[0]
    })
    const [isSaving, setIsSaving] = useState(false)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [createData, setCreateData] = useState({
        cemetery_id: 'CEM-001',
        section: 'A',
        count: 10,
        startNumber: 1
    })

    useEffect(() => {
        fetchNiches()
    }, [])

    async function fetchNiches() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('niche_record')
                .select(`
                    *,
                    burial_record (
                        deceased:deceased_id (full_name)
                    )
                `)

            if (error) throw error
            setNiches(data || [])
        } catch (error: any) {
            toast.error('Failed to fetch niches: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    async function fetchDeceased() {
        try {
            const { data } = await supabase.from('deceased').select('deceased_id, full_name')
            setDeceasedOptions(data || [])
        } catch (err) {
            console.error('Error fetching deceased:', err)
        }
    }

    useEffect(() => {
        if (showAssignModal) fetchDeceased()
    }, [showAssignModal])

    async function handleAssign() {
        if (!selected || !formData.deceased_id || !formData.burial_date) {
            toast.error('Please fill in all fields')
            return
        }

        setIsSaving(true)
        try {
            // Check if deceased is already assigned
            const { data: existing, error: checkError } = await supabase
                .from('burial_record')
                .select('burial_id')
                .eq('deceased_id', formData.deceased_id)
                .maybeSingle()

            if (checkError) throw checkError
            if (existing) {
                toast.error('This deceased individual is already assigned to a niche.')
                return
            }

            const burialId = `BUR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            
            // 1. Create burial record
            const { error: burialError } = await supabase
                .from('burial_record')
                .insert({
                    burial_id: burialId,
                    deceased_id: formData.deceased_id,
                    cemetery_id: selected.cemetery_id,
                    niche_id: selected.niche_id,
                    burial_date: formData.burial_date
                })

            if (burialError) throw burialError

            // 2. Update niche status
            const { error: nicheError } = await supabase
                .from('niche_record')
                .update({
                    status: 'occupied',
                    burial_schedule_date: formData.burial_date
                })
                .eq('niche_id', selected.niche_id)

            if (nicheError) throw nicheError

            toast.success('Niche assigned successfully')
            setShowAssignModal(false)
            setSelected(null)
            fetchNiches()
        } catch (error: any) {
            toast.error('Assignment failed: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    async function handleCreateNiches() {
        if (!createData.cemetery_id || !createData.section || createData.count <= 0) {
            toast.error('Invalid inputs')
            return
        }

        setIsCreating(true)
        try {
            const newNiches = []
            for (let i = 0; i < createData.count; i++) {
                const num = createData.startNumber + i
                const nicheNumber = `${createData.section}-${num.toString().padStart(2, '0')}-${(Math.floor(Math.random() * 900) + 100)}`
                const nicheId = `NR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
                
                newNiches.push({
                    niche_id: nicheId,
                    cemetery_id: createData.cemetery_id,
                    niche_number: nicheNumber,
                    status: 'available'
                })
            }

            const { error } = await supabase
                .from('niche_record')
                .insert(newNiches)

            if (error) throw error

            toast.success(`Successfully added ${createData.count} niches`)
            setShowCreateModal(false)
            fetchNiches()
        } catch (error: any) {
            toast.error('Failed to add niches: ' + error.message)
        } finally {
            setIsCreating(false)
        }
    }

    const sectionNiches = niches
        .filter(n => n.niche_number.startsWith(selectedSection))
        .sort((a, b) => a.niche_number.localeCompare(b.niche_number))

    const counts = {
        available: niches.filter(n => n.status === 'available').length,
        occupied: niches.filter(n => n.status === 'occupied').length,
        reserved: niches.filter(n => n.status === 'reserved').length,
        maintenance: niches.filter(n => n.status === 'maintenance').length,
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Niche Management</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Niche_Record — Cemetery occupancy overview</p>
                </div>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                    <Plus size={18} /> Add Niches
                </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {loading ? (
                    Array(4).fill(0).map((_, i) => (
                        <div key={i} className="glass rounded-xl p-4 animate-pulse h-24" style={{ border: '1px solid rgba(148,163,184,0.08)' }} />
                    ))
                ) : (
                    (Object.entries(counts) as [string, number][]).map(([status, count]) => (
                        <div key={status} className="glass rounded-xl p-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-3 h-3 rounded-full" style={{ background: STATUS_COLOR[status] }} />
                                <span className="text-xs text-slate-400 capitalize font-medium">{status}</span>
                            </div>
                            <div className="text-2xl font-bold text-white">{count}</div>
                        </div>
                    ))
                )}
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
                <h2 className="font-semibold text-white mb-4 text-sm">Section {selectedSection} — {sectionNiches.length} Niches</h2>
                
                {loading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                        <Loader2 className="animate-spin" size={24} />
                        <p className="text-sm">Loading niches...</p>
                    </div>
                ) : (
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
                                {niche.niche_number.split('-').pop()}
                            </button>
                        ))}
                    </div>
                )}

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-5 pt-5" style={{ borderTop: '1px solid rgba(148,163,184,0.08)' }}>
                    {(Object.entries(STATUS_COLOR) as [string, string][]).map(([status, color]) => (
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
                            <h2 className="font-bold text-white">Niche {selected.niche_number}</h2>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Niche ID', selected.niche_id],
                                ['Status', selected.status],
                                ['Occupant', selected.burial_record?.[0]?.deceased?.full_name || '—'],
                                ['Schedule', selected.burial_schedule_date ? new Date(selected.burial_schedule_date).toLocaleDateString('en-PH') : '—'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide">{l}</span>
                                    <span className="text-sm text-white capitalize">{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-5">
                            {selected.status === 'available' && (
                                <button 
                                    onClick={() => setShowAssignModal(true)}
                                    className="btn-primary flex-1 justify-center"
                                >
                                    Assign Niche
                                </button>
                            )}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Niche Modal */}
            {showAssignModal && selected && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowAssignModal(false)}
                >
                    <div 
                        className="glass rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-white mb-4">Assign Niche {selected.niche_number}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deceased Individual</label>
                                <select 
                                    className="input-field w-full"
                                    value={formData.deceased_id}
                                    onChange={e => setFormData(prev => ({ ...prev, deceased_id: e.target.value }))}
                                >
                                    <option value="">Select deceased...</option>
                                    {deceasedOptions.map(d => (
                                        <option key={d.deceased_id} value={d.deceased_id}>{d.full_name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Burial date</label>
                                <input 
                                    type="date"
                                    className="input-field w-full"
                                    value={formData.burial_date}
                                    onChange={e => setFormData(prev => ({ ...prev, burial_date: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button 
                                onClick={handleAssign}
                                disabled={isSaving}
                                className="gradient-primary flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Assignment'}
                            </button>
                            <button className="btn-secondary flex-1" onClick={() => setShowAssignModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Create Niches Modal */}
            {showCreateModal && (
                <div 
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowCreateModal(false)}
                >
                    <div 
                        className="glass rounded-2xl p-6 w-full max-w-sm border border-white/10 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-bold text-white mb-4">Add New Niches</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cemetery</label>
                                <select 
                                    className="input-field w-full"
                                    value={createData.cemetery_id}
                                    onChange={e => setCreateData(prev => ({ ...prev, cemetery_id: e.target.value }))}
                                >
                                    {CEMETERIES.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                                    <select 
                                        className="input-field w-full"
                                        value={createData.section}
                                        onChange={e => setCreateData(prev => ({ ...prev, section: e.target.value }))}
                                    >
                                        {SECTIONS.map(s => (
                                            <option key={s} value={s}>Section {s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Starting No.</label>
                                    <input 
                                        type="number"
                                        className="input-field w-full"
                                        value={createData.startNumber}
                                        onChange={e => setCreateData(prev => ({ ...prev, startNumber: parseInt(e.target.value) }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Number of Niches</label>
                                <input 
                                    type="number"
                                    className="input-field w-full"
                                    value={createData.count}
                                    onChange={e => setCreateData(prev => ({ ...prev, count: parseInt(e.target.value) }))}
                                    min="1"
                                    max="50"
                                />
                                <p className="text-[10px] text-slate-500 mt-1 ml-1 italic">Max 50 per batch</p>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button 
                                onClick={handleCreateNiches}
                                disabled={isCreating}
                                className="gradient-primary flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCreating ? <Loader2 size={16} className="animate-spin" /> : 'Add Niches'}
                            </button>
                            <button className="btn-secondary flex-1" onClick={() => setShowCreateModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
