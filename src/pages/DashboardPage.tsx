import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import type { UserRole } from '@/types'
import { TrendingUp, TrendingDown, Clock, CheckCircle, AlertTriangle, Users, FileText, Skull, CreditCard, Package } from 'lucide-react'
import {
    AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Mock data per role ─────────────────────────────────────────────────────
const DASHBOARD_DATA: Record<UserRole, {
    kpis: Array<{ label: string; value: string | number; change: number; icon: React.FC<any>; color: string }>
    recentActivity: Array<{ id: string; action: string; subject: string; time: string; status: string }>
    chartData?: any
}> = {
    cemetery_office: {
        kpis: [
            { label: 'Pending Applications', value: 7, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Approved This Month', value: 23, change: 5, icon: CheckCircle, color: '#34d399' },
            { label: 'Available Niches', value: 142, change: -3, icon: Package, color: '#60a5fa' },
            { label: 'Indigent Cases', value: 4, change: 1, icon: Users, color: '#a78bfa' },
        ],
        recentActivity: [
            { id: 'BA-2024-045', action: 'New Burial Application', subject: 'Dela Cruz, Maria', time: '10 min ago', status: 'pending' },
            { id: 'BA-2024-044', action: 'Application Approved', subject: 'Santos, Jose', time: '1 hr ago', status: 'approved' },
            { id: 'BR-2024-012', action: 'Burial Record Created', subject: 'Reyes, Carmen', time: '3 hrs ago', status: 'completed' },
            { id: 'IA-2024-008', action: 'Indigent Case Opened', subject: 'Villanueva, Ana', time: '5 hrs ago', status: 'pending' },
            { id: 'BR-2024-011', action: 'Niche Assigned', subject: 'Cruz, Roberto', time: '1 day ago', status: 'completed' },
        ],
        chartData: [
            { month: 'Sep', burials: 18, applications: 22 }, { month: 'Oct', burials: 21, applications: 25 },
            { month: 'Nov', burials: 15, applications: 19 }, { month: 'Dec', burials: 28, applications: 35 },
            { month: 'Jan', burials: 12, applications: 16 }, { month: 'Feb', burials: 23, applications: 28 },
        ],
    },
    ssdd: {
        kpis: [
            { label: 'Assigned Cases', value: 12, change: 3, icon: Users, color: '#34d399' },
            { label: 'Pending Assistance', value: 3, change: -1, icon: Clock, color: '#fbbf24' },
            { label: 'Closed This Month', value: 8, change: 2, icon: CheckCircle, color: '#60a5fa' },
            { label: 'Citizen Records', value: 1842, change: 12, icon: FileText, color: '#a78bfa' },
        ],
        recentActivity: [
            { id: 'IA-2024-012', action: 'New Indigent Case', subject: 'Bautista, Pedro', time: '20 min ago', status: 'pending' },
            { id: 'IA-2024-011', action: 'Case Resolved', subject: 'Gomez, Lydia', time: '2 hrs ago', status: 'completed' },
            { id: 'IA-2024-010', action: 'Assistance Granted', subject: 'Ramos, Felix', time: '4 hrs ago', status: 'approved' },
        ],
        chartData: [],
    },
    death_registration: {
        kpis: [
            { label: 'Pending Certificates', value: 5, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Verified Today', value: 8, change: 3, icon: CheckCircle, color: '#34d399' },
            { label: 'Docs Received', value: 31, change: 5, icon: FileText, color: '#60a5fa' },
            { label: 'Approvals Pending', value: 2, change: 0, icon: Users, color: '#a78bfa' },
        ],
        recentActivity: [
            { id: 'DC-2024-099', action: 'Certificate Submitted', subject: 'Pascual, Rodrigo', time: '15 min ago', status: 'pending' },
            { id: 'DC-2024-098', action: 'Certificate Verified', subject: 'Torres, Elena', time: '1 hr ago', status: 'approved' },
        ],
        chartData: [],
    },
    citizen: {
        kpis: [
            { label: 'My Applications', value: 2, change: 1, icon: FileText, color: '#60a5fa' },
            { label: 'Pending Approvals', value: 1, change: 0, icon: Clock, color: '#fbbf24' },
            { label: 'Completed', value: 3, change: 2, icon: CheckCircle, color: '#34d399' },
            { label: 'Payments Due', value: 1, change: 0, icon: CreditCard, color: '#f87171' },
        ],
        recentActivity: [
            { id: 'BA-2024-044', action: 'Burial Application Approved', subject: 'Application #BA-044', time: '30 min ago', status: 'approved' },
            { id: 'PR-2024-018', action: 'Park Reservation Pending', subject: 'Quezon Memorial Pk.', time: '2 days ago', status: 'pending' },
        ],
        chartData: [],
    },
    parks_admin: {
        kpis: [
            { label: 'Pending Reservations', value: 4, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Approved This Month', value: 16, change: 4, icon: CheckCircle, color: '#34d399' },
            { label: 'Active Venues', value: 8, change: 0, icon: Package, color: '#60a5fa' },
            { label: 'Usage Log Entries', value: 24, change: 6, icon: FileText, color: '#4ade80' },
        ],
        recentActivity: [
            { id: 'PR-2024-023', action: 'New Reservation Request', subject: 'Burnham Park — Events', time: '1 hr ago', status: 'pending' },
            { id: 'PR-2024-022', action: 'Permit Issued', subject: 'Amoranto Stadium', time: '3 hrs ago', status: 'approved' },
        ],
        chartData: [
            { day: 'Mon', reservations: 3 }, { day: 'Tue', reservations: 5 }, { day: 'Wed', reservations: 2 },
            { day: 'Thu', reservations: 7 }, { day: 'Fri', reservations: 9 }, { day: 'Sat', reservations: 12 }, { day: 'Sun', reservations: 8 },
        ],
    },
    reservation_officer: {
        kpis: [
            { label: 'Incoming Park Requests', value: 2, change: 1, icon: Clock, color: '#fbbf24' },
            { label: 'Approved This Week', value: 7, change: 2, icon: CheckCircle, color: '#34d399' },
            { label: 'Event Permits Issued', value: 18, change: 3, icon: FileText, color: '#60a5fa' },
            { label: 'Park Venues', value: 5, change: 0, icon: Package, color: '#fbbf24' },
        ],
        recentActivity: [
            { id: 'PR-2024-019', action: 'New Park Reservation', subject: 'Quezon Memorial Circle — Open Grounds', time: '2 hrs ago', status: 'pending' },
        ],
        chartData: [],
    },
    punong_barangay: {
        kpis: [
            { label: 'Pending Approvals', value: 2, change: 1, icon: Clock, color: '#fbbf24' },
            { label: 'Approved This Month', value: 14, change: 3, icon: CheckCircle, color: '#34d399' },
            { label: 'Ordinances', value: 32, change: 0, icon: FileText, color: '#60a5fa' },
            { label: 'Active Requests', value: 5, change: 2, icon: AlertTriangle, color: '#fb923c' },
        ],
        recentActivity: [
            { id: 'BR-2024-019', action: 'Reservation Awaiting Approval', subject: 'Multi-Purpose Hall', time: '2 hrs ago', status: 'pending' },
        ],
        chartData: [],
    },
    barangay_secretary: {
        kpis: [
            { label: 'Pending Approvals', value: 2, change: 1, icon: Clock, color: '#fbbf24' },
            { label: 'Approved This Month', value: 14, change: 3, icon: CheckCircle, color: '#34d399' },
            { label: 'Ordinances on File', value: 32, change: 0, icon: FileText, color: '#e879f9' },
            { label: 'Requests Filed', value: 128, change: 8, icon: Package, color: '#60a5fa' },
        ],
        recentActivity: [
            { id: 'BR-2024-019', action: 'Reservation Forwarded', subject: 'Multi-Purpose Hall', time: '2 hrs ago', status: 'pending' },
        ],
        chartData: [],
    },
    utility_engineering: {
        kpis: [
            { label: 'Assigned Tickets', value: 9, change: 3, icon: Clock, color: '#fbbf24' },
            { label: 'In Progress', value: 4, change: 1, icon: AlertTriangle, color: '#fb923c' },
            { label: 'Resolved Today', value: 5, change: 2, icon: CheckCircle, color: '#34d399' },
            { label: 'Leak Reports', value: 3, change: -1, icon: FileText, color: '#22d3ee' },
        ],
        recentActivity: [
            { id: 'ST-2024-088', action: 'Ticket Assigned', subject: 'Q.C. Ave Leak — Severe', time: '30 min ago', status: 'pending' },
            { id: 'ST-2024-087', action: 'Repair In Progress', subject: 'Pipe Burst — Brgy. 123', time: '2 hrs ago', status: 'pending' },
        ],
        chartData: [],
    },
    utility_helpdesk: {
        kpis: [
            { label: 'Open Tickets', value: 12, change: 4, icon: Clock, color: '#fbbf24' },
            { label: 'Triaged Today', value: 7, change: 2, icon: CheckCircle, color: '#34d399' },
            { label: 'Pending Assign', value: 5, change: 1, icon: AlertTriangle, color: '#fb923c' },
            { label: 'Connections', value: 38, change: 5, icon: Package, color: '#38bdf8' },
        ],
        recentActivity: [
            { id: 'ST-2024-092', action: 'New Ticket Submitted', subject: 'Water Connection — New', time: '5 min ago', status: 'pending' },
        ],
        chartData: [
            { type: 'Water Connection', count: 18 },
            { type: 'Leak Report', count: 9 },
            { type: 'Drainage', count: 6 },
            { type: 'General', count: 5 },
        ],
    },
    cgsd_management: {
        kpis: [
            { label: 'Total Properties', value: 284, change: 3, icon: Package, color: '#f472b6' },
            { label: 'Pending Inspections', value: 8, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Reports Submitted', value: 12, change: 4, icon: FileText, color: '#60a5fa' },
            { label: 'Approved Reports', value: 9, change: 3, icon: CheckCircle, color: '#34d399' },
        ],
        recentActivity: [
            { id: 'IR-2024-035', action: 'Inspection Scheduled', subject: 'City Hall — Equipment', time: '1 hr ago', status: 'pending' },
        ],
        chartData: [],
    },
    famcd: {
        kpis: [
            { label: 'Total Properties', value: 284, change: 3, icon: Package, color: '#a3e635' },
            { label: 'Inventory Requests', value: 6, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Reports Submitted', value: 12, change: 4, icon: FileText, color: '#60a5fa' },
            { label: 'Submissions Done', value: 5, change: 1, icon: CheckCircle, color: '#34d399' },
        ],
        recentActivity: [
            { id: 'INV-2024-011', action: 'Inventory Request Filed', subject: 'IT Equipment', time: '2 hrs ago', status: 'pending' },
        ],
        chartData: [],
    },
    treasurer: {
        kpis: [
            { label: 'Total Collections Today', value: '₱124,500', change: 12, icon: CreditCard, color: '#fcd34d' },
            { label: 'Pending Reconciliation', value: 6, change: 2, icon: Clock, color: '#fbbf24' },
            { label: 'Failed Transactions', value: 2, change: -1, icon: AlertTriangle, color: '#f87171' },
            { label: 'Settled Today', value: 31, change: 8, icon: CheckCircle, color: '#34d399' },
        ],
        recentActivity: [
            { id: 'TXN-2024-502', action: 'Payment Settled', subject: 'GCash — BA-2024-044', time: '15 min ago', status: 'settled' },
            { id: 'TXN-2024-499', action: 'Failed Transaction', subject: 'Landbank — ST-030', time: '2 hrs ago', status: 'failed' },
        ],
        chartData: [
            { date: 'Feb 27', amount: 89500 }, { date: 'Feb 28', amount: 112000 },
            { date: 'Mar 1', amount: 95000 }, { date: 'Mar 2', amount: 134000 },
            { date: 'Mar 3', amount: 108000 }, { date: 'Mar 4', amount: 124500 },
        ],
    },
    system_admin: {
        kpis: [
            { label: 'Total Users', value: 248, change: 5, icon: Users, color: '#94a3b8' },
            { label: 'Active Sessions', value: 12, change: 3, icon: CheckCircle, color: '#34d399' },
            { label: 'Audit Entries', value: 1024, change: 87, icon: FileText, color: '#60a5fa' },
            { label: 'System Alerts', value: 2, change: -1, icon: AlertTriangle, color: '#fbbf24' },
        ],
        recentActivity: [
            { id: 'AU-2024-8841', action: 'User Created', subject: 'eng.ramirez@bpm.gov', time: '1 hr ago', status: 'completed' },
            { id: 'AU-2024-8840', action: 'Role Assigned', subject: 'utility_engineering', time: '2 hrs ago', status: 'completed' },
            { id: 'AU-2024-8839', action: 'Login Attempt Failed', subject: 'unknown@gmail.com', time: '3 hrs ago', status: 'rejected' },
        ],
        chartData: [],
    },
}

const STATUS_BADGE: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
    rejected: 'destructive',
    settled: 'success',
    failed: 'destructive',
    active: 'info',
}

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#34d399', '#fbbf24']

export default function DashboardPage() {
    const { user } = useAuth()
    if (!user) return null

    const roleMeta = ROLE_META[user.role]
    const data = DASHBOARD_DATA[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
            {/* ─── Header ─── */}
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: roleMeta.bgColor, color: roleMeta.color }}>
                        {roleMeta.label}
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

            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {data.kpis.map((kpi, i) => {
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
                {/* ─── Recent Activity ─── */}
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Recent Activity</CardTitle>
                            <span className="text-xs text-muted-foreground">Live updates</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {data.recentActivity.map(item => (
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
                                        <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5">
                                            {item.status}
                                        </Badge>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ─── Chart / Quick-links ─── */}
                <div className="space-y-4">
                    {user.role === 'cemetery_office' && data.chartData && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Burials vs. Applications</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={160}>
                                    <ReAreaChart data={data.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }} />
                                        <Area type="monotone" dataKey="applications" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="burials" stroke="#a78bfa" fill="rgba(167,139,250,0.1)" strokeWidth={2} />
                                    </ReAreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {user.role === 'treasurer' && data.chartData && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Collections (6 days)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={160}>
                                    <BarChart data={data.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }} formatter={(v: any) => [`₱${v.toLocaleString()}`, 'Amount']} />
                                        <Bar dataKey="amount" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {user.role === 'utility_helpdesk' && data.chartData && data.chartData.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm">Tickets by Type</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={data.chartData} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={55} label={({ percent }) => `${(((percent ?? 0) * 100)).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                            {data.chartData.map((_: any, idx: number) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* My Inventory Requests / Reports for requesting offices */}
                    {(user.role === 'punong_barangay' || user.role === 'cemetery_office' || user.role === 'parks_admin') && (
                        <>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">My Inventory Requests</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {getInventoryItems(user.role).map(item => (
                                            <div key={item.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors">
                                                <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                                                <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                                <Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'info' : 'secondary'} className="text-[10px] px-1.5 py-0.5">
                                                    {item.status_label}
                                                </Badge>
                                            </div>
                                        ))}
                                        {getInventoryItems(user.role).length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No inventory requests yet. Coordinate with FAMCD to initiate an inventory cycle for your facilities.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm">My Inventory Reports</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {getInventoryItems(user.role)
                                            .filter(item => item.status === 'completed')
                                            .map(item => (
                                                <div key={item.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors">
                                                    <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                                                    <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                                    <Badge variant="success" className="text-[10px] px-1.5 py-0.5">
                                                        Report Available
                                                    </Badge>
                                                </div>
                                            ))}
                                        {getInventoryItems(user.role).filter(item => item.status === 'completed').length === 0 && (
                                            <p className="text-xs text-muted-foreground">
                                                No completed reports yet. Completed inventory cycles will appear here when FAMCD submits the final report.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}

                    {/* Quick actions */}
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {getQuickActions(user.role).map(qa => (
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
    )
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

function getQuickActions(role: UserRole) {
    const map: Partial<Record<UserRole, Array<{ label: string; emoji: string; path: string }>>> = {
        cemetery_office: [{ label: 'Review Applications', emoji: '📋', path: '/burial/applications' }, { label: 'Check Niche Availability', emoji: '🪦', path: '/burial/niches' }],
        citizen: [{ label: 'Apply for Burial', emoji: '⚰️', path: '/citizen/apply/burial' }, { label: 'Reserve a Park', emoji: '🌳', path: '/citizen/apply/park' }, { label: 'Report a Leak', emoji: '💧', path: '/citizen/apply/leak' }],
        parks_admin: [{ label: 'View Calendar', emoji: '📅', path: '/parks/calendar' }, { label: 'Approve Reservations', emoji: '✅', path: '/parks/reservations' }],
        utility_engineering: [{ label: 'View Assigned Tickets', emoji: '🔧', path: '/utility/tickets' }, { label: 'Log a Repair', emoji: '🛠️', path: '/utility/jobs' }],
        treasurer: [{ label: 'Reconciliation Queue', emoji: '🔄', path: '/treasurer/reconciliation' }, { label: 'Issue Official Receipt', emoji: '🧾', path: '/treasurer/receipts' }],
        system_admin: [{ label: 'Manage Users', emoji: '👥', path: '/admin/users' }, { label: 'View Audit Logs', emoji: '📜', path: '/admin/audit' }, { label: 'Legacy Migration', emoji: '📦', path: '/admin/migration' }],
        cgsd_management: [{ label: 'New Inspection', emoji: '🔍', path: '/assets/inspections' }, { label: 'View Reports', emoji: '📊', path: '/assets/reports' }],
    }
    return map[role] ?? [{ label: 'View Dashboard', emoji: '🏠', path: '/dashboard' }]
}

function getInventoryItems(role: UserRole): Array<{ id: string; asset: string; status: 'draft' | 'in_progress' | 'completed'; status_label: string }> {
    if (role === 'punong_barangay') {
        return [
            { id: 'INV-BRGY-001', asset: 'Barangay Hall & Multi-purpose Complex', status: 'in_progress', status_label: 'For Inspection' },
            { id: 'INV-BRGY-000', asset: 'Covered Court & Open Grounds', status: 'completed', status_label: 'Report Available' },
        ]
    }
    if (role === 'cemetery_office') {
        return [
            { id: 'INV-CEM-004', asset: 'Public Cemetery — North Block Niches', status: 'draft', status_label: 'Draft Request' },
            { id: 'INV-CEM-003', asset: 'Public Cemetery — Main Admin Building', status: 'completed', status_label: 'Report Available' },
        ]
    }
    if (role === 'parks_admin') {
        return [
            { id: 'INV-PARK-007', asset: 'Central Park Grandstand & Stage', status: 'in_progress', status_label: 'Inspection Scheduled' },
            { id: 'INV-PARK-006', asset: 'Playground & Fitness Equipment', status: 'completed', status_label: 'Report Available' },
        ]
    }
    return []
}
