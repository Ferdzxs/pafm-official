import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Package, AlertTriangle } from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getHelpdeskStats, getRecentUtilityActivity, type TicketsByTypeStat } from '@/lib/serviceTickets'

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

const QUICK_ACTIONS = [
    { label: 'View Tickets', emoji: '🎫', path: '/utility/tickets' },
    { label: 'Triage Queue', emoji: '📋', path: '/utility/triage' },
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

export default function UtilityHelpdeskDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [openTickets, setOpenTickets] = useState(0)
    const [triagedToday, setTriagedToday] = useState(0)
    const [pendingAssign, setPendingAssign] = useState(0)
    const [byType, setByType] = useState<TicketsByTypeStat[]>([])
    const [activity, setActivity] = useState<
        { id: string; action: string; subject: string; time: string; status: string }[]
    >([])

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const stats = await getHelpdeskStats()
                const recent = await getRecentUtilityActivity()
                if (cancelled) return
                setOpenTickets(stats.kpis.openCount)
                setTriagedToday(stats.kpis.triagedToday)
                setPendingAssign(stats.kpis.pendingAssignment)
                setByType(stats.byType)
                setActivity(
                    recent.map(item => ({
                        id: item.reference_id,
                        action: item.message,
                        subject: item.reference_id,
                        time: new Date(item.sent_at).toLocaleTimeString('en-PH', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }),
                        status: 'pending',
                    })),
                )
            } catch (err: any) {
                if (!cancelled) {
                    setError(err?.message || 'Failed to load utility helpdesk statistics.')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [])

    if (!user) return null

    const meta = ROLE_META[user.role]

    const KPI_DATA = [
        { label: 'Open Tickets', value: openTickets, change: 0, icon: Clock, tone: 'warning' as const },
        { label: 'Triaged Today', value: triagedToday, change: 0, icon: CheckCircle, tone: 'success' as const },
        { label: 'Pending Assign', value: pendingAssign, change: 0, icon: AlertTriangle, tone: 'danger' as const },
        {
            label: 'Utility Status',
            value: openTickets + triagedToday + pendingAssign,
            change: 0,
            icon: Package,
            tone: 'info' as const,
        },
    ]

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

            {error && (
                <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {KPI_DATA.map((kpi, i) => {
                    const Icon = kpi.icon
                    const isPositive = kpi.change >= 0
                    const toneClasses: Record<typeof kpi.tone, string> = {
                        info: 'bg-state-info-soft text-state-info',
                        warning: 'bg-state-warning-soft text-state-warning',
                        success: 'bg-state-success-soft text-state-success',
                        danger: 'bg-state-danger-soft text-state-danger',
                    }
                    return (
                        <Card key={i} className="card-hover">
                            <CardContent className="pt-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${toneClasses[kpi.tone]}`}>
                                        <Icon size={18} />
                                    </div>
                                    {kpi.change !== 0 && (
                                        <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-state-success' : 'text-state-danger'}`}>
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
                            {activity.length === 0 && !loading && (
                                <div className="px-3 py-3 text-xs text-muted-foreground">
                                    No recent utility activity logged yet.
                                </div>
                            )}
                            {activity.map(item => (
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
                            <CardTitle className="text-sm">Tickets by Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={
                                            byType.length === 0
                                                ? [
                                                    { ticket_type: 'water_connection', count: 0 },
                                                    { ticket_type: 'leak_report', count: 0 },
                                                    { ticket_type: 'drainage', count: 0 },
                                                    { ticket_type: 'general', count: 0 },
                                                ]
                                                : byType
                                        }
                                        dataKey="count"
                                        nameKey="ticket_type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={55}
                                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                        fontSize={10}
                                    >
                                        {(byType.length === 0 ? [1, 2, 3, 4] : byType).map((_, idx) => (
                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: 'var(--color-card)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 8,
                                            fontSize: 12,
                                            color: 'var(--color-text-primary)',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

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
