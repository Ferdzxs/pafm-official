import React, { useEffect, useState } from 'react'
import { useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { supabase } from '@/lib/supabase'
import {
  TrendingUp, TrendingDown, CreditCard, Clock, CheckCircle,
  AlertTriangle, RefreshCw, Receipt, BarChart3, Eye, DollarSign,
  Zap, Activity, ChevronRight, ArrowUpRight,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
type KPI = { label: string; value: string | number; change: number; icon: React.FC<{ size?: number; style?: React.CSSProperties }>; color: string }
type Activity = { payment_id: string; action: string; subject: string; time: string; status: string }
type ChartPoint = { date: string; amount: number }

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toPhpDate(d: Date) { return d.toISOString().split('T')[0] }
function daysBefore(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toPhpDate(d)
}
function fmtPeso(n: number) { return `₱${n.toLocaleString('en-PH')}` }
function elapsed(isoTs: string) {
  const diff = Math.floor((Date.now() - new Date(isoTs).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning', settled: 'success', failed: 'destructive', reconciled: 'secondary',
}

const QUICK_ACTIONS = [
  { label: 'Collections & Payments', icon: DollarSign, path: '/treasurer/collections', desc: 'Process pending fees & view records' },
  { label: 'Official Receipts', icon: Receipt, path: '/treasurer/receipts', desc: 'Browse all issued receipts' },
  { label: 'Audit Logs', icon: Eye, path: '/treasurer/audit', desc: 'Trace every treasury action' },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreasurerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [kpis, setKpis] = useState<KPI[]>([])
  const [activity, setActivity] = useState<Activity[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { void loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    try {
      const today = toPhpDate(new Date())
      const yday = daysBefore(1)

      // ── KPIs ──────────────────────────────────────────────────────────────
      const [todayRes, ydayRes, pendingRes, failedRes, settledRes] = await Promise.all([
        supabase.from('digital_payment').select('amount_paid').eq('payment_status', 'settled').eq('payment_date', today),
        supabase.from('digital_payment').select('amount_paid').eq('payment_status', 'settled').eq('payment_date', yday),
        supabase.from('digital_payment').select('payment_id', { count: 'exact', head: true }).eq('payment_status', 'settled').not('digital_or_no', 'is', null),
        supabase.from('digital_payment').select('payment_id', { count: 'exact', head: true }).eq('payment_status', 'failed'),
        supabase.from('digital_payment').select('payment_id', { count: 'exact', head: true }).eq('payment_status', 'settled').eq('payment_date', today),
      ])

      const todayTotal = (todayRes.data ?? []).reduce((s: number, r: any) => s + (r.amount_paid ?? 0), 0)
      const ydayTotal = (ydayRes.data ?? []).reduce((s: number, r: any) => s + (r.amount_paid ?? 0), 0)
      const collectionChange = ydayTotal > 0 ? Math.round(((todayTotal - ydayTotal) / ydayTotal) * 100) : 0

      const pendingCount = pendingRes.count ?? 0
      const failedCount = failedRes.count ?? 0
      const settledCount = settledRes.count ?? 0

      setKpis([
        { label: 'Total Collections Today', value: fmtPeso(todayTotal), change: collectionChange, icon: CreditCard, color: '#fcd34d' },
        { label: 'Pending Reconciliation', value: pendingCount, change: 0, icon: Clock, color: '#fbbf24' },
        { label: 'Failed Transactions', value: failedCount, change: 0, icon: AlertTriangle, color: '#f87171' },
        { label: 'Settled Today', value: settledCount, change: 0, icon: CheckCircle, color: '#34d399' },
      ])

      // ── Activity ──────────────────────────────────────────────────────────
      const { data: recentPayments } = await supabase
        .from('digital_payment')
        .select('payment_id, payment_status, amount_paid, digital_or_no, payment_date, document_id, transaction_ref_no')
        .in('payment_status', ['settled', 'failed', 'pending'])
        .order('payment_date', { ascending: false })
        .limit(6)

      const mapped: Activity[] = (recentPayments ?? []).map((p: any) => ({
        payment_id: p.payment_id,
        action: p.payment_status === 'settled' ? 'Payment Settled' : p.payment_status === 'failed' ? 'Failed Transaction' : 'Pending Payment',
        subject: p.digital_or_no ? `OR: ${p.digital_or_no}` : (p.transaction_ref_no ?? p.document_id ?? p.payment_id),
        time: p.payment_date ? elapsed(p.payment_date + 'T00:00:00') : '—',
        status: p.payment_status ?? 'pending',
      }))
      setActivity(mapped)

      // ── Chart (last 7 days) ───────────────────────────────────────────────
      const since = daysBefore(6)
      const { data: chartPayments } = await supabase
        .from('digital_payment')
        .select('payment_date, amount_paid')
        .eq('payment_status', 'settled')
        .gte('payment_date', since)
        .order('payment_date', { ascending: true })

      const byDay: Record<string, number> = {}
      for (let i = 6; i >= 0; i--) {
        const d = daysBefore(i)
        byDay[d] = 0
      }
      ;(chartPayments ?? []).forEach((p: any) => {
        if (p.payment_date && byDay[p.payment_date] !== undefined) {
          byDay[p.payment_date] += p.amount_paid ?? 0
        }
      })
      setChartData(Object.entries(byDay).map(([date, amount]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        amount,
      })))
    } catch (e) {
      console.error('Dashboard load error', e)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  const kpiVariants: ('warning' | 'success' | 'info' | 'default')[] = ['warning', 'info', 'warning', 'success']

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
              {meta.label.toUpperCase()}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Treasury overview
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
          <Button variant="outline" size="sm" onClick={() => loadAll()} disabled={loading} className="shadow-xs border-border">
            <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} />
            Sync data
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="group overflow-hidden border-border shadow-xs animate-pulse">
                <CardContent className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-muted mb-4" />
                  <div className="h-8 bg-muted rounded mb-2 w-24" />
                  <div className="h-3 bg-muted rounded w-32" />
                </CardContent>
              </Card>
            ))
          : kpis.map((kpi, i) => {
              const Icon = kpi.icon
              const isPositive = kpi.change >= 0
              const variant = kpiVariants[i] ?? 'default'
              return (
                <Card key={i} className="group overflow-hidden border-border shadow-xs hover:shadow-md transition-all duration-300 bg-card">
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
                        {kpi.change !== 0 && (
                          <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(kpi.change)}%
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-3xl font-bold tracking-tighter">{kpi.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Payment stream
              </CardTitle>
              <CardDescription>Latest digital payment activity from the treasury queue</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-8" onClick={() => navigate('/treasurer/collections')}>
              See all <ArrowUpRight size={12} className="ml-1 inline" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 px-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-40" />
                      <div className="h-2 bg-muted rounded w-56" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2 bg-muted/40">
                <BarChart3 size={24} className="opacity-20" /> No recent payment activity.
              </div>
            ) : (
              <div className="space-y-1">
                {activity.map(item => (
                  <div
                    key={item.payment_id}
                    className="group relative flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-muted/80 border border-transparent cursor-pointer"
                    onClick={() => navigate('/treasurer/collections')}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-xl bg-background border flex items-center justify-center shadow-xs group-hover:border-primary/20 transition-colors">
                        <span className="text-xs font-bold text-muted-foreground">{item.status === 'settled' ? '✓' : item.status === 'failed' ? '!' : '·'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.action}</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight truncate">{item.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[9px] font-bold uppercase tracking-tighter hidden md:flex">
                        {item.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                      <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-all hidden sm:block" />
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
                <BarChart3 size={14} /> Collections (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-40 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary opacity-40" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                      formatter={(v: any) => [`₱${(v ?? 0).toLocaleString()}`, 'Settled']}
                    />
                    <Bar dataKey="amount" fill="#fcd34d" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
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
                {QUICK_ACTIONS.map(qa => {
                  const Icon = qa.icon
                  return (
                    <NavLink
                      key={qa.label}
                      to={qa.path}
                      className="flex items-center justify-between group px-3 py-3 rounded-xl hover:bg-muted transition-all border border-transparent hover:border-border mt-1.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-background border flex items-center justify-center shadow-xs shrink-0">
                          <Icon size={14} className="text-primary" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors block">{qa.label}</span>
                          <span className="text-[10px] text-muted-foreground truncate block">{qa.desc}</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1 shrink-0" />
                    </NavLink>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
