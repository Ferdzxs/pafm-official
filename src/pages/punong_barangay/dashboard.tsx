import React from 'react'
<<<<<<< HEAD
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, FileText, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const KPI_DATA = [
    { label: 'Pending Approvals', value: 2, change: 1, icon: Clock, color: '#fbbf24' },
    { label: 'Approved This Month', value: 14, change: 3, icon: CheckCircle, color: '#34d399' },
    { label: 'Ordinances', value: 32, change: 0, icon: FileText, color: '#60a5fa' },
    { label: 'Active Requests', value: 5, change: 2, icon: AlertTriangle, color: '#fb923c' },
]

const RECENT_ACTIVITY = [
    { id: 'BR-2024-019', action: 'Reservation Awaiting Approval', subject: 'Multi-Purpose Hall', time: '2 hrs ago', status: 'pending' },
]

const INVENTORY_ITEMS = [
    { id: 'INV-BRGY-001', asset: 'Barangay Hall & Multi-purpose Complex', status: 'in_progress', status_label: 'For Inspection' },
    { id: 'INV-BRGY-000', asset: 'Covered Court & Open Grounds', status: 'completed', status_label: 'Report Available' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'info' | 'secondary'> = {
    pending: 'warning',
    approved: 'success',
    completed: 'success',
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'morning'
    if (h < 17) return 'afternoon'
    return 'evening'
}

export default function PunongBarangayDashboard() {
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
                            <CardTitle className="text-sm">My Inventory Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {INVENTORY_ITEMS.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors">
                                        <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                                        <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                        <Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'info' : 'secondary'} className="text-[10px] px-1.5 py-0.5">
                                            {item.status_label}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">My Inventory Reports</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {INVENTORY_ITEMS.filter(item => item.status === 'completed').map(item => (
                                    <div key={item.id} className="flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-accent/70 transition-colors">
                                        <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
                                        <span className="truncate flex-1 text-foreground">{item.asset}</span>
                                        <Badge variant="success" className="text-[10px] px-1.5 py-0.5">Report Available</Badge>
                                    </div>
                                ))}
                                {INVENTORY_ITEMS.filter(item => item.status === 'completed').length === 0 && (
                                    <p className="text-xs text-muted-foreground">No completed reports yet.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Quick Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-1.5">
                                {[
                                    { label: 'Pending Approvals', emoji: '✅', path: '/barangay/pending' },
                                    { label: 'View Reservations', emoji: '📋', path: '/barangay/reservations' },
                                ].map(qa => (
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
=======
import DashboardPage from '@/pages/DashboardPage'

export default function PunongBarangayDashboard() {
  return <DashboardPage />
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
}
