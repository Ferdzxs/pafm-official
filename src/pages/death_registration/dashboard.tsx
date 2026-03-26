import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, CheckCircle, Users, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'

export interface RecentAct {
    id: string
    action: string
    subject: string
    time: string
    status: string
}

const QUICK_ACTIONS = [
    { label: 'Verify certificates', emoji: '📋', path: '/death/verify' },
    { label: 'Received documents', emoji: '📥', path: '/death/documents' },
    { label: 'Approvals & signing', emoji: '✅', path: '/death/approvals' },
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

export default function DeathRegistrationDashboard() {
    const { user } = useAuth()
    const [recentActivity, setRecentActivity] = React.useState<RecentAct[]>([])
    const [loading, setLoading] = React.useState(true)
    const [kpiStats, setKpiStats] = React.useState({
        verificationQueue: 0,
        pendingDocValidation: 0,
        awaitingSigning: 0,
        permitsIssued: 0,
    })

    React.useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const [
                    verifyRes,
                    pendingDocsRes,
                    signingRes,
                    permitsRes,
                    recentRes,
                ] = await Promise.all([
                    supabase
                        .from('online_burial_application')
                        .select('*', { count: 'exact', head: true })
                        .eq('document_validation_status', 'validated')
                        .neq('application_status', 'verified')
                        .neq('application_status', 'approved')
                        .neq('application_status', 'rejected'),
                    supabase
                        .from('online_burial_application')
                        .select('*', { count: 'exact', head: true })
                        .eq('document_validation_status', 'pending'),
                    supabase
                        .from('online_burial_application')
                        .select('*', { count: 'exact', head: true })
                        .eq('application_status', 'verified'),
                    supabase
                        .from('digital_document')
                        .select('*', { count: 'exact', head: true })
                        .eq('document_type', 'burial_permit'),
                    supabase
                        .from('online_burial_application')
                        .select(`
                    application_id,
                    document_validation_status,
                    application_status,
                    submission_date,
                    person:person_id ( full_name )
                `)
                        .order('submission_date', { ascending: false })
                        .limit(5),
                ])

                setKpiStats({
                    verificationQueue: verifyRes.count ?? 0,
                    pendingDocValidation: pendingDocsRes.count ?? 0,
                    awaitingSigning: signingRes.count ?? 0,
                    permitsIssued: permitsRes.count ?? 0,
                })

                const data = recentRes.data
                if (data) {
                    const formatted = data.map((item: any) => {
                        const applicant = Array.isArray(item.person) ? item.person[0]?.full_name : item.person?.full_name
                        const subDate = new Date(item.submission_date as string)
                        const diffMs = new Date().getTime() - subDate.getTime()
                        const diffMins = Math.floor(diffMs / 60000)
                        const diffHrs = Math.floor(diffMins / 60)
                        const diffDays = Math.floor(diffHrs / 24)

                        let timeStr = 'Just now'
                        if (diffMins < 60 && diffMins > 0) timeStr = `${diffMins} min ago`
                        else if (diffHrs < 24 && diffHrs > 0) timeStr = `${diffHrs} hr ago`
                        else if (diffDays > 0) timeStr = `${diffDays} days ago`

                        let actionLabel = 'Application Submitted'
                        const renderStatus = item.document_validation_status || 'pending'
                        if (item.document_validation_status === 'validated') actionLabel = 'Documents Validated'
                        if (item.application_status === 'approved') actionLabel = 'Application Approved'

                        return {
                            id: item.application_id,
                            action: actionLabel,
                            subject: applicant || 'Unknown Applicant',
                            time: timeStr,
                            status: renderStatus,
                        }
                    })
                    setRecentActivity(formatted)
                }
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
            label: 'Certificate verification',
            value: kpiStats.verificationQueue,
            sub: 'Ready for certificate check',
            icon: Clock,
            tone: 'warning' as const,
            to: '/death/verify',
        },
        {
            label: 'Documents to validate',
            value: kpiStats.pendingDocValidation,
            sub: 'Incoming uploads',
            icon: FileText,
            tone: 'info' as const,
            to: '/death/documents',
        },
        {
            label: 'Awaiting signing',
            value: kpiStats.awaitingSigning,
            sub: 'Verified, pending permit',
            icon: Users,
            tone: 'warning' as const,
            to: '/death/approvals',
        },
        {
            label: 'Permits issued',
            value: kpiStats.permitsIssued,
            sub: 'Burial permits on file',
            icon: CheckCircle,
            tone: 'success' as const,
            to: '/death/approvals',
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
                            to="/death/verify"
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
                        >
                            Verification queue
                            <ChevronRight size={16} />
                        </Link>
                        <Link
                            to="/death/documents"
                            className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
                        >
                            Documents
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
                            {recentActivity.length > 0 ? (
                                recentActivity.map(item => (
                                    <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                                        <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                            {item.id.slice(0, 2).toUpperCase()}
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
                            ) : (
                                <div className="text-xs text-muted-foreground py-4 text-center">No recent activity</div>
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
