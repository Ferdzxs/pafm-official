/**
 * reservation-records.tsx — Reservation Officer overhauled for UI/UX
 */

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText,
  Eye,
  Search, 
  X, 
  RefreshCw, 
  Calendar, 
  User, 
  MapPin, 
  ChevronRight, 
  Info,
  ShieldCheck,
  Zap,
  Ticket,
  ClipboardList
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ParkReservationDocumentsViewer } from "@/components/parks/ParkReservationDocumentsViewer"
import type { QmcParkApplicationPayload } from "@/lib/qmcParkApplicationForm"
import { cn } from "@/lib/utils"

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
  application_form_doc: string | null
  application_form_payload: QmcParkApplicationPayload | null
  digital_permit_url: string | null
  received_by_employee: string | null
  venue?: Venue | null
  person?: Person | null
  letter_of_intent_url?: string | null
  application_form_url?: string | null
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
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState<ParkReservationRecord | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select(
          "reservation_id, park_venue_id, applicant_person_id, reservation_date, time_slot, status, letter_of_intent_doc, application_form_doc, application_form_payload, digital_permit_url, received_by_employee"
        )
        .order("reservation_date", { ascending: true })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((recs ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const docIds = [
        ...new Set(
          (recs ?? []).flatMap((r: any) => [r.letter_of_intent_doc, r.application_form_doc].filter(Boolean))
        ),
      ] as string[]

      const [{ data: venues }, { data: persons }, { data: docs }] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name, location").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] as any[] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, contact_number, address").in("person_id", personIds)
          : Promise.resolve({ data: [] as any[] }),
        docIds.length
          ? supabase.from("digital_document").select("document_id, file_url").in("document_id", docIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      const docUrlMap: Record<string, string> = {}
      ;(venues ?? []).forEach((v: any) => (venueMap[v.park_venue_id] = v))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p))
      ;(docs ?? []).forEach((d: any) => (docUrlMap[d.document_id] = d.file_url ?? ""))

      const merged = (recs ?? []).map((r: any) => {
        const payload = r.application_form_payload as QmcParkApplicationPayload | null
        const validPayload =
          payload && payload.source_form === "qmc_facilities_2024_09" && payload.applicant && payload.event
            ? payload
            : null
        return {
          ...r,
          application_form_payload: validPayload,
          venue: r.park_venue_id ? venueMap[r.park_venue_id] ?? null : null,
          person: r.applicant_person_id ? personMap[r.applicant_person_id] ?? null : null,
          letter_of_intent_url: r.letter_of_intent_doc ? docUrlMap[r.letter_of_intent_doc] ?? null : null,
          application_form_url: r.application_form_doc ? docUrlMap[r.application_form_doc] ?? null : null,
        }
      }) as ParkReservationRecord[]

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
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
               {meta.label.toUpperCase()}
             </Badge>
              <span className="h-1 w-1 rounded-full bg-muted-foreground" />
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
               <ClipboardList className="h-3.5 w-3.5 text-primary" /> Incoming Queue
             </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Reservation Intake</h1>
           <p className="text-muted-foreground text-sm font-medium italic">
            Parks & Recreation Intake — Availability & Endorsement
          </p>
        </div>
        <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading} className="shadow-xs border-border">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Intake
            </Button>
        </div>
      </header>

      {error && (
         <div className="rounded-xl border border-destructive bg-destructive/10 p-4 flex gap-3 text-sm text-destructive items-center shadow-xs">
           <AlertCircle size={16} className="shrink-0" />
           <p className="font-medium">{error}</p>
           <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto hover:bg-destructive/20 text-destructive" onClick={() => setError(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* TOOLBAR */}
       <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
           <Input
            className="pl-10 h-10 border-border bg-background focus:bg-background transition-all shadow-xs"
            placeholder="Search by ID, venue, organizer, or purpose..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-amber-500" />
             Pending Intake: <span className="text-foreground ml-1">{incoming.length}</span>
          </div>
        </div>
      </div>

      {/* QUEUE RECORDS */}
       <Card className="border-border shadow-sm overflow-hidden bg-card">
         <CardHeader className="pb-3 bg-muted border-b">
           <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight">
             <Clock size={18} className="text-amber-500" /> Administrative Intake Queue
           </CardTitle>
           <CardDescription>Perform availability checks before endorsement</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                 <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Synchronizing Availability Logs...</p>
             </div>
          ) : incoming.length === 0 ? (
             <div className="py-24 text-center space-y-4">
                 <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                   <CheckCircle2 size={24} />
                </div>
                <div className="space-y-1">
                   <p className="font-bold text-foreground">Intake Clear</p>
                   <p className="text-xs text-muted-foreground">No new Letter of Intent submissions awaiting officer validation.</p>
                </div>
             </div>
          ) : (
             <div className="divide-y divide-border">
              {incoming.map((r) => {
                const slot = parseTimeSlot(r.time_slot)
                const status = normalizeParkStatus(r.status)
                const canEndorse = status === "desk_logged"
                
                return (
                   <div key={r.reservation_id} className="group flex flex-col lg:flex-row lg:items-center justify-between p-6 hover:bg-muted transition-all gap-6">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-start gap-4">
                         <div className="h-10 w-10 shrink-0 rounded-xl bg-background border border-border flex flex-col items-center justify-center shadow-xs group-hover:border-primary transition-colors">
                           <p className="text-[9px] font-bold uppercase text-muted-foreground italic tracking-tighter">REF</p>
                           <p className="text-xs font-bold font-mono text-foreground leading-none">{r.reservation_id.slice(-4)}</p>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-foreground flex items-center gap-2 group-hover:text-amber-600 transition-colors truncate">
                             {r.reservation_id}
                          </p>
                           <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] font-medium text-muted-foreground">
                              <span className="flex items-center gap-1.5"><MapPin size={12} /> {r.venue?.park_venue_name || 'System Site'}</span>
                              <span className="flex items-center gap-1.5"><Calendar size={12} /> {r.reservation_date} {slot.time && `(@${slot.time})`}</span>
                              <span className="flex items-center gap-1.5"><User size={12} /> {r.person?.full_name || 'Unknown Applicant'}</span>
                           </div>
                          {slot.eventName && (
                             <p className="mt-2 text-xs font-bold text-foreground line-clamp-1 flex items-center gap-2">
                               <Zap size={10} className="text-amber-500" /> {slot.eventName}
                            </p>
                          )}
                          {slot.purpose && (
                            <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed italic line-clamp-1">
                               Purpose: {slot.purpose}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-14">
                         <Badge variant={status === 'availability_failed' ? 'destructive' : status === 'desk_logged' ? 'success' : 'warning'} className="text-[9px] font-bold uppercase tracking-tight h-5 px-2 py-0 border-none">
                            {status.replace(/_/g, ' ')}
                         </Badge>
                         <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           className="h-7 text-[10px] font-bold uppercase tracking-widest gap-2 bg-background border-border shadow-xs"
                           onClick={() => {
                             setDetailRecord(r)
                             setDetailOpen(true)
                           }}
                         >
                           <Eye size={12} className="text-primary" />
                           View documents
                         </Button>
                         {!r.letter_of_intent_url && (
                           <span className="text-[10px] font-bold text-amber-600 uppercase flex items-center gap-1.5">
                             <AlertCircle size={10} /> LOI missing
                           </span>
                         )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end pl-14 lg:pl-0">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        disabled={actionLoading === r.reservation_id}
                        onClick={() => checkAvailabilityAndProceed(r)}
                        title="Check availability"
                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest gap-2 shadow-xs"
                      >
                         {actionLoading === r.reservation_id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <Search size={14} />}
                         Check Availability
                      </Button>

                      <Button 
                        size="sm" 
                        disabled={!canEndorse || actionLoading === r.reservation_id}
                        onClick={() => setStatus(r.reservation_id, "endorsed_to_admin")}
                        title="Endorse to Parks Admin"
                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest gap-2 bg-primary hover:bg-primary/90 text-white shadow-xs"
                      >
                        {actionLoading === r.reservation_id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <CheckCircle2 size={14} />}
                        Endorse
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open)
          if (!open) setDetailRecord(null)
        }}
      >
        <DialogContent className="sm:max-w-4xl w-[min(100vw-2rem,56rem)] p-0 overflow-hidden border-none bg-transparent shadow-none max-h-[92vh]">
          {detailRecord && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar p-1">
              <DialogHeader className="mb-6 space-y-1 text-left px-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">
                      REF: {detailRecord.reservation_id}
                    </Badge>
                    <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight pt-2">
                      {parseTimeSlot(detailRecord.time_slot).eventName || "Park reservation"}
                    </DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground/80">
                      {detailRecord.venue?.park_venue_name ?? "Venue"} · {detailRecord.reservation_date} ·{" "}
                      {detailRecord.person?.full_name ?? "Applicant"}
                    </DialogDescription>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-inner">
                    <FileText size={22} />
                  </div>
                </div>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm surface-box border border-border/20 p-4 mb-6">
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Status</p>
                  <Badge variant="outline" className="text-[9px]">
                    {normalizeParkStatus(detailRecord.status).replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Schedule</p>
                  <p className="font-bold text-foreground">{detailRecord.reservation_date}</p>
                </div>
              </div>

              <ParkReservationDocumentsViewer
                reservationId={detailRecord.reservation_id}
                loiUrl={detailRecord.letter_of_intent_url}
                applicationFormDocUrl={detailRecord.application_form_url}
                applicationFormPayload={detailRecord.application_form_payload}
                permitUrl={detailRecord.digital_permit_url}
              />

              <div className="mt-6 flex justify-end">
                <Button variant="outline" className="rounded-xl h-11 text-[11px] font-extrabold uppercase tracking-widest" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FOOTER CALLOUT */}
       <footer className="rounded-2xl border border-amber-500 bg-amber-50 p-4 flex gap-4 items-start md:items-center shadow-xs">
          <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
           <Info size={18} />
         </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium leading-relaxed max-w-2xl">
           <strong className="text-amber-900 dark:text-amber-300 uppercase tracking-tighter mr-1.5 font-bold italic">Intake SOP:</strong>            Automated checks only validate schedule overlaps. Officers must still verify the <span className="underline decoration-amber-500">Letter of Intent (LOI)</span> contents for compliance with municipal park regulations before endorsing.
         </p>
      </footer>
    </div>
  )
}
