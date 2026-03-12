import React, { useState, useEffect } from 'react'
import { FileText, Loader2, ArrowRight, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import toast from 'react-hot-toast'

interface UnifiedApplication {
    id: string
    type: 'Burial' | 'Utility' | 'Barangay' | 'Park'
    title: string
    status: string
    date: string
    details: string
    extra?: Record<string, string>
}

const STATUS_COLORS: Record<string, string> = {
    pending:      '#fbbf24',
    approved:     '#34d399',
    completed:    '#60a5fa',
    rejected:     '#f87171',
    under_review: '#a78bfa',
    validated:    '#34d399',
    verified:     '#818cf8',
}

const TYPE_EMOJI: Record<string, string> = {
    Burial:   '⚰️',
    Utility:  '💧',
    Barangay: '🏛️',
    Park:     '🌳',
}

const PAGE_SIZE = 8

export default function MyApplicationsPage() {
    const { user } = useAuth()
    const [apps, setApps] = useState<UnifiedApplication[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [selected, setSelected] = useState<UnifiedApplication | null>(null)

    useEffect(() => { if (user) fetchApplications() }, [user])
    useEffect(() => { setCurrentPage(1) }, [filter, searchTerm])

    async function fetchApplications() {
        setLoading(true)
        try {
            const { data: citData } = await supabase
                .from('citizen_account')
                .select('person_id')
                .eq('account_id', user?.id)
                .single()

            if (!citData) return

            const pid = citData.person_id
            const unified: UnifiedApplication[] = []

            // 1. Burial Applications
            const { data: burial } = await supabase
                .from('online_burial_application')
                .select('application_id, application_status, submission_date, deceased:deceased_id(full_name, date_of_death)')
                .eq('person_id', pid)

            burial?.forEach(b => {
                unified.push({
                    id: b.application_id,
                    type: 'Burial',
                    title: `Burial Permit: ${(b.deceased as any)?.full_name || 'Deceased'}`,
                    status: b.application_status,
                    date: b.submission_date,
                    details: `Date of Death: ${(b.deceased as any)?.date_of_death ?? '—'}`,
                    extra: {
                        'Application ID': b.application_id,
                        'Status': b.application_status.replace(/_/g, ' '),
                        'Date of Death': (b.deceased as any)?.date_of_death ?? '—',
                        'Submitted': b.submission_date,
                    },
                })
            })

            // 2. Utility / Service Tickets
            const { data: tickets } = await supabase
                .from('service_tickets')
                .select('*')
                .eq('requester_name', user?.full_name)

            tickets?.forEach(t => {
                unified.push({
                    id: t.ticket_id,
                    type: 'Utility',
                    title: `${t.ticket_type === 'leak_report' ? 'Leak Report' : 'Utility Service'}: ${t.location}`,
                    status: t.status,
                    date: t.created_at?.split('T')[0],
                    details: t.description,
                    extra: {
                        'Ticket ID': t.ticket_id,
                        'Type': t.ticket_type?.replace(/_/g, ' ') ?? '—',
                        'Location': t.location ?? '—',
                        'Status': t.status,
                        'Description': t.description ?? '—',
                        'Submitted': t.created_at?.split('T')[0] ?? '—',
                    },
                })
            })

            // 3. Barangay Reservations
            const { data: brgy } = await supabase
                .from('barangay_reservation_record')
                .select('*, barangay_facility(*)')
                .eq('applicant_person_id', pid)

            brgy?.forEach(r => {
                unified.push({
                    id: r.reservation_id,
                    type: 'Barangay',
                    title: `Facility: ${r.barangay_facility?.facility_name}`,
                    status: r.status,
                    date: r.reservation_date,
                    details: `${r.time_slot} on ${r.reservation_date}`,
                    extra: {
                        'Reservation ID': r.reservation_id,
                        'Facility': r.barangay_facility?.facility_name ?? '—',
                        'Date': r.reservation_date,
                        'Time Slot': r.time_slot ?? '—',
                        'Status': r.status,
                    },
                })
            })

            // 4. Park Reservations
            const { data: parks } = await supabase
                .from('park_reservation_record')
                .select('*, park_venue(*)')
                .eq('applicant_person_id', pid)

            parks?.forEach(r => {
                unified.push({
                    id: r.reservation_id,
                    type: 'Park',
                    title: `Park: ${r.park_venue?.park_venue_name}`,
                    status: r.status,
                    date: r.reservation_date,
                    details: `${r.time_slot} on ${r.reservation_date}`,
                    extra: {
                        'Reservation ID': r.reservation_id,
                        'Venue': r.park_venue?.park_venue_name ?? '—',
                        'Date': r.reservation_date,
                        'Time Slot': r.time_slot ?? '—',
                        'Status': r.status,
                    },
                })
            })

            setApps(unified.sort((a, b) => b.date.localeCompare(a.date)))
        } catch (error) {
            console.error(error)
            toast.error('Failed to fetch applications')
        } finally {
            setLoading(false)
        }
    }

    const filtered = apps.filter(a => {
        const matchType = filter === 'all' || a.type.toLowerCase() === filter
        const q = searchTerm.toLowerCase()
        const matchSearch = !q || a.id.toLowerCase().includes(q) || a.title.toLowerCase().includes(q)
        return matchType && matchSearch
    })

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(currentPage, totalPages)
    const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">My Applications</h1>
                    <p className="text-slate-400 text-sm mt-1">Track and manage all your requests to the city government</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search by ID or title…"
                        className="input-field pl-9 py-2 text-sm w-52"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Type Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                {['all', 'burial', 'utility', 'barangay', 'park'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                            filter === f
                                ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                                : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-500'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <Loader2 className="animate-spin mb-4" size={32} />
                    <p>Loading your applications…</p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-20 glass rounded-2xl border border-slate-800">
                    <FileText className="mx-auto mb-4 text-slate-700" size={48} />
                    <h3 className="text-lg font-semibold text-white">No applications found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">You haven't submitted any applications in this category yet.</p>
                </div>
            ) : (
                <>
                    <div className="grid gap-3">
                        {paginated.map(app => (
                            <Card key={app.id} className="card-hover overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="flex items-center gap-4 p-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl"
                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                        >
                                            {TYPE_EMOJI[app.type]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-mono text-slate-500">{app.id}</span>
                                                <Badge
                                                    style={{
                                                        background: `${STATUS_COLORS[app.status] || '#64748b'}20`,
                                                        color: STATUS_COLORS[app.status] || '#64748b',
                                                        border: `1px solid ${STATUS_COLORS[app.status] || '#64748b'}40`,
                                                    }}
                                                    className="text-[10px] px-1.5 py-0"
                                                >
                                                    {app.status.replace(/_/g, ' ')}
                                                </Badge>
                                            </div>
                                            <h3 className="text-sm font-bold text-white truncate">{app.title}</h3>
                                            <p className="text-xs text-slate-500 truncate">{app.details}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs font-semibold text-white mb-2">{app.date}</div>
                                            <button
                                                onClick={() => setSelected(app)}
                                                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ml-auto"
                                            >
                                                Details <ArrowRight size={10} />
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 px-1">
                            <p className="text-xs text-slate-500">
                                Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} applications
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
                                            <span key={`e-${i}`} className="px-2 text-slate-600 text-xs">…</span>
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
                        className="glass rounded-2xl w-full max-w-md animate-fade-in border border-white/10 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                                    {TYPE_EMOJI[selected.type]}
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-white">{selected.title}</h2>
                                    <p className="text-[10px] font-mono text-slate-500">{selected.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Status Banner */}
                        <div className="px-6 py-3 flex items-center gap-2"
                            style={{ background: `${STATUS_COLORS[selected.status] || '#64748b'}10` }}>
                            <span className="text-xs font-bold uppercase tracking-widest"
                                style={{ color: STATUS_COLORS[selected.status] || '#64748b' }}>
                                {selected.status.replace(/_/g, ' ')}
                            </span>
                        </div>

                        {/* Detail Rows */}
                        <div className="p-6 space-y-0">
                            {Object.entries(selected.extra ?? {}).map(([label, value]) => (
                                <div key={label} className="flex justify-between py-2.5 border-b border-white/5">
                                    <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">{label}</span>
                                    <span className="text-sm text-white text-right max-w-[55%] capitalize">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 pb-6">
                            <button
                                onClick={() => setSelected(null)}
                                className="btn-secondary w-full justify-center"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
