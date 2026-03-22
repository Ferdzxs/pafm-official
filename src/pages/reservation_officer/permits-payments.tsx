/**
 * permits-payments.tsx — Reservation Officer overhauled for UI/UX
 */

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Calendar, 
  AlertTriangle, 
  X, 
  RefreshCw, 
  FileCheck, 
  CreditCard, 
  Download, 
  ExternalLink, 
  Info,
  ShieldCheck,
  Package,
  ChevronRight,
  MoreVertical,
  Zap,
  Ticket,
  AlertCircle,
  BadgeCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectItem } from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  generateParkPermitPdfBlob,
  buildPermitInputFromPayload,
  buildPermitInputFallback,
} from "@/lib/parkPermitPdf"
import type { QmcParkApplicationPayload } from "@/lib/qmcParkApplicationForm"

type PaymentStatus = "unpaid" | "paid"
type PermitStatus = "waiting_admin" | "ready_to_release" | "released"

type Venue = { park_venue_id: string; park_venue_name: string; location: string | null }
type Person = { person_id: string; full_name: string; address?: string | null; contact_number?: string | null }
type Payment = { payment_id: string; payment_status: string | null; digital_or_no: string | null; amount_paid: number | null }

interface ParkPermitRow {
  reservation_id: string
  venue: string
  event_name: string
  organizer: string
  schedule_date: string
  payment_status: PaymentStatus
  payment_reference?: string
  permit_status: PermitStatus
  raw: {
    status: string | null
    park_venue_id: string | null
    applicant_person_id: string | null
    payment_id: string | null
    digital_permit_url: string | null
    reservation_date: string
    time_slot: string | null
    application_form_payload: QmcParkApplicationPayload | null
    venue: Venue | null
    person: Person | null
  }
}

const BUCKET_PARKS_DOCS = "parks-docs"

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

function buildPermitInputForRow(row: ParkPermitRow, permitRefNo: string) {
  const { raw } = row
  if (raw.application_form_payload && raw.application_form_payload.source_form === "qmc_facilities_2024_09") {
    return buildPermitInputFromPayload(
      raw.application_form_payload,
      row.reservation_id,
      permitRefNo,
      row.payment_reference ?? null,
      raw.venue?.park_venue_name ?? row.venue,
      raw.venue?.location ?? null
    )
  }
  const slot = parseTimeSlot(raw.time_slot)
  return buildPermitInputFallback({
    reservationId: row.reservation_id,
    permitRefNo,
    orNo: row.payment_reference ?? null,
    venueName: raw.venue?.park_venue_name ?? row.venue,
    venueLocation: raw.venue?.location ?? null,
    reservationDate: raw.reservation_date,
    timeSlot: slot.time,
    eventName: slot.eventName || row.event_name,
    applicantName: raw.person?.full_name ?? row.organizer,
    applicantAddress: raw.person?.address ?? undefined,
    applicantContact: raw.person?.contact_number ?? undefined,
  })
}

export default function PermitsPaymentsPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | PermitStatus>("all")
  const [rows, setRows] = useState<ParkPermitRow[]>([])
  const [selected, setSelected] = useState<ParkPermitRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [releasing, setReleasing] = useState(false)
  /** Blob URL for preview (ready_to_release) or same as stored URL for released */
  const [permitPreviewUrl, setPermitPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  useEffect(() => {
    if (!selected) {
      setPermitPreviewUrl(null)
      return
    }
    if (selected.permit_status === "released" && selected.raw.digital_permit_url) {
      setPermitPreviewUrl(selected.raw.digital_permit_url)
      return
    }
    if (selected.permit_status === "ready_to_release") {
      const permitRefNo = `PP-PREVIEW-${selected.reservation_id.slice(-8)}`
      const blob = generateParkPermitPdfBlob(buildPermitInputForRow(selected, permitRefNo))
      const url = URL.createObjectURL(blob)
      setPermitPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    }
    setPermitPreviewUrl(null)
  }, [selected])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, park_venue_id, applicant_person_id, reservation_date, time_slot, status, payment_id, digital_permit_url, application_form_payload")
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((recs ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIds = [...new Set((recs ?? []).map((r: any) => r.payment_id).filter(Boolean))] as string[]

      const [{ data: venues }, { data: persons }, { data: payments }] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name, location").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] as any[] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, address, contact_number").in("person_id", personIds)
          : Promise.resolve({ data: [] as any[] }),
        paymentIds.length
          ? supabase.from("digital_payment").select("payment_id, payment_status, digital_or_no, amount_paid").in("payment_id", paymentIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      const paymentMap: Record<string, Payment> = {}
      ;(venues ?? []).forEach((v: any) => (venueMap[v.park_venue_id] = v))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p))
      ;(payments ?? []).forEach((p: any) => (paymentMap[p.payment_id] = p))

      const next: ParkPermitRow[] = (recs ?? []).map((r: any) => {
        const slot = parseTimeSlot(r.time_slot)
        const venue = r.park_venue_id ? venueMap[r.park_venue_id] : null
        const person = r.applicant_person_id ? personMap[r.applicant_person_id] : null
        const pay = r.payment_id ? paymentMap[r.payment_id] : null

        const normalized = normalizeParkStatus(r.status)
        const isReleased = normalized === "permit_released" || !!r.digital_permit_url
        const isValidated = ["application_validated", "payment_pending", "payment_settled", "order_of_payment_issued"].includes(normalized)
        const postApprovalStatuses = ["admin_approved", "approved", "application_form_issued", "application_submitted", "application_incomplete", "application_validated", "order_of_payment_issued", "payment_settled"]
        const isAdminApproved = postApprovalStatuses.includes(normalized)
        const paid = pay?.payment_status === "settled" || (pay && (pay.amount_paid ?? 0) === 0)
        const payment_status: PaymentStatus = paid ? "paid" : "unpaid"

        const permit_status: PermitStatus = isReleased
          ? "released"
          : isValidated && isAdminApproved && paid
          ? "ready_to_release"
          : "waiting_admin"

        const payload = r.application_form_payload as QmcParkApplicationPayload | null
        const isValidPayload = payload && payload.source_form === "qmc_facilities_2024_09" && payload.applicant && payload.event

        return {
          reservation_id: r.reservation_id,
          venue: venue?.park_venue_name ?? "—",
          event_name: slot.eventName || (isValidPayload ? payload!.event.event_title : "") || "—",
          organizer: person?.full_name ?? (isValidPayload ? payload!.applicant.full_name : "") ?? "—",
          schedule_date: `${r.reservation_date}T00:00:00Z`,
          payment_status,
          payment_reference: pay?.digital_or_no ?? undefined,
          permit_status,
          raw: {
            status: r.status,
            park_venue_id: r.park_venue_id,
            applicant_person_id: r.applicant_person_id,
            payment_id: r.payment_id,
            digital_permit_url: r.digital_permit_url,
            reservation_date: r.reservation_date,
            time_slot: r.time_slot,
            application_form_payload: isValidPayload ? payload : null,
            venue,
            person,
          },
        }
      })

      setRows(next.filter(r => ["waiting_admin", "ready_to_release", "released"].includes(r.permit_status)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load permits.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return rows.filter((row) => {
      const matchSearch =
        row.reservation_id.toLowerCase().includes(q) ||
        row.venue.toLowerCase().includes(q) ||
        row.event_name.toLowerCase().includes(q) ||
        row.organizer.toLowerCase().includes(q)
      const matchStatus = statusFilter === "all" || row.permit_status === statusFilter
      return (!q || matchSearch) && matchStatus
    })
  }, [rows, search, statusFilter])

  const stats = useMemo(() => {
    return {
      waiting: rows.filter((r) => r.permit_status === "waiting_admin").length,
      ready: rows.filter((r) => r.permit_status === "ready_to_release").length,
      released: rows.filter((r) => r.permit_status === "released").length,
    }
  }, [rows])

  async function releasePermit(row: ParkPermitRow) {
    if (row.permit_status !== "ready_to_release") return
    setReleasing(true)
    setError(null)
    try {
      const permitRefNo = `PP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000 + 10000))}`
      const permitInput = buildPermitInputForRow(row, permitRefNo)
      const blob = generateParkPermitPdfBlob(permitInput)
      const path = `permits/${row.reservation_id}/${Date.now()}-permit.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET_PARKS_DOCS).upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      })
      if (upErr) throw new Error(upErr.message)

      const { data: urlData } = supabase.storage.from(BUCKET_PARKS_DOCS).getPublicUrl(path)
      const fileUrl = urlData.publicUrl

      await supabase.from("digital_document").insert({
        document_id: `DDOC-${Date.now()}`,
        document_type: "park_permit",
        reference_no: permitRefNo,
        date_created: new Date().toISOString().split("T")[0],
        status: "active",
        created_by_office: "OFF-003",
        person_id: row.raw.applicant_person_id,
        file_url: fileUrl,
      })

      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status: "permit_released", digital_permit_url: fileUrl })
        .eq("reservation_id", row.reservation_id)
      if (e) throw new Error(e.message)

      setSelected(null)
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to release permit.")
    } finally {
      setReleasing(false)
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
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
               <Ticket className="h-3.5 w-3.5 text-primary" /> Multi-Step Checkout
             </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Permits & Payments</h1>
          <p className="text-muted-foreground text-sm font-medium italic max-w-2xl">
            Authorize digital permit release only after verified payment coordination and administrative clearance.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading} className="shadow-xs border-border">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Records
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

      {/* KPI STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-5 flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <Clock size={24} />
             </div>
             <div>
                <p className="text-2xl font-bold tracking-tight">{stats.waiting}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Awaiting Admin/Pay</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500 shadow-xs bg-amber-50">
          <CardContent className="p-5 flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                <AlertTriangle size={24} />
             </div>
             <div>
                <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400">{stats.ready}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Ready to Release</p>
             </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500 shadow-xs bg-emerald-50">
          <CardContent className="p-5 flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle size={24} />
             </div>
             <div>
                <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">{stats.released}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Permits Issued</p>
             </div>
          </CardContent>
        </Card>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center justify-between bg-card border border-border rounded-2xl p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-10 h-10 border-border bg-background focus:bg-background transition-all shadow-xs"
            placeholder="Search by ID, organizer, or venue name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
           <Filter size={14} className="text-muted-foreground" />
           <select 
              className="flex h-10 w-[180px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
           >
              <option value="all">All Status</option>
              <option value="waiting_admin">Awaiting Admin/Pay</option>
              <option value="ready_to_release">Ready to Release</option>
              <option value="released">Released</option>
           </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[140px] font-bold tracking-tight uppercase text-[10px]">Reference</TableHead>
              <TableHead className="font-bold tracking-tight uppercase text-[10px]">Venue & Event</TableHead>
              <TableHead className="font-bold tracking-tight uppercase text-[10px]">Organizer</TableHead>
              <TableHead className="font-bold tracking-tight uppercase text-[10px]">Schedule</TableHead>
              <TableHead className="font-bold tracking-tight uppercase text-[10px]">Payment</TableHead>
              <TableHead className="font-bold tracking-tight uppercase text-[10px]">Permit</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-64 text-center">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Fetching registry...</p>
                 </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-64 text-center">
                    <Package className="h-6 w-6 mx-auto text-muted-foreground/20 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No records found matching filters.</p>
                 </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow 
                  key={row.reservation_id} 
                  className="group cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => setSelected(row)}
                >
                  <TableCell className="font-mono text-xs font-bold text-primary">{row.reservation_id}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-foreground truncate max-w-[200px]">{row.event_name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <MapPin size={10} className="opacity-50" /> {row.venue}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm font-medium text-foreground">{row.organizer}</p>
                  </TableCell>
                  <TableCell>
                     <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
                        <Calendar size={12} className="opacity-50" />
                        {new Date(row.schedule_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                     </div>
                  </TableCell>
                  <TableCell>
                     <Badge variant={row.payment_status === 'paid' ? 'success' : 'destructive'} className="text-[9px] font-bold uppercase tracking-tight h-5">
                       {row.payment_status}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.permit_status === 'released' ? 'outline' : row.permit_status === 'ready_to_release' ? 'warning' : 'secondary'} className="text-[9px] font-bold uppercase tracking-tight h-5">
                      {row.permit_status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                     <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight size={14} className="text-muted-foreground" />
                     </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-4xl w-[min(100vw-2rem,56rem)] p-0 overflow-hidden border-none bg-transparent shadow-none">
          {selected && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6 space-y-1 text-left">
                 <div className="flex items-start justify-between">
                    <div className="space-y-1">
                       <div className="flex items-center gap-2 mb-2">
                         <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">REF: {selected.reservation_id}</Badge>
                       </div>
                       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                         {selected.event_name}
                       </DialogTitle>
                       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                         Scheduled at {selected.venue}
                       </DialogDescription>
                    </div>
                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", 
                      selected.permit_status === 'ready_to_release' ? 'bg-amber-100 text-amber-600' :
                      selected.permit_status === 'released' ? 'bg-emerald-100/50 text-emerald-600' : 'bg-muted text-muted-foreground'
                    )}>
                      {selected.permit_status === 'released' ? <BadgeCheck size={24} /> : <FileCheck size={24} />}
                    </div>
                 </div>
              </DialogHeader>

              <div className="space-y-6">
                 {permitPreviewUrl && (
                   <div className="space-y-3">
                     <div className="flex flex-wrap items-center justify-between gap-2">
                       <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                         <Eye size={14} className="text-primary" />
                         {selected.permit_status === "ready_to_release" ? "Permit preview (before release)" : "Issued permit"}
                       </p>
                       <div className="flex items-center gap-2">
                         <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest" asChild>
                           <a href={permitPreviewUrl} target="_blank" rel="noopener noreferrer" download={`park-permit-${selected.reservation_id}.pdf`}>
                             <Download size={12} className="mr-1.5" /> Download PDF
                           </a>
                         </Button>
                         {selected.permit_status === "released" && selected.raw.digital_permit_url && (
                           <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary" asChild>
                             <a href={selected.raw.digital_permit_url} target="_blank" rel="noopener noreferrer">
                               <ExternalLink size={12} className="mr-1.5" /> Open in new tab
                             </a>
                           </Button>
                         )}
                       </div>
                     </div>
                     <div className="rounded-xl border border-border bg-muted/30 overflow-hidden shadow-inner">
                       <iframe
                         title="Park event permit PDF"
                         src={`${permitPreviewUrl}#toolbar=1`}
                         className="w-full min-h-[min(70vh,520px)] h-[min(70vh,520px)] bg-background"
                       />
                     </div>
                     {selected.permit_status === "ready_to_release" && (
                       <p className="text-[11px] text-muted-foreground leading-relaxed">
                         Preview uses a draft permit number. Authorize Release to issue the final permit and store it on file.
                       </p>
                     )}
                   </div>
                 )}

                 <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm surface-box border border-border/20 p-5">
                    <div className="space-y-1">
                       <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Organizer</p>
                       <p className="font-bold text-foreground">{selected.organizer}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5 justify-end"><Calendar size={12}/> Schedule</p>
                       <p className="font-bold text-foreground">{new Date(selected.schedule_date).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-1">
                       <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 flex items-center gap-1.5"><CreditCard size={12}/> Payment Ref</p>
                       <p className="font-mono text-xs font-bold text-foreground opacity-80">{selected.payment_reference || 'MANUAL/NONE'}</p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Audit Status</p>
                       <Badge variant={selected.payment_status === 'paid' ? 'success' : 'destructive'} className="text-[9px] mt-0.5">PAYMENT {selected.payment_status.toUpperCase()}</Badge>
                    </div>
                 </div>

                 {selected.permit_status === "ready_to_release" && !permitPreviewUrl && (
                   <div className="admin-box group !rounded-xl !p-5 border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-transparent">
                      <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-600/70 dark:text-emerald-400/70 mb-2">
                        <CheckCircle size={14} /> System-generated permit
                      </p>
                      <p className="text-xs text-foreground font-medium leading-relaxed">
                        The system will generate an official park event permit with applicant and event details from the application form. Click Authorize Release to issue the permit.
                      </p>
                   </div>
                 )}
              </div>

              <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                 <Button variant="outline" className="h-11 rounded-xl px-8 w-full sm:w-auto border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all" onClick={() => setSelected(null)}>Close</Button>
                 {selected.permit_status === 'ready_to_release' && (
                   <Button 
                      className="h-11 rounded-xl flex-1 sm:flex-none text-[11px] font-extrabold shadow-lg shadow-emerald-500/20 uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white gap-2" 
                      disabled={releasing}
                      onClick={() => releasePermit(selected)}
                   >
                     {releasing ? <RefreshCw size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                     {releasing ? "Releasing..." : "Authorize Release"}
                   </Button>
                 )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* FOOTER CALLOUT */}
      <footer className="rounded-2xl border border-border bg-card p-6 flex gap-6 items-start shadow-xs">
         <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shrink-0 transition-transform hover:scale-105">
           <ShieldCheck size={22} className="opacity-80" />
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <Zap size={14} className="text-amber-500 fill-amber-500/20" /> Compliance Note for Officers
            </h4>
            <div className="text-[11px] text-muted-foreground leading-relaxed max-w-3xl space-y-2">
              <p>The Reservation Officer Desk operates as a verification node in the <span className="text-foreground font-semibold">Registry Workflow</span>. You are responsible for the transition from Payment Settlement to Permit Issuance.</p>
              <p>Direct interaction with treasury accounts is restricted; this module only reads verified payment logs to ensure institutional separation of duties.</p>
            </div>
         </div>
      </footer>
    </div>
  )
}
