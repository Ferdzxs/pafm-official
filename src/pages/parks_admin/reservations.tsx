/**
 * reservations.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

import {
  Clock, CheckCircle, CheckCircle2,
  Eye, ThumbsUp, ThumbsDown,
  Search, ChevronDown, RefreshCw, X,
  MapPin, Calendar as CalendarIcon, User, FileText,
  ExternalLink, Filter, CreditCard,
  AlertCircle, BadgeCheck, Ban, AlignLeft,
  MoreVertical, ArrowLeftRight, ShieldCheck
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { ParkReservationDocumentsViewer } from "@/components/parks/ParkReservationDocumentsViewer"
import type { QmcParkApplicationPayload } from "@/lib/qmcParkApplicationForm"
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
  address: string | null
  contact_number: string | null
}
interface Payment {
  payment_id: string
  amount_paid: number | null
  payment_method: string | null
  transaction_ref_no: string | null
  digital_or_no: string | null
  payment_status: string | null
}
interface Reservation {
  reservation_id: string
  park_venue_id: string | null
  applicant_person_id: string | null
  reservation_date: string
  time_slot: string | null
  status: string
  digital_permit_url: string | null
  letter_of_intent_doc: string | null
  application_form_doc: string | null
  application_form_payload: QmcParkApplicationPayload | null
  payment_id: string | null
  processed_by_admin: string | null
  venue: Venue | null
  person: Person | null
  payment: Payment | null
  letter_of_intent_url?: string | null
  application_form_url?: string | null
}

interface ParsedSlot {
  time: string
  eventName: string | null
  purpose: string | null
}

// ─── HELPERS ───
function parseTimeSlot(raw: string | null): ParsedSlot {
  if (!raw) return { time: "—", eventName: null, purpose: null }
  const parts = raw.split(" | ")
  const time = parts[0] ?? raw
  const eventName = parts[1] ?? null
  const purposePart = parts[2] ?? null
  const purpose = purposePart?.startsWith("Purpose: ")
    ? purposePart.replace("Purpose: ", "")
    : purposePart
  return { time, eventName, purpose }
}

function getStatusBadge(status: string) {
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  switch (status) {
    case "pending":
    case "endorsed_to_admin":
    case "desk_logged":
    case "pending_loi":
      return <Badge variant="warning">{label}</Badge>
    case "approved":
    case "admin_approved":
      return <Badge variant="success">{label}</Badge>
    case "completed":
      return <Badge variant="info">{label}</Badge>
    case "rejected":
    case "admin_rejected":
      return <Badge variant="destructive">{label}</Badge>
    default:
      return <Badge variant="secondary">{label}</Badge>
  }
}

function getStatusLabel(status: string) {
  return status.replace(/_/g, " ").toUpperCase()
}

async function notifyCitizenByPersonId(params: {
  personId: string | null
  referenceId: string
  notifType: string
  message: string
}) {
  if (!params.personId) return
  const { data: acct } = await supabase
    .from("citizen_account")
    .select("account_id")
    .eq("person_id", params.personId)
    .maybeSingle()
  if (!acct?.account_id) return
  await supabase.from("notification_log").insert({
    notif_id: `NLOG-${Date.now()}`,
    account_id: acct.account_id,
    module_reference: "parks",
    reference_id: params.referenceId,
    notif_type: params.notifType,
    message: params.message,
  })
}

// ─── MAIN COMPONENT ───
export default function Reservations() {
  const { user } = useAuth()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [viewR, setViewR] = useState<Reservation | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    action: "approve" | "reject"
    r: Reservation
  } | null>(null)

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
          "reservation_id, park_venue_id, applicant_person_id, " +
          "reservation_date, time_slot, status, digital_permit_url, " +
          "letter_of_intent_doc, application_form_doc, application_form_payload, " +
          "payment_id, processed_by_admin"
        )
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(`Reservations: ${e1.message}`)
      if (!recs || recs.length === 0) {
        setReservations([])
        return
      }

      const venueIds = [...new Set(recs.map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set(recs.map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIds = [...new Set(recs.map((r: any) => r.payment_id).filter(Boolean))] as string[]
      const docIds = [
        ...new Set(recs.flatMap((r: any) => [r.letter_of_intent_doc, r.application_form_doc].filter(Boolean))),
      ] as string[]

      const [{ data: venues }, { data: persons }, { data: payments }, { data: docs }] = await Promise.all([
        venueIds.length ? supabase.from("park_venue").select("park_venue_id, park_venue_name, location, venue_type, availability_status").in("park_venue_id", venueIds) : Promise.resolve({ data: [] }),
        personIds.length ? supabase.from("person").select("person_id, full_name, address, contact_number").in("person_id", personIds) : Promise.resolve({ data: [] }),
        paymentIds.length ? supabase.from("digital_payment").select("payment_id, amount_paid, payment_method, transaction_ref_no, digital_or_no, payment_status").in("payment_id", paymentIds) : Promise.resolve({ data: [] }),
        docIds.length ? supabase.from("digital_document").select("document_id, file_url").in("document_id", docIds) : Promise.resolve({ data: [] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      const paymentMap: Record<string, Payment> = {}
      const docUrlMap: Record<string, string> = {}
      ;(venues ?? []).forEach((v: any) => { venueMap[v.park_venue_id] = v })
      ;(persons ?? []).forEach((p: any) => { personMap[p.person_id] = p })
      ;(payments ?? []).forEach((p: any) => { paymentMap[p.payment_id] = p })
      ;(docs ?? []).forEach((d: any) => { docUrlMap[d.document_id] = d.file_url ?? "" })

      const merged: Reservation[] = recs.map((r: any) => {
        const rawPayload = r.application_form_payload as QmcParkApplicationPayload | null
        const application_form_payload =
          rawPayload &&
          rawPayload.source_form === "qmc_facilities_2024_09" &&
          rawPayload.applicant &&
          rawPayload.event
            ? rawPayload
            : null
        return {
          ...r,
          application_form_payload,
          venue: venueMap[r.park_venue_id] ?? null,
          person: personMap[r.applicant_person_id] ?? null,
          payment: paymentMap[r.payment_id] ?? null,
          letter_of_intent_url: r.letter_of_intent_doc ? docUrlMap[r.letter_of_intent_doc] ?? null : null,
          application_form_url: r.application_form_doc ? docUrlMap[r.application_form_doc] ?? null : null,
        }
      })

      setReservations(merged)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reservations.")
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: "approve" | "reject", r: Reservation) {
    setActionLoading(true)
    const newStatus = action === "approve" ? "admin_approved" : "admin_rejected"
    const notifType = action === "approve" ? "reservation_approved" : "reservation_disapproved"
    const message = action === "approve" 
      ? `Your park reservation ${r.reservation_id} has been approved.`
      : `Your park reservation ${r.reservation_id} was not approved.`

    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status: newStatus })
        .eq("reservation_id", r.reservation_id)
      
      if (e) throw new Error(e.message)

      await notifyCitizenByPersonId({
        personId: r.applicant_person_id,
        referenceId: r.reservation_id,
        notifType,
        message,
      })

      toast.success(`Reservation ${action === 'approve' ? 'approved' : 'rejected'} successfully.`)
      setConfirmDialog(null)
      setViewR(null)
      await loadData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : `Failed to ${action}.`)
    } finally {
      setActionLoading(false)
    }
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

  const pendingQueue = reservations.filter((r) => r.status === "endorsed_to_admin" || r.status === "pending")

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="px-2 py-0.5" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
            {meta.label}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Reservations</h1>
          <p className="text-muted-foreground text-sm">Monitor and process park scheduling requests.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Sync Records
          </Button>
        </div>
      </header>

      {/* KPI HIGHLIGHTS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Requests</p>
              <p className="text-xl font-bold">{reservations.length}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500 bg-yellow-50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">For Review</p>
              <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{pendingQueue.length}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center">
              <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500 bg-green-50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Approved</p>
              <p className="text-xl font-bold text-green-700 dark:text-green-300">{reservations.filter(r => ['admin_approved','approved'].includes(r.status)).length}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500 bg-blue-50 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Completed</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{reservations.filter(r => r.status === 'completed').length}</p>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ACTIONS & FILTERS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search venue, applicant, or ID..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent py-2 pl-10 pr-8 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="endorsed_to_admin">Endorsed</option>
              <option value="pending">Legacy Pending</option>
              <option value="admin_approved">Admin Approved</option>
              <option value="completed">Completed</option>
              <option value="admin_rejected">Admin Rejected</option>
            </select>
          </div>
          {(search || filterStatus !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatus('all') }}>
              <X className="mr-2 h-4 w-4" /> Clear
            </Button>
          )}
        </div>
        <div className="md:ml-auto text-xs text-muted-foreground whitespace-nowrap">
          Showing <strong>{filtered.length}</strong> of {reservations.length} records
        </div>
      </div>

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead>Venue & Applicant</TableHead>
              <TableHead className="hidden lg:table-cell">Schedule</TableHead>
              <TableHead className="hidden md:table-cell text-right">Payment</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center animate-pulse text-muted-foreground">
                  Syncing with Supabase...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No reservations match those criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const slot = parseTimeSlot(r.time_slot)
                const isActionable = r.status === "endorsed_to_admin" || r.status === "pending"
                return (
                  <TableRow key={r.reservation_id} className="group hover:bg-muted">
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(r.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-semibold truncate leading-none">
                          {r.venue?.park_venue_name ?? "Unknown Venue"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono text-[10px] opacity-80">#{r.reservation_id.slice(-8)}</span>
                          <Separator orientation="vertical" className="h-2" />
                          <span className="flex items-center gap-1 truncate">
                            <User className="h-3 w-3" /> {r.person?.full_name ?? "Guest"}
                          </span>
                        </div>
                        {slot.eventName && (
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                            <span className="inline-block px-1 bg-secondary rounded text-[9px]">EVENT</span>
                            <span className="truncate max-w-[200px]">{slot.eventName}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-xs space-y-1">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-medium text-foreground">{r.reservation_date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{slot.time}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right">
                      {r.payment?.amount_paid != null ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-foreground">
                            ₱{Number(r.payment.amount_paid).toLocaleString()}
                          </span>
                          <Badge variant="outline" className="text-[9px] h-4 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10">
                            SETTLED
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isActionable && (
                          <div className="flex items-center gap-1 mr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => setConfirmDialog({ action: 'approve', r })}>
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setConfirmDialog({ action: 'reject', r })}>
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setViewR(r)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog open={!!viewR} onOpenChange={(open) => !open && setViewR(null)}>
        <DialogContent className="sm:max-w-4xl w-[min(100vw-2rem,56rem)] p-0 overflow-hidden border-none bg-transparent shadow-none max-h-[92vh]">
          {viewR && (
            <div className="card-premium mx-auto w-full animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <Badge variant={['approved', 'admin_approved', 'completed'].includes(viewR.status) ? 'success' : 'warning'} className="font-bold uppercase tracking-wider text-[10px]">
                    {viewR.status.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground opacity-60 tracking-tighter">ID: {viewR.reservation_id}</span>
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                  {viewR.venue?.park_venue_name ?? 'Reservation Detail'}
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                  Parks & Facilities Registry Record — submitted forms below
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-primary" /> Submitted documents
                  </h4>
                  <ParkReservationDocumentsViewer
                    reservationId={viewR.reservation_id}
                    loiUrl={viewR.letter_of_intent_url}
                    applicationFormDocUrl={viewR.application_form_url}
                    applicationFormPayload={viewR.application_form_payload}
                    permitUrl={viewR.digital_permit_url}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="surface-box group border border-border/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Applicant
                    </p>
                    <p className="text-sm font-bold text-foreground leading-tight">{viewR.person?.full_name ?? '—'}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                      <CreditCard className="h-2.5 w-2.5 opacity-50" /> {viewR.person?.contact_number ?? 'No contact line'}
                    </p>
                  </div>
                  <div className="surface-box group border border-border/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5" /> Schedule
                    </p>
                    <p className="text-sm font-bold text-foreground leading-tight">{viewR.reservation_date}</p>
                    <p className="text-[10px] text-muted-foreground mt-1.5 font-medium flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5 opacity-50" /> {parseTimeSlot(viewR.time_slot).time}
                    </p>
                  </div>
                </div>

                <div className="surface-box border border-border/40 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                     <FileText size={48} />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-4">
                    <FileText className="h-3.5 w-3.5 text-primary" /> Event Information
                  </h4>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Event Title</span>
                      <span className="text-sm font-bold text-foreground">{parseTimeSlot(viewR.time_slot).eventName || 'Untitled Event'}</span>
                    </div>
                    <div className="flex flex-col gap-1 pt-3 border-t border-border/5">
                      <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5">
                        <AlignLeft className="h-3 w-3" /> Purpose / Remarks
                      </span>
                      <p className="text-xs text-foreground leading-relaxed font-medium italic pl-3 border-l-2 border-primary/30 py-1 bg-primary/5 rounded-r-lg">
                        {parseTimeSlot(viewR.time_slot).purpose || 'No description provided for this occupancy.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="surface-box border border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                     <BadgeCheck size={40} className="text-emerald-500" />
                  </div>
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-4">
                    <CreditCard className="h-3.5 w-3.5" /> Financial Summary
                  </h4>
                  {viewR.payment_id ? (
                    <div className="grid grid-cols-2 gap-y-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">Amount Paid</span>
                        <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">₱{Number(viewR.payment?.amount_paid).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-right">
                        <span className="text-[10px] text-muted-foreground font-semibold">Method</span>
                        <span className="text-[10px] font-bold uppercase py-1 px-2 bg-emerald-500/10 rounded-lg text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {viewR.payment?.payment_method || 'DIGITAL'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] text-muted-foreground font-semibold">OR Number</span>
                        <span className="text-xs font-mono font-bold text-foreground">{viewR.payment?.digital_or_no || 'Pending Receipt'}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                         <Badge variant="outline" className="text-[9px] font-bold h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                           OFFICIALLY SETTLED
                         </Badge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border flex items-center justify-center gap-2 text-xs text-muted-foreground font-medium italic">
                      <AlertCircle className="h-4 w-4 opacity-50" /> Pending validation.
                    </div>
                  )}
                </div>

                <div className="admin-box mt-6 group">
                  <ShieldCheck className="absolute top-4 right-4 h-12 w-12 text-primary/5 transition-transform group-hover:scale-110 duration-500" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Authorization Authority</span>
                  </div>
                  <div className="text-sm font-bold text-foreground leading-tight px-1">
                    {viewR.processed_by_admin || 'Global System Governance'}
                  </div>
                  <div className="sep mt-4">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium italic">
                      <Clock className="h-3 w-3 text-primary/40" />
                      Digital Signature Verified · {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {(viewR.status === "endorsed_to_admin" || viewR.status === "pending") && (
                      <>
                        <Button variant="outline" size="sm" className="rounded-xl border-red-500/30 text-red-500 hover:bg-red-50 font-bold text-[11px] h-11 px-6 transition-all active:scale-95" onClick={() => setConfirmDialog({ action: 'reject', r: viewR })}>
                          REJECT
                        </Button>
                        <Button size="sm" className="rounded-xl bg-primary hover:bg-primary/90 font-bold text-[11px] h-11 px-8 shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={() => setConfirmDialog({ action: 'approve', r: viewR })}>
                          APPROVE
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setViewR(null)} className="rounded-xl h-11 px-6 font-bold text-[11px] uppercase tracking-widest hover:bg-muted">
                      Close View
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM ACTION DIALOG */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          {confirmDialog && (
            <div className="card-premium mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                   <div className={cn(
                     "h-10 w-10 rounded-full flex items-center justify-center shadow-inner",
                     confirmDialog?.action === 'approve' ? "bg-green-100 text-green-600 dark:bg-green-900/40" : "bg-red-100 text-red-600 dark:bg-red-900/40"
                   )}>
                      {confirmDialog?.action === 'approve' ? <BadgeCheck size={20} /> : <Ban size={20} />}
                   </div>
                   <div>
                     <DialogTitle className="font-display text-xl font-bold text-foreground">
                        {confirmDialog?.action === 'approve' ? 'Authorize Request' : 'Decline Request'}
                     </DialogTitle>
                     <DialogDescription className="font-medium">
                        Confirm legal action on registry entry.
                     </DialogDescription>
                   </div>
                </div>
              </DialogHeader>

              <div className="surface-box border border-border/40 bg-muted/40 p-5 space-y-4">
                <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reference</span>
                  <span className="text-xs font-mono font-bold text-primary">{confirmDialog?.r.reservation_id}</span>
                  
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Applicant</span>
                  <span className="text-xs font-bold text-foreground">{confirmDialog?.r.person?.full_name ?? 'Anonymous'}</span>
                  
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Venue</span>
                  <span className="text-xs font-bold text-foreground">{confirmDialog?.r.venue?.park_venue_name ?? '—'}</span>
                </div>
              </div>

              <DialogFooter className="mt-8 flex items-center justify-end gap-3">
                <Button variant="ghost" size="sm" className="font-bold text-[11px] uppercase tracking-widest h-10 px-6 hover:bg-muted" onClick={() => setConfirmDialog(null)} disabled={actionLoading}>
                   Back
                </Button>
                <Button 
                  size="sm" 
                  className={cn(
                    "rounded-xl font-extrabold text-[11px] h-10 px-8 shadow-lg transition-all active:scale-95",
                    confirmDialog?.action === 'approve' ? "bg-green-600 hover:bg-green-700 shadow-green-600/20" : "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                  )}
                  onClick={() => confirmDialog && handleAction(confirmDialog.action, confirmDialog.r)}
                  disabled={actionLoading}
                >
                  {actionLoading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : 'CONFIRM'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}