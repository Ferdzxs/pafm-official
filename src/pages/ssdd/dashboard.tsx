import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, CheckCircle, Users, FileText, ChevronRight, Loader2, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'

const QUICK_ACTIONS = [
    { label: 'Indigent assistance', emoji: '🤝', path: '/ssdd/indigent' },
    { label: 'Citizen records', emoji: '👥', path: '/ssdd/citizens' },
    { label: 'Death registration coordination', emoji: '📋', path: '/ssdd/coordination' },
    { label: 'Reports & analytics', emoji: '📊', path: '/reports' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    rejected: 'destructive',
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

type ActivityItem = { id: string; action: string; subject: string; time: string; status: string }

export default function SsddDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        pendingAssistance: 0,
        indigentOpen: 0,
        closedMonth: 0,
        citizenRecords: 0,
    })
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const startOfMonth = new Date()
                startOfMonth.setDate(1)
                startOfMonth.setHours(0, 0, 0, 0)
                const monthStr = `${startOfMonth.getFullYear()}-${String(startOfMonth.getMonth() + 1).padStart(2, '0')}-01`

                const [pendingRes, indigentRes, closedRes, personsRes, recentRows] = await Promise.all([
                    supabase
                        .from('indigent_assistance_record')
                        .select('*', { count: 'exact', head: true })
                        .in('status', ['pending', 'submitted', 'under_review']),
                    supabase
                        .from('online_burial_application')
                        .select('*', { count: 'exact', head: true })
                        .eq('is_indigent', true)
                        .eq('application_status', 'pending'),
                    supabase
                        .from('online_burial_application')
                        .select('*', { count: 'exact', head: true })
                        .eq('is_indigent', true)
                        .in('application_status', ['approved', 'completed', 'ssdd_evaluated'])
                        .gte('submission_date', monthStr),
                    supabase.from('person').select('*', { count: 'exact', head: true }),
                    supabase
                        .from('indigent_assistance_record')
                        .select('assistance_id, status, deceased_id, social_worker_eval_date')
                        .order('assistance_id', { ascending: false })
                        .limit(8),
                ])

                setStats({
                    pendingAssistance: pendingRes.count ?? 0,
                    indigentOpen: indigentRes.count ?? 0,
                    closedMonth: closedRes.count ?? 0,
                    citizenRecords: personsRes.count ?? 0,
                })

                const data = recentRows.data || []
                setRecentActivity(
                    data.map((r: any) => ({
                        id: r.assistance_id,
                        action: 'Indigent case',
                        subject: r.deceased_id || r.assistance_id,
                        time: r.social_worker_eval_date
                            ? new Date(r.social_worker_eval_date).toLocaleString('en-PH', { dateStyle: 'short' })
                            : '—',
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
            label: 'Pending assistance',
            value: stats.pendingAssistance,
            sub: 'Cases needing SSDD',
            icon: Clock,
            tone: 'warning' as const,
            to: '/ssdd/indigent',
        },
        {
            label: 'Indigent applications',
            value: stats.indigentOpen,
            sub: 'Burial apps pending',
            icon: Users,
            tone: 'warning' as const,
            to: '/ssdd/indigent',
        },
        {
            label: 'Closed this month',
            value: stats.closedMonth,
            sub: 'Assistance closed',
            icon: CheckCircle,
            tone: 'success' as const,
            to: '/ssdd/indigent',
        },
        {
            label: 'Citizen records',
            value: stats.citizenRecords,
            sub: 'Persons on file',
            icon: FileText,
            tone: 'info' as const,
            to: '/ssdd/citizens',
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
                            to="/ssdd/indigent"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            Indigent assistance
                            <ChevronRight size={16} />
                        </Link>
                        <Link
                            to="/reports"
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
                        >
                            Reports
                            <BarChart3 size={16} />
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
                            <CardTitle className="text-base">Recent activity</CardTitle>
                            <span className="text-xs text-muted-foreground">Indigent records</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {recentActivity.length === 0 && !loading ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">No recent activity</div>
                            ) : loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-muted-foreground" />
                                </div>
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
