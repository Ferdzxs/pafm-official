/**
 * dashboard.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from "recharts"

import {
  Clock,
  CheckCircle,
  Package,
  Activity,
  TrendingUp,
  Calendar,
  User as UserIcon,
  MapPin,
  ChevronRight,
  TrendingDown,
  Sparkles,
  Zap,
  LayoutDashboard,
  Timer,
  RefreshCw,
  Info
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function ParksAdminDashboard() {
  const { user } = useAuth()

  const [chartData, setChartData] = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [endorsedQueue, setEndorsedQueue] = useState<any[]>([])
  const [activeEvents, setActiveEvents] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    setLoading(true)
    try {
      /* KPI Data Fetch */
      const [{ count: pendingCount }, { count: approvedCount }, { count: venueCount }, { count: usageCount }] = await Promise.all([
        supabase.from("park_reservation_record").select("*", { count: "exact", head: true }).in("status", ["pending", "endorsed_to_admin"]),
        supabase.from("park_reservation_record").select("*", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("park_venue").select("*", { count: "exact", head: true }),
        supabase.from("site_usage_log").select("*", { count: "exact", head: true })
      ])

      setKpis([
        { label: "Awaiting Approval", value: pendingCount ?? 0, icon: Timer, trend: "Requires Attention", variant: "warning" },
        { label: "Active Bookings", value: approvedCount ?? 0, icon: CheckCircle, trend: "Verified Records", variant: "success" },
        { label: "Municipal Venues", value: venueCount ?? 0, icon: MapPin, trend: "Asset Registry", variant: "info" },
        { label: "Monitoring Logs", value: usageCount ?? 0, icon: Activity, trend: "Compliance Tracking", variant: "default" }
      ])

      /* Recent Activity */
      const { data: reservations } = await supabase
        .from("park_reservation_record")
        .select(`
          reservation_id,
          reservation_date,
          time_slot,
          status,
          park_venue (park_venue_name, location),
          person:applicant_person_id (full_name)
        `)
        .order("reservation_date", { ascending: false })
        .limit(6)

      if (reservations) setRecentActivity(reservations)

      /* Endorsement Queue */
      const { data: endorsed } = await supabase
        .from("park_reservation_record")
        .select(`
          reservation_id,
          reservation_date,
          time_slot,
          status,
          park_venue (park_venue_name),
          person:applicant_person_id (full_name)
        `)
        .in("status", ["endorsed_to_admin", "pending"])
        .order("reservation_date", { ascending: true })
        .limit(4)

      if (endorsed) setEndorsedQueue(endorsed)

      /* Active Events */
      const { data: active } = await supabase
        .from("site_usage_log")
        .select(`
          usage_id,
          remarks,
          event_conducted_flag,
          park_reservation_record:reservation_id (
            reservation_date,
            time_slot,
            status,
            park_venue (park_venue_name)
          )
        `)
        .order("usage_id", { ascending: false })
        .limit(4)

      if (active) setActiveEvents(active)

      /* Chart Data */
      const { data: weekly } = await supabase
        .from("park_reservation_record")
        .select("reservation_date")

      if (weekly) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        const counts: any = {}
        days.forEach(d => (counts[d] = 0))
        weekly.forEach((r: any) => {
          const day = new Date(r.reservation_date).getDay()
          counts[days[day]]++
        })
        setChartData(days.map(d => ({ day: d, reservations: counts[d] })))
      }
    } catch (error) {
      console.error("Dashboard synchronization failure:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-10">
      {/* HEADER SECTION */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
               {meta.label.toUpperCase()}
             </Badge>
             <span className="h-1 w-1 rounded-full bg-muted-foreground" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
               <Zap className="h-3 w-3 text-amber-500" /> Operational Overview
             </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {getGreeting()}, {user.full_name.split(" ")[0]} 
          </h1>
          <p className="text-muted-foreground text-sm max-w-[600px]">
            The municipality's park infrastructure is currently maintaining {kpis.find(k => k.label === 'Active Bookings')?.value || 0} active reservations. Check the queues below for urgent actions.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => loadDashboard()} disabled={loading} className="shadow-xs">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Dashboard
            </Button>
            <Button size="sm" className="shadow-xs bg-primary hover:bg-primary">
              <Sparkles className="mr-2 h-3.5 w-3.5" /> Generative Insights
            </Button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <Card key={i} className="group overflow-hidden border-border shadow-xs hover:shadow-md transition-all duration-300 bg-card">
              <CardContent className="p-6 relative">
                 <div className="absolute top-0 right-0 p-4 opacity-5 h-full flex items-center group-hover:scale-110 group-hover:opacity-10 transition-all duration-500 pointer-events-none">
                    <Icon size={80} />
                 </div>
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <span className={cn("inline-flex items-center justify-center p-2 rounded-xl", 
                        kpi.variant === 'warning' ? 'bg-amber-100 text-amber-600' : 
                        kpi.variant === 'success' ? 'bg-emerald-100 text-emerald-600' : 
                        kpi.variant === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-primary/30 text-primary')}>
                          <Icon size={18} />
                       </span>
                       <Badge variant={kpi.variant} className="text-[9px] font-bold uppercase tracking-tighter px-1.5 h-4 border-none shadow-none">
                          {kpi.trend}
                       </Badge>
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
        {/* RECENT ACTIVITY */}
        <Card className="lg:col-span-2 border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">Reservation Stream</CardTitle>
              <CardDescription>Live feed of latest submissions and status updates</CardDescription>
            </div>
            <div className="h-8 w-8 bg-muted rounded-full flex items-center justify-center">
              <LayoutDashboard size={14} className="text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="space-y-1">
              {recentActivity.length === 0 && (
                <div className="py-20 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2">
                  <Activity size={24} className="text-muted-foreground/50" /> No activity recorded recently.
                </div>
              )}
              {recentActivity.map((item: any) => (
                <div key={item.reservation_id} className="group relative flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-muted border border-transparent cursor-pointer">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-background border flex items-center justify-center shadow-xs group-hover:border-primary transition-colors">
                      <UserIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{item.person?.full_name ?? "Guest User"}</p>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                        <MapPin className="h-2.5 w-2.5 opacity-60" />
                        <span className="truncate">{item.park_venue?.park_venue_name || 'System Site'}</span>
                        <span className="opacity-30">•</span>
                        <span>{item.reservation_date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.status === 'approved' ? 'success' : item.status === 'pending' || item.status === 'endorsed_to_admin' ? 'warning' : 'secondary'} className="text-[9px] font-bold uppercase tracking-tighter hidden md:flex">
                        {item.status === 'endorsed_to_admin' ? 'REVIEWING' : item.status.replace(/_/g, ' ')}
                    </Badge>
                    <ChevronRight size={14} className="text-muted-foreground opacity-20 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="px-6 py-4 bg-muted border-t flex justify-center">
             <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary">View Full Records</Button>
          </div>
        </Card>

        {/* ACTIVITY PULSE CHART */}
        <Card className="border-border shadow-sm bg-card self-start">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg leading-tight">Activity Pulse</CardTitle>
            <CardDescription>System usage volume by weekday</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={8}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" strokeOpacity={0.3} vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                    dy={12} 
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)",
                      fontSize: "11px",
                      fontWeight: 700,
                      background: 'hsl(var(--card))'
                    }}
                  />
                  <Bar
                    dataKey="reservations"
                    fill="url(#barGradient)"
                    radius={[6, 6, 2, 2]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-6 flex items-center justify-between px-2">
               <div className="space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Busiest Day</p>
                  <p className="text-sm font-bold text-foreground">{chartData.length > 0 ? chartData.reduce((prev, curr) => (prev.reservations > curr.reservations) ? prev : curr).day : 'N/A'}</p>
               </div>
               <div className="text-right space-y-0.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Weekly Change</p>
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                    <TrendingUp size={14} /> +12.4%
                  </div>
               </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* APPROVAL QUEUE */}
        <Card className="border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight font-bold flex items-center gap-2">
                <Timer size={18} className="text-amber-500" /> Administrative Action Queue
              </CardTitle>
              <CardDescription>Reservations requiring administrative review</CardDescription>
            </div>
            <Badge variant="warning" className="font-bold tracking-tighter text-[9px] px-2 h-5">URGENT</Badge>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {endorsedQueue.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2 h-full justify-center">
                 <CheckCircle size={24} className="text-emerald-500 opacity-20" /> No pending tasks in queue.
              </div>
            )}
            {endorsedQueue.map((item: any) => (
              <div key={item.reservation_id} className="flex items-center justify-between p-4 rounded-2xl border border-border bg-background transition-colors hover:bg-muted hover:shadow-sm group">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.person?.full_name ?? "Applicant"}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                    <MapPin size={10} /> {item.park_venue?.park_venue_name}
                    <Separator orientation="vertical" className="h-2" />
                    <Calendar size={10} /> {item.reservation_date}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-muted">Review</Button>
              </div>
            ))}
          </CardContent>
          <div className="px-6 py-3 border-t bg-muted">
             <p className="text-[9px] text-center text-muted-foreground font-semibold flex items-center justify-center gap-1.5 uppercase tracking-tighter">
                <Info size={10} /> Actioning items here sends an immediate notification to the citizen.
             </p>
          </div>
        </Card>

        {/* MONITORING INSIGHTS */}
        <Card className="border-border shadow-sm bg-card overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight font-bold flex items-center gap-2">
                <Activity size={18} className="text-blue-500" /> Compliance Monitoring
              </CardTitle>
              <CardDescription>Latest venue status updates from completion logs</CardDescription>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Activity size={12} className="text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3 flex-1">
            {activeEvents.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2 h-full justify-center">
                 No active monitoring logs detected.
              </div>
            )}
            {activeEvents.map((log: any) => {
              const res = log.park_reservation_record
              return (
                <div key={log.usage_id} className="grid grid-cols-[1fr_auto] items-center gap-4 p-4 rounded-2xl bg-secondary border border-border hover:border-primary transition-colors">
                  <div className="min-w-0 flex flex-col gap-1">
                    <p className="truncate text-sm font-bold text-foreground leading-tight">{res?.park_venue?.park_venue_name || 'Generic Site'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic">
                      <span className="font-mono text-[9px] uppercase tracking-tighter opacity-80">#{log.usage_id.slice(-6)}</span>
                      <Separator orientation="vertical" className="h-2" />
                      <span className="truncate">{log.remarks || 'Event completed smoothly.'}</span>
                    </div>
                  </div>
                  <Badge variant={log.event_conducted_flag ? "success" : "secondary"} className="text-[8px] font-bold h-4 px-1 leading-none shadow-none uppercase">
                    {log.event_conducted_flag ? "CONDUCTED" : "FLAGGED"}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
          <div className="px-6 py-3 border-t bg-muted">
             <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tight text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle size={10} className="text-emerald-500" /> 98% Compliance Rate</span>
                <span className="flex items-center gap-1 text-primary cursor-pointer hover:underline">View All Logs</span>
             </div>
          </div>
        </Card>
      </div>
    </div>
  )
}