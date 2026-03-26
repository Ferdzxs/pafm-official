import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, FileCheck, Send, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'

const QUICK_ACTIONS = [
    { label: 'Route pending requests', emoji: '📬', path: '/rmcd/routing' },
    { label: 'Release documents', emoji: '📄', path: '/rmcd/releases' },
]

const toneClasses = {
    info: 'bg-state-info-soft text-state-info',
    warning: 'bg-state-warning-soft text-state-warning',
    success: 'bg-state-success-soft text-state-success',
} as const

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

type ActivityRow = { id: string; action: string; subject: string; status: string }

export default function RmcdDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ pendingRoutes: 0, releasedDocs: 0, totalRequests: 0 })
    const [recent, setRecent] = useState<ActivityRow[]>([])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [pendingRes, releasedRes, totalRes, recentReq] = await Promise.all([
                    supabase
                        .from('inventory_request')
                        .select('*', { count: 'exact', head: true })
                        .in('status', ['pending', 'in_progress']),
                    supabase.from('approval_record').select('*', { count: 'exact', head: true }).eq('decision', 'released'),
                    supabase.from('inventory_request').select('*', { count: 'exact', head: true }),
                    supabase
                        .from('inventory_request')
                        .select('inventory_request_id, status, date_requested, inventory_scope, property(property_name)')
                        .order('date_requested', { ascending: false })
                        .limit(6),
                ])
                setStats({
                    pendingRoutes: pendingRes.count ?? 0,
                    releasedDocs: releasedRes.count ?? 0,
                    totalRequests: totalRes.count ?? 0,
                })
                const rows = recentReq.data || []
                setRecent(
                    rows.map((r: any) => ({
                        id: r.inventory_request_id,
                        action: 'Inventory request',
                        subject:
                            Array.isArray(r.property) && r.property[0]?.property_name
                                ? r.property[0].property_name
                                : r.property?.property_name || r.inventory_scope || r.inventory_request_id,
                        status: r.status || '—',
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
            label: 'Pending routes',
            value: stats.pendingRoutes,
            sub: 'Awaiting RMCD action',
            icon: Clock,
            tone: 'warning' as const,
            to: '/rmcd/routing',
        },
        {
            label: 'Documents released',
            value: stats.releasedDocs,
            sub: 'Marked released in workflow',
            icon: FileCheck,
            tone: 'success' as const,
            to: '/rmcd/releases',
        },
        {
            label: 'Total requests',
            value: stats.totalRequests,
            sub: 'All inventory requests',
            icon: Send,
            tone: 'info' as const,
            to: '/rmcd/routing',
        },
    ]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in pb-12">
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
                            {user.office && ` · ${user.office}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Link
                            to="/rmcd/routing"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            Routing queue
                            <ChevronRight size={16} />
                        </Link>
                        <Link
                            to="/rmcd/releases"
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
                        >
                            Releases
                            <FileCheck size={16} />
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
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
                            <CardTitle className="text-base">Recent activity</CardTitle>
                            <span className="text-xs text-muted-foreground">Inventory requests</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {recent.length === 0 && !loading ? (
                            <div className="text-sm text-muted-foreground italic py-4">No recent activity</div>
                        ) : loading ? (
                            <div className="flex items-center gap-2 text-muted-foreground py-6">
                                <Loader2 size={18} className="animate-spin" />
                                <span className="text-sm">Loading…</span>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {recent.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {item.id.slice(0, 2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                                            <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] shrink-0">
                                            {item.status}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card className="border-border-subtle">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1">
                                {QUICK_ACTIONS.map(qa => (
                                    <Link
                                        key={qa.label}
                                        to={qa.path}
                                        className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border"
                                    >
                                        <EmojiIcon symbol={qa.emoji} className="h-4 w-4 shrink-0" />
                                        <span className="flex-1">{qa.label}</span>
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 shrink-0" />
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
