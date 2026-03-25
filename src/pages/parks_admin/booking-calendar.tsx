/**
 * booking-calendar.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

import {
  ChevronLeft, ChevronRight, RefreshCw,
  X, Calendar, MapPin, User, Clock,
  Filter, AlertCircle, BadgeCheck, Ban,
  Eye, ExternalLink, CreditCard, Building2,
  CalendarCheck, Info, Search, FileText
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── TYPES ───
interface Venue {
  park_venue_id: string
  park_venue_name: string
  location: string | null
  venue_type: string | null
  availability_status: string
}

interface Person {
  person_id: string
  full_name: string
  contact_number: string | null
  address: string | null
}

interface Payment {
  payment_id: string
  amount_paid: number | null
  payment_date: string | null
  payment_method: string | null
  transaction_ref_no: string | null
  digital_or_no: string | null
  payment_status: string | null
}

interface Reservation {
  reservation_id: string
  reservation_date: string
  time_slot: string | null
  status: string
  park_venue_id: string | null
  applicant_person_id: string | null
  payment_id: string | null
  digital_permit_url: string | null
  venue: Venue | null
  person: Person | null
  payment: Payment | null
  monitored: boolean
}

// ─── HELPERS ───
function parseSlot(raw: string | null | undefined) {
  if (!raw) return { time: "—", eventName: null, purpose: null }
  const parts = raw.split(" | ")
  return {
    time: parts[0] ?? raw,
    eventName: parts[1] ?? null,
    purpose: parts[2]?.replace("Purpose: ", "") ?? null,
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function getStatusColor(s: string) {
  switch (s) {
    case "pending": return "warning"
    case "approved": return "success"
    case "admin_approved": return "success"
    case "completed": return "info"
    case "rejected": return "destructive"
    case "admin_rejected": return "destructive"
    default: return "secondary"
  }
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const MONTHS = ["January","February","March","April","May","June",
    "July","August","September","October","November","December"]

function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }
function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

// ─── MAIN COMPONENT ───
export default function BookingCalendar() {
  const { user } = useAuth()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewR, setViewR] = useState<Reservation | null>(null)

  const [venueFilter, setVenueFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select("*")
        .order("reservation_date", { ascending: true })

      if (e1) throw e1
      if (!recs || recs.length === 0) { setReservations([]); return }

      // Unique FKs
      const venueIds = [...new Set(recs.map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set(recs.map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIds = [...new Set(recs.map((r: any) => r.payment_id).filter(Boolean))] as string[]
      const resIds = recs.map((r: any) => r.reservation_id) as string[]

      // Batch fetches
      const [vRes, pRes, pyRes, uRes] = await Promise.all([
        venueIds.length ? supabase.from("park_venue").select("*").in("park_venue_id", venueIds) : Promise.resolve({ data: [] }),
        personIds.length ? supabase.from("person").select("*").in("person_id", personIds) : Promise.resolve({ data: [] }),
        paymentIds.length ? supabase.from("digital_payment").select("*").in("payment_id", paymentIds) : Promise.resolve({ data: [] }),
        resIds.length ? supabase.from("site_usage_log").select("reservation_id").in("reservation_id", resIds) : Promise.resolve({ data: [] }),
      ])

      const vMap: any = {}; (vRes.data ?? []).forEach(v => vMap[v.park_venue_id] = v)
      const pMap: any = {}; (pRes.data ?? []).forEach(p => pMap[p.person_id] = p)
      const pyMap: any = {}; (pyRes.data ?? []).forEach(p => pyMap[p.payment_id] = p)
      const uSet = new Set((uRes.data ?? []).map((l: any) => l.reservation_id))

      const merged: Reservation[] = recs.map((r: any) => ({
        ...r,
        venue: vMap[r.park_venue_id] || null,
        person: pMap[r.applicant_person_id] || null,
        payment: pyMap[r.payment_id] || null,
        monitored: uSet.has(r.reservation_id),
      }))

      setReservations(merged)
    } catch (err: any) {
      setError(err.message || "Failed to synchronize booking data.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id: string, newStatus: string) {
    setActionLoading(true)
    try {
      const { error: e } = await supabase.from("park_reservation_record").update({ status: newStatus }).eq("reservation_id", id)
      if (e) throw e
      toast.success(`Reservation marked as ${newStatus.replace(/_/g, ' ')}.`)
      setViewR(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally { setActionLoading(false) }
  }

  // Navigation
  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else { setCalMonth(m => m - 1) }
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else { setCalMonth(m => m + 1) }
  }

  // Filtering
  const filteredReservations = useMemo(() =>
    reservations.filter(r =>
      (venueFilter === "all" || r.park_venue_id === venueFilter) &&
      (statusFilter === "all" || r.status === statusFilter)
    ),
  [reservations, venueFilter, statusFilter])

  const byDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    filteredReservations.forEach(r => {
      if (!map[r.reservation_date]) map[r.reservation_date] = []
      map[r.reservation_date].push(r)
    })
    return map
  }, [filteredReservations])

  const allVenues = useMemo(() => {
    const map: any = {}; reservations.forEach(r => { if (r.venue) map[r.venue.park_venue_id] = r.venue.park_venue_name })
    return Object.entries(map)
  }, [reservations])

  const totalDays = daysInMonth(calYear, calMonth)
  const firstDay = firstDayOfMonth(calYear, calMonth)
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate())

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="px-2 py-0.5" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
            {meta.label}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Booking Calendar</h1>
          <p className="text-muted-foreground text-sm">Visual schedule of venue allocations and reservation statuses — End-to-End Scheduling.</p>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <div className="flex items-center bg-muted rounded-lg p-1">
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}><ChevronLeft size={16} /></Button>
             <span className="px-4 text-sm font-bold min-w-[140px] text-center">{MONTHS[calMonth]} {calYear}</span>
             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}><ChevronRight size={16} /></Button>
          </div>
        </div>
      </header>

      {/* TOOLBAR & FILTERS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center bg-card border rounded-xl p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-4 flex-1">
          <div className="space-y-1.5 flex-1 max-w-[240px]">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Filter by Venue</Label>
            <select 
               className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus:ring-1 focus:ring-ring"
               value={venueFilter}
               onChange={(e) => setVenueFilter(e.target.value)}
            >
              <option value="all">All Parks & Venues</option>
              {allVenues.map(([id, name]: any) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 flex-1 max-w-[240px]">
            <Label className="text-[10px] uppercase tracking-widest text-muted-foreground ml-1">Filter Status</Label>
            <select 
               className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors outline-none focus:ring-1 focus:ring-ring"
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Booking States</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
        <div className="hidden lg:flex flex-col items-end opacity-90">
           <p className="text-[10px] font-bold uppercase tracking-tighter">Legend</p>
           <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1 text-[9px] font-bold"><span className="h-2 w-2 rounded-full bg-amber-400" /> Pending</span>
              <span className="flex items-center gap-1 text-[9px] font-bold"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Confirmed</span>
              <span className="flex items-center gap-1 text-[9px] font-bold"><span className="h-2 w-2 rounded-full bg-violet-400" /> Paid</span>
           </div>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className={cn("grid gap-6 transition-all duration-300", selectedDate ? "lg:grid-cols-[1fr_360px]" : "grid-cols-1")}>
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b bg-muted">
            {DAYS.map(day => (
              <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 bg-background">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="h-28 border-b border-r bg-muted last:border-r-0" />
            ))}
            {Array.from({ length: totalDays }).map((_, i) => {
              const day = i + 1
              const dateStr = toYMD(calYear, calMonth, day)
              const dayRes = byDate[dateStr] ?? []
              const active = dateStr === selectedDate
              const isToday = dateStr === todayYMD
              const hasPending = dayRes.some(r => r.status === 'pending' || r.status === 'endorsed_to_admin')
              const hasPaid = dayRes.some(r => r.payment?.payment_status === 'settled')

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(active ? null : dateStr)}
                  className={cn(
                    "h-28 border-b border-r p-2 flex flex-col items-start gap-1 transition-all relative group last:border-r-0",
                    active ? "bg-primary/20 ring-1 ring-inset ring-primary z-10" : "hover:bg-muted",
                    isToday && "bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold h-7 w-7 rounded-full flex items-center justify-center transition-colors",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground group-hover:bg-muted",
                    active && !isToday && "text-primary bg-primary/40"
                  )}>
                    {day}
                  </span>

                  {/* Indicators */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {hasPending && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Pending Action" />}
                    {hasPaid && <span className="h-2 w-2 rounded-full bg-violet-400" title="Payment Settled" />}
                  </div>

                  <div className="w-full mt-auto space-y-1">
                    {dayRes.slice(0, 2).map(r => (
                      <div key={r.reservation_id} className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded-sm font-bold truncate text-white border-none",
                        r.status === 'approved' || r.status === 'completed' ? 'bg-emerald-600' : 
                        r.status === 'pending' || r.status === 'endorsed_to_admin' ? 'bg-amber-500' : 
                        r.status === 'rejected' ? 'bg-red-500' : 'bg-slate-500'
                      )}>
                        {r.venue?.park_venue_name?.split('—')[0] || 'Booking'}
                      </div>
                    ))}
                    {dayRes.length > 2 && (
                      <div className="text-[8px] font-bold text-muted-foreground pl-1">
                        + {dayRes.length - 2} more...
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* SIDE PANEL FOR DAY DETAILS */}
        {selectedDate && (
          <div className="animate-in slide-in-from-right duration-300">
            <Card className="h-full border-primary bg-muted shadow-sm flex flex-col sticky top-8">
               <CardHeader className="pb-3 border-b border-border">
                 <div className="flex items-center justify-between">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Schedule Detail</p>
                   <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setSelectedDate(null)}><X size={14} /></Button>
                 </div>
                 <CardTitle className="text-lg leading-tight">
                   {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
                 </CardTitle>
               </CardHeader>
               <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-primary/5">
                 {byDate[selectedDate]?.length ? (
                   byDate[selectedDate].map((r) => {
                     const slot = parseSlot(r.time_slot)
                     return (
                       <button
                         key={r.reservation_id}
                         onClick={() => setViewR(r)}
                         className="w-full p-4 hover:bg-muted transition-colors text-left flex flex-col gap-2 group"
                       >
                         <div className="flex items-start justify-between">
                            <h4 className="font-bold text-sm tracking-tight group-hover:text-primary transition-colors">{r.venue?.park_venue_name || 'General Park Space'}</h4>
                            <Badge variant={getStatusColor(r.status) as any} className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-tighter">
                              {r.status === 'endorsed_to_admin' ? 'REVIEWING' : r.status.replace(/_/g, ' ')}
                            </Badge>
                         </div>
                         <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {slot.time}</span>
                            <Separator orientation="vertical" className="h-2" />
                            <span className="flex items-center gap-1 uppercase tracking-tighter font-mono opacity-80">#{r.reservation_id.slice(-6)}</span>
                         </div>
                         <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-[10px] font-semibold">{r.person?.full_name || 'Guest Organizers'}</span>
                            </div>
                            {r.payment?.amount_paid && (
                              <span className="text-[10px] font-bold text-emerald-600">₱{Number(r.payment.amount_paid).toLocaleString()}</span>
                            )}
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-2 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase tracking-widest flex items-center gap-1">
                           Inspect Detail <ChevronRight size={10} />
                         </p>
                       </button>
                     )
                   })
                 ) : (
                   <div className="p-8 text-center flex flex-col items-center justify-center space-y-3 opacity-50">
                      <Calendar className="h-10 w-10" />
                      <p className="text-xs font-bold uppercase tracking-widest">No allocations found</p>
                   </div>
                 )}
               </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      <Dialog open={!!viewR} onOpenChange={(open) => !open && setViewR(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
          {viewR && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6 space-y-1 text-left">
                 <div className="flex items-center gap-2 mb-2">
                   <Badge variant={getStatusColor(viewR.status) as any} className="uppercase font-bold tracking-widest px-3">
                     {viewR.status.replace(/_/g, ' ')}
                   </Badge>
                   <span className="text-[10px] font-mono text-muted-foreground">ID: {viewR.reservation_id}</span>
                 </div>
                 <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                   {viewR.venue?.park_venue_name || 'Park Reservation Request'}
                 </DialogTitle>
                 <DialogDescription className="font-medium text-muted-foreground/80 mt-1 flex items-center gap-2">
                   <Building2 className="h-3.5 w-3.5" /> {viewR.venue?.location || 'Municipal Park Jurisdiction'}
                 </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3">
                   <div className="surface-box group border border-border/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" /> Event Schedule</p>
                      <p className="text-sm font-bold text-foreground">{viewR.reservation_date}</p>
                      <p className="text-xs text-muted-foreground font-medium truncate">{parseSlot(viewR.time_slot).time}</p>
                   </div>
                   <div className="surface-box group border border-border/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Applicant</p>
                      <p className="text-sm font-bold text-foreground truncate">{viewR.person?.full_name}</p>
                      <p className="text-xs text-muted-foreground font-medium">{viewR.person?.contact_number || 'No Contact'}</p>
                   </div>
                </div>

                <div className="admin-box group !p-4 !rounded-xl">
                   <div className="flex items-center justify-between mb-3">
                     <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                       <FileText className="h-4 w-4" /> Logistics & Content
                     </h4>
                     {viewR.monitored && <Badge variant="secondary" className="bg-blue-100/50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none h-5 px-1.5 text-[9px] font-bold shadow-sm"><Eye className="h-2.5 w-2.5 mr-1" /> MONITORED</Badge>}
                   </div>
                   <div className="space-y-4">
                      {parseSlot(viewR.time_slot).eventName && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-90 tracking-tighter">Occasion Title</span>
                          <p className="text-sm font-semibold text-foreground">{parseSlot(viewR.time_slot).eventName}</p>
                        </div>
                      )}
                      {parseSlot(viewR.time_slot).purpose && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground opacity-80 tracking-tighter">Description / Notes</span>
                          <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary/20 pl-3 py-1">"{parseSlot(viewR.time_slot).purpose}"</p>
                        </div>
                      )}
                   </div>
                </div>

                <div className="admin-box group !p-4 !rounded-xl border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
                   <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-3">
                     <CreditCard className="h-4 w-4" /> Financial Transparency
                   </h4>
                   {viewR.payment ? (
                     <div className="flex items-center justify-between">
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Payment Processed</p>
                          <p className="text-[10px] text-muted-foreground font-mono">OR: {viewR.payment.digital_or_no || 'MANUAL-COLLECTION'}</p>
                       </div>
                       <div className="text-right space-y-1">
                          <p className="text-2xl font-black text-foreground font-mono leading-none tracking-tight">₱{Number(viewR.payment.amount_paid).toLocaleString()}</p>
                          <p className="text-[9px] font-bold uppercase text-muted-foreground/60">{viewR.payment.payment_method || 'BANK TRANSFER'}</p>
                       </div>
                     </div>
                   ) : (
                     <div className="rounded-xl border border-dashed border-emerald-500/30 p-6 text-center text-xs text-muted-foreground italic flex flex-col items-center justify-center gap-2">
                       <AlertCircle className="h-5 w-5 opacity-50" />
                       Fees not yet synchronized or recorded.
                     </div>
                   )}
                </div>

                {viewR.digital_permit_url && (
                  <div className="bg-primary/10 rounded-xl p-3 flex items-center justify-between border border-primary/20 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="text-sm font-bold text-primary tracking-tight">Official Permit Released</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 hover:bg-primary/20 text-[11px] font-black text-primary uppercase tracking-widest transition-all" asChild>
                      <a href={viewR.digital_permit_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="mr-2" /> View PDF</a>
                    </Button>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                {(viewR.status === 'endorsed_to_admin' || viewR.status === 'pending') ? (
                  <>
                    <Button variant="outline" className="h-11 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive hover:text-destructive text-[11px] font-extrabold uppercase tracking-widest" disabled={actionLoading} onClick={() => handleAction(viewR.reservation_id, 'admin_rejected')}>
                      <Ban size={14} className="mr-2" /> Decline
                    </Button>
                    <Button className="h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 flex-1 sm:flex-none text-[11px] font-extrabold shadow-lg shadow-emerald-500/20 uppercase tracking-widest" disabled={actionLoading} onClick={() => handleAction(viewR.reservation_id, 'admin_approved')}>
                      <BadgeCheck size={14} className="mr-2" /> Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" className="h-11 rounded-xl px-8 w-full sm:w-auto border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted" onClick={() => setViewR(null)}>Close</Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FOOTER CALLOUT */}
      <footer className="rounded-xl border border-blue-500 bg-blue-50 p-4 flex gap-4 items-start md:items-center">
        <Info className="h-5 w-5 text-blue-500 shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
          <strong className="text-blue-900 dark:text-blue-300">Operational Notice:</strong> This calendar provides real-time visibility into the full scheduling lifecycle. Pending approvals are indicated with pulsing amber markers. Monitored events appear with high-visibility audit indicators.
        </p>
      </footer>
    </div>
  )
}