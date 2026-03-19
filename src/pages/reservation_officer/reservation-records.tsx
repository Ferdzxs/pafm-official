import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { AlertCircle, CheckCircle2, Clock, Search, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Venue = {
  park_venue_id: string
  park_venue_name: string
  location: string | null
}
type Person = {
  person_id: string
  full_name: string
  contact_number: string | null
  address: string | null
}
type ParkReservationRecord = {
  reservation_id: string
  park_venue_id: string | null
  applicant_person_id: string | null
  reservation_date: string
  time_slot: string | null
  status: string | null
  letter_of_intent_doc: string | null
  received_by_employee: string | null
  venue?: Venue | null
  person?: Person | null
}

function normalizeParkStatus(s?: string | null) {
  if (!s) return "pending_loi"
  if (s === "pending") return "pending_loi"
  if (s === "approved") return "admin_approved"
  if (s === "rejected") return "admin_rejected"
  return s
}

function parseTimeSlot(timeSlot?: string | null) {
  const raw = (timeSlot ?? "").trim()
  if (!raw) return { time: "", eventName: "", purpose: "" }
  const parts = raw.split("|").map(p => p.trim())
  const time = parts[0] ?? ""
  const eventName = parts[1] ?? ""
  const purposePart = parts.find(p => p.toLowerCase().startsWith("purpose:"))
  const purpose = purposePart ? purposePart.replace(/^purpose:\s*/i, "") : ""
  return { time, eventName, purpose }
}

function overlapsSlot(a?: string | null, b?: string | null) {
  const parse = (s?: string | null) => {
    const first = (s ?? "").split("|")[0]?.trim() ?? ""
    const [start, end] = first.split("-").map(x => x.trim())
    if (!start || !end) return null
    const toMin = (t: string) => {
      const [hh, mm] = t.split(":").map(n => parseInt(n, 10))
      if (Number.isNaN(hh) || Number.isNaN(mm)) return null
      return hh * 60 + mm
    }
    const sMin = toMin(start)
    const eMin = toMin(end)
    if (sMin == null || eMin == null) return null
    return { sMin, eMin }
  }
  const pa = parse(a)
  const pb = parse(b)
  if (!pa || !pb) return false
  return pa.sMin < pb.eMin && pb.sMin < pa.eMin
}

export default function ReservationRecordsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ParkReservationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, park_venue_id, applicant_person_id, reservation_date, time_slot, status, letter_of_intent_doc, received_by_employee")
        .order("reservation_date", { ascending: true })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((recs ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]

      const [{ data: venues }, { data: persons }] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name, location").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] as any[] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, contact_number, address").in("person_id", personIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      ;(venues ?? []).forEach((v: any) => (venueMap[v.park_venue_id] = v))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p))

      const merged = (recs ?? []).map((r: any) => ({
        ...r,
        venue: r.park_venue_id ? venueMap[r.park_venue_id] ?? null : null,
        person: r.applicant_person_id ? personMap[r.applicant_person_id] ?? null : null,
      })) as ParkReservationRecord[]

      setRows(merged)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reservations.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const slot = parseTimeSlot(r.time_slot)
      const hay = [
        r.reservation_id,
        r.reservation_date,
        r.venue?.park_venue_name ?? "",
        r.person?.full_name ?? "",
        slot.eventName,
        slot.purpose,
      ]
        .join(" ")
        .toLowerCase()
      return !q || hay.includes(q)
    })
  }, [rows, search])

  const incoming = filtered.filter((r) => {
    const s = normalizeParkStatus(r.status)
    return s === "pending_loi" || s === "desk_logged"
  })

  async function setStatus(reservationId: string, status: string) {
    setActionLoading(reservationId)
    setError(null)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status })
        .eq("reservation_id", reservationId)
      if (e) throw new Error(e.message)
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed.")
    } finally {
      setActionLoading(null)
    }
  }

  async function checkAvailabilityAndProceed(r: ParkReservationRecord) {
    if (!r.park_venue_id) {
      setError("Missing venue on this reservation.")
      return
    }
    setActionLoading(r.reservation_id)
    setError(null)
    try {
      const { data: sameDay, error: e } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, time_slot, status")
        .eq("park_venue_id", r.park_venue_id)
        .eq("reservation_date", r.reservation_date)

      if (e) throw new Error(e.message)

      const conflicts = (sameDay ?? [])
        .filter((x: any) => x.reservation_id !== r.reservation_id)
        .filter((x: any) => {
          const s = normalizeParkStatus(x.status)
          // treat these as occupying time:
          return ["endorsed_to_admin", "admin_approved", "payment_settled", "permit_released", "monitored", "completed", "approved"].includes(s)
        })
        .some((x: any) => overlapsSlot(r.time_slot, x.time_slot))

      if (conflicts) {
        await setStatus(r.reservation_id, "availability_failed")
        return
      }
      await setStatus(r.reservation_id, "desk_logged")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Availability check failed.")
    } finally {
      setActionLoading(null)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-8">
        <span className="px-3 py-1 rounded text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Reservation Records (Desk)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parks &amp; Recreation Scheduling — BPMN Steps 2 · 3 · 4
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="input-field pl-9"
            placeholder="Search by ID, venue, applicant, event, purpose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Incoming queue: <span className="font-semibold text-foreground">{incoming.length}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock size={16} /> Incoming Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
          {!loading && incoming.length === 0 && (
            <div className="text-sm text-muted-foreground">No incoming requests.</div>
          )}
          {!loading && incoming.map((r) => {
            const slot = parseTimeSlot(r.time_slot)
            const status = normalizeParkStatus(r.status)
            const canEndorse = status === "desk_logged"
            return (
              <div key={r.reservation_id} className="rounded-xl border border-border-subtle bg-card px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">
                      {r.reservation_id} · {r.venue?.park_venue_name ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.person?.full_name ?? "Unknown applicant"} · {r.reservation_date}
                      {slot.time ? ` · ${slot.time}` : ""}
                      {slot.eventName ? ` · ${slot.eventName}` : ""}
                    </div>
                    {slot.purpose && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        Purpose: {slot.purpose}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      className="btn-secondary"
                      disabled={actionLoading === r.reservation_id}
                      onClick={() => checkAvailabilityAndProceed(r)}
                      title="BPMN Step 3 — Check availability"
                    >
                      {actionLoading === r.reservation_id ? "Checking…" : "Check Availability"}
                    </button>
                    <button
                      className="btn-primary"
                      disabled={!canEndorse || actionLoading === r.reservation_id}
                      onClick={() => setStatus(r.reservation_id, "endorsed_to_admin")}
                      title="BPMN Step 4 — Endorse to Parks Admin"
                    >
                      <CheckCircle2 size={14} />
                      Endorse
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-muted-foreground">
                  Current status: <span className="font-semibold text-foreground">{status}</span>
                  {!r.letter_of_intent_doc && (
                    <>
                      {" · "}
                      <span className="text-amber-600">LOI document missing</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
