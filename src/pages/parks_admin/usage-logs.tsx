/**
 * usage-logs.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"

import {
  Search, Filter, Eye, RefreshCw, X,
  MapPin, Calendar, CheckCircle2, AlertTriangle,
  Clock, UserCheck, AlignLeft, ExternalLink,
  FileText, ChevronDown, AlertCircle, ShieldCheck,
  ShieldAlert, ShieldX, CalendarCheck, CreditCard,
  Building2, MoreVertical, Info, BadgeCheck, ClipboardCheck
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
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── TYPES ───
interface UsageLog {
  usage_id: string
  reservation_id: string | null
  permit_document: string | null
  monitored_by_office: string | null
  remarks: string | null
  event_conducted_flag: boolean
  reservation: {
    reservation_date: string
    time_slot: string | null
    status: string
    digital_permit_url: string | null
    park_venue_id: string | null
    applicant_person_id: string | null
    payment_id: string | null
  } | null
  venue: {
    park_venue_name: string
    location: string | null
    venue_type: string | null
    availability_status: string
  } | null
  person: {
    full_name: string
    contact_number: string | null
    address: string | null
  } | null
  office: {
    office_name: string
    parent_department: string | null
    location: string | null
  } | null
  permit_doc: {
    reference_no: string | null
    file_url: string | null
    document_type: string
  } | null
  payment: {
    payment_id: string
    amount_paid: number | null
    payment_date: string | null
    payment_method: string | null
    transaction_ref_no: string | null
    digital_or_no: string | null
    payment_status: string | null
  } | null
}

interface ParsedSlot {
  time: string
  eventName: string | null
  purpose: string | null
}

// ─── HELPERS ───
function parseSlot(raw: string | null | undefined): ParsedSlot {
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

function complianceInfo(flag: boolean, remarks: string | null) {
  if (!flag) return { label: "No Show", variant: "secondary" as const, Icon: ShieldX }
  if (!remarks) return { label: "Compliant", variant: "success" as const, Icon: ShieldCheck }
  const lower = remarks.toLowerCase()
  if (lower.includes("major") || lower.includes("incident") || lower.includes("violation"))
    return { label: "Incident", variant: "destructive" as const, Icon: ShieldAlert }
  if (lower.includes("minor") || lower.includes("issue") || lower.includes("garbage"))
    return { label: "Minor Issue", variant: "warning" as const, Icon: ShieldAlert }
  return { label: "Compliant", variant: "success" as const, Icon: ShieldCheck }
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ")
}

// ─── MAIN COMPONENT ───
export default function SiteUsageLogs() {
  const { user } = useAuth()

  const [logs, setLogs] = useState<UsageLog[]>([])
  const [eligible, setEligible] = useState<any[]>([])
  const [adminOffices, setAdminOffices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [filterConducted, setFilterConducted] = useState<"all" | "true" | "false">("all")
  const [filterCompliance, setFilterCompliance] = useState<"all" | "compliant" | "issue" | "no_show">("all")

  const [viewLog, setViewLog] = useState<UsageLog | null>(null)
  const [createFor, setCreateFor] = useState<any | null>(null)
  const [createForm, setCreateForm] = useState({
    remarks: "",
    conducted: true,
    officeId: ""
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      // Step 1: Fetch raw logs
      const { data: rawLogs, error: e1 } = await supabase
        .from("site_usage_log")
        .select("usage_id, reservation_id, permit_document, monitored_by_office, remarks, event_conducted_flag")
        .order("usage_id", { ascending: false })

      if (e1) throw e1
      const safeLogs = rawLogs ?? []

      // Step 2: Extract FKs
      const resIds = [...new Set(safeLogs.map((l: any) => l.reservation_id).filter(Boolean))] as string[]
      const offIds = [...new Set(safeLogs.map((l: any) => l.monitored_by_office).filter(Boolean))] as string[]
      const docIds = [...new Set(safeLogs.map((l: any) => l.permit_document).filter(Boolean))] as string[]

      // Step 3: Fetch Reservations
      const { data: reservations } = resIds.length
        ? await supabase.from("park_reservation_record").select("*").in("reservation_id", resIds)
        : { data: [] }

      // Step 4: Extract sub-FKs from Reservations
      const venueIds = [...new Set((reservations ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((reservations ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIds = [...new Set((reservations ?? []).map((r: any) => r.payment_id).filter(Boolean))] as string[]

      // Step 5: Batch Hydration
      const [vRes, pRes, oRes, dRes, pyRes] = await Promise.all([
        venueIds.length ? supabase.from("park_venue").select("*").in("park_venue_id", venueIds) : Promise.resolve({ data: [] }),
        personIds.length ? supabase.from("person").select("*").in("person_id", personIds) : Promise.resolve({ data: [] }),
        offIds.length ? supabase.from("administration_office").select("*").in("admin_office_id", offIds) : Promise.resolve({ data: [] }),
        docIds.length ? supabase.from("digital_document").select("*").in("document_id", docIds) : Promise.resolve({ data: [] }),
        paymentIds.length ? supabase.from("digital_payment").select("*").in("payment_id", paymentIds) : Promise.resolve({ data: [] }),
      ])

      // Step 6: Map building
      const resMap: any = {}; (reservations ?? []).forEach(r => resMap[r.reservation_id] = r)
      const vMap: any = {}; (vRes.data ?? []).forEach(v => vMap[v.park_venue_id] = v)
      const pMap: any = {}; (pRes.data ?? []).forEach(p => pMap[p.person_id] = p)
      const oMap: any = {}; (oRes.data ?? []).forEach(o => oMap[o.admin_office_id] = o)
      const dMap: any = {}; (dRes.data ?? []).forEach(d => dMap[d.document_id] = d)
      const pyMap: any = {}; (pyRes.data ?? []).forEach(py => pyMap[py.payment_id] = py)

      const merged: UsageLog[] = safeLogs.map((l: any) => {
        const r = resMap[l.reservation_id] || null
        return {
          ...l,
          reservation: r,
          venue: r ? (vMap[r.park_venue_id] || null) : null,
          person: r ? (pMap[r.applicant_person_id] || null) : null,
          office: oMap[l.monitored_by_office] || null,
          permit_doc: dMap[l.permit_document] || null,
          payment: r ? (pyMap[r.payment_id] || null) : null,
        }
      })
      setLogs(merged)

      // Step 7: Queue for monitoring (Released permits needing logs)
      const today = new Date().toISOString().split("T")[0]
      const { data: eligibleRes } = await supabase
        .from("park_reservation_record")
        .select(`*, park_venue(park_venue_name), person:applicant_person_id(full_name)`)
        .eq("status", "permit_released")
        .lte("reservation_date", today)
        .order("reservation_date", { ascending: false })
      
      const loggedResIds = new Set(resIds)
      setEligible((eligibleRes ?? []).filter((r: any) => !loggedResIds.has(r.reservation_id)))

      // Step 8: Offices for dropdown
      const { data: offices } = await supabase.from("administration_office").select("*").order("office_name")
      setAdminOffices(offices ?? [])
      if (offices?.[0] && !createForm.officeId) setCreateForm(f => ({ ...f, officeId: offices[0].admin_office_id }))

    } catch (err: any) {
      setError(err.message || "Failed to sync system usage logs.")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateLog() {
    if (!createFor || !createForm.officeId) return
    setSaving(true)
    try {
      const usageId = `SUL-${Date.now()}`
      const { error: insErr } = await supabase.from("site_usage_log").insert({
        usage_id: usageId,
        reservation_id: createFor.reservation_id,
        monitored_by_office: createForm.officeId,
        remarks: createForm.remarks || null,
        event_conducted_flag: createForm.conducted,
      })
      if (insErr) throw insErr

      if (createForm.conducted) {
        // Complete reservation and notify
        await supabase.from("park_reservation_record").update({ status: "completed" }).eq("reservation_id", createFor.reservation_id)
        
        const { data: acct } = await supabase.from("citizen_account").select("account_id").eq("person_id", createFor.applicant_person_id).maybeSingle()
        if (acct?.account_id) {
          await supabase.from("notification_log").insert({
            notif_id: `NLOG-${Date.now()}`,
            account_id: acct.account_id,
            module_reference: "parks",
            reference_id: createFor.reservation_id,
            notif_type: "reservation_completed",
            message: `Your park reservation ${createFor.reservation_id} has been marked completed. Thank you for using our parks.`,
          })
        }
      }

      toast.success("Event monitoring log recorded.")
      setCreateFor(null)
      setCreateForm({ remarks: "", conducted: true, officeId: adminOffices[0]?.admin_office_id || "" })
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase()
    const match = !q || l.usage_id.toLowerCase().includes(q) || 
                  (l.reservation_id ?? "").toLowerCase().includes(q) ||
                  (l.venue?.park_venue_name ?? "").toLowerCase().includes(q) ||
                  (l.person?.full_name ?? "").toLowerCase().includes(q)
    
    const matchCond = filterConducted === "all" || (filterConducted === "true" ? l.event_conducted_flag : !l.event_conducted_flag)
    
    const ci = complianceInfo(l.event_conducted_flag, l.remarks)
    const matchComp = filterCompliance === "all" || 
                     (filterCompliance === "compliant" && ci.label === "Compliant") ||
                     (filterCompliance === "issue" && (ci.label === "Minor Issue" || ci.label === "Incident")) ||
                     (filterCompliance === "no_show" && ci.label === "No Show")

    return match && matchCond && matchComp
  })

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
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Site Usage Logs</h1>
          <p className="text-muted-foreground text-sm">Review event history and monitor venue compliance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Sync Records
          </Button>
        </div>
      </header>

      {/* MONITORING QUEUE (CAROUSEL-LIKE LIST) */}
      {eligible.length > 0 && (
        <Card className="border-primary bg-primary/10 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b bg-primary/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> 
              Monitoring Queue
              <Badge variant="secondary" className="ml-2 font-mono h-5 px-1.5 text-[10px]">{eligible.length} Awaiting Log</Badge>
            </CardTitle>
            <CardDescription className="text-primary">Recently occurred events requiring post-conduct monitoring verification.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-primary/20 max-h-64 overflow-y-auto">
              {eligible.map((r: any) => (
                <div key={r.reservation_id} className="flex items-center justify-between p-4 hover:bg-primary/20 transition-all group">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-bold truncate tracking-tight">{r.park_venue?.park_venue_name || 'Generic Venue'}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground lowercase">
                      <span className="font-mono text-[9px] uppercase tracking-tighter opacity-80">#{r.reservation_id.slice(-8)}</span>
                      <Separator orientation="vertical" className="h-2" />
                      <span>{r.person?.full_name || 'Guest'}</span>
                      <Separator orientation="vertical" className="h-2" />
                      <span>{r.reservation_date}</span>
                    </div>
                  </div>
                  <Button size="sm" className="h-8 text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary hover:bg-primary hover:text-white border-none shadow-none" onClick={() => setCreateFor(r)}>
                    Generate Log
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Recorded", value: logs.length, icon: CalendarCheck, variant: "secondary" },
          { label: "Successfully Conducted", value: logs.filter(l => l.event_conducted_flag).length, icon: CheckCircle2, variant: "success" },
          { label: "Full Compliance", value: logs.filter(l => complianceInfo(l.event_conducted_flag, l.remarks).label === 'Compliant' && l.event_conducted_flag).length, icon: ShieldCheck, variant: "success" },
          { label: "Incidents Recorded", value: logs.filter(l => complianceInfo(l.event_conducted_flag, l.remarks).variant === 'destructive').length, icon: AlertTriangle, variant: "destructive" },
          { label: "Settled Payments", value: logs.filter(l => l.payment?.payment_status === 'settled').length, icon: CreditCard, variant: "info" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border shadow-xs p-4 flex flex-col justify-between h-24">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 opacity-80" />
            </div>
            <p className="text-2xl font-bold tracking-tighter">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search log ID, venue, or applicant..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-ring outline-none"
            value={filterConducted}
            onChange={(e) => setFilterConducted(e.target.value as any)}
          >
            <option value="all">Conduction: All</option>
            <option value="true">Conducted</option>
            <option value="false">Not Conducted</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:ring-1 focus:ring-ring outline-none"
            value={filterCompliance}
            onChange={(e) => setFilterCompliance(e.target.value as any)}
          >
            <option value="all">Compliance: All</option>
            <option value="compliant">Compliant</option>
            <option value="issue">Issue/Incident</option>
            <option value="no_show">No Show</option>
          </select>
          {(search || filterConducted !== 'all' || filterCompliance !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterConducted('all'); setFilterCompliance('all') }}>
              <X className="mr-2 h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* LOGS TABLE */}
      <Card className="border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[100px]">Log</TableHead>
              <TableHead>Event Details</TableHead>
              <TableHead className="hidden lg:table-cell">Monitoring</TableHead>
              <TableHead className="hidden md:table-cell">Fees</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead className="w-[80px] text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center animate-pulse text-muted-foreground">
                  Synchronizing monitoring database...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                  No monitoring records found matched those parameters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((l) => {
                const slot = parseSlot(l.reservation?.time_slot)
                const comp = complianceInfo(l.event_conducted_flag, l.remarks)
                return (
                  <TableRow key={l.usage_id} className="group hover:bg-muted transition-colors">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono text-[10px] text-primary font-bold">#{l.usage_id.slice(-6)}</span>
                        <span className="text-[9px] text-muted-foreground opacity-80 uppercase tracking-tighter font-bold">REGISTRY ITEM</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-sm truncate max-w-[200px] leading-tight text-foreground">
                          {l.venue?.park_venue_name || 'System Site'}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                          <span className="flex items-center gap-1"><Calendar className="h-2.5 w-2.5" /> {l.reservation?.reservation_date || 'N/A'}</span>
                          <Separator orientation="vertical" className="h-2" />
                          <span className="truncate max-w-[100px]">{l.person?.full_name || 'Guest'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-col gap-0.5 max-w-[150px]">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">{l.office?.office_name || 'LGU OFFICE'}</p>
                        <p className="text-[10px] text-muted-foreground italic truncate leading-tight">
                          {l.remarks || 'No specific oversight notes.'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {l.payment ? (
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-foreground leading-none">₱{Number(l.payment.amount_paid).toLocaleString()}</p>
                          <Badge variant="outline" className="text-[9px] h-4 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 uppercase font-bold tracking-tighter shadow-none">SETTLED</Badge>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/50 italic">Not Linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={l.event_conducted_flag ? 'outline' : 'secondary'} className={cn("text-[9px] font-bold h-5 shadow-none", l.event_conducted_flag && "border-green-500 text-green-700 bg-green-50 dark:bg-green-900/10 dark:text-green-400")}>
                          {l.event_conducted_flag ? 'CONDUCTED' : 'NOT CONDUCTED'}
                        </Badge>
                        <div className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider", comp.variant === 'destructive' ? 'text-red-600' : comp.variant === 'warning' ? 'text-yellow-600' : 'text-emerald-600')}>
                          <comp.Icon className="h-3 w-3" /> {comp.label}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewLog(l)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* DETAIL MODAL */}
      <Dialog open={!!viewLog} onOpenChange={(open) => !open && setViewLog(null)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
          {viewLog && (
            <div className="card-premium mx-auto w-full animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={viewLog.event_conducted_flag ? 'success' : 'secondary'} className="font-bold uppercase tracking-wider text-[10px]">
                    {viewLog.event_conducted_flag ? 'Conducted' : 'No Show'}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground opacity-60">ID: {viewLog.usage_id}</span>
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                   {viewLog.venue?.park_venue_name || 'Event Performance Review'}
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                   Registry Monitoring Archive record for current period.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className={cn(
                  "surface-box border relative overflow-hidden",
                  complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'destructive' ? 'border-red-500/30 bg-red-500/5' : 
                  complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 
                  'border-emerald-500/30 bg-emerald-500/5'
                )}>
                  <div className="flex gap-4 items-start relative z-10">
                    <div className={cn(
                      "h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                      complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'destructive' ? 'bg-red-500/20 text-red-500' : 
                      complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'warning' ? 'bg-yellow-500/20 text-yellow-500' : 
                      'bg-emerald-500/20 text-emerald-500'
                    )}>
                      {React.createElement(complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).Icon, { className: "h-6 w-6" })}
                    </div>
                    <div className="space-y-1.5 flex-1">
                      <p className={cn(
                        "text-xs font-extrabold tracking-widest uppercase",
                        complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'destructive' ? 'text-red-600' : 
                        complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).variant === 'warning' ? 'text-yellow-600' : 
                        'text-emerald-600'
                      )}>
                        Compliance: {complianceInfo(viewLog.event_conducted_flag, viewLog.remarks).label}
                      </p>
                      <p className="text-sm text-foreground/90 font-medium leading-relaxed italic border-l-2 border-border/20 pl-3">
                        "{viewLog.remarks || 'The event proceeded smoothly according to monitoring standards.'}"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div className="surface-box group border border-border/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <UserCheck className="h-3.5 w-3.5" /> Organizer
                      </p>
                      <p className="text-sm font-bold text-foreground truncate">{viewLog.person?.full_name || '—'}</p>
                   </div>
                   <div className="surface-box group border border-border/20">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <CalendarCheck className="h-3.5 w-3.5" /> Date Recorded
                      </p>
                      <p className="text-sm font-bold text-foreground">{viewLog.reservation?.reservation_date || 'N/A'}</p>
                   </div>
                </div>

                <div className="admin-box mt-2 group">
                  <Building2 className="absolute top-4 right-4 h-12 w-12 text-primary/5 transition-transform group-hover:scale-110 duration-500" />
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <Building2 className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Monitoring Authority</span>
                  </div>
                  <div className="text-sm font-bold text-foreground px-1">
                    {viewLog.office?.office_name || 'Parks Monitoring Unit'}
                  </div>
                  <div className="sep mt-4">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium italic">
                      <MapPin className="h-3 w-3 text-primary/40" />
                      {viewLog.office?.location || 'Operational Site Presence'}
                    </div>
                  </div>
                </div>

                <DialogFooter className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end">
                  <Button size="sm" variant="secondary" onClick={() => setViewLog(null)} className="rounded-xl h-11 px-8 font-bold text-[11px] uppercase tracking-widest">
                    Close Archive
                  </Button>
                </DialogFooter>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE LOG DIALOG */}
      <Dialog open={!!createFor} onOpenChange={(open) => !open && setCreateFor(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          {createFor && (
            <div className="card-premium mx-auto w-full animate-in slide-in-from-bottom-4 duration-300">
              <DialogHeader className="mb-6">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-inner">
                  <BadgeCheck size={24} />
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                  Log Event Completion
                </DialogTitle>
                <DialogDescription className="font-medium text-muted-foreground/80 mt-1 space-y-1.5">
                  <p>Conducting monitoring for reservation <strong className="text-primary font-mono font-bold font-mono">#{createFor.reservation_id.slice(-8)}</strong>.</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest bg-muted/50 py-1 px-2 rounded-lg border border-border/20 inline-block">
                    {createFor.park_venue?.park_venue_name} · {createFor.reservation_date}
                  </p>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="surface-box border border-border/40 space-y-2">
                  <Label htmlFor="create-office" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monitoring Office</Label>
                  <select
                    id="create-office"
                    className="flex h-11 w-full rounded-xl border border-border/40 bg-background/50 px-4 py-2 text-sm font-medium shadow-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={createForm.officeId}
                    onChange={(e) => setCreateForm(f => ({ ...f, officeId: e.target.value }))}
                  >
                    <option value="">Select monitoring body…</option>
                    {adminOffices.map((o: any) => (
                      <option key={o.admin_office_id} value={o.admin_office_id}>{o.office_name}</option>
                    ))}
                  </select>
                </div>

                <div className="surface-box border border-border/40 bg-muted/30 flex items-center justify-between p-5">
                  <div className="space-y-1">
                    <Label htmlFor="conducted" className="font-bold text-sm">Conduction Status</Label>
                    <p className="text-[10px] text-muted-foreground font-medium italic">Confirmed successful venue utilization.</p>
                  </div>
                  <Switch 
                    id="conducted" 
                    checked={createForm.conducted} 
                    onCheckedChange={(checked) => setCreateForm(f => ({ ...f, conducted: checked }))} 
                    className="data-[state=checked]:bg-green-600"
                  />
                </div>

                <div className="surface-box border border-border/40 space-y-2">
                  <Label htmlFor="remarks" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <AlignLeft className="h-3 w-3" /> Field Observer Remarks
                  </Label>
                  <Textarea 
                    id="remarks" 
                    placeholder="Document compliance, venue condition, or any incidents reported (Registry Item 15)..." 
                    className="min-h-[120px] rounded-xl border-border/40 bg-background/50 focus:ring-2 focus:ring-primary/20 resize-none font-medium text-sm leading-relaxed"
                    value={createForm.remarks}
                    onChange={(e) => setCreateForm(f => ({ ...f, remarks: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-border/10">
                <Button variant="ghost" size="sm" className="font-bold text-[11px] uppercase tracking-widest h-11 px-6 hover:bg-muted" onClick={() => setCreateFor(null)} disabled={loading}>
                  Discard
                </Button>
                <Button 
                  size="sm" 
                  className="rounded-xl font-extrabold text-[11px] h-11 px-10 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95"
                  onClick={handleCreateLog}
                  disabled={loading}
                >
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'AUTHORIZE ENTRY'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SYSTEM FOOTNOTE */}
      <footer className="rounded-xl border border-border bg-muted p-4 flex gap-4 items-start md:items-center">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-background border shadow-xs shrink-0">
          <Info className="h-5 w-5 text-blue-500" />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">System Governance:</strong> Recording monitoring logs triggers the <strong className="text-foreground">Event Completion Workflow</strong>, where the system automatically issues a completion certificate and feedback request. This data also feeds into the annual venue utilization reporting.
        </p>
      </footer>
    </div>
  )
}