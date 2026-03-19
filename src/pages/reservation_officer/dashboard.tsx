import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"
import { AlertCircle, CheckCircle, Clock, FileText, Package } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { NavLink } from "react-router-dom"

type Kpi = { label: string; value: number; icon: any; color: string }

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
    if (!user) return null

    const meta = ROLE_META[user.role]
    const [kpis, setKpis] = useState<Kpi[]>([])
    const [recent, setRecent] = useState<any[]>([])
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      void load()
    }, [])

    async function load() {
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
          { label: "Incoming Park Requests", value: incoming ?? 0, icon: Clock, color: "#fbbf24" },
          { label: "Admin Approved", value: approved ?? 0, icon: CheckCircle, color: "#34d399" },
          { label: "Permits Released", value: permits ?? 0, icon: FileText, color: "#60a5fa" },
          { label: "Park Venues", value: venues ?? 0, icon: Package, color: "#fbbf24" },
        ])
        setRecent(recentRows ?? [])
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard.")
      }
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
            <div className="mb-8">
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
                        {meta.label}
                    </span>
                </div>
                <h1 className="font-display text-2xl font-bold text-foreground">
                    Good {getGreeting()}, {user.full_name.split(' ')[0]}!
                </h1>
                <p className="text-muted-foreground text-sm mt-1">
                    {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    {user.office && ` · ${user.office}`}
                </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {kpis.map((kpi, i) => {
                    const Icon = kpi.icon
                    return (
                        <Card key={i} className="card-hover">
                            <CardContent className="pt-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                                        <Icon size={18} style={{ color: kpi.color }} />
                                    </div>
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
                            <span className="text-xs text-muted-foreground">From database</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1">
                            {error && (
                              <div className="mb-2 text-xs text-red-600 flex items-center gap-2">
                                <AlertCircle size={14} /> {error}
                              </div>
                            )}
                            {recent.map((item: any) => {
                              const s = normalizeParkStatus(item.status)
                              return (
                                <div key={item.reservation_id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                        {item.reservation_id.slice(0, 2)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-foreground truncate">Park reservation update</div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {item.park_venue?.park_venue_name ?? "Park venue"} · {item.reservation_date}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <Badge
                                          variant={s.includes("rejected") ? "destructive" : s.includes("approved") ? "success" : "warning"}
                                          className="text-[10px] px-1.5 py-0.5"
                                        >
                                          {s}
                                        </Badge>
                                    </div>
                                </div>
                              )
                            })}
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
                                    <NavLink key={qa.label} to={qa.path} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border">
                                        <span>{qa.emoji}</span>
                                        <span>{qa.label}</span>
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
