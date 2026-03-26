import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, CheckCircle, Package, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'

const QUICK_ACTIONS = [
    { label: 'Inventory & assets', emoji: '📦', path: '/assets/inventory' },
    { label: 'Inspection findings', emoji: '🔍', path: '/assets/inspections' },
    { label: 'Inventory reports', emoji: '📊', path: '/assets/reports' },
    { label: 'Submissions', emoji: '📤', path: '/assets/submissions' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
}

const toneClasses = {
    info: 'bg-state-info-soft text-state-info',
    warning: 'bg-state-warning-soft text-state-warning',
    success: 'bg-state-success-soft text-state-success',
    muted: 'bg-muted text-muted-foreground',
} as const

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

type ActivityItem = {
    id: string
    action: string
    subject: string
    time: string
    status: string
}

export default function FamcdDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalProperties: 0,
        pendingRequests: 0,
        reportsSubmitted: 0,
        completedRequests: 0,
    })
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [{ count: propCount }, { count: pendCount }, { count: repCount }, { count: doneCount }, reqRecent] = await Promise.all([
                    supabase.from('property').select('*', { count: 'exact', head: true }),
                    supabase.from('inventory_request').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
                    supabase.from('inventory_report').select('*', { count: 'exact', head: true }),
                    supabase.from('inventory_request').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
                    supabase
                        .from('inventory_request')
                        .select('inventory_request_id, date_requested, status, property(property_name)')
                        .order('date_requested', { ascending: false })
                        .limit(6),
                ])
                setStats({
                    totalProperties: propCount || 0,
                    pendingRequests: pendCount || 0,
                    reportsSubmitted: repCount || 0,
                    completedRequests: doneCount || 0,
                })
                const rows = reqRecent.data || []
                setRecentActivity(
                    rows.map((r: any) => ({
                        id: r.inventory_request_id,
                        action: 'Inventory request',
                        subject:
                            Array.isArray(r.property) && r.property[0]?.property_name
                                ? r.property[0].property_name
                                : r.property?.property_name || r.inventory_request_id,
                        time: r.date_requested || '—',
                        status: r.status || 'pending',
                    })),
                )
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (!user) return null

    const meta = ROLE_META[user.role]

    const kpis = [
        {
            label: 'Total properties',
            value: stats.totalProperties,
            sub: 'Registered in inventory',
            icon: Package,
            tone: 'info' as const,
            to: '/assets/inventory',
        },
        {
            label: 'Pending requests',
            value: stats.pendingRequests,
            sub: 'Awaiting FAMCD action',
            icon: Clock,
            tone: 'warning' as const,
            to: '/assets/inspections',
        },
        {
            label: 'Reports submitted',
            value: stats.reportsSubmitted,
            sub: 'Inventory reports filed',
            icon: FileText,
            tone: 'muted' as const,
            to: '/assets/reports',
        },
        {
            label: 'Completed requests',
            value: stats.completedRequests,
            sub: 'Closed inventory cycles',
            icon: CheckCircle,
            tone: 'success' as const,
            to: '/assets/submissions',
        },
    ]

    return (
        <div className="mx-auto max-w-6xl animate-fade-in px-4 py-4 sm:px-6 lg:px-8 pb-12">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
                                {meta.label}
                            </span>
                        </div>
                        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            Good {getGreeting()}, {user.full_name.split(' ')[0]}!
                        </h1>
                        <p className="text-muted-foreground text-sm mt-2 max-w-xl">
                            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            {user.office ? ` · ${user.office}` : ''}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/assets/inventory"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            Inventory
                            <ChevronRight size={16} />
                        </Link>
                        <Link
                            to="/assets/reports"
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
                        >
                            Reports
                            <FileText size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {kpis.map(kpi => {
                    const Icon = kpi.icon
                    return (
                        <Link key={kpi.label} to={kpi.to} className="group block min-h-[120px]">
                            <Card className="h-full border-border transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5">
                                <CardContent className="pt-5 pb-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClasses[kpi.tone]}`}>
                                            <Icon size={18} />
                                        </div>
                                        <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    </div>
                                    {loading ? (
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 size={18} className="animate-spin" />
                                            <span className="text-xs">Loading…</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-2xl font-bold text-foreground tabular-nums mb-1">{kpi.value}</div>
                                            <div className="text-xs font-medium text-foreground/90">{kpi.label}</div>
                                            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{kpi.sub}</div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-border-subtle">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <span className="text-xs text-muted-foreground">Live updates</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {recentActivity.length === 0 ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">No recent requests</div>
                            ) : (
                                recentActivity.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors">
                                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {item.id.slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                                            <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5">
                                                {item.status}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="border-border-subtle">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {QUICK_ACTIONS.map(qa => (
                                    <Link
                                        key={qa.label}
                                        to={qa.path}
                                        className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border"
                                    >
                                        <EmojiIcon symbol={qa.emoji} className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="flex-1">{qa.label}</span>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground" />
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
