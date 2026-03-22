import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Users, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

const KPI_DATA = [
    { label: 'Pending Certificates', value: 5, change: 2, icon: Clock, color: '#fbbf24' },
    { label: 'Verified Today', value: 8, change: 3, icon: CheckCircle, color: '#34d399' },
    { label: 'Docs Received', value: 31, change: 5, icon: FileText, color: '#60a5fa' },
    { label: 'Approvals Pending', value: 2, change: 0, icon: Users, color: '#a78bfa' },
]

export interface RecentAct {
    id: string
    action: string
    subject: string
    time: string
    status: string
}

const QUICK_ACTIONS = [
    { label: 'Verify Certificates', emoji: '📋', path: '/death/verify' },
    { label: 'Approve Permits', emoji: '✅', path: '/death/approvals' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    rejected: 'destructive',
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

export default function DeathRegistrationDashboard() {
    const { user } = useAuth()
    const [recentActivity, setRecentActivity] = React.useState<RecentAct[]>([])

    React.useEffect(() => {
        async function fetchRecent() {
            const { data } = await supabase
                .from('online_burial_application')
                .select(`
                    application_id,
                    document_validation_status,
                    application_status,
                    submission_date,
                    person:person_id ( full_name )
                `)
                .order('submission_date', { ascending: false })
                .limit(5)

            if (data) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                        status: renderStatus
                    }
                })
                setRecentActivity(formatted)
            }
        }
        fetchRecent()
    }, [])

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
                            {recentActivity.length > 0 ? recentActivity.map(item => (
                                <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {item.id.slice(0, 2).toUpperCase()}
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
                            )) : (
                                <div className="text-xs text-muted-foreground py-4 text-center">No recent activity</div>
                            )}
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
