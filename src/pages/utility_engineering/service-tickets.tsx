import React, { useEffect, useState } from 'react'
import type { ServiceTicket, TicketPriority, TicketStatus } from '@/types'
import { Search, AlertTriangle, Clock, CheckCircle, User, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import toast from 'react-hot-toast'

const PRIORITY_COLOR: Record<TicketPriority, string> = {
    low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
}

const STATUS_BADGE: Partial<Record<TicketStatus, string>> = {
    open: 'badge-pending',
    triaged: 'badge-pending',
    assigned: 'badge-pending',
    in_progress: 'badge-pending',
    resolved: 'badge-approved',
    closed: 'badge-completed',
}

export default function ServiceTickets() {
    const { user } = useAuth()
    const [tickets, setTickets] = useState<ServiceTicket[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
    const [selected, setSelected] = useState<ServiceTicket | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!user) return
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const data = await listTickets({ assigned_to: user.full_name })
                if (!cancelled) setTickets(data)
            } catch (err: any) {
                if (!cancelled) setError(err?.message || 'Failed to load assigned tickets.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => {
            cancelled = true
        }
    }, [user])

    if (!user) return null

    const filtered = tickets.filter(t => {
        const q = search.toLowerCase()
        const match = t.requester_name.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
        return match && (statusFilter === 'all' || t.status === statusFilter)
    })

    const summary = {
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        assigned: tickets.filter(t => t.status === 'assigned').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    }

    const handleStartJob = async (ticket: ServiceTicket) => {
        setLoading(true)
        try {
            await updateTicket(ticket.ticket_id, { status: 'in_progress' } as any)
            await logTicketEvent({
                ticket_id: ticket.ticket_id,
                event: 'in_progress',
                message: 'Engineering started work on this ticket.',
            })
            setTickets(prev => prev.map(t => (t.ticket_id === ticket.ticket_id ? { ...t, status: 'in_progress' } : t)))
            toast.success('Job marked as in progress.')
        } catch (err: any) {
            toast.error(err?.message || 'Failed to start job.')
        } finally {
            setLoading(false)
        }
    }

    const handleResolve = async (ticket: ServiceTicket) => {
        const note = window.prompt('Enter resolution note:', '')
        if (note === null) return
        const resolved_at = new Date().toISOString()
        setLoading(true)
        try {
            await updateTicket(ticket.ticket_id, {
                status: 'resolved',
                resolved_at,
                resolution_note: note || ticket.description,
            } as any)
            await logTicketEvent({
                ticket_id: ticket.ticket_id,
                event: 'resolved',
                message: 'Ticket resolved by engineering.',
            })
            setTickets(prev =>
                prev.map(t =>
                    t.ticket_id === ticket.ticket_id ? { ...t, status: 'resolved', resolved_at } : t,
                ),
            )
            toast.success('Ticket marked as resolved.')
        } catch (err: any) {
            toast.error(err?.message || 'Failed to mark ticket as resolved.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Service tickets</h1>
                    <p className="text-sm mt-0.5 text-muted-foreground">
                        Tickets assigned to you for water connections, leak repairs, and drainage work.
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
                    {error}
                </div>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                {[
                    { label: 'Open', value: summary.open, color: '#fbbf24', icon: Clock },
                    { label: 'In Progress', value: summary.in_progress, color: '#fb923c', icon: AlertTriangle },
                    { label: 'Assigned', value: summary.assigned, color: '#60a5fa', icon: User },
                    { label: 'Resolved', value: summary.resolved, color: '#34d399', icon: CheckCircle },
                ].map(s => {
                    const Icon = s.icon
                    return (
                        <div key={s.label} className="rounded-xl p-4 border border-border-subtle bg-card">
                            <Icon size={16} style={{ color: s.color }} className="mb-2" />
                            <div className="text-2xl font-bold text-foreground">{s.value}</div>
                            <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                    )
                })}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        className="input-field pl-9"
                        placeholder="Search by requester, ID or location…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="input-field w-full sm:w-auto"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {loading && tickets.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Loading your tickets…
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-subtle p-6 text-center bg-card">
                    <p className="text-sm text-foreground mb-1">No tickets assigned to you yet.</p>
                    <p className="text-xs text-muted-foreground">
                        When the helpdesk assigns tickets to you, they will appear here.
                    </p>
                </div>
            ) : (
                <>
                    {/* List */}
                    <div className="space-y-3">
                        {filtered.map(ticket => (
                            <div
                                key={ticket.ticket_id}
                                onClick={() => setSelected(ticket)}
                                className="rounded-xl p-4 cursor-pointer border bg-card hover:bg-bg-hover transition-all card-hover"
                                style={{ borderColor: `${PRIORITY_COLOR[ticket.priority]}33` }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: PRIORITY_COLOR[ticket.priority] }} />
                                        <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-sm font-mono text-primary">{ticket.ticket_id}</span>
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full border"
                                                style={{
                                                    background: `${PRIORITY_COLOR[ticket.priority]}22`,
                                                    color: PRIORITY_COLOR[ticket.priority],
                                                    borderColor: `${PRIORITY_COLOR[ticket.priority]}44`,
                                                }}
                                            >
                                                {ticket.priority}
                                            </span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {ticket.ticket_type.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium text-foreground mt-1 truncate">
                                            {ticket.description}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                                <span>📍 {ticket.location}</span>
                                                <span>👤 {ticket.requester_name}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[ticket.status]}`}>
                                            {ticket.status.replace('_', ' ')}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(ticket.created_at).toLocaleDateString('en-PH')}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Detail modal */}
                    {selected && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
                            <div
                                className="rounded-2xl p-6 w-full max-w-lg animate-fade-in bg-card border border-border-strong shadow-lg"
                                style={{ maxHeight: '90vh', overflowY: 'auto' }}
                            >
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="font-bold text-foreground text-lg">{selected.ticket_id}</h2>
                                    <button
                                        onClick={() => setSelected(null)}
                                        className="text-muted-foreground hover:text-foreground text-xl"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        ['Type', selected.ticket_type.replace('_', ' ')],
                                        ['Priority', selected.priority],
                                        ['Status', selected.status.replace('_', ' ')],
                                        ['Requester', selected.requester_name],
                                        ['Location', selected.location],
                                        ['Assigned To', selected.assigned_to ?? 'You'],
                                        ['Description', selected.description],
                                        ['Opened', new Date(selected.created_at).toLocaleString('en-PH')],
                                        ...(selected.image_url ? [['Photo Proof', <a href={selected.image_url} target="_blank" rel="noreferrer" className="text-blue-400 font-semibold underline">View Full Image</a>]] : []),
                                        ...(selected.resolved_at ? [['Resolved', new Date(selected.resolved_at).toLocaleString('en-PH')]] : []),
                                    ].map(([label, value]) => (
                                        <div
                                            key={label as string}
                                            className="flex justify-between py-2 gap-4 border-b border-border-subtle last:border-b-0"
                                        >
                                            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex-shrink-0">
                                                {label as string}
                                            </span>
                                            <span className="text-sm text-foreground text-right font-normal">{value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2 mt-6">
                                    {selected.status === 'assigned' && (
                                        <button
                                            className="btn-primary flex-1 justify-center"
                                            disabled={loading}
                                            onClick={() => handleStartJob(selected)}
                                        >
                                            Start Job
                                        </button>
                                    )}
                                    {selected.status === 'in_progress' && (
                                        <button
                                            className="btn-success flex-1 justify-center"
                                            disabled={loading}
                                            onClick={() => handleResolve(selected)}
                                        >
                                            Mark Resolved
                                        </button>
                                    )}
                                    <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
