import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { CheckCircle, Users, FileText, Building2, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'

const QUICK_ACTIONS = [
    { label: 'Manage users', emoji: '👥', path: '/admin/users' },
    { label: 'Audit logs', emoji: '📜', path: '/admin/audit' },
    { label: 'Backups', emoji: '💾', path: '/admin/migration' },
    { label: 'Government directory', emoji: '🏛️', path: '/admin/employees' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    rejected: 'destructive',
}

const toneClasses = {
    muted: 'bg-surface-subtle text-text-primary-token',
    success: 'bg-state-success-soft text-state-success',
    info: 'bg-state-info-soft text-state-info',
    warning: 'bg-state-warning-soft text-state-warning',
} as const

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

type ActivityItem = { id: string; action: string; subject: string; time: string; status: string }

export default function SystemAdminDashboard() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        systemUsers: 0,
        activeUsers: 0,
        auditEntries: 0,
        offices: 0,
    })
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([])

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [usersRes, activeRes, auditRes, officesRes, auditRecent] = await Promise.all([
                    supabase.from('system_users').select('*', { count: 'exact', head: true }),
                    supabase.from('system_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
                    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
                    supabase.from('government_office').select('*', { count: 'exact', head: true }),
                    supabase
                        .from('audit_logs')
                        .select('id, action, subject, timestamp, status')
                        .order('timestamp', { ascending: false })
                        .limit(8),
                ])
                setStats({
                    systemUsers: usersRes.count ?? 0,
                    activeUsers: activeRes.count ?? 0,
                    auditEntries: auditRes.count ?? 0,
                    offices: officesRes.count ?? 0,
                })
                const rows = auditRecent.data || []
                setRecentActivity(
                    rows.map((r: any) => ({
                        id: String(r.id),
                        action: r.action || 'Audit',
                        subject: r.subject || '—',
                        time: r.timestamp
                            ? new Date(r.timestamp).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })
                            : '—',
                        status: r.status || 'success',
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
            label: 'System users',
            value: stats.systemUsers,
            sub: 'Accounts in system_users',
            icon: Users,
            tone: 'muted' as const,
            to: '/admin/users',
        },
        {
            label: 'Active users',
            value: stats.activeUsers,
            sub: 'is_active = true',
            icon: CheckCircle,
            tone: 'success' as const,
            to: '/admin/users',
        },
        {
            label: 'Audit entries',
            value: stats.auditEntries,
            sub: 'Immutable audit_logs',
            icon: FileText,
            tone: 'info' as const,
            to: '/admin/audit',
        },
        {
            label: 'Government offices',
            value: stats.offices,
            sub: 'Offices registered',
            icon: Building2,
            tone: 'warning' as const,
            to: '/admin/offices',
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
                            to="/admin/users"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            User management
                            <ChevronRight size={16} />
                        </Link>
                        <Link
                            to="/admin/audit"
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
                        >
                            Audit logs
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
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium ${toneClasses[kpi.tone]}`}>
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
                            <span className="text-xs text-muted-foreground">Audit logs</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {recentActivity.length === 0 && !loading ? (
                                <div className="text-sm text-muted-foreground py-8 text-center">No audit entries loaded</div>
                            ) : loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                recentActivity.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-md hover:bg-bg-hover transition-colors cursor-pointer">
                                        <div className="w-8 h-8 rounded-md bg-surface-subtle flex items-center justify-center text-xs font-semibold text-text-primary-token shrink-0">
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
                            <div className="space-y-1.5">
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
