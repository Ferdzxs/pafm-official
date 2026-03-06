import React, { useState } from 'react'
import type { ServiceTicket, TicketPriority, TicketStatus } from '@/types'
import { Search, Plus, AlertTriangle, Clock, CheckCircle, User } from 'lucide-react'

const PRIORITY_COLOR: Record<TicketPriority, string> = {
    low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
}

const STATUS_BADGE: Record<TicketStatus, string> = {
    open: 'badge-pending', assigned: 'badge-pending', in_progress: 'badge-pending',
    resolved: 'badge-approved', closed: 'badge-completed',
}

const MOCK_TICKETS: ServiceTicket[] = [
    { ticket_id: 'ST-2024-092', ticket_type: 'water_connection', requester_name: 'Luisa Hernandez', description: 'Requesting new water connection for residential unit', location: 'Blk 4 Lot 12, Brgy. 123', priority: 'medium', status: 'open', created_at: '2024-03-05T08:00:00Z' },
    { ticket_id: 'ST-2024-091', ticket_type: 'leak_report', requester_name: 'Ricardo Castillo', description: 'Major pipe burst near main road causing flooding', location: 'Q.C. Ave, near EDSA', priority: 'critical', status: 'in_progress', created_at: '2024-03-04T22:00:00Z', assigned_to: 'Engr. Cruz' },
    { ticket_id: 'ST-2024-090', ticket_type: 'drainage', requester_name: 'Norma Dela Vega', description: 'Drainage clogged causing water backup in street', location: 'P. Florentino St.', priority: 'high', status: 'assigned', created_at: '2024-03-04T18:00:00Z', assigned_to: 'Team B' },
    { ticket_id: 'ST-2024-089', ticket_type: 'general', requester_name: 'Eduardo Marquez', description: 'Inquiry about water bill discrepancy', location: 'Pasig District Office', priority: 'low', status: 'open', created_at: '2024-03-04T14:00:00Z' },
    { ticket_id: 'ST-2024-088', ticket_type: 'leak_report', requester_name: 'Christina Moran', description: 'Underground pipe leak detected in alley', location: 'Brgy. 456 — Alley 7', priority: 'high', status: 'assigned', created_at: '2024-03-03T10:00:00Z', assigned_to: 'Engr. Cruz' },
    { ticket_id: 'ST-2024-087', ticket_type: 'water_connection', requester_name: 'Manuel Soriano', description: 'Water connection for new commercial establishment', location: 'Scout Barrio, QC', priority: 'medium', status: 'resolved', created_at: '2024-03-02T09:00:00Z', resolved_at: '2024-03-04T16:00:00Z' },
]

export default function ServiceTickets() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<ServiceTicket | null>(null)

    const filtered = MOCK_TICKETS.filter(t => {
        const q = search.toLowerCase()
        const match = t.requester_name.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
        return match && (statusFilter === 'all' || t.status === statusFilter)
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Service Tickets</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Service_Ticket — Water, Leak & Drainage requests</p>
                </div>
                <button className="btn-primary self-start sm:self-auto"><Plus size={15} /> New Ticket</button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                    { label: 'Open', value: MOCK_TICKETS.filter(t => t.status === 'open').length, color: '#fbbf24', icon: Clock },
                    { label: 'In Progress', value: MOCK_TICKETS.filter(t => t.status === 'in_progress').length, color: '#fb923c', icon: AlertTriangle },
                    { label: 'Assigned', value: MOCK_TICKETS.filter(t => t.status === 'assigned').length, color: '#60a5fa', icon: User },
                    { label: 'Resolved', value: MOCK_TICKETS.filter(t => t.status === 'resolved').length, color: '#34d399', icon: CheckCircle },
                ].map(s => {
                    const Icon = s.icon
                    return (
                        <div key={s.label} className="glass rounded-xl p-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                            <Icon size={16} style={{ color: s.color }} className="mb-2" />
                            <div className="text-2xl font-bold text-white">{s.value}</div>
                            <div className="text-xs text-slate-400">{s.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by requester, ID or location…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {/* List */}
            <div className="space-y-3">
                {filtered.map(ticket => (
                    <div
                        key={ticket.ticket_id}
                        onClick={() => setSelected(ticket)}
                        className="glass rounded-xl p-4 cursor-pointer hover:bg-white/5 transition-all card-hover"
                        style={{ border: `1px solid ${PRIORITY_COLOR[ticket.priority]}22` }}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: PRIORITY_COLOR[ticket.priority] }} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-mono text-blue-400">{ticket.ticket_id}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${PRIORITY_COLOR[ticket.priority]}22`, color: PRIORITY_COLOR[ticket.priority], border: `1px solid ${PRIORITY_COLOR[ticket.priority]}44` }}>
                                            {ticket.priority}
                                        </span>
                                        <span className="text-xs text-slate-400 capitalize">{ticket.ticket_type.replace('_', ' ')}</span>
                                    </div>
                                    <div className="text-sm font-medium text-white mt-1 truncate">{ticket.description}</div>
                                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                        <span>📍 {ticket.location}</span>
                                        <span>👤 {ticket.requester_name}</span>
                                        {ticket.assigned_to && <span>🔧 {ticket.assigned_to}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[ticket.status]}`}>
                                    {ticket.status.replace('_', ' ')}
                                </span>
                                <span className="text-[10px] text-slate-600">{new Date(ticket.created_at).toLocaleDateString('en-PH')}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ border: '1px solid rgba(148,163,184,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-white text-lg">{selected.ticket_id}</h2>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Type', selected.ticket_type.replace('_', ' ')],
                                ['Priority', selected.priority],
                                ['Status', selected.status.replace('_', ' ')],
                                ['Requester', selected.requester_name],
                                ['Location', selected.location],
                                ['Assigned To', selected.assigned_to ?? 'Unassigned'],
                                ['Description', selected.description],
                                ['Opened', new Date(selected.created_at).toLocaleString('en-PH')],
                                ...(selected.resolved_at ? [['Resolved', new Date(selected.resolved_at).toLocaleString('en-PH')]] : []),
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between py-2 gap-4" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                    <span className="text-xs text-slate-400 font-medium uppercase tracking-wide flex-shrink-0">{label}</span>
                                    <span className="text-sm text-white text-right capitalize">{value}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            {selected.status === 'open' && <button className="btn-primary flex-1 justify-center">Assign Ticket</button>}
                            {selected.status === 'assigned' && <button className="btn-success flex-1 justify-center">Mark Resolved</button>}
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
