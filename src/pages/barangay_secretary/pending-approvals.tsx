/**
 * Barangay Secretary — Intake & availability (BPMN steps 2–3).
 * Routes: /barangay/secretary/intake
 */
import React, { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import {
  BARANGAY_SCHEDULE_BLOCKING_STATUSES,
  formatBarangayReservationStatus,
} from "@/config/barangayCitizenWorkflow"
import toast from "react-hot-toast"
import {
  Search,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  ExternalLink,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const SECRETARY_OFFICE = "OFF-004"

type Row = {
  reservation_id: string
  barangay_facility_id: string | null
  applicant_person_id: string | null
  reservation_date: string
  time_slot: string | null
  status: string
  purpose: string | null
  request_slip_doc: string | null
  created_at: string
  barangay_facility: { facility_name: string; rental_rate: number | null } | null
  person: { full_name: string; contact_number: string | null } | null
}

type DocMeta = { file_url: string | null; document_type: string | null }

async function loadIdDocMeta(
  requestSlipDocIds: (string | null)[],
): Promise<Record<string, DocMeta>> {
  const ids = [...new Set(requestSlipDocIds.filter(Boolean))] as string[]
  if (!ids.length) return {}
  const { data, error } = await supabase
    .from("digital_document")
    .select("document_id, file_url, document_type")
    .in("document_id", ids)
  if (error) {
    console.error("digital_document batch load:", error.message)
    return {}
  }
  const map: Record<string, DocMeta> = {}
  for (const row of data ?? []) {
    const id = (row as { document_id?: string }).document_id
    if (id)
      map[id] = {
        file_url: (row as { file_url?: string | null }).file_url ?? null,
        document_type: (row as { document_type?: string | null }).document_type ?? null,
      }
  }
  return map
}

function isPdfUrl(url: string) {
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().includes("application/pdf")
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp)(\?|$)/i.test(url)
}

export default function BarangaySecretaryIntake() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Row | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [docMetaById, setDocMetaById] = useState<Record<string, DocMeta>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("barangay_reservation_record")
        .select(
          `
          reservation_id,
          barangay_facility_id,
          applicant_person_id,
          reservation_date,
          time_slot,
          status,
          purpose,
          request_slip_doc,
          created_at,
          barangay_facility ( facility_name, rental_rate ),
          person:applicant_person_id ( full_name, contact_number )
        `,
        )
        .eq("status", "submitted")
        .order("created_at", { ascending: false })

      if (error) throw error
      const list = (data as unknown as Row[]) ?? []
      setRows(list)
      setDocMetaById(await loadIdDocMeta(list.map(r => r.request_slip_doc)))
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load queue")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function scheduleConflict(
    excludeId: string,
    facilityId: string | null,
    date: string,
    slot: string | null,
  ): Promise<boolean> {
    if (!facilityId || !slot) return false
    const { data } = await supabase
      .from("barangay_reservation_record")
      .select("reservation_id")
      .eq("barangay_facility_id", facilityId)
      .eq("reservation_date", date)
      .eq("time_slot", slot)
      .in("status", BARANGAY_SCHEDULE_BLOCKING_STATUSES)
      .neq("reservation_id", excludeId)
    return (data?.length ?? 0) > 0
  }

  async function markIncomplete(id: string) {
    setActionLoading(id)
    try {
      const { error } = await supabase
        .from("barangay_reservation_record")
        .update({
          status: "returned_incomplete",
          approved_by_office: SECRETARY_OFFICE,
        })
        .eq("reservation_id", id)
        .eq("status", "submitted")
      if (error) throw error
      toast.success("Marked as incomplete requirements.")
      setRows(prev => prev.filter(r => r.reservation_id !== id))
      setSelected(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function markUnavailable(id: string) {
    setActionLoading(id)
    try {
      const { error } = await supabase
        .from("barangay_reservation_record")
        .update({
          status: "availability_failed",
          approved_by_office: SECRETARY_OFFICE,
        })
        .eq("reservation_id", id)
        .eq("status", "submitted")
      if (error) throw error
      toast.success("Recorded as facility unavailable for this schedule.")
      setRows(prev => prev.filter(r => r.reservation_id !== id))
      setSelected(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setActionLoading(null)
    }
  }

  async function passIntake(r: Row) {
    if (!r.request_slip_doc) {
      toast.error("Citizen has no valid ID on file. Return for incomplete requirements.")
      return
    }
    setActionLoading(r.reservation_id)
    try {
      const conflict = await scheduleConflict(
        r.reservation_id,
        r.barangay_facility_id,
        r.reservation_date,
        r.time_slot,
      )
      if (conflict) {
        toast.error("Schedule conflict: another active reservation uses this facility, date, and slot.")
        return
      }

      const rental = Number(r.barangay_facility?.rental_rate ?? 0)
      const nextStatus = rental > 0 ? "awaiting_treasury" : "pending_pb_approval"

      const { error } = await supabase
        .from("barangay_reservation_record")
        .update({
          status: nextStatus,
          approved_by_office: SECRETARY_OFFICE,
        })
        .eq("reservation_id", r.reservation_id)
        .eq("status", "submitted")

      if (error) throw error
      toast.success(
        rental > 0
          ? "Forwarded to Treasury for order of payment."
          : "Forwarded to Punong Barangay for approval (no rental fee).",
      )
      setRows(prev => prev.filter(x => x.reservation_id !== r.reservation_id))
      setSelected(null)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed")
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    if (!q) return true
    const fac = r.barangay_facility?.facility_name ?? ""
    const name = r.person?.full_name ?? ""
    return (
      r.reservation_id.toLowerCase().includes(q) ||
      fac.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q)
    )
  })

  const meta = user ? ROLE_META[user.role] : null

  if (!user) return null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 animate-fade-in max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          {meta && (
            <span
              className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-2"
              style={{ background: meta.bgColor, color: meta.color }}
            >
              {meta.label}
            </span>
          )}
          <h1 className="font-display text-2xl font-bold text-foreground">Intake &amp; availability</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Validate citizen submissions and check the facility calendar. Rental fees route to Treasury; otherwise requests
            go to Punong Barangay.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <Card className="border-border shadow-sm mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Queue</CardTitle>
          <CardDescription>{filtered.length} submitted reservation(s) need intake</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by ID, facility, applicant…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No submissions awaiting intake.</p>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-left">
                    <th className="p-3 font-semibold">ID</th>
                    <th className="p-3 font-semibold">Facility</th>
                    <th className="p-3 font-semibold">Applicant</th>
                    <th className="p-3 font-semibold">Schedule</th>
                    <th className="p-3 font-semibold">ID doc</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const rental = Number(r.barangay_facility?.rental_rate ?? 0)
                    return (
                      <tr key={r.reservation_id} className="border-b border-border/60 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{r.reservation_id}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span>{r.barangay_facility?.facility_name ?? "—"}</span>
                          </div>
                          {rental > 0 && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              Rental ₱{rental.toLocaleString()}
                            </Badge>
                          )}
                        </td>
                        <td className="p-3">{r.person?.full_name ?? "—"}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-xs">
                            <Calendar className="h-3 w-3" />
                            {r.reservation_date}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {r.time_slot ?? "—"}
                          </div>
                        </td>
                        <td className="p-3">
                          {r.request_slip_doc ? (
                            <div className="flex flex-col gap-1 items-start">
                              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                                On file
                              </Badge>
                              {docMetaById[r.request_slip_doc]?.file_url ? (
                                <a
                                  href={docMetaById[r.request_slip_doc]!.file_url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                  onClick={e => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  View ID
                                </a>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">No URL</span>
                              )}
                            </div>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Missing
                            </Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="secondary" onClick={() => setSelected(r)}>
                            Review
                          </Button>
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

      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg border-none bg-transparent p-0 shadow-none gap-0 sm:max-w-lg">
          {selected && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <div className="mb-6 space-y-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selected.reservation_id}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/20 uppercase text-[9px] font-bold">
                    {formatBarangayReservationStatus(selected.status)}
                  </Badge>
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-foreground font-display leading-tight">
                  Intake review
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Logged {selected.created_at ? new Date(selected.created_at).toLocaleString() : "—"}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Facility
                  </p>
                  <p className="text-sm font-bold truncate flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {selected.barangay_facility?.facility_name ?? "—"}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                    Schedule
                  </p>
                  <p className="text-sm font-bold">{selected.reservation_date}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {selected.time_slot ?? "—"}
                  </p>
                </div>
              </div>

              <div className="admin-box group relative mb-6">
                <User className="absolute top-4 right-4 h-12 w-12 text-primary/5 transition-transform group-hover:scale-110 duration-500" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <User className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    Applicant
                  </span>
                </div>
                <div className="text-sm font-extrabold text-foreground px-1 leading-tight">
                  {selected.person?.full_name ?? "—"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{selected.person?.contact_number ?? "No contact"}</p>
                <div className="sep">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Purpose</p>
                  <p className="text-sm text-foreground leading-relaxed">{selected.purpose?.trim() || "—"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Valid ID (digital)
                  </span>
                </div>
                {!selected.request_slip_doc ? (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-amber-800 dark:text-amber-200 text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    No valid ID document linked. Use “Incomplete requirements” or ask the citizen to re-apply.
                  </div>
                ) : !docMetaById[selected.request_slip_doc]?.file_url ? (
                  <p className="text-xs text-muted-foreground">
                    Document record {selected.request_slip_doc} has no file URL. Check storage and{" "}
                    <code className="text-[10px] bg-muted px-1 rounded">digital_document</code>.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] font-mono">
                        {docMetaById[selected.request_slip_doc]?.document_type ?? "document"}
                      </Badge>
                      <a
                        href={docMetaById[selected.request_slip_doc]!.file_url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open in new tab
                      </a>
                    </div>
                    {isImageUrl(docMetaById[selected.request_slip_doc]!.file_url!) && (
                      <div className="rounded-lg border border-border overflow-hidden bg-background">
                        <img
                          src={docMetaById[selected.request_slip_doc]!.file_url!}
                          alt="Citizen valid ID"
                          className="max-h-56 w-full object-contain"
                        />
                      </div>
                    )}
                    {isPdfUrl(docMetaById[selected.request_slip_doc]!.file_url!) && (
                      <p className="text-xs text-muted-foreground">
                        PDF preview: use “Open in new tab” to view the file.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-2 pt-6 border-t border-border/10 flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    className="gap-1 rounded-xl"
                    disabled={!!actionLoading}
                    onClick={() => markIncomplete(selected.reservation_id)}
                  >
                    <XCircle className="h-4 w-4" />
                    Incomplete requirements
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1 rounded-xl"
                    disabled={!!actionLoading}
                    onClick={() => markUnavailable(selected.reservation_id)}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Unavailable (schedule)
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  <Button variant="ghost" className="rounded-xl" onClick={() => setSelected(null)}>
                    Close
                  </Button>
                  <Button
                    className="gap-1 rounded-xl font-semibold"
                    disabled={!!actionLoading || !selected.request_slip_doc}
                    onClick={() => void passIntake(selected)}
                  >
                    {actionLoading === selected.reservation_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Validate &amp; pass
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
