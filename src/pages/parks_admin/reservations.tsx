/**
 * reservations.tsx — Parks Administrator
 * BPMN Steps: 2 · 3 · 4 · 5 · 10–12 · 13 · 15
 *
 * time_slot format from citizen form:
 *   "HH:MM-HH:MM | Event Name | Purpose: description text"
 * This file parses and displays all three parts separately.
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"

import {
  Clock, CheckCircle, CheckCircle2,
  Eye, ThumbsUp, ThumbsDown,
  Search, ChevronDown, RefreshCw, X,
  MapPin, Calendar, User, FileText,
  ExternalLink, Filter, CreditCard,
  AlertCircle, BadgeCheck, Ban, AlignLeft,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─────────────────────────────────────────────
// TYPES
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
  address:        string | null
  contact_number: string | null
}
interface Payment {
  payment_id:         string
  amount_paid:        number | null
  payment_method:     string | null
  transaction_ref_no: string | null
  digital_or_no:      string | null
  payment_status:     string | null
}
interface Reservation {
  reservation_id:      string
  park_venue_id:       string | null
  applicant_person_id: string | null
  reservation_date:    string
  time_slot:           string | null
  status:              string
  digital_permit_url:  string | null
  payment_id:          string | null
  processed_by_admin:  string | null
  venue:   Venue   | null
  person:  Person  | null
  payment: Payment | null
}

// ─────────────────────────────────────────────
// PARSE time_slot — format: "HH:MM-HH:MM | Event Name | Purpose: text"
// ─────────────────────────────────────────────
interface ParsedSlot {
  time:       string        // "09:00-17:00"
  eventName:  string | null // "Birthday ni Mama"
  purpose:    string | null // "Family celebration with 30 guests"
}

function parseTimeSlot(raw: string | null): ParsedSlot {
  if (!raw) return { time: "—", eventName: null, purpose: null }
  const parts = raw.split(" | ")
  const time      = parts[0] ?? raw
  const eventName = parts[1] ?? null
  const purposePart = parts[2] ?? null
  const purpose = purposePart?.startsWith("Purpose: ")
    ? purposePart.replace("Purpose: ", "")
    : purposePart
  return { time, eventName, purpose }
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function statusBg(s: string) {
  switch (s) {
    case "pending":   return "bg-yellow-500"
    case "approved":  return "bg-green-600"
    case "completed": return "bg-blue-600"
    case "rejected":  return "bg-red-600"
    default:          return "bg-slate-500"
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
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}
function bpmnLabel(status: string) {
  switch (status) {
    case "pending":   return "BPMN Step 4 — Awaiting Parks Admin Decision"
    case "approved":  return "BPMN Step 5 ✓ — Approved · Permit Issued (Step 13)"
    case "completed": return "BPMN Step 15 — Event Monitored & Completed"
    case "rejected":  return "BPMN Step 5 ✗ — Request Disapproved"
    default:          return ""
  }
}

// ─────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────
function Modal({ title, onClose, children, wide = false }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full overflow-hidden ${wide ? "max-w-2xl" : "max-w-lg"}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
function DRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 shrink-0 w-40">{label}</span>
      <span className="text-xs text-slate-100 text-right max-w-[55%] break-words">{value ?? <span className="text-slate-700">—</span>}</span>
    </div>
  )
}
function SLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-5 mb-1 flex items-center gap-1.5">{icon} {children}</p>
}
function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${cls}`}>{label}</span>
}

// ─────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────
function DetailModal({ r, onClose, onApprove, onReject, loading }: {
  r: Reservation; onClose: () => void
  onApprove: (id: string) => void; onReject: (id: string) => void; loading: boolean
}) {
  const slot = parseTimeSlot(r.time_slot)

  return (
    <Modal title={`Reservation — ${r.reservation_id}`} onClose={onClose} wide>
      {/* Status + BPMN */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Badge label={cap(r.status)} cls={statusBg(r.status)} />
        <span className="text-[11px] text-slate-500 italic">{bpmnLabel(r.status)}</span>
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

      {/* BPMN Step 1: Schedule + Event Info — PARSED from time_slot */}
      <SLabel icon="📅">Schedule & Event (BPMN Step 1 — Letter of Intent)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Reservation Date" value={r.reservation_date} />
        <DRow label="Time Slot"        value={slot.time} />
        {slot.eventName && (
          <DRow label="Event Name" value={
            <span className="font-medium text-slate-200">{slot.eventName}</span>
          } />
        )}
      </div>

      {/* Event Purpose/Description — NEWLY VISIBLE */}
      {slot.purpose && (
        <>
          <SLabel icon="📝">Event Purpose / Description</SLabel>
          <div className="bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{slot.purpose}</p>
          </div>
        </>
      )}

      {/* BPMN Step 1: Applicant */}
      <SLabel icon="👤">Applicant (BPMN Step 1 — Citizen)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Full Name"   value={r.person?.full_name} />
        <DRow label="Contact No." value={r.person?.contact_number} />
        <DRow label="Address"     value={r.person?.address} />
      </div>

      {/* BPMN Steps 10–12: Payment */}
      <SLabel icon="💰">Payment (BPMN Steps 10–12)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        {r.payment_id ? (
          <>
            <DRow label="Payment ID"       value={r.payment_id} />
            <DRow label="Amount Paid"      value={
              r.payment?.amount_paid != null
                ? <span className="font-semibold text-green-400">₱{Number(r.payment.amount_paid).toLocaleString()}</span>
                : null
            } />
            <DRow label="Payment Method"   value={r.payment?.payment_method ? cap(r.payment.payment_method) : null} />
            <DRow label="Transaction Ref"  value={r.payment?.transaction_ref_no} />
            <DRow label="Official Receipt" value={r.payment?.digital_or_no} />
            <DRow label="Payment Status"   value={
              r.payment?.payment_status
                ? <Badge label={cap(r.payment.payment_status)} cls={payBg(r.payment.payment_status)} />
                : null
            } />
          </>
        ) : (
          <p className="text-xs text-slate-600 py-2">No payment record linked yet.</p>
        )}
      </div>

      {/* BPMN Step 13: Digital Permit */}
      {r.digital_permit_url && (
        <>
          <SLabel icon="📜">Digital Event Permit (BPMN Step 13)</SLabel>
          <div className="bg-slate-800 rounded-xl px-4 py-3">
            <a
              href={r.digital_permit_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium"
            >
              <ExternalLink size={12} />
              View / Download Digital Permit
            </a>
          </div>
        </>
      )}

      {/* BPMN Step 5: Approve / Reject */}
      {r.status === "pending" && (
        <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
          <button
            onClick={() => onReject(r.reservation_id)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 transition"
          >
            <Ban size={13} /> {loading ? "Processing…" : "Reject (Step 5 ✗)"}
          </button>
          <button
            onClick={() => onApprove(r.reservation_id)}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 transition"
          >
            <BadgeCheck size={13} /> {loading ? "Processing…" : "Approve (Step 5 ✓)"}
          </button>
        </div>
      )}
    </Modal>
  )
}

// ─────────────────────────────────────────────
// CONFIRM MODAL
// ─────────────────────────────────────────────
function ConfirmModal({ action, r, loading, onConfirm, onCancel }: {
  action: "approve" | "reject"; r: Reservation
  loading: boolean; onConfirm: () => void; onCancel: () => void
}) {
  const isApprove = action === "approve"
  const slot = parseTimeSlot(r.time_slot)
  return (
    <Modal title={isApprove ? "✓ Confirm Approval" : "✗ Confirm Rejection"} onClose={onCancel}>
      <p className="text-sm text-slate-400 mb-4">
        {isApprove
          ? "Approving this reservation will mark it as approved. A digital permit can then be issued (BPMN Step 13)."
          : "Rejecting this reservation will notify the applicant their request was disapproved (BPMN Step 5)."}
      </p>
      <div className="bg-slate-800 rounded-xl px-4 py-3 text-xs space-y-1.5 text-slate-300 mb-5">
        <div><span className="text-slate-500">ID: </span>{r.reservation_id}</div>
        <div><span className="text-slate-500">Applicant: </span>{r.person?.full_name ?? "—"}</div>
        <div><span className="text-slate-500">Venue: </span>{r.venue?.park_venue_name ?? "—"}</div>
        <div><span className="text-slate-500">Date: </span>{r.reservation_date}{slot.time ? ` · ${slot.time}` : ""}</div>
        {slot.eventName && <div><span className="text-slate-500">Event: </span>{slot.eventName}</div>}
        {slot.purpose   && <div><span className="text-slate-500">Purpose: </span>{slot.purpose}</div>}
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={loading}
          className="px-4 py-2 text-sm rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 transition">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={loading}
          className={`px-5 py-2 text-sm rounded-lg font-semibold text-white disabled:opacity-50 transition ${isApprove ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
          {loading ? "Saving…" : isApprove ? "✓ Yes, Approve" : "✗ Yes, Reject"}
        </button>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function Reservations() {
  const { user } = useAuth()

  const [reservations, setReservations]   = useState<Reservation[]>([])
  const [loading, setLoading]             = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [search, setSearch]               = useState("")
  const [filterStatus, setFilterStatus]   = useState("all")
  const [viewR, setViewR]                 = useState<Reservation | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    action: "approve" | "reject"; r: Reservation
  } | null>(null)

  useEffect(() => { void loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select(
          "reservation_id, park_venue_id, applicant_person_id, " +
          "reservation_date, time_slot, status, digital_permit_url, " +
          "payment_id, processed_by_admin"
        )
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(`Reservations: ${e1.message}`)
      if (!recs || recs.length === 0) { setReservations([]); return }

      const venueIds   = [...new Set(recs.map((r: any) => r.park_venue_id).filter(Boolean))]   as string[]
      const personIds  = [...new Set(recs.map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIds = [...new Set(recs.map((r: any) => r.payment_id).filter(Boolean))]      as string[]

      const { data: venues }   = venueIds.length
        ? await supabase.from("park_venue").select("park_venue_id, park_venue_name, location, venue_type, availability_status").in("park_venue_id", venueIds)
        : { data: [] }

      const { data: persons }  = personIds.length
        ? await supabase.from("person").select("person_id, full_name, address, contact_number").in("person_id", personIds)
        : { data: [] }

      const { data: payments } = paymentIds.length
        ? await supabase.from("digital_payment").select("payment_id, amount_paid, payment_method, transaction_ref_no, digital_or_no, payment_status").in("payment_id", paymentIds)
        : { data: [] }

      const venueMap:   Record<string, Venue>   = {}
      const personMap:  Record<string, Person>  = {}
      const paymentMap: Record<string, Payment> = {}
      ;(venues   ?? []).forEach((v: any) => { venueMap[v.park_venue_id]   = v })
      ;(persons  ?? []).forEach((p: any) => { personMap[p.person_id]      = p })
      ;(payments ?? []).forEach((p: any) => { paymentMap[p.payment_id]    = p })

      const merged: Reservation[] = recs.map((r: any) => ({
        ...r,
        venue:   venueMap[r.park_venue_id]        ?? null,
        person:  personMap[r.applicant_person_id] ?? null,
        payment: paymentMap[r.payment_id]         ?? null,
      }))

      setReservations(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reservations.")
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(true)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record").update({ status: "approved" }).eq("reservation_id", id)
      if (e) throw new Error(e.message)
      setConfirmAction(null); setViewR(null)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve.")
    } finally { setActionLoading(false) }
  }

  async function handleReject(id: string) {
    setActionLoading(true)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record").update({ status: "rejected" }).eq("reservation_id", id)
      if (e) throw new Error(e.message)
      setConfirmAction(null); setViewR(null)
      await loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject.")
    } finally { setActionLoading(false) }
  }

  function openConfirm(action: "approve" | "reject", r: Reservation) {
    setViewR(null)
    setConfirmAction({ action, r })
  }

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase()
    const slot = parseTimeSlot(r.time_slot)
    return (
      (!q ||
        r.reservation_id.toLowerCase().includes(q) ||
        (r.venue?.park_venue_name ?? "").toLowerCase().includes(q) ||
        (r.person?.full_name ?? "").toLowerCase().includes(q) ||
        (slot.eventName ?? "").toLowerCase().includes(q) ||
        (slot.purpose ?? "").toLowerCase().includes(q)) &&
      (filterStatus === "all" || r.status === filterStatus)
    )
  })

  const pending = reservations.filter((r) => r.status === "pending")

  const kpis = [
    { label: "Total Reservations",  value: reservations.length,                                          icon: FileText    },
    { label: "Pending (Step 4)",    value: pending.length,                                                icon: Clock       },
    { label: "Approved (Step 5)",   value: reservations.filter((r) => r.status === "approved").length,  icon: CheckCircle  },
    { label: "Completed (Step 15)", value: reservations.filter((r) => r.status === "completed").length, icon: CheckCircle2 },
  ]

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">

      {/* HEADER */}
      <div className="mb-8">
        <span className="px-3 py-1 rounded text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Reservations</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parks &amp; Recreation Scheduling — BPMN Steps 2 · 3 · 4 · 5 · 13 · 15
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700"><X size={13} /></button>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <Card key={i}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3"><Icon size={18} /></div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search ID, venue, applicant, event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            className="appearance-none pl-8 pr-8 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} of {reservations.length} records</span>
        <button onClick={() => void loadData()} className="p-2 rounded-md border text-muted-foreground hover:bg-muted transition" title="Refresh">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* BPMN Step 4: PENDING QUEUE */}
      {pending.length > 0 && filterStatus === "all" && !search && (
        <Card className="mb-6 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock size={16} className="text-yellow-500" />
              Awaiting Your Approval
              <span className="ml-1 px-2 py-0.5 rounded-full bg-yellow-500 text-white text-[11px] font-bold">{pending.length}</span>
              <span className="text-xs font-normal text-muted-foreground ml-1">— BPMN Step 4</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {pending.map((r) => {
              const slot = parseTimeSlot(r.time_slot)
              return (
                <div key={r.reservation_id} className="flex justify-between items-start py-2 border-b last:border-0">
                  <div>
                    <div className="text-sm font-medium">{r.person?.full_name ?? r.applicant_person_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.venue?.park_venue_name ?? r.park_venue_id} · {r.reservation_date} · {slot.time}
                    </div>
                    {slot.eventName && (
                      <div className="text-xs text-slate-400 mt-0.5">🎉 {slot.eventName}</div>
                    )}
                    {slot.purpose && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                        <AlignLeft size={10} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{slot.purpose}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <button onClick={() => setViewR(r)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition" title="View details">
                      <Eye size={13} />
                    </button>
                    <button onClick={() => openConfirm("reject", r)} className="px-3 py-1 text-xs rounded-lg border border-red-300 text-red-600 hover:bg-red-50 font-medium transition">
                      Reject
                    </button>
                    <button onClick={() => openConfirm("approve", r)} className="px-3 py-1 text-xs rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition">
                      Approve
                    </button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ALL RESERVATIONS */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Reservations
            <span className="text-xs font-normal text-muted-foreground ml-2">({filtered.length} of {reservations.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" /> Loading from Supabase…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Calendar size={30} className="mb-2 opacity-25" />
              <p className="text-sm">No reservations found.</p>
              {(search || filterStatus !== "all") && (
                <button onClick={() => { setSearch(""); setFilterStatus("all") }} className="mt-2 text-xs text-primary hover:underline">
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => {
                const slot = parseTimeSlot(r.time_slot)
                return (
                  <div key={r.reservation_id} className="flex justify-between items-start px-6 py-3 group hover:bg-muted/30 transition">
                    <div className="min-w-0 flex-1 pr-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">
                          {r.venue?.park_venue_name ?? r.park_venue_id ?? "Unknown Venue"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/40">{r.reservation_id}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {r.person?.full_name && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User size={10} />{r.person.full_name}
                          </span>
                        )}
                        {r.venue?.location && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin size={10} />{r.venue.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={10} />{r.reservation_date} · {slot.time}
                        </span>
                        {r.payment?.amount_paid != null && (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CreditCard size={10} />₱{Number(r.payment.amount_paid).toLocaleString()}
                          </span>
                        )}
                      </div>
                      {/* Show event name + purpose snippet in list */}
                      {slot.eventName && (
                        <div className="text-xs text-slate-400 mt-0.5">🎉 {slot.eventName}</div>
                      )}
                      {slot.purpose && (
                        <div className="text-xs text-slate-500 mt-0.5 flex items-start gap-1">
                          <AlignLeft size={10} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{slot.purpose}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 mt-1">
                      <span className={`px-2 py-1 rounded-full text-[11px] font-semibold text-white ${statusBg(r.status)}`}>
                        {cap(r.status)}
                      </span>
                      {r.status === "pending" && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openConfirm("approve", r)} className="p-1.5 rounded text-muted-foreground hover:text-green-600 hover:bg-green-50 transition" title="Approve">
                            <ThumbsUp size={13} />
                          </button>
                          <button onClick={() => openConfirm("reject", r)} className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition" title="Reject">
                            <ThumbsDown size={13} />
                          </button>
                        </div>
                      )}
                      <button onClick={() => setViewR(r)} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition opacity-0 group-hover:opacity-100" title="View details">
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODALS */}
      {viewR && (
        <DetailModal
          r={viewR}
          onClose={() => setViewR(null)}
          onApprove={(id) => openConfirm("approve", reservations.find((x) => x.reservation_id === id)!)}
          onReject={(id) => openConfirm("reject", reservations.find((x) => x.reservation_id === id)!)}
          loading={actionLoading}
        />
      )}
      {confirmAction && (
        <ConfirmModal
          action={confirmAction.action}
          r={confirmAction.r}
          loading={actionLoading}
          onConfirm={() =>
            confirmAction.action === "approve"
              ? handleApprove(confirmAction.r.reservation_id)
              : handleReject(confirmAction.r.reservation_id)
          }
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  )
}