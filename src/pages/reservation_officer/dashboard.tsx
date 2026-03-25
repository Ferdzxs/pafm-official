/**
 * dashboard.tsx — Reservation Officer overhauled for UI/UX
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  Package, 
  Calendar, 
  ArrowUpRight, 
  Zap,
  TrendingUp,
  LayoutDashboard,
  Timer,
  RefreshCw,
  Info,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Building2,
  BadgeCheck,
  CreditCard,
  Activity
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

type Kpi = { label: string; value: number; icon: any; color: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }

const QUICK_ACTIONS = [
  { label: "Validate Requests", emoji: "✅", path: "/parks/desk-reservations" },
  { label: "Issue Forms / Validate", emoji: "📝", path: "/parks/desk-approvals" },
  { label: "Release Permits", emoji: "📋", path: "/parks/desk-permits" },
]

function normalizeParkStatus(s?: string | null) {
  if (!s) return "pending_loi"
  if (s === "pending") return "pending_loi"
  if (s === "approved") return "admin_approved"
  if (s === "rejected") return "admin_rejected"
  return s
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function ReservationOfficerDashboard() {
  const { user } = useAuth()
  const [kpis, setKpis] = useState<Kpi[]>([])
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [{ count: venues }, { count: incoming }, { count: approved }, { count: permits }, { data: recentRows, error: e5 }] =
        await Promise.all([
          supabase.from("park_venue").select("*", { count: "exact", head: true }),
          supabase.from("park_reservation_record").select("*", { count: "exact", head: true }).in("status", ["pending", "pending_loi", "desk_logged"]),
          supabase.from("park_reservation_record").select("*", { count: "exact", head: true }).in("status", ["approved", "admin_approved"]),
          supabase.from("park_reservation_record").select("*", { count: "exact", head: true }).in("status", ["permit_released"]),
          supabase
            .from("park_reservation_record")
            .select("reservation_id, reservation_date, time_slot, status, park_venue(park_venue_name)")
            .order("reservation_date", { ascending: false })
            .limit(6),
        ])

      if (e5) throw new Error(e5.message)

      setKpis([
        { label: "Incoming Requests", value: incoming ?? 0, icon: Timer, color: "#fbbf24", variant: "warning" },
        { label: "Admin Approved", value: approved ?? 0, icon: ShieldCheck, color: "#34d399", variant: "success" },
        { label: "Permits Released", value: permits ?? 0, icon: FileText, color: "#60a5fa", variant: "info" },
        { label: "Venue Catalog", value: venues ?? 0, icon: Building2, color: "#fbbf24", variant: "default" },
      ])
      setRecent(recentRows ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard.")
    } finally {
      setLoading(false)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER SECTION */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
               {meta.label.toUpperCase()}
             </Badge>
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
               <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Operational Status
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
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading} className="shadow-xs border-border">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Data
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
                 <div className="absolute -top-2 -right-2 p-4 opacity-10 h-full flex items-center group-hover:scale-110 group-hover:opacity-20 transition-all duration-500 pointer-events-none">
                    <Icon size={80} />
                 </div>
                 <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <span className={cn("inline-flex items-center justify-center p-2.5 rounded-xl transition-all duration-300", 
                        kpi.variant === 'warning' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 
                        kpi.variant === 'success' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100' : 
                        kpi.variant === 'info' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : 'bg-primary/20 text-primary group-hover:bg-primary/30')}>
                          <Icon size={20} />
                       </span>
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
              <CardTitle className="text-lg leading-tight flex items-center gap-2">
                <Activity size={18} className="text-primary" /> Reservation Stream
              </CardTitle>
              <CardDescription>Live feed of lately synchronized system entries</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex-1 px-4">
            <div className="space-y-1">
              {error && (
                <div className="rounded-xl border border-destructive bg-destructive/10 p-3 flex gap-3 text-xs text-destructive items-center mb-4">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {loading ? (
                  <p className="text-[10px] uppercase tracking-widest font-bold">Synchronizing Data...</p>
              ) : recent.length === 0 ? (
                <div className="py-20 text-center text-sm text-muted-foreground border border-dashed rounded-xl flex flex-col items-center gap-2 bg-muted">
                  <Package size={24} className="opacity-20" /> No synchronized records.
                </div>
              ) : (
                recent.map((item: any) => {
                  const s = normalizeParkStatus(item.status)
                  return (
                    <div key={item.reservation_id} className="group relative flex items-center justify-between p-3.5 rounded-xl transition-all hover:bg-muted/80 border border-transparent cursor-pointer">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-background border flex items-center justify-center shadow-xs group-hover:border-primary/20 transition-colors">
                          <p className="text-[10px] font-bold text-muted-foreground">{item.reservation_id.slice(0, 3)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">Desk Log Update</p>
                          <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground uppercase tracking-tight">
                            <MapPin className="h-2.5 w-2.5 opacity-70" />
                            <span className="truncate">{item.park_venue?.park_venue_name || 'System Site'}</span>
                            <span className="opacity-40">•</span>
                            <Calendar className="h-2.5 w-2.5 opacity-70 ml-0.5" />
                            <span>{item.reservation_date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={s.includes("rejected") ? "destructive" : s.includes("approved") ? "success" : "warning"}
                          className="text-[9px] font-bold uppercase tracking-tighter hidden md:flex"
                        >
                          {s.replace(/_/g, ' ')}
                        </Badge>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
          <div className="px-6 py-4 bg-muted border-t flex justify-center">
             <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2" asChild>
                <NavLink to="/parks/desk-reservations">View Full Archive <ArrowUpRight size={12} /></NavLink>
             </Button>
          </div>
        </Card>

        {/* SIDEBAR ACTIONS */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b bg-muted">
              <CardTitle className="text-sm font-bold tracking-widest uppercase flex items-center gap-2 text-primary">
                <Zap size={14} className="fill-primary" /> Quick Desk Actions
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
                        {qa.emoji}
                      </div>
                      <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">{qa.label}</span>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-30 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                  </NavLink>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-primary/20 border-dashed overflow-hidden">
             <CardContent className="p-6 relative">
                <div className="space-y-2">
                   <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Info size={16} />
                   </div>
                   <p className="text-xs font-bold leading-tight">Pro-tip for Officers</p>
                   <p className="text-[11px] text-muted-foreground leading-relaxed">Ensure you validate digital application forms before releasing the permit to maintain proper audit trails.</p>
                </div>
                <div className="absolute -top-4 -right-4 opacity-20 pointer-events-none">
                   <ShieldCheck size={100} className="text-primary rotate-12" />
                </div>
             </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
