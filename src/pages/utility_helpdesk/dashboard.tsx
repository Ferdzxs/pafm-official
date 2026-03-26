import React, { useCallback, useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Package,
  AlertTriangle,
  Zap,
  Activity,
  ChevronRight,
  RefreshCw,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getHelpdeskStats, getRecentUtilityActivity, type TicketsByTypeStat } from '@/lib/serviceTickets'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { cn } from '@/lib/utils'

const PIE_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openTickets, setOpenTickets] = useState(0)
  const [triagedToday, setTriagedToday] = useState(0)
  const [pendingAssign, setPendingAssign] = useState(0)
  const [byType, setByType] = useState<TicketsByTypeStat[]>([])
  const [activity, setActivity] = useState<
    { id: string; action: string; subject: string; time: string; status: string }[]
  >([])

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const stats = await getHelpdeskStats()
      const recent = await getRecentUtilityActivity()
      setOpenTickets(stats.kpis.openCount)
      setTriagedToday(stats.kpis.triagedToday)
      setPendingAssign(stats.kpis.pendingAssignment)
      setByType(stats.byType)
      setActivity(
        recent.map(item => ({
          id: item.reference_id,
          action: item.message,
          subject: item.reference_id,
          time: new Date(item.sent_at).toLocaleTimeString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          status: 'pending',
        })),
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load utility helpdesk statistics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (!user) return null

  const meta = ROLE_META[user.role]

  const KPI_DATA = [
    { label: 'Open Tickets', sub: 'All open queue', value: openTickets, change: 0, icon: Clock, variant: 'warning' as const, to: '/utility/tickets' },
    { label: 'Triaged Today', sub: 'Processed today', value: triagedToday, change: 0, icon: CheckCircle, variant: 'success' as const, to: '/utility/triage' },
    { label: 'Pending Assign', sub: 'Awaiting team', value: pendingAssign, change: 0, icon: AlertTriangle, variant: 'warning' as const, to: '/utility/assign' },
    {
      label: 'Desk Load',
      sub: 'Combined volume',
      value: openTickets + triagedToday + pendingAssign,
      change: 0,
      icon: Package,
      variant: 'info' as const,
      to: '/utility/triage',
    },
  ]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
              {meta.label.toUpperCase()}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Helpdesk overview
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Good {getGreeting()}, {user.full_name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm max-w-[600px] font-medium italic">
            {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {user.office && ` · ${user.office}`}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button variant="outline" size="sm" onClick={() => void loadDashboard()} disabled={loading} className="shadow-xs border-border">
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
            Sync data
          </Button>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <span className="font-medium">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon
          const isPositive = kpi.change >= 0
          const variant = kpi.variant
          return (
            <Link key={i} to={kpi.to} className="group block min-h-[120px]">
            <Card className="h-full overflow-hidden border-border shadow-xs transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5 bg-card">
              <CardContent className="p-6 relative">
                <div className="absolute -top-2 -right-2 p-4 opacity-10 h-full flex items-center group-hover:scale-110 group-hover:opacity-20 transition-all duration-500 pointer-events-none">
                  <Icon size={80} />
                </div>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center p-2.5 rounded-xl transition-all duration-300',
                        variant === 'warning'
                          ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100'
                          : variant === 'success'
                            ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'
                            : variant === 'info'
                              ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
                              : 'bg-primary/20 text-primary group-hover:bg-primary/30',
                      )}
                    >
                      <Icon size={20} />
                    </span>
                    <div className="flex items-center gap-1">
                    {kpi.change !== 0 && (
                      <div className={cn('flex items-center gap-1 text-xs font-semibold', isPositive ? 'text-emerald-500' : 'text-red-500')}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(kpi.change)}
                      </div>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-3xl font-bold tracking-tighter">{loading ? '—' : kpi.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-snug pt-0.5">{kpi.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Utility stream
              </CardTitle>
              <CardDescription>Notifications and routing events from the helpdesk queue</CardDescription>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live</span>
          </CardHeader>
          <CardContent className="flex-1 px-4">
            {loading && activity.length === 0 ? (
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground py-8">Synchronizing…</p>
            ) : activity.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2 bg-muted/40">
                <Package size={24} className="opacity-20" /> No recent utility activity logged yet.
              </div>
            ) : (
              <div className="space-y-1">
                {activity.map(item => (
                  <div key={item.id} className="group relative flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-muted/80 border border-transparent">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-background border flex items-center justify-center shadow-xs">
                        <span className="text-[10px] font-bold text-muted-foreground">{item.id.slice(0, 2)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{item.action}</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight truncate">{item.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[9px] font-bold uppercase tracking-tighter hidden md:flex">
                        {item.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                      <ChevronRight size={14} className="text-muted-foreground opacity-40 hidden sm:block" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-primary">
                <Package size={14} /> Tickets by type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={
                      byType.length === 0
                        ? [
                            { ticket_type: 'water_connection', count: 0 },
                            { ticket_type: 'leak_report', count: 0 },
                            { ticket_type: 'drainage', count: 0 },
                            { ticket_type: 'general', count: 0 },
                          ]
                        : byType
                    }
                    dataKey="count"
                    nameKey="ticket_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={55}
                    label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    fontSize={10}
                  >
                    {(byType.length === 0 ? [1, 2, 3, 4] : byType).map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted/40">
              <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-primary">
                <Zap size={14} className="fill-primary" /> Quick actions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="space-y-1">
                {QUICK_ACTIONS.map(qa => (
                  <NavLink
                    key={qa.label}
                    to={qa.path}
                    className="flex items-center justify-between group px-3 py-3 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border mt-1.5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shadow-xs text-sm group-hover:scale-110 transition-transform">
                        <EmojiIcon symbol={qa.emoji} className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">{qa.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </NavLink>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
