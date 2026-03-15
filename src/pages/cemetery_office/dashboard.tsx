import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Users, Package } from 'lucide-react'
import {
    AreaChart as ReAreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const KPI_DATA = [
    { label: 'Pending Applications', value: 7, change: 2, icon: Clock, color: '#fbbf24' },
    { label: 'Approved This Month', value: 23, change: 5, icon: CheckCircle, color: '#34d399' },
    { label: 'Available Niches', value: 142, change: -3, icon: Package, color: '#60a5fa' },
    { label: 'Indigent Cases', value: 4, change: 1, icon: Users, color: '#a78bfa' },
]

const RECENT_ACTIVITY = [
    { id: 'BA-2024-045', action: 'New Burial Application', subject: 'Dela Cruz, Maria', time: '10 min ago', status: 'pending' },
    { id: 'BA-2024-044', action: 'Application Approved', subject: 'Santos, Jose', time: '1 hr ago', status: 'approved' },
    { id: 'BR-2024-012', action: 'Burial Record Created', subject: 'Reyes, Carmen', time: '3 hrs ago', status: 'completed' },
    { id: 'IA-2024-008', action: 'Indigent Case Opened', subject: 'Villanueva, Ana', time: '5 hrs ago', status: 'pending' },
    { id: 'BR-2024-011', action: 'Niche Assigned', subject: 'Cruz, Roberto', time: '1 day ago', status: 'completed' },
]

const CHART_DATA = [
    { month: 'Sep', burials: 18, applications: 22 },
    { month: 'Oct', burials: 21, applications: 25 },
    { month: 'Nov', burials: 15, applications: 19 },
    { month: 'Dec', burials: 28, applications: 35 },
    { month: 'Jan', burials: 12, applications: 16 },
    { month: 'Feb', burials: 23, applications: 28 },
]

const INVENTORY_ITEMS = [
    { id: 'INV-CEM-004', asset: 'Public Cemetery — North Block Niches', status: 'draft', status_label: 'Draft Request' },
    { id: 'INV-CEM-003', asset: 'Public Cemetery — Main Admin Building', status: 'completed', status_label: 'Report Available' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'info' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    rejected: 'destructive',
    settled: 'success',
    failed: 'destructive',
    active: 'info',
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

export default function CemeteryOfficeDashboard() {
    const { user } = useAuth()
    if (!user) return null

    const meta = ROLE_META[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span
                        className="px-2.5 py-1 rounded-md text-xs font-semibold"
                        style={{ background: meta.bgColor, color: meta.color }}
                    >
                        {meta.label}
                    </span>
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Good {getGreeting()}, {user.full_name.split(' ')[0]}! 👋
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {new Date().toLocaleDateString('en-PH', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                    {user.office && ` · ${user.office}`}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {KPI_DATA.map((kpi, i) => {
                    const Icon = kpi.icon
                    const isPositive = kpi.change >= 0
                    return (
                        <Card key={i} className="card-hover">
                            <CardContent className="pt-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ background: `${kpi.color}18` }}
                                    >
                                        <Icon size={18} style={{ color: kpi.color }} />
                                    </div>
                                    {kpi.change !== 0 && (
                                        <div
                                            className={`flex items-center gap-1 text-xs font-semibold ${
                                                isPositive ? 'text-emerald-500' : 'text-red-500'
                                            }`}
                                        >
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
                {/* Recent Activity */}
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
                                <div
                                    key={item.id}
                                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {item.id.slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                                        <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                            variant={STATUS_BADGE[item.status] ?? 'secondary'}
                                            className="text-[10px] px-1.5 py-0.5"
                                        >
                                            {item.status}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                            {item.time}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Charts / Inventory / Quick Actions */}
                <div className="space-y-4">
                    {/* Area Chart: Burials vs Applications */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Burials vs. Applications</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={160}>
                                <ReAreaChart data={CHART_DATA}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="month"
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                    />
                                    <YAxis
                                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'hsl(var(--card))',
                                            border: '1px solid hsl(var(--border))',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            color: 'hsl(var(--foreground))',
                                        }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="applications"
                                        stroke="#3b82f6"
                                        fill="rgba(59,130,246,0.1)"
                                        strokeWidth={2}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="burials"
                                        stroke="#a78bfa"
                                        fill="rgba(167,139,250,0.1)"
                                        strokeWidth={2}
                                    />
                                </ReAreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* My Inventory Requests */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">My Inventory Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {INVENTORY_ITEMS.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors"
                                    >
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            {item.id}
                                        </span>
                                        <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                        <Badge
                                            variant={
                                                item.status === 'completed'
                                                    ? 'success'
                                                    : item.status === 'in_progress'
                                                    ? 'info'
                                                    : 'secondary'
                                            }
                                            className="text-[10px] px-1.5 py-0.5"
                                        >
                                            {item.status_label}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* My Inventory Reports */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">My Inventory Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {INVENTORY_ITEMS.filter(item => item.status === 'completed').map(item => (
                                    <div
                                        key={item.id}
                                        className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors"
                                    >
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                            {item.id}
                                        </span>
                                        <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                            Report Available
                                        </Badge>
                                    </div>
                                ))}
                                {INVENTORY_ITEMS.filter(item => item.status === 'completed').length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        No completed reports yet. Completed inventory cycles will appear here when
                                        FAMCD submits the final report.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {[
                                    {
                                        label: 'Review Applications',
                                        emoji: '📋',
                                        path: '/burial/applications',
                                    },
                                    {
                                        label: 'Check Niche Availability',
                                        emoji: '🪦',
                                        path: '/burial/niches',
                                    },
                                ].map(qa => (
                                    <a
                                        key={qa.label}
                                        href={qa.path}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border"
                                    >
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
    )}
