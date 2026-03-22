/**
 * approvals.tsx — Reservation Officer overhauled for UI/UX
 */

import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  FileText, 
  Search, 
  Send, 
  X, 
  RefreshCw, 
  ArrowLeftRight, 
  BadgeCheck, 
  Ban, 
  Clock, 
  Building2, 
  User, 
  MapPin, 
  Calendar, 
  ChevronRight,
  Info,
  Layers,
  FileCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type Venue = {
  park_venue_id: string
  park_venue_name: string
}
type Person = {
  person_id: string
  full_name: string
  contact_number: string | null
}
type Row = {
  reservation_id: string
  reservation_date: string
  time_slot: string | null
  status: string | null
  park_venue_id: string | null
  applicant_person_id: string | null
  application_form_doc: string | null
  venue?: Venue | null
  person?: Person | null
  application_form_url?: string | null
}

function normalizeParkStatus(s?: string | null) {
  if (!s) return "pending_loi"
  if (s === "pending") return "pending_loi"
  if (s === "approved") return "admin_approved"
  if (s === "rejected") return "admin_rejected"
  return s
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

export default function ReservationApprovalsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
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
        .select("reservation_id, reservation_date, time_slot, status, park_venue_id, applicant_person_id, application_form_doc")
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((recs ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const appDocIds = [...new Set((recs ?? []).map((r: any) => r.application_form_doc).filter(Boolean))] as string[]

      const [{ data: venues }, { data: persons }, { data: appDocs }] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] as any[] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, contact_number").in("person_id", personIds)
          : Promise.resolve({ data: [] as any[] }),
        appDocIds.length
          ? supabase.from("digital_document").select("document_id, file_url").in("document_id", appDocIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      const appDocUrlMap: Record<string, string> = {}
      ;(venues ?? []).forEach((v: any) => (venueMap[v.park_venue_id] = v))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p))
      ;(appDocs ?? []).forEach((d: any) => (appDocUrlMap[d.document_id] = d.file_url ?? ""))

      const merged = (recs ?? []).map((r: any) => ({
        ...r,
        venue: r.park_venue_id ? venueMap[r.park_venue_id] ?? null : null,
        person: r.applicant_person_id ? personMap[r.applicant_person_id] ?? null : null,
        application_form_url: r.application_form_doc ? appDocUrlMap[r.application_form_doc] ?? null : null,
      })) as Row[]

      setRows(merged)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load approvals queue.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const s = normalizeParkStatus(r.status)
      const inDeskScope = [
        "admin_approved",
        "application_form_issued",
        "application_submitted",
        "application_incomplete",
      ].includes(s)
      if (!inDeskScope) return false
      if (!q) return true
      const hay = [
        r.reservation_id,
        r.reservation_date,
        r.venue?.park_venue_name ?? "",
        r.person?.full_name ?? "",
        r.time_slot ?? "",
        s,
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  async function updateStatus(r: Row, status: string, notify?: { type: string; msg: string }) {
    setActionLoading(r.reservation_id)
    setError(null)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status })
        .eq("reservation_id", r.reservation_id)
      if (e) throw new Error(e.message)

      if (notify) {
        await notifyCitizenByPersonId({
          personId: r.applicant_person_id,
          referenceId: r.reservation_id,
          notifType: notify.type,
          message: notify.msg,
        })
      }
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed.")
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
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
               <Layers className="h-3.5 w-3.5 text-primary" /> Application Workflow
             </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Approvals Queue</h1>
          <p className="text-muted-foreground text-sm font-medium italic">
            Parks & Recreation Management — Application Validation
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadData()} disabled={loading} className="shadow-xs border-border">
              <RefreshCw className={cn("mr-2 h-3.5 w-3.5", loading && "animate-spin")} />
              Sync Queue
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
            placeholder="Search by ID, venue, or applicant name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <div className="flex items-center gap-2">
             <span className="h-2 w-2 rounded-full bg-primary" />
             Awaiting Action: <span className="text-foreground ml-1">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* QUEUE RECORDS */}
      <Card className="border-border shadow-sm overflow-hidden bg-card">
        <CardHeader className="pb-3 bg-muted border-b">
           <CardTitle className="text-base flex items-center gap-2 font-bold tracking-tight">
             <FileCheck size={18} className="text-primary" /> Pending Officer Validation
           </CardTitle>
           <CardDescription>Issue and validate digital application forms</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
             <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-40" />
                <p className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">Synchronizing Workflow States...</p>
             </div>
          ) : filtered.length === 0 ? (
             <div className="py-24 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground opacity-30">
                   <Layers size={24} />
                </div>
                <div className="space-y-1">
                   <p className="font-bold text-foreground">All Clear!</p>
                   <p className="text-xs text-muted-foreground">No records matching your current filter are awaiting action.</p>
                </div>
             </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((r) => {
                const s = normalizeParkStatus(r.status)
                const canIssue = s === "admin_approved"
                const canValidate = s === "application_submitted" || s === "application_incomplete"
                const canReturn = s === "application_submitted"
                
                return (
                  <div key={r.reservation_id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-muted transition-all gap-6">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-background border border-border flex flex-col items-center justify-center shadow-xs group-hover:border-primary transition-colors">
                           <p className="text-[9px] font-bold uppercase text-muted-foreground italic tracking-tighter">REF</p>
                           <p className="text-xs font-bold font-mono text-foreground leading-none">{r.reservation_id.slice(-4)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-foreground flex items-center gap-2 group-hover:text-primary transition-colors truncate">
                             {r.reservation_id}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-[11px] font-medium text-muted-foreground">
                             <span className="flex items-center gap-1.5"><MapPin size={12} className="opacity-50" /> {r.venue?.park_venue_name || 'System Site'}</span>
                             <span className="flex items-center gap-1.5"><Calendar size={12} className="opacity-50" /> {r.reservation_date}</span>
                             <span className="flex items-center gap-1.5"><User size={12} className="opacity-50" /> {r.person?.full_name || 'Unknown Applicant'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-14">
                         <div className="flex items-center gap-2">
                           <Badge variant={s.includes("rejected") ? "destructive" : s.includes("approved") ? "success" : "warning"} className="text-[9px] font-bold uppercase tracking-tight h-5 px-2 py-0 border-none">
                              {s.replace(/_/g, ' ')}
                           </Badge>
                         </div>
                         {r.application_form_url && (
                           <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest gap-2 bg-background border-border shadow-xs" asChild>
                             <a href={r.application_form_url} target="_blank" rel="noopener noreferrer">
                               <FileText size={12} className="text-primary" /> View Form <ExternalLink size={10} className="opacity-30" />
                             </a>
                           </Button>
                         )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap md:justify-end pl-14 md:pl-0">
                      <Button 
                        size="sm" 
                        variant="secondary"
                        disabled={!canIssue || actionLoading === r.reservation_id}
                        onClick={() => updateStatus(r, "application_form_issued", {
                          type: "application_form_issued",
                          msg: `Your park reservation ${r.reservation_id} was approved. Please complete the application form.`,
                        })}
                        title="Issue digital application form"
                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest gap-2 shadow-xs"
                      >
                         {actionLoading === r.reservation_id ? <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground"/> : <Send size={14} className="text-primary"/>}
                         Issue Form
                      </Button>

                      {canReturn && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          disabled={actionLoading === r.reservation_id}
                          onClick={() => updateStatus(r, "application_incomplete", {
                            type: "application_incomplete",
                            msg: `Your application for ${r.reservation_id} is incomplete. Please correct and resubmit.`,
                          })}
                          title="Return for correction"
                          className="h-9 px-4 text-xs font-bold uppercase tracking-widest border-red-500 text-red-600 hover:bg-red-500 hover:text-white shadow-xs"
                        >
                          <Ban size={14} className="mr-1.5" /> Return
                        </Button>
                      )}

                      <Button 
                        size="sm" 
                        disabled={!canValidate || actionLoading === r.reservation_id}
                        onClick={() => updateStatus(r, "application_validated", {
                          type: "application_validated",
                          msg: `Your application for ${r.reservation_id} was validated. Payment processing may proceed if fees apply.`,
                        })}
                        title="Mark complete"
                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        {actionLoading === r.reservation_id ? <RefreshCw className="h-3 w-3 animate-spin"/> : <BadgeCheck size={14} />}
                        Validate
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FOOTER CALLOUT */}
      <footer className="rounded-2xl border border-blue-500 bg-blue-50 p-4 flex gap-4 items-start md:items-center shadow-xs">
         <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
           <Info size={18} />
         </div>
         <p className="text-[11px] text-blue-700/80 dark:text-blue-400 font-medium leading-relaxed max-w-2xl">
           <strong className="text-blue-900 dark:text-blue-300 uppercase tracking-tighter mr-1.5 font-bold italic">Operational Guideline:</strong> 
           Validation marks the transition to payment processing. After Validate, the reservation is routed to the Treasurer to compute fees and generate Order of Payment. Citizen pays; Treasurer processes payment and issues OR; then release the permit in Permits & Payments.
         </p>
      </footer>
    </div>
  )
}
