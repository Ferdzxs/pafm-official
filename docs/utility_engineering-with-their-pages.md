# 📁 Merged TSX Files

## 📑 Table of Contents

1. [assigned-jobs.tsx](#assigned-jobs-tsx)
2. [dashboard.tsx](#dashboard-tsx)
3. [installations.tsx](#installations-tsx)
4. [leak-reports.tsx](#leak-reports-tsx)
5. [service-tickets.tsx](#service-tickets-tsx)

---

## 1. assigned-jobs.tsx

```tsx
import React from 'react'
import PlaceholderPage from '@/pages/PlaceholderPage'

export default function AssignedJobs() {
  return (
    <PlaceholderPage
      title="Assigned Jobs"
      description="View and manage field jobs assigned to Utility Engineering crews for water connection, leak repair, and drainage requests."
    />
  )
}

```

---

## 2. dashboard.tsx

```tsx
import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, FileText, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const KPI_DATA = [
    { label: 'Assigned Tickets', value: 9, change: 3, icon: Clock, color: '#fbbf24' },
    { label: 'In Progress', value: 4, change: 1, icon: AlertTriangle, color: '#fb923c' },
    { label: 'Resolutions', value: 5, change: 2, icon: CheckCircle, color: '#34d399' },
    { label: 'Drainage & Leaks', value: 3, change: -1, icon: FileText, color: '#22d3ee' },
]

const RECENT_ACTIVITY = [
    { id: 'ST-2024-088', action: 'Ticket Assigned', subject: 'Q.C. Ave Leak — Severe', time: '30 min ago', status: 'pending' },
    { id: 'ST-2024-087', action: 'Repair In Progress', subject: 'Pipe Burst — Brgy. 123', time: '2 hrs ago', status: 'pending' },
]

const QUICK_ACTIONS = [
    { label: 'View Assigned Tickets', emoji: '🔧', path: '/utility/tickets' },
    { label: 'Log a Repair', emoji: '🛠️', path: '/utility/jobs' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

export default function UtilityEngineeringDashboard() {
    const { user } = useAuth()
    if (!user) return null

    const meta = ROLE_META[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
                        {meta.label}
                    </span>
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Good {getGreeting()}, {user.full_name.split(' ')[0]}! 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {user.office && ` · ${user.office}`}
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {KPI_DATA.map((kpi, i) => {
                    const Icon = kpi.icon
                    const isPositive = kpi.change >= 0
                    return (
                        <Card key={i} className="card-hover">
                            <CardContent className="pt-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                                        <Icon size={18} style={{ color: kpi.color }} />
                                    </div>
                                    {kpi.change !== 0 && (
                                        <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                            {Math.abs(kpi.change)}
                                        </div>
                                    )}
                                </div>
                                <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
                                <div className="text-xs text-muted-foreground">{kpi.label}</div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <span className="text-xs text-muted-foreground">Live updates</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {RECENT_ACTIVITY.map(item => (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {item.id.slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                                        <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5">{item.status}</Badge>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {QUICK_ACTIONS.map(qa => (
                                    <a key={qa.label} href={qa.path} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border">
                                        <span>{qa.emoji}</span>
                                        <span>{qa.label}</span>
                                    </a>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

```

---

## 3. installations.tsx

```tsx
import React from 'react'
import PlaceholderPage from '@/pages/PlaceholderPage'

export default function Installations() {
  return (
    <PlaceholderPage
      title="Installations & Major Fixes"
      description="Track site inspections, completed new water supply connections, major water leak repairs, and drainage system fixes."
    />
  )
}

```

---

## 4. leak-reports.tsx

```tsx
import React from 'react'
import PlaceholderPage from '@/pages/PlaceholderPage'

export default function LeakReports() {
  return (
    <PlaceholderPage
      title="Leak & Drainage Reports"
      description="Inspect reported water leak sites and drainage blockages, and record repair work performed by Utility Engineering teams."
    />
  )
}

```

---

## 5. service-tickets.tsx

```tsx
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
                    <p className="text-slate-400 text-sm mt-0.5">Service_Ticket — Water connection, leak, and drainage requests managed by the Utility Helpdesk and Engineering teams.</p>
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

```

