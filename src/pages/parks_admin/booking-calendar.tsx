/**
 * booking-calendar.tsx — Parks Administrator
 * ─────────────────────────────────────────────────────────────────────
 * BPMN TO-BE MAPPING (Parks & Recreation Scheduling):
 *
 *  STEP 2  — Log & Pre-Check Request   → all reservations shown on calendar
 *  STEP 3  — Check Venue Availability  → venue filter + availability badge
 *  STEP 4  — Endorse Request           → pending pulse dot on calendar day
 *  STEP 5  — Review & Decide           → approve/reject from day detail modal
 *  STEP 10 — Compute Fees              → payment amount shown in modal
 *  STEP 11 — Pay Fees                  → payment record shown in modal
 *  STEP 12 — Process Payment           → payment status + OR no. in modal
 *  STEP 13 — Release Digital Permit    → digital_permit_url link in modal
 *  STEP 14 — Conduct Event             → reservation_date = calendar date
 *  STEP 15 — Monitor Event             → "monitored" indicator per reservation
 *
 * DATABASE TABLES (Supabase — separate batch fetches, no FK alias issues):
 *  park_reservation_record — reservation_date, time_slot, status,
 *                            park_venue_id, applicant_person_id,
 *                            payment_id, digital_permit_url
 *  park_venue              — park_venue_name, location, venue_type,
 *                            availability_status
 *  person                  — full_name, contact_number, address
 *  digital_payment         — amount_paid, payment_date, payment_method,
 *                            transaction_ref_no, digital_or_no, payment_status
 *  site_usage_log          — reservation_id only (marks "monitored" days)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"

import {
  ChevronLeft, ChevronRight, RefreshCw,
  X, Calendar, MapPin, User, Clock,
  Filter, AlertCircle, BadgeCheck, Ban,
  Eye, ExternalLink, CreditCard,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

// ─────────────────────────────────────────────
// TYPES — exact DB columns
// ─────────────────────────────────────────────
interface Venue {
  park_venue_id:       string
  park_venue_name:     string
  location:            string | null
  venue_type:          string | null
  availability_status: string
}

interface Person {
  person_id:      string
  full_name:      string
  contact_number: string | null
  address:        string | null   // ← added
}

interface Payment {
  payment_id:         string
  amount_paid:        number | null
  payment_date:       string | null
  payment_method:     string | null
  transaction_ref_no: string | null
  digital_or_no:      string | null
  payment_status:     string | null
}

interface Reservation {
  reservation_id:      string
  reservation_date:    string         // "YYYY-MM-DD"
  time_slot:           string | null
  status:              string
  park_venue_id:       string | null
  applicant_person_id: string | null
  payment_id:          string | null
  digital_permit_url:  string | null
  // hydrated
  venue:     Venue   | null
  person:    Person  | null
  payment:   Payment | null           // ← added (BPMN Steps 10–12)
  monitored: boolean                  // has a site_usage_log entry
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function parseSlot(raw: string | null | undefined) {
  if (!raw) return { time: "—", eventName: null, purpose: null }
  const parts = raw.split(" | ")
  return {
    time:      parts[0] ?? raw,
    eventName: parts[1] ?? null,
    purpose:   parts[2]?.replace("Purpose: ", "") ?? null,
  }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function statusColor(s: string) {
  switch (s) {
    case "pending":   return "bg-yellow-500"
    case "approved":  return "bg-green-600"
    case "completed": return "bg-blue-600"
    case "rejected":  return "bg-red-500"
    default:          return "bg-slate-500"
  }
}
function statusDot(s: string) {
  switch (s) {
    case "pending":   return "bg-yellow-400"
    case "approved":  return "bg-green-500"
    case "completed": return "bg-blue-500"
    case "rejected":  return "bg-red-400"
    default:          return "bg-slate-400"
  }
}
function venueBg(s: string) {
  if (s === "available")         return "bg-green-600"
  if (s === "under_maintenance") return "bg-yellow-500"
  return "bg-red-600"
}
function payBg(s: string | null) {
  if (s === "settled") return "bg-green-600"
  if (s === "pending") return "bg-yellow-500"
  return "bg-red-600"
}

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"]

function daysInMonth(y: number, m: number)  { return new Date(y, m + 1, 0).getDate() }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m, 1).getDay() }
function toYMD(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

// ─────────────────────────────────────────────
// MODAL WRAPPER (dark)
// ─────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 shrink-0 w-36">{label}</span>
      <span className="text-xs text-slate-100 text-right max-w-[58%] break-words">
        {value ?? <span className="text-slate-700">—</span>}
      </span>
    </div>
  )
}

function SLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4 mb-1 flex items-center gap-1.5">
      {icon} {children}
    </p>
  )
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${cls}`}>{label}</span>
}

// ─────────────────────────────────────────────
// RESERVATION DETAIL MODAL — BPMN Steps 3–5, 10–15
// ─────────────────────────────────────────────
function ReservationModal({ r, onClose, onApprove, onReject, actionLoading }: {
  r: Reservation
  onClose: () => void
  onApprove: (id: string) => void
  onReject:  (id: string) => void
  actionLoading: boolean
}) {
  const slot = parseSlot(r.time_slot)
  return (
    <Modal title={`Reservation — ${r.reservation_id}`} onClose={onClose}>

      {/* Status row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge label={cap(r.status)} cls={statusColor(r.status)} />
        {r.monitored && <Badge label="Monitored (Step 15)" cls="bg-blue-700" />}
        {r.payment?.payment_status === "settled" && (
          <Badge label="Payment Settled" cls="bg-violet-600" />
        )}
      </div>

      {/* BPMN Step 3: Venue */}
      <SLabel icon="🏛️">Venue (BPMN Step 3 — Availability Check)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Venue Name"   value={r.venue?.park_venue_name} />
        <DRow label="Location"     value={r.venue?.location} />
        <DRow label="Venue Type"   value={r.venue?.venue_type ? cap(r.venue.venue_type) : null} />
        <DRow label="Availability" value={
          r.venue
            ? <Badge label={r.venue.availability_status.replace(/_/g, " ")} cls={venueBg(r.venue.availability_status)} />
            : null
        } />
      </div>

      {/* BPMN Step 14: Schedule */}
      <SLabel icon="📅">Schedule (BPMN Step 14 — Conduct Event)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Date"       value={r.reservation_date} />
        <DRow label="Time Slot"  value={slot.time} />
        {slot.eventName && (
          <DRow label="Event Name" value={
            <span className="font-medium text-slate-200">{slot.eventName}</span>
          } />
        )}
        {slot.purpose && <DRow label="Purpose" value={slot.purpose} />}
      </div>

      {/* Applicant */}
      <SLabel icon="👤">Applicant (BPMN Step 1 — Citizen)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Full Name"   value={r.person?.full_name} />
        <DRow label="Contact No." value={r.person?.contact_number} />
        <DRow label="Address"     value={r.person?.address} />
      </div>

      {/* BPMN Steps 10–12: Payment */}
      <SLabel icon="💰">Payment (BPMN Steps 10–12 — Fees & Collection)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        {r.payment ? (
          <>
            <DRow label="Payment ID"       value={
              <span className="font-mono text-slate-300">{r.payment.payment_id}</span>
            } />
            <DRow label="Amount Paid"      value={
              r.payment.amount_paid != null
                ? <span className="font-semibold text-green-400">
                    ₱{Number(r.payment.amount_paid).toLocaleString()}
                  </span>
                : null
            } />
            <DRow label="Payment Date"     value={r.payment.payment_date} />
            <DRow label="Payment Method"   value={
              r.payment.payment_method ? cap(r.payment.payment_method) : null
            } />
            <DRow label="Transaction Ref"  value={r.payment.transaction_ref_no} />
            <DRow label="Official Receipt" value={r.payment.digital_or_no} />
            <DRow label="Payment Status"   value={
              r.payment.payment_status
                ? <Badge label={cap(r.payment.payment_status)} cls={payBg(r.payment.payment_status)} />
                : null
            } />
          </>
        ) : (
          <p className="text-xs text-slate-600 py-2">No payment record linked to this reservation.</p>
        )}
      </div>

      {/* BPMN Step 13: Digital Permit */}
      {r.digital_permit_url && (
        <>
          <SLabel icon="📜">Digital Permit (BPMN Step 13)</SLabel>
          <div className="bg-slate-800 rounded-xl px-4 py-3">
            <a
              href={r.digital_permit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium transition"
            >
              <ExternalLink size={12} /> View Digital Permit
            </a>
          </div>
        </>
      )}

      {/* BPMN Step 5: Approve / Reject */}
      {r.status === "pending" && (
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={() => onReject(r.reservation_id)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition"
          >
            <Ban size={13} />{actionLoading ? "Processing…" : "Reject (Step 5 ✗)"}
          </button>
          <button
            onClick={() => onApprove(r.reservation_id)}
            disabled={actionLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 transition"
          >
            <BadgeCheck size={13} />{actionLoading ? "Processing…" : "Approve (Step 5 ✓)"}
          </button>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────
// DAY DETAIL SIDE PANEL
// ─────────────────────────────────────────────
function DayPanel({ date, reservations, onViewDetail, onClose }: {
  date: string
  reservations: Reservation[]
  onViewDetail: (r: Reservation) => void
  onClose: () => void
}) {
  const display = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Selected Day</p>
          <h3 className="text-sm font-bold text-slate-100 mt-0.5">{display}</h3>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition">
          <X size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {reservations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-600">
            <Calendar size={24} className="mb-2 opacity-30" />
            <p className="text-xs">No reservations on this day.</p>
          </div>
        ) : (
          reservations.map((r) => {
            const slot = parseSlot(r.time_slot)
            return (
              <button
                key={r.reservation_id}
                onClick={() => onViewDetail(r)}
                className="w-full text-left rounded-xl border border-slate-700 bg-slate-800 hover:border-slate-500 transition p-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${statusDot(r.status)}`} />
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {r.venue?.park_venue_name?.split("—")[0]?.trim() ?? r.park_venue_id ?? "—"}
                    </span>
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white shrink-0 ${statusColor(r.status)}`}>
                    {cap(r.status)}
                  </span>
                </div>

                {slot.eventName && (
                  <p className="text-[11px] text-slate-400 mt-1 ml-4">🎉 {slot.eventName}</p>
                )}

                <div className="flex items-center gap-3 mt-1.5 ml-4 flex-wrap">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock size={9} />{slot.time}
                  </span>
                  {r.person?.full_name && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <User size={9} />{r.person.full_name}
                    </span>
                  )}
                  {/* Payment pill — BPMN Steps 10–12 */}
                  {r.payment?.amount_paid != null && (
                    <span className="flex items-center gap-1 text-[11px] text-green-500 font-medium">
                      <CreditCard size={9} />₱{Number(r.payment.amount_paid).toLocaleString()}
                    </span>
                  )}
                </div>

                {r.monitored && (
                  <span className="mt-1.5 ml-4 inline-flex items-center gap-1 text-[10px] text-blue-400">
                    <Eye size={8} /> Monitored (Step 15)
                  </span>
                )}

                <p className="text-[10px] text-slate-600 mt-1.5 ml-4 group-hover:text-slate-400 transition">
                  Click to view full details →
                </p>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function BookingCalendar() {
  const { user } = useAuth()

  const [reservations, setReservations]     = useState<Reservation[]>([])
  const [loading, setLoading]               = useState(true)
  const [actionLoading, setActionLoading]   = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  const today = new Date()
  const [calYear,  setCalYear]  = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [viewR,        setViewR]        = useState<Reservation | null>(null)

  const [venueFilter,  setVenueFilter]  = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  useEffect(() => { void loadData() }, [])

  // ═══════════════════════════════════════════════════════════════
  // LOAD — 5 Supabase batch fetches
  // Tables: park_reservation_record, park_venue, person,
  //         digital_payment, site_usage_log
  // ═══════════════════════════════════════════════════════════════
  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // 1️⃣ park_reservation_record (BPMN Steps 2–5, 10–15)
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select(
          "reservation_id, reservation_date, time_slot, status, " +
          "park_venue_id, applicant_person_id, payment_id, digital_permit_url"
        )
        .order("reservation_date", { ascending: true })

      if (e1) throw new Error(`Reservations: ${e1.message}`)
      if (!recs || recs.length === 0) { setReservations([]); return }

      // 2️⃣ Collect unique FKs
      const venueIds   = [...new Set(recs.map((r: any) => r.park_venue_id).filter(Boolean))]        as string[]
      const personIds  = [...new Set(recs.map((r: any) => r.applicant_person_id).filter(Boolean))]  as string[]
      const paymentIds = [...new Set(recs.map((r: any) => r.payment_id).filter(Boolean))]           as string[]
      const resIds     = recs.map((r: any) => r.reservation_id)                                     as string[]

      // 3️⃣ Parallel batch fetches
      const [
        { data: venues },
        { data: persons },
        { data: payments },
        { data: usageLogs },
      ] = await Promise.all([
        // park_venue — BPMN Step 3
        venueIds.length
          ? supabase
              .from("park_venue")
              .select("park_venue_id, park_venue_name, location, venue_type, availability_status")
              .in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] }),

        // person — full_name, contact_number, address
        personIds.length
          ? supabase
              .from("person")
              .select("person_id, full_name, contact_number, address")
              .in("person_id", personIds)
          : Promise.resolve({ data: [] }),

        // digital_payment — BPMN Steps 10–12
        // amount_paid (NOT "amount"), settled status, OR no.
        paymentIds.length
          ? supabase
              .from("digital_payment")
              .select(
                "payment_id, amount_paid, payment_date, payment_method, " +
                "transaction_ref_no, digital_or_no, payment_status"
              )
              .in("payment_id", paymentIds)
          : Promise.resolve({ data: [] }),

        // site_usage_log — reservation_id only, marks "monitored" (BPMN Step 15)
        resIds.length
          ? supabase
              .from("site_usage_log")
              .select("reservation_id")
              .in("reservation_id", resIds)
          : Promise.resolve({ data: [] }),
      ])

      // 4️⃣ Build lookup maps
      const venueMap:   Record<string, Venue>   = {}
      const personMap:  Record<string, Person>  = {}
      const paymentMap: Record<string, Payment> = {}
      const monitoredSet = new Set<string>()

      ;(venues    ?? []).forEach((v: any) => { venueMap[v.park_venue_id]   = v })
      ;(persons   ?? []).forEach((p: any) => { personMap[p.person_id]      = p })
      ;(payments  ?? []).forEach((p: any) => { paymentMap[p.payment_id]    = p })
      ;(usageLogs ?? []).forEach((l: any) => { monitoredSet.add(l.reservation_id) })

      // 5️⃣ Merge
      const merged: Reservation[] = recs.map((r: any) => ({
        ...r,
        venue:     venueMap[r.park_venue_id]        ?? null,
        person:    personMap[r.applicant_person_id] ?? null,
        payment:   paymentMap[r.payment_id]         ?? null,
        monitored: monitoredSet.has(r.reservation_id),
      }))

      setReservations(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reservations.")
    } finally {
      setLoading(false)
    }
  }

  // ── BPMN Step 5: Approve ──────────────────────────────────────
  async function handleApprove(id: string) {
    setActionLoading(true)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status: "approved" })
        .eq("reservation_id", id)
      if (e) throw new Error(e.message)
      setViewR(null)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Approve failed.")
    } finally { setActionLoading(false) }
  }

  // ── BPMN Step 5: Reject ───────────────────────────────────────
  async function handleReject(id: string) {
    setActionLoading(true)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status: "rejected" })
        .eq("reservation_id", id)
      if (e) throw new Error(e.message)
      setViewR(null)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reject failed.")
    } finally { setActionLoading(false) }
  }

  // ── Calendar navigation ───────────────────────────────────────
  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else                { setCalMonth(m => m - 1) }
    setSelectedDate(null)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else                 { setCalMonth(m => m + 1) }
    setSelectedDate(null)
  }
  function goToday() {
    setCalYear(today.getFullYear())
    setCalMonth(today.getMonth())
    setSelectedDate(null)
  }

  // ── Unique venues for filter (BPMN Step 3) ───────────────────
  const allVenues = useMemo(() => {
    const map: Record<string, string> = {}
    reservations.forEach(r => {
      if (r.park_venue_id && r.venue?.park_venue_name)
        map[r.park_venue_id] = r.venue.park_venue_name
    })
    return Object.entries(map)
  }, [reservations])

  // ── Apply filters ─────────────────────────────────────────────
  const filteredReservations = useMemo(() =>
    reservations.filter(r =>
      (venueFilter  === "all" || r.park_venue_id === venueFilter) &&
      (statusFilter === "all" || r.status        === statusFilter)
    ),
  [reservations, venueFilter, statusFilter])

  // ── Group by date ─────────────────────────────────────────────
  const byDate = useMemo(() => {
    const map: Record<string, Reservation[]> = {}
    filteredReservations.forEach(r => {
      if (!map[r.reservation_date]) map[r.reservation_date] = []
      map[r.reservation_date].push(r)
    })
    return map
  }, [filteredReservations])

  // ── Calendar grid params ──────────────────────────────────────
  const totalDays = daysInMonth(calYear, calMonth)
  const firstDay  = firstDayOfMonth(calYear, calMonth)
  const todayYMD  = toYMD(today.getFullYear(), today.getMonth(), today.getDate())

  // ── KPIs for current viewed month ────────────────────────────
  const monthKey     = `${calYear}-${String(calMonth + 1).padStart(2, "0")}`
  const monthRes     = filteredReservations.filter(r => r.reservation_date.startsWith(monthKey))
  const pendingCount   = monthRes.filter(r => r.status === "pending").length
  const approvedCount  = monthRes.filter(r => r.status === "approved").length
  const monitoredCount = monthRes.filter(r => r.monitored).length
  const paidCount      = monthRes.filter(r => r.payment?.payment_status === "settled").length

  const selectedReservations = selectedDate ? (byDate[selectedDate] ?? []) : []

  if (!user) return null
  const meta = ROLE_META[user.role]

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">

      {/* PAGE HEADER */}
      <div className="mb-6">
        <span
          className="px-3 py-1 rounded text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Booking Calendar</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parks &amp; Recreation Scheduling — BPMN Steps 2 · 3 · 4 · 5 · 10 · 11 · 12 · 13 · 14 · 15
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
            <X size={13} />
          </button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold">{monthRes.length}</div>
            <div className="text-xs text-muted-foreground mt-1">{MONTHS[calMonth]} Bookings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-yellow-500">{pendingCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Pending (Step 4)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-green-500">{approvedCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Approved (Step 5)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-violet-500">{paidCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Paid (Steps 10–12)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="text-2xl font-bold text-blue-500">{monitoredCount}</div>
            <div className="text-xs text-muted-foreground mt-1">Monitored (Step 15)</div>
          </CardContent>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* Venue filter — BPMN Step 3 */}
        <div className="flex items-center gap-1.5">
          <MapPin size={13} className="text-muted-foreground" />
          <select
            className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={venueFilter}
            onChange={e => { setVenueFilter(e.target.value); setSelectedDate(null) }}
          >
            <option value="all">All Venues</option>
            {allVenues.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-muted-foreground" />
          <select
            className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setSelectedDate(null) }}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex-1" />

        {/* Month navigation */}
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-2 text-xs font-medium border rounded-md hover:bg-muted transition">
            Today
          </button>
          <button onClick={prevMonth} className="p-2 rounded-md border hover:bg-muted transition">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm font-semibold min-w-[130px] text-center">
            {MONTHS[calMonth]} {calYear}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-md border hover:bg-muted transition">
            <ChevronRight size={14} />
          </button>
          <button
            onClick={() => void loadData()}
            className="p-2 rounded-md border text-muted-foreground hover:bg-muted transition"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* CALENDAR + DAY PANEL */}
      <div className={`grid gap-4 ${selectedDate ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1"}`}>

        {/* CALENDAR GRID */}
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
                <RefreshCw size={15} className="animate-spin mr-2" />
                Loading calendar…
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {/* Empty leading cells */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24 rounded-lg" />
                ))}

                {/* Day cells */}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day      = i + 1
                  const dateStr  = toYMD(calYear, calMonth, day)
                  const dayRes   = byDate[dateStr] ?? []
                  const isToday    = dateStr === todayYMD
                  const isSelected = dateStr === selectedDate
                  const hasPending = dayRes.some(r => r.status === "pending")
                  const hasPaid    = dayRes.some(r => r.payment?.payment_status === "settled")

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={`
                        h-24 rounded-xl p-2 text-left flex flex-col transition relative border
                        ${isSelected
                          ? "border-blue-500 bg-blue-500/10"
                          : isToday
                            ? "border-blue-400/50 bg-blue-400/5"
                            : dayRes.length > 0
                              ? "border-border hover:border-muted-foreground/40 hover:bg-muted/30"
                              : "border-transparent hover:bg-muted/20"
                        }
                      `}
                    >
                      {/* Day number */}
                      <span className={`
                        text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday    ? "bg-blue-500 text-white"
                          : isSelected ? "text-blue-400"
                          : "text-foreground"}
                      `}>
                        {day}
                      </span>

                      {/* Pending pulse dot — BPMN Step 4 */}
                      {hasPending && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                      )}

                      {/* Paid indicator dot — BPMN Steps 10–12 */}
                      {hasPaid && !hasPending && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-violet-400" />
                      )}

                      {/* Reservation chips */}
                      <div className="mt-auto space-y-0.5 w-full">
                        {dayRes.slice(0, 2).map(r => (
                          <div
                            key={r.reservation_id}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate ${statusColor(r.status)}`}
                          >
                            <span className="truncate">
                              {r.venue?.park_venue_name?.split("—")[0]?.trim() ?? r.park_venue_id ?? "—"}
                            </span>
                          </div>
                        ))}
                        {dayRes.length > 2 && (
                          <div className="text-[10px] text-muted-foreground px-1">
                            +{dayRes.length - 2} more
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* DAY DETAIL SIDE PANEL */}
        {selectedDate && (
          <DayPanel
            date={selectedDate}
            reservations={selectedReservations}
            onViewDetail={r => setViewR(r)}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </div>

      {/* LEGEND */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Legend:</span>
        {[
          { label: "Pending",   cls: "bg-yellow-500" },
          { label: "Approved",  cls: "bg-green-600"  },
          { label: "Completed", cls: "bg-blue-600"   },
          { label: "Rejected",  cls: "bg-red-500"    },
        ].map(({ label, cls }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${cls}`} />{label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Pending approval (BPMN Step 4)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400" />
          Payment settled (BPMN Steps 10–12)
        </span>
        <span className="flex items-center gap-1.5">
          <Eye size={11} className="text-blue-400" />
          Monitored (BPMN Step 15)
        </span>
      </div>

      {/* BPMN note */}
      <div className="mt-3 px-4 py-3 rounded-xl text-xs text-muted-foreground flex items-start gap-2 border">
        <AlertCircle size={13} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">Calendar covers BPMN Steps 2–5 and 10–15.</strong>{" "}
          Click any day to view its reservations. Click a card to open full details including
          payment records (Steps 10–12), digital permit (Step 13), and approve/reject actions (Step 5).
          Pulsing <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 mx-0.5 align-middle animate-pulse" /> dots
          indicate pending approvals. Purple{" "}
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-400 mx-0.5 align-middle" /> dots
          indicate settled payments.
        </span>
      </div>

      {/* RESERVATION DETAIL MODAL */}
      {viewR && (
        <ReservationModal
          r={viewR}
          onClose={() => setViewR(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          actionLoading={actionLoading}
        />
      )}
    </div>
  )
}