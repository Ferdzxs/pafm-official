/**
 * usage-logs.tsx — Parks Administrator
 * ─────────────────────────────────────────────────────────────────────
 * BPMN TO-BE MAPPING (Parks & Recreation Scheduling):
 *
 *  STEP 10 — Compute Fees            → payment amount_paid shown
 *  STEP 11 — Pay Fees                → payment record linked via reservation
 *  STEP 12 — Process Payment         → payment_status, OR no., method
 *  STEP 13 — Release Digital Permit  → permit_document (digital_document)
 *                                       + digital_permit_url from reservation
 *  STEP 14 — Conduct Event           → reservation date, venue, organizer
 *  STEP 15 — Monitor Event           → event_conducted_flag, remarks,
 *                                       monitored_by_office, compliance
 *  STEP 16 — Send Completion Notice  → BPMN note shown in UI footer
 *
 * DATABASE TABLES (all via Supabase — separate batch fetches):
 *  site_usage_log          — PK: usage_id
 *    ├─ reservation_id     → park_reservation_record
 *    ├─ permit_document    → digital_document
 *    ├─ monitored_by_office→ administration_office
 *    ├─ remarks
 *    └─ event_conducted_flag
 *
 *  park_reservation_record — joined by reservation_id
 *    ├─ park_venue_id      → park_venue
 *    ├─ applicant_person_id→ person
 *    ├─ payment_id         → digital_payment   ← BPMN Steps 10–12
 *    ├─ reservation_date, time_slot, status
 *    └─ digital_permit_url                     ← BPMN Step 13
 *
 *  park_venue              — park_venue_name, location, venue_type,
 *                            availability_status
 *  person                  — full_name, contact_number, address
 *  administration_office   — office_name, parent_department, location
 *  digital_document        — reference_no, file_url, document_type
 *                            (permit_document from site_usage_log)
 *  digital_payment         — amount_paid, payment_method,
 *                            transaction_ref_no, digital_or_no,
 *                            payment_status, payment_date
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"

import {
  Search, Filter, Eye, RefreshCw, X,
  MapPin, Calendar, CheckCircle2, AlertTriangle,
  Clock, UserCheck, AlignLeft, ExternalLink,
  FileText, ChevronDown, AlertCircle, ShieldCheck,
  ShieldAlert, ShieldX, CalendarCheck, CreditCard,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─────────────────────────────────────────────
// TYPES — exact columns from DB
// ─────────────────────────────────────────────
interface UsageLog {
  // site_usage_log columns
  usage_id:             string
  reservation_id:       string | null
  permit_document:      string | null
  monitored_by_office:  string | null
  remarks:              string | null
  event_conducted_flag: boolean

  // hydrated from joins
  reservation: {
    reservation_date:    string
    time_slot:           string | null
    status:              string
    digital_permit_url:  string | null
    park_venue_id:       string | null
    applicant_person_id: string | null
    payment_id:          string | null   // ← BPMN Steps 10–12
  } | null
  venue: {
    park_venue_name:     string
    location:            string | null
    venue_type:          string | null
    availability_status: string          // ← was missing
  } | null
  person: {
    full_name:      string
    contact_number: string | null
    address:        string | null        // ← was missing
  } | null
  office: {
    office_name:       string
    parent_department: string | null
    location:          string | null
  } | null
  permit_doc: {                          // digital_document via permit_document FK
    reference_no:  string | null
    file_url:      string | null
    document_type: string
  } | null
  payment: {                             // digital_payment — BPMN Steps 10–12 (was missing)
    payment_id:         string
    amount_paid:        number | null
    payment_date:       string | null
    payment_method:     string | null
    transaction_ref_no: string | null
    digital_or_no:      string | null
    payment_status:     string | null
  } | null
}

// ─────────────────────────────────────────────
// PARSE time_slot — "HH:MM-HH:MM | Event Name | Purpose: text"
// ─────────────────────────────────────────────
interface ParsedSlot {
  time:      string
  eventName: string | null
  purpose:   string | null
}
function parseSlot(raw: string | null | undefined): ParsedSlot {
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
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

function conductedBg(flag: boolean) {
  return flag ? "bg-green-600" : "bg-slate-500"
}
function conductedLabel(flag: boolean) {
  return flag ? "Conducted" : "Not Conducted"
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

function reservationStatusBg(s: string) {
  switch (s) {
    case "approved":  return "bg-green-600"
    case "completed": return "bg-blue-600"
    case "rejected":  return "bg-red-600"
    default:          return "bg-yellow-500"
  }
}

// Derive compliance from event_conducted_flag + remarks text
function complianceInfo(flag: boolean, remarks: string | null) {
  if (!flag) return { label: "No Show / Cancelled", cls: "bg-slate-500",   Icon: ShieldX    }
  if (!remarks)
              return { label: "Conducted",           cls: "bg-green-600",  Icon: ShieldCheck }
  const lower = remarks.toLowerCase()
  if (
    lower.includes("major")       || lower.includes("altercation") ||
    lower.includes("incident")    || lower.includes("violation")
  )           return { label: "Incident Reported",  cls: "bg-red-600",    Icon: ShieldAlert }
  if (
    lower.includes("minor")       || lower.includes("garbage") ||
    lower.includes("slightly")    || lower.includes("issue")
  )           return { label: "Minor Issue",         cls: "bg-yellow-500", Icon: ShieldAlert }
  return      { label: "Compliant",                 cls: "bg-green-600",  Icon: ShieldCheck }
}

// ─────────────────────────────────────────────
// MODAL WRAPPER (dark)
// ─────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
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
      <span className="text-xs text-slate-500 shrink-0 w-44">{label}</span>
      <span className="text-xs text-slate-100 text-right max-w-[55%] break-words">
        {value ?? <span className="text-slate-700">—</span>}
      </span>
    </div>
  )
}

function SLabel({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-5 mb-1 flex items-center gap-1.5">
      {icon} {children}
    </p>
  )
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${cls}`}>
      {label}
    </span>
  )
}

// ─────────────────────────────────────────────
// DETAIL MODAL — full BPMN steps 10–16
// ─────────────────────────────────────────────
function DetailModal({ log, onClose }: { log: UsageLog; onClose: () => void }) {
  const slot       = parseSlot(log.reservation?.time_slot)
  const compliance = complianceInfo(log.event_conducted_flag, log.remarks)
  const CompIcon   = compliance.Icon

  return (
    <Modal title={`Usage Log — ${log.usage_id}`} onClose={onClose}>

      {/* Top status row */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Badge label={conductedLabel(log.event_conducted_flag)} cls={conductedBg(log.event_conducted_flag)} />
        <Badge label={compliance.label} cls={compliance.cls} />
        <span className="text-[11px] text-slate-500 italic">BPMN Steps 14–15 — Event Monitoring Record</span>
      </div>

      {/* ── BPMN Step 14: Venue ── */}
      <SLabel icon="🏛️">Venue (BPMN Step 14 — Event Location)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Venue Name"    value={log.venue?.park_venue_name} />
        <DRow label="Location"      value={log.venue?.location} />
        <DRow label="Venue Type"    value={log.venue?.venue_type ? cap(log.venue.venue_type) : null} />
        <DRow label="Venue Status"  value={
          log.venue
            ? <Badge
                label={log.venue.availability_status.replace(/_/g, " ")}
                cls={venueBg(log.venue.availability_status)}
              />
            : null
        } />
      </div>

      {/* ── BPMN Step 14: Schedule & Event ── */}
      <SLabel icon="📅">Schedule & Event (BPMN Step 14 — Conduct Event)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Reservation ID"   value={
          <span className="font-mono text-blue-400">{log.reservation_id}</span>
        } />
        <DRow label="Reservation Date" value={log.reservation?.reservation_date} />
        <DRow label="Time Slot"        value={slot.time} />
        {slot.eventName && (
          <DRow label="Event Name" value={
            <span className="font-medium text-slate-200">{slot.eventName}</span>
          } />
        )}
        <DRow label="Booking Status"   value={
          log.reservation?.status
            ? <Badge label={cap(log.reservation.status)} cls={reservationStatusBg(log.reservation.status)} />
            : null
        } />
      </div>

      {/* ── Event Purpose ── */}
      {slot.purpose && (
        <>
          <SLabel icon="📝">Event Purpose / Description</SLabel>
          <div className="bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{slot.purpose}</p>
          </div>
        </>
      )}

      {/* ── BPMN Step 14: Applicant ── */}
      <SLabel icon="👤">Applicant (BPMN Step 14 — Event Organizer)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Full Name"   value={log.person?.full_name} />
        <DRow label="Contact No." value={log.person?.contact_number} />
        <DRow label="Address"     value={log.person?.address} />
      </div>

      {/* ── BPMN Steps 10–12: Payment ── */}
      <SLabel icon="💰">Payment (BPMN Steps 10–12 — Fees & Collection)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        {log.payment ? (
          <>
            <DRow label="Payment ID"       value={
              <span className="font-mono text-slate-300">{log.payment.payment_id}</span>
            } />
            <DRow label="Amount Paid"      value={
              log.payment.amount_paid != null
                ? <span className="font-semibold text-green-400">
                    ₱{Number(log.payment.amount_paid).toLocaleString()}
                  </span>
                : null
            } />
            <DRow label="Payment Date"     value={log.payment.payment_date} />
            <DRow label="Payment Method"   value={
              log.payment.payment_method ? cap(log.payment.payment_method) : null
            } />
            <DRow label="Transaction Ref"  value={log.payment.transaction_ref_no} />
            <DRow label="Official Receipt" value={log.payment.digital_or_no} />
            <DRow label="Payment Status"   value={
              log.payment.payment_status
                ? <Badge label={cap(log.payment.payment_status)} cls={payBg(log.payment.payment_status)} />
                : null
            } />
          </>
        ) : (
          <p className="text-xs text-slate-600 py-2">
            No payment record linked to this reservation.
          </p>
        )}
      </div>

      {/* ── BPMN Step 13: Digital Permit ── */}
      <SLabel icon="📜">Digital Permit (BPMN Step 13 — Permit Release)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-2">
        {/* Permit doc from site_usage_log.permit_document → digital_document */}
        {log.permit_doc ? (
          <>
            <div className="text-xs text-slate-400">
              Type: <span className="text-slate-200">{cap(log.permit_doc.document_type)}</span>
            </div>
            {log.permit_doc.reference_no && (
              <div className="text-xs text-slate-400">
                Ref No: <span className="text-slate-200 font-mono">{log.permit_doc.reference_no}</span>
              </div>
            )}
            {log.permit_doc.file_url && (
              <a
                href={log.permit_doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium"
              >
                <ExternalLink size={12} />
                View Permit Document (DDOC)
              </a>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-600">No linked permit document (permit_document is null).</p>
        )}

        {/* Fallback: digital_permit_url from park_reservation_record */}
        {log.reservation?.digital_permit_url && (
          <a
            href={log.reservation.digital_permit_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
          >
            <ExternalLink size={12} />
            View Reservation Digital Permit (URL)
          </a>
        )}

        {!log.permit_doc && !log.reservation?.digital_permit_url && (
          <p className="text-xs text-slate-600">No permit document available for this log.</p>
        )}
      </div>

      {/* ── BPMN Step 15: Monitoring ── */}
      <SLabel icon="👀">Monitoring Info (BPMN Step 15 — Monitor Event)</SLabel>
      <div className="bg-slate-800 rounded-xl px-4 py-1">
        <DRow label="Monitoring Office"  value={log.office?.office_name} />
        <DRow label="Department"         value={log.office?.parent_department} />
        <DRow label="Office Location"    value={log.office?.location} />
        <DRow label="Event Conducted"    value={
          <Badge label={conductedLabel(log.event_conducted_flag)} cls={conductedBg(log.event_conducted_flag)} />
        } />
        <DRow label="Compliance Result"  value={
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${compliance.cls}`}>
            <CompIcon size={10} />{compliance.label}
          </span>
        } />
      </div>

      {/* ── Monitor Remarks ── */}
      {log.remarks && (
        <>
          <SLabel icon="📋">Monitor Remarks (BPMN Step 15)</SLabel>
          <div className="bg-slate-800 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">{log.remarks}</p>
          </div>
        </>
      )}

      {/* BPMN Step 16 note */}
      <div className="mt-5 px-3 py-2.5 rounded-lg text-[11px] text-slate-500 border border-slate-800">
        <strong className="text-slate-400">BPMN Step 16 —</strong> After this log is recorded,
        the Notification &amp; Alert System sends an event completion notice to the citizen/organizer.
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function SiteUsageLogs() {
  const { user } = useAuth()

  const [logs, setLogs]       = useState<UsageLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [search, setSearch]                   = useState("")
  const [filterConducted, setFilterConducted] = useState<"all" | "true" | "false">("all")
  const [filterCompliance, setFilterCompliance] = useState<"all" | "compliant" | "issue" | "no_show">("all")

  const [viewLog, setViewLog] = useState<UsageLog | null>(null)

  useEffect(() => { void loadData() }, [])

  // ═══════════════════════════════════════════════════════════════
  // LOAD — 6 separate Supabase batch fetches (avoids FK alias bugs)
  // Tables: site_usage_log → reservation → venue + person + payment
  //         + administration_office + digital_document
  // ═══════════════════════════════════════════════════════════════
  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // ── 1. site_usage_log (BPMN Step 15 main table) ───────────
      const { data: rawLogs, error: e1 } = await supabase
        .from("site_usage_log")
        .select(
          "usage_id, reservation_id, permit_document, " +
          "monitored_by_office, remarks, event_conducted_flag"
        )
        .order("usage_id", { ascending: false })

      if (e1) throw new Error(`Usage logs: ${e1.message}`)
      if (!rawLogs || rawLogs.length === 0) { setLogs([]); return }

      // ── 2. Collect unique FKs from site_usage_log ─────────────
      const reservationIds = [...new Set(rawLogs.map((l: any) => l.reservation_id).filter(Boolean))]  as string[]
      const officeIds      = [...new Set(rawLogs.map((l: any) => l.monitored_by_office).filter(Boolean))] as string[]
      const permitDocIds   = [...new Set(rawLogs.map((l: any) => l.permit_document).filter(Boolean))]  as string[]

      // ── 3. park_reservation_record (BPMN Steps 13–14) ─────────
      // Note: payment_id column needed for BPMN Steps 10–12
      const { data: reservations } = reservationIds.length
        ? await supabase
            .from("park_reservation_record")
            .select(
              "reservation_id, reservation_date, time_slot, status, " +
              "digital_permit_url, park_venue_id, applicant_person_id, payment_id"
            )
            .in("reservation_id", reservationIds)
        : { data: [] }

      // ── 4. Collect venue + person + payment IDs from reservations
      const venueIds   = [...new Set((reservations ?? []).map((r: any) => r.park_venue_id).filter(Boolean))]        as string[]
      const personIds  = [...new Set((reservations ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))]  as string[]
      const paymentIds = [...new Set((reservations ?? []).map((r: any) => r.payment_id).filter(Boolean))]           as string[]

      // ── 5. Parallel batch fetches ──────────────────────────────
      const [
        { data: venues },
        { data: persons },
        { data: offices },
        { data: permitDocs },
        { data: payments },
      ] = await Promise.all([
        // park_venue — includes availability_status (BPMN Step 3 context)
        venueIds.length
          ? supabase
              .from("park_venue")
              .select("park_venue_id, park_venue_name, location, venue_type, availability_status")
              .in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] }),

        // person — includes address (was missing before)
        personIds.length
          ? supabase
              .from("person")
              .select("person_id, full_name, contact_number, address")
              .in("person_id", personIds)
          : Promise.resolve({ data: [] }),

        // administration_office — BPMN Step 15 monitoring office
        officeIds.length
          ? supabase
              .from("administration_office")
              .select("admin_office_id, office_name, parent_department, location")
              .in("admin_office_id", officeIds)
          : Promise.resolve({ data: [] }),

        // digital_document — permit_document FK from site_usage_log (BPMN Step 13)
        permitDocIds.length
          ? supabase
              .from("digital_document")
              .select("document_id, reference_no, file_url, document_type")
              .in("document_id", permitDocIds)
          : Promise.resolve({ data: [] }),

        // digital_payment — via payment_id on reservation (BPMN Steps 10–12)
        // amount_paid (NOT "amount"), payment_date, method, ref, OR no., status
        paymentIds.length
          ? supabase
              .from("digital_payment")
              .select(
                "payment_id, amount_paid, payment_date, payment_method, " +
                "transaction_ref_no, digital_or_no, payment_status"
              )
              .in("payment_id", paymentIds)
          : Promise.resolve({ data: [] }),
      ])

      // ── 6. Build lookup maps ───────────────────────────────────
      const resMap:     Record<string, any> = {}
      const venueMap:   Record<string, any> = {}
      const personMap:  Record<string, any> = {}
      const officeMap:  Record<string, any> = {}
      const permitMap:  Record<string, any> = {}
      const paymentMap: Record<string, any> = {}

      ;(reservations ?? []).forEach((r: any) => { resMap[r.reservation_id]       = r })
      ;(venues       ?? []).forEach((v: any) => { venueMap[v.park_venue_id]       = v })
      ;(persons      ?? []).forEach((p: any) => { personMap[p.person_id]          = p })
      ;(offices      ?? []).forEach((o: any) => { officeMap[o.admin_office_id]    = o })
      ;(permitDocs   ?? []).forEach((d: any) => { permitMap[d.document_id]        = d })
      ;(payments     ?? []).forEach((p: any) => { paymentMap[p.payment_id]        = p })

      // ── 7. Merge all data into each log ───────────────────────
      const merged: UsageLog[] = rawLogs.map((l: any) => {
        const res = resMap[l.reservation_id] ?? null
        return {
          ...l,
          reservation: res,
          venue:      res ? (venueMap[res.park_venue_id]        ?? null) : null,
          person:     res ? (personMap[res.applicant_person_id] ?? null) : null,
          office:     officeMap[l.monitored_by_office]          ?? null,
          permit_doc: permitMap[l.permit_document]              ?? null,
          payment:    res ? (paymentMap[res.payment_id]         ?? null) : null,  // ← BPMN 10–12
        }
      })

      setLogs(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load usage logs.")
    } finally {
      setLoading(false)
    }
  }

  // ── Filtering ─────────────────────────────────────────────────
  const filtered = logs.filter((l) => {
    const q    = search.toLowerCase()
    const slot = parseSlot(l.reservation?.time_slot)
    const matchSearch = !q ||
      l.usage_id.toLowerCase().includes(q) ||
      (l.reservation_id  ?? "").toLowerCase().includes(q) ||
      (l.venue?.park_venue_name   ?? "").toLowerCase().includes(q) ||
      (l.person?.full_name        ?? "").toLowerCase().includes(q) ||
      (slot.eventName             ?? "").toLowerCase().includes(q) ||
      (l.remarks                  ?? "").toLowerCase().includes(q) ||
      (l.office?.office_name      ?? "").toLowerCase().includes(q)

    const matchConducted =
      filterConducted === "all" ||
      (filterConducted === "true"  &&  l.event_conducted_flag) ||
      (filterConducted === "false" && !l.event_conducted_flag)

    const ci = complianceInfo(l.event_conducted_flag, l.remarks)
    const matchCompliance =
      filterCompliance === "all" ||
      (filterCompliance === "compliant" && ci.label === "Compliant") ||
      (filterCompliance === "issue"     && (ci.label === "Minor Issue" || ci.label === "Incident Reported")) ||
      (filterCompliance === "no_show"   && ci.label === "No Show / Cancelled")

    return matchSearch && matchConducted && matchCompliance
  })

  // ── KPI counts ────────────────────────────────────────────────
  const conductedCount = logs.filter(l => l.event_conducted_flag).length
  const incidentCount  = logs.filter(l => complianceInfo(l.event_conducted_flag, l.remarks).label === "Incident Reported").length
  const minorCount     = logs.filter(l => complianceInfo(l.event_conducted_flag, l.remarks).label === "Minor Issue").length
  const compliantCount = logs.filter(l => complianceInfo(l.event_conducted_flag, l.remarks).label === "Compliant").length
  const paidCount      = logs.filter(l => l.payment?.payment_status === "settled").length

  if (!user) return null
  const meta = ROLE_META[user.role]

  // ─────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">

      {/* PAGE HEADER */}
      <div className="mb-8">
        <span
          className="px-3 py-1 rounded text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Site Usage Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parks &amp; Recreation Scheduling — BPMN Steps 10 · 11 · 12 · 13 · 14 · 15 · 16
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <CalendarCheck size={18} className="text-blue-500" />
            </div>
            <div className="text-2xl font-bold">{logs.length}</div>
            <div className="text-xs text-muted-foreground">Total Logs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle2 size={18} className="text-green-500" />
            </div>
            <div className="text-2xl font-bold">{conductedCount}</div>
            <div className="text-xs text-muted-foreground">Events Conducted</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <ShieldCheck size={18} className="text-emerald-500" />
            </div>
            <div className="text-2xl font-bold">{compliantCount}</div>
            <div className="text-xs text-muted-foreground">Fully Compliant</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <div className="text-2xl font-bold">{incidentCount + minorCount}</div>
            <div className="text-xs text-muted-foreground">Issues / Incidents</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between mb-3">
              <CreditCard size={18} className="text-violet-500" />
            </div>
            <div className="text-2xl font-bold">{paidCount}</div>
            <div className="text-xs text-muted-foreground">Payments Settled</div>
          </CardContent>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search log ID, venue, applicant, event…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            className="appearance-none pl-8 pr-8 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterConducted}
            onChange={(e) => setFilterConducted(e.target.value as any)}
          >
            <option value="all">All Events</option>
            <option value="true">Conducted</option>
            <option value="false">Not Conducted</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <ShieldCheck size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            className="appearance-none pl-8 pr-8 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterCompliance}
            onChange={(e) => setFilterCompliance(e.target.value as any)}
          >
            <option value="all">All Compliance</option>
            <option value="compliant">Compliant</option>
            <option value="issue">Issues / Incidents</option>
            <option value="no_show">No Show</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} of {logs.length} logs</span>
        <button
          onClick={() => void loadData()}
          className="p-2 rounded-md border text-muted-foreground hover:bg-muted transition"
          title="Refresh from Supabase"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* LOGS TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck size={16} />
            Event Monitoring Records
            <span className="text-xs font-normal text-muted-foreground ml-1">
              ({filtered.length} of {logs.length}) — BPMN Step 15
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" />
              Loading from Supabase…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <FileText size={30} className="mb-2 opacity-25" />
              <p className="text-sm">No usage logs found.</p>
              {(search || filterConducted !== "all" || filterCompliance !== "all") && (
                <button
                  onClick={() => { setSearch(""); setFilterConducted("all"); setFilterCompliance("all") }}
                  className="mt-2 text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="border-b text-left">
                    {[
                      "Log ID",
                      "Venue",
                      "Event / Date",
                      "Applicant",
                      "Monitoring Office",
                      "Payment",           // BPMN Steps 10–12
                      "Conducted",
                      "Compliance",
                      "Remarks",
                      "",
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((l) => {
                    const slot = parseSlot(l.reservation?.time_slot)
                    const ci   = complianceInfo(l.event_conducted_flag, l.remarks)
                    const CIcon = ci.Icon
                    return (
                      <tr
                        key={l.usage_id}
                        className="group hover:bg-muted/30 transition cursor-pointer"
                        onClick={() => setViewLog(l)}
                      >
                        {/* Log ID */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-blue-500">{l.usage_id}</span>
                          {l.reservation_id && (
                            <div className="text-[10px] text-muted-foreground/50 font-mono">{l.reservation_id}</div>
                          )}
                        </td>

                        {/* Venue */}
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium max-w-[150px] truncate">
                            {l.venue?.park_venue_name ?? "—"}
                          </div>
                          {l.venue?.location && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                              <MapPin size={9} />{l.venue.location}
                            </div>
                          )}
                          {l.venue?.availability_status && (
                            <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${venueBg(l.venue.availability_status)}`}>
                              {l.venue.availability_status.replace(/_/g, " ")}
                            </span>
                          )}
                        </td>

                        {/* Event / Date */}
                        <td className="px-4 py-3">
                          {slot.eventName && (
                            <div className="text-sm font-medium max-w-[140px] truncate">
                              🎉 {slot.eventName}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Calendar size={10} />
                            {l.reservation?.reservation_date ?? "—"}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock size={9} />{slot.time}
                          </div>
                        </td>

                        {/* Applicant */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-200">{l.person?.full_name ?? "—"}</div>
                          {l.person?.contact_number && (
                            <div className="text-[11px] text-muted-foreground">{l.person.contact_number}</div>
                          )}
                        </td>

                        {/* Monitoring Office */}
                        <td className="px-4 py-3">
                          <div className="text-xs text-slate-300 max-w-[130px] truncate">
                            {l.office?.office_name ?? "—"}
                          </div>
                          {l.office?.parent_department && (
                            <div className="text-[11px] text-muted-foreground">{l.office.parent_department}</div>
                          )}
                        </td>

                        {/* Payment — BPMN Steps 10–12 */}
                        <td className="px-4 py-3">
                          {l.payment ? (
                            <div>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold text-white ${payBg(l.payment.payment_status)}`}>
                                {l.payment.payment_status ? cap(l.payment.payment_status) : "—"}
                              </span>
                              {l.payment.amount_paid != null && (
                                <div className="text-xs text-green-500 font-medium mt-0.5">
                                  ₱{Number(l.payment.amount_paid).toLocaleString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/40">No payment</span>
                          )}
                        </td>

                        {/* Conducted */}
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${conductedBg(l.event_conducted_flag)}`}>
                            {conductedLabel(l.event_conducted_flag)}
                          </span>
                        </td>

                        {/* Compliance */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white ${ci.cls}`}>
                            <CIcon size={9} />{ci.label}
                          </span>
                        </td>

                        {/* Remarks snippet */}
                        <td className="px-4 py-3 max-w-[160px]">
                          {l.remarks ? (
                            <div className="flex items-start gap-1 text-xs text-muted-foreground">
                              <AlignLeft size={10} className="mt-0.5 shrink-0" />
                              <span className="line-clamp-2">{l.remarks}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/30">—</span>
                          )}
                        </td>

                        {/* View */}
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setViewLog(l)}
                            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition opacity-0 group-hover:opacity-100"
                            title="View full details"
                          >
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BPMN Step 16 footer note */}
      <div className="mt-4 px-4 py-3 rounded-xl text-xs text-muted-foreground flex items-start gap-2 border">
        <AlertCircle size={13} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          <strong className="text-foreground">BPMN Step 16 —</strong> After an event is logged as
          completed and monitored here, the <strong className="text-foreground">Citizen Information &amp; Engagement
          — Notification &amp; Alert System</strong> sends an event completion notice to the applicant
          and the funeral home (if applicable). This table is the source of truth for that trigger.
        </span>
      </div>

      {/* DETAIL MODAL */}
      {viewLog && (
        <DetailModal log={viewLog} onClose={() => setViewLog(null)} />
      )}
    </div>
  )
}