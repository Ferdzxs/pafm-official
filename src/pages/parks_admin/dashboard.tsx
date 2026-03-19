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
  ResponsiveContainer
} from "recharts"

import {
  Clock,
  CheckCircle,
  Package,
  Activity
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "morning"
  if (h < 17) return "afternoon"
  return "evening"
}

// Maps DB status values → badge colors
function statusColor(status: string) {
  if (status === "pending")   return "bg-yellow-500"
  if (status === "approved")  return "bg-green-600"
  if (status === "completed") return "bg-blue-600"
  if (status === "rejected")  return "bg-red-600"
  return "bg-slate-500"
}

function statusLabel(status: string) {
  if (status === "pending")   return "Pending"
  if (status === "approved")  return "Approved"
  if (status === "completed") return "Completed"
  if (status === "rejected")  return "Rejected"
  return status
}

export default function ParksAdminDashboard() {

  const { user } = useAuth()

  const [chartData, setChartData]         = useState<any[]>([])
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [endorsedQueue, setEndorsedQueue]   = useState<any[]>([])
  const [activeEvents, setActiveEvents]     = useState<any[]>([])
  const [kpis, setKpis]                     = useState<any[]>([])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {

    /* ── KPI 1: Pending Reservations (BPMN Step 2 — awaiting pre-check) ── */
    const { count: pendingCount } = await supabase
      .from("park_reservation_record")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")

    /* ── KPI 2: Approved Reservations (BPMN Step 5 — admin approved) ── */
    const { count: approvedCount } = await supabase
      .from("park_reservation_record")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")

    /* ── KPI 3: Total Park Venues (prerequisite registry) ── */
    const { count: venueCount } = await supabase
      .from("park_venue")
      .select("*", { count: "exact", head: true })

    /* ── KPI 4: Site Usage Logs (BPMN Step 15 — Event Monitoring) ── */
    const { count: usageCount } = await supabase
      .from("site_usage_log")
      .select("*", { count: "exact", head: true })

    setKpis([
      { label: "Pending Reservations",  value: pendingCount  ?? 0, icon: Clock },
      { label: "Approved Reservations", value: approvedCount ?? 0, icon: CheckCircle },
      { label: "Park Venues",           value: venueCount    ?? 0, icon: Package },
      { label: "Site Usage Logs",       value: usageCount    ?? 0, icon: Activity }
    ])

    /* ── Recent Activity: join venue name via park_venue ── */
    // BPMN Steps 4–5: shows endorsed + recently processed reservations
    const { data: reservations } = await supabase
      .from("park_reservation_record")
      .select(`
        reservation_id,
        reservation_date,
        time_slot,
        status,
        park_venue (
          park_venue_name,
          location
        ),
        person:applicant_person_id (
          full_name
        )
      `)
      .order("reservation_date", { ascending: false })
      .limit(5)

    if (reservations) {
      setRecentActivity(reservations)
    }

    /* ── Endorsed Queue: pending reservations awaiting Parks Admin decision ── */
    // BPMN Step 4 — Desk Officer has endorsed, Parks Admin must approve/reject
    const { data: endorsed } = await supabase
      .from("park_reservation_record")
      .select(`
        reservation_id,
        reservation_date,
        time_slot,
        status,
        park_venue (
          park_venue_name
        ),
        person:applicant_person_id (
          full_name
        )
      `)
      .in("status", ["endorsed_to_admin", "pending"])
      .order("reservation_date", { ascending: true })
      .limit(5)

    if (endorsed) {
      setEndorsedQueue(endorsed)
    }

    /* ── Active Events: approved reservations + site usage logs ── */
    // BPMN Step 15 — Event Monitoring Team monitors event compliance
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
          park_venue (
            park_venue_name
          )
        )
      `)
      .limit(5)

    if (active) {
      setActiveEvents(active)
    }

    /* ── Daily Reservations Chart ── */
    const { data: weekly } = await supabase
      .from("park_reservation_record")
      .select("reservation_date")

    if (weekly) {
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
      const counts: any = {}
      days.forEach(d => counts[d] = 0)
      weekly.forEach((r: any) => {
        const day = new Date(r.reservation_date).getDay()
        counts[days[day]]++
      })
      setChartData(days.map(d => ({ day: d, reservations: counts[d] })))
    }
  }

  if (!user) return null

  const meta = ROLE_META[user.role]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">

      {/* HEADER */}
      <div className="mb-8">
        <span
          className="px-3 py-1 rounded text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">
          Good {getGreeting()}, {user.full_name.split(" ")[0]} 👋
        </h1>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <Card key={i}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* ROW 1: Recent Activity + Chart */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* RECENT ACTIVITY — BPMN Steps 4–5 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Reservations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">No recent reservations.</p>
            )}
            {recentActivity.map((item: any) => (
              <div
                key={item.reservation_id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <div className="text-sm font-medium">
                    {item.person?.full_name ?? "Unknown Applicant"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.park_venue?.park_venue_name ?? "Unknown Venue"} — {item.reservation_date} {item.time_slot}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusColor(item.status)}`}>
                  {statusLabel(item.status)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* DAILY RESERVATIONS CHART */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Reservations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "10px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                />
                <Bar
                  dataKey="reservations"
                  fill="url(#barGradient)"
                  radius={[8, 8, 0, 0]}
                  animationDuration={600}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* ROW 2: Endorsement Queue + Event Monitoring */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* ENDORSEMENT QUEUE — BPMN Step 4: Pending admin decision */}
        <Card>
          <CardHeader>
            <CardTitle>⏳ Awaiting Your Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {endorsedQueue.length === 0 && (
              <p className="text-sm text-muted-foreground">No pending reservations.</p>
            )}
            {endorsedQueue.map((item: any) => (
              <div
                key={item.reservation_id}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <div className="text-sm font-medium">
                    {item.person?.full_name ?? "Unknown Applicant"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.park_venue?.park_venue_name ?? "Unknown Venue"} — {item.reservation_date}
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-yellow-500">
                  Pending
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* EVENT MONITORING — BPMN Step 15: Monitor event compliance */}
        <Card>
          <CardHeader>
            <CardTitle> Event Monitoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeEvents.length === 0 && (
              <p className="text-sm text-muted-foreground">No event logs yet.</p>
            )}
            {activeEvents.map((log: any) => {
              const reservation = log.park_reservation_record
              return (
                <div
                  key={log.usage_id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {reservation?.park_venue?.park_venue_name ?? "Unknown Venue"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {reservation?.reservation_date} — {log.remarks ?? "No remarks"}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${log.event_conducted_flag ? "bg-blue-600" : "bg-slate-500"}`}>
                    {log.event_conducted_flag ? "Conducted" : "Not Yet"}
                  </span>
                </div>
              )
            })}
          </CardContent>
        </Card>

      </div>

    </div>
  )
}