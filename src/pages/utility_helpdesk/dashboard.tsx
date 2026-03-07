import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Package, AlertTriangle } from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const KPI_DATA = [
    { label: 'Open Tickets', value: 12, change: 4, icon: Clock, color: '#fbbf24' },
    { label: 'Triaged Today', value: 7, change: 2, icon: CheckCircle, color: '#34d399' },
    { label: 'Pending Assign', value: 5, change: 1, icon: AlertTriangle, color: '#fb923c' },
    { label: 'Utility Status', value: 38, change: 5, icon: Package, color: '#38bdf8' },
]

const RECENT_ACTIVITY = [
    { id: 'ST-2024-092', action: 'New Ticket Submitted', subject: 'Water Connection — New', time: '5 min ago', status: 'pending' },
]

const CHART_DATA = [
    { type: 'Water Connection', count: 18 },
    { type: 'Leak Report', count: 9 },
    { type: 'Drainage', count: 6 },
    { type: 'General', count: 5 },
]

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#34d399', '#fbbf24']

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
                            <CardTitle className="text-sm">Tickets by Type</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={160}>
                                <PieChart>
                                    <Pie
                                        data={CHART_DATA}
                                        dataKey="count"
                                        nameKey="type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={55}
                                        label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                                        labelLine={false}
                                        fontSize={10}
                                    >
                                        {CHART_DATA.map((_, idx) => (
                                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }} />
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
