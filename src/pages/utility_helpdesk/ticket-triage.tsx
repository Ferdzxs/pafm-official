import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META } from "@/config/rbac";
import { supabase } from "@/lib/supabase";
import {
 UTILITY_TICKET_TYPES,
} from "@/config/utilityRequest";
import { UtilityRequirementChecklist } from "@/pages/citizen/apply-utility_request";
import {
 AlertCircle,
 CheckCircle2,
 Clock,
 Filter,
 Loader2,
 MapPin,
 Search,
 X,
 Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
type TicketStatus = string;

interface ServiceTicketRow {
 ticket_id: string;
 ticket_type: string;
 requester_name: string;
 requester_contact: string | null;
 description: string;
 location: string;
 priority: string | null;
 status: TicketStatus;
 created_at: string;
 person_id: string | null;
}

const STATUS_LABEL: Record<string, string> = {
 submitted: "Submitted",
 open: "Open",
 under_review: "Under review",
 incomplete: "Incomplete / Needs docs",
 triaged: "Triaged",
 documents_validated: "Documents validated",
 hcdrd_pending: "Awaiting HCDRD clearance",
 hcdrd_cleared: "HCDRD cleared",
 assigned: "Assigned",
 for_inspection: "Queued for site inspection",
 in_progress: "In progress",
 awaiting_treasury: "Awaiting treasury (fees)",
 order_of_payment_issued: "Order of payment issued",
 for_installation: "Ready for installation",
 pending_activation: "Pending activation",
 resolved: "Resolved (for closing)",
 closed: "Closed",
 rejected: "Rejected",
};

const STATUS_CLASS: Record<string, string> = {
 submitted: "badge-pending",
 open: "badge-pending",
 under_review: "badge-pending",
 incomplete: "badge-pending",
 triaged: "badge-pending",
 documents_validated: "badge-pending",
 hcdrd_pending: "badge-pending",
 hcdrd_cleared: "badge-pending",
 assigned: "badge-pending",
 for_inspection: "badge-pending",
 in_progress: "badge-pending",
 awaiting_treasury: "badge-pending",
 order_of_payment_issued: "badge-pending",
 for_installation: "badge-pending",
 pending_activation: "badge-pending",
 resolved: "badge-approved",
 closed: "badge-completed",
 rejected: "badge-declined",
};

function humanTypeLabel(ticketType: string): string {
 const meta = (UTILITY_TICKET_TYPES as any)[ticketType];
 if (meta?.label) return meta.label;
 return ticketType.replace(/_/g, " ");
}

function isPathAType(ticketType: string) {
 return ["water_connection:new", "water_connection:additional_meter", "water_connection"].includes(ticketType);
}

export default function TicketTriage() {
 const { user } = useAuth();
 const [tickets, setTickets] = useState<ServiceTicketRow[]>([]);
 const [wcrRow, setWcrRow] = useState<{
  property_type: string | null;
  water_request_id: string;
 } | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [statusFilter, setStatusFilter] = useState<string>("all");
 const [selected, setSelected] = useState<ServiceTicketRow | null>(null);
 const [actionLoading, setActionLoading] = useState(false);

 useEffect(() => {
 void loadTickets();
 }, []);

 useEffect(() => {
 if (!selected) {
  setWcrRow(null);
  return;
 }
 if (!isPathAType(selected.ticket_type)) {
  setWcrRow(null);
  return;
 }
 void supabase
  .from("water_connection_request")
  .select("property_type, water_request_id")
  .eq("ticket_id", selected.ticket_id)
  .maybeSingle()
  .then(({ data }) => {
  setWcrRow(
   data
    ? {
     property_type: (data as { property_type?: string | null }).property_type ?? null,
     water_request_id: (data as { water_request_id: string }).water_request_id,
    }
    : null,
  );
  });
 }, [selected]);

 async function loadTickets() {
 setLoading(true);
 setError(null);
 try {
  const { data, error: e } = await supabase
  .from("service_tickets")
  .select(
   "ticket_id, ticket_type, requester_name, requester_contact, description, location, priority, status, created_at, person_id",
  )
  .in("ticket_type", [
   "water_connection:new",
   "water_connection:additional_meter",
   "leak:owner",
   "leak:representative",
   "drainage",
   "water_connection",
   "leak_report",
  ])
  .in("status", [
   "submitted",
   "open",
   "under_review",
   "incomplete",
   "triaged",
   "documents_validated",
   "hcdrd_pending",
  ])
  .order("created_at", { ascending: false });

  if (e) throw e;
  setTickets((data as ServiceTicketRow[]) ?? []);
 } catch (err: any) {
  setError(err?.message ?? "Failed to load utility tickets.");
 } finally {
  setLoading(false);
 }
 }

 const filtered = useMemo(() => {
 const q = search.toLowerCase();
 return tickets.filter((t) => {
  const matchesSearch =
  !q ||
  t.ticket_id.toLowerCase().includes(q) ||
  t.requester_name.toLowerCase().includes(q) ||
  t.description.toLowerCase().includes(q) ||
  t.location.toLowerCase().includes(q);
  const matchesStatus =
  statusFilter === "all" || t.status === statusFilter;
  return matchesSearch && matchesStatus;
 });
 }, [tickets, search, statusFilter]);

 async function validateDocsAndRoutePathA(ticket: ServiceTicketRow) {
 if (!user || !wcrRow) return;
 setActionLoading(true);
 try {
  const openDepressed = wcrRow.property_type === "open_depressed";
  const nextTicket = openDepressed ? "hcdrd_pending" : "for_inspection";
  const { error: e1 } = await supabase
  .from("service_tickets")
  .update({ status: nextTicket })
  .eq("ticket_id", ticket.ticket_id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
  .from("water_connection_request")
  .update({ status: openDepressed ? "awaiting_hcdrd" : "queued_inspection" })
  .eq("ticket_id", ticket.ticket_id);
  if (e2) throw e2;
  await supabase.from("notification_log").insert({
  notif_id: `NLOG-${Date.now()}`,
  account_id: user.id,
  module_reference: "utility",
  reference_id: ticket.ticket_id,
  notif_type: "documents_validated",
  message: openDepressed
   ? `Request ${ticket.ticket_id}: documents validated; HCDRD clearance required (socialized housing).`
   : `Request ${ticket.ticket_id}: documents validated; queued for site inspection.`,
  });
  setSelected(null);
  await loadTickets();
 } catch (err: any) {
  setError(err?.message ?? "Failed to route request.");
 } finally {
  setActionLoading(false);
 }
 }

 async function recordHcdrdClearance(ticket: ServiceTicketRow) {
 if (!user || !wcrRow) return;
 const url = window.prompt("Digital clearance URL (optional):", "") ?? "";
 setActionLoading(true);
 try {
  const clearanceId = `HC-${Date.now()}`;
  const today = new Date().toISOString().split("T")[0];
  const { error: e0 } = await supabase.from("hcdrd_clearance").insert({
  clearance_id: clearanceId,
  water_request_id: wcrRow.water_request_id,
  issued_by_office: "OFF-009",
  clearance_type: "water_connection_clearance",
  issue_date: today,
  digital_clearance_url: url.trim() || null,
  });
  if (e0) throw e0;
  const { error: e1 } = await supabase
  .from("service_tickets")
  .update({ status: "for_inspection" })
  .eq("ticket_id", ticket.ticket_id);
  if (e1) throw e1;
  const { error: e2 } = await supabase
  .from("water_connection_request")
  .update({ status: "hcdrd_cleared" })
  .eq("ticket_id", ticket.ticket_id);
  if (e2) throw e2;
  await supabase.from("notification_log").insert({
  notif_id: `NLOG-${Date.now()}`,
  account_id: user.id,
  module_reference: "utility",
  reference_id: ticket.ticket_id,
  notif_type: "hcdrd_recorded",
  message: `HCDRD clearance recorded for ${ticket.ticket_id}. Queued for site inspection.`,
  });
  setSelected(null);
  await loadTickets();
 } catch (err: any) {
  setError(err?.message ?? "Failed to record clearance.");
 } finally {
  setActionLoading(false);
 }
 }

 async function forwardToInspectionBC(ticket: ServiceTicketRow) {
 await updateStatus(
  ticket.ticket_id,
  "for_inspection",
  "forwarded_inspection",
  `Request ${ticket.ticket_id} forwarded to Utility Engineering for site validation.`,
 );
 }

 async function updateStatus(
 ticketId: string,
 newStatus: TicketStatus,
 notifType: string,
 message: string,
 ) {
 if (!user) return;
 setActionLoading(true);
 try {
  const { error: e1 } = await supabase
  .from("service_tickets")
  .update({ status: newStatus })
  .eq("ticket_id", ticketId);
  if (e1) throw e1;

  await supabase.from("notification_log").insert({
  notif_id: `NLOG-${Date.now()}`,
  account_id: user.id,
  module_reference: "utility",
  reference_id: ticketId,
  notif_type: notifType,
  message,
  });

  setSelected(null);
  await loadTickets();
 } catch (err: any) {
  setError(err?.message ?? "Failed to update ticket.");
 } finally {
  setActionLoading(false);
 }
 }

 if (!user) return null;
 const meta = ROLE_META[user.role];

 return (
 <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-6 pb-12">
  <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
   <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3">
     <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
      {meta.label.toUpperCase()}
     </Badge>
     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Triage queue
     </span>
    </div>
    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Utility ticket triage</h1>
    <p className="text-muted-foreground text-sm max-w-2xl">
     Review new utility requests, check completeness, validate documents, and route them to Engineering.
    </p>
   </div>
  </header>

  {error && (
  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive items-center">
   <AlertCircle size={16} className="shrink-0" />
   <span className="font-medium">{error}</span>
   <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto hover:bg-destructive/10 text-destructive" onClick={() => setError(null)}>
    <X size={14} />
   </Button>
  </div>
  )}

  <div className="flex flex-col sm:flex-row gap-3">
   <div className="relative flex-1 max-w-md">
    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    <Input className="pl-10 h-10 border-border/50" placeholder="Search by ticket ID, applicant, location…" value={search} onChange={e => setSearch(e.target.value)} />
   </div>
   <div className="relative w-full sm:w-56">
    <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
    <select
     className="flex h-10 w-full rounded-xl border border-border/50 bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     value={statusFilter}
     onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
    >
     <option value="all">All statuses</option>
     <option value="submitted">Submitted</option>
     <option value="under_review">Under review</option>
     <option value="incomplete">Incomplete</option>
     <option value="triaged">Triaged</option>
     <option value="documents_validated">Documents validated</option>
     <option value="hcdrd_pending">HCDRD pending</option>
    </select>
   </div>
  </div>

  <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
  <CardHeader className="pb-3 bg-muted/20 border-b">
   <CardTitle className="text-base flex items-center gap-2">
    <Clock size={18} className="text-primary" />
    Incoming utility tickets
    <Badge variant="secondary" className="ml-auto sm:ml-1">{filtered.length}</Badge>
   </CardTitle>
   <CardDescription>Showing {filtered.length} of {tickets.length} loaded tickets.</CardDescription>
  </CardHeader>
  <CardContent className="p-0">
   {loading ? (
   <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
    <Loader2 size={16} className="mr-2 animate-spin" />
    Loading from Supabase…
   </div>
   ) : filtered.length === 0 ? (
   <div className="flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
    <p>No tickets currently require triage.</p>
   </div>
   ) : (
   <div className="divide-y">
    {filtered.map((t) => (
    <button
     key={t.ticket_id}
     type="button"
     onClick={() => setSelected(t)}
     className="w-full text-left px-4 py-3 hover:bg-bg-hover transition flex items-start gap-3"
    >
     <div className="mt-1">
     <div className="w-2 h-2 rounded-full bg-primary" />
     </div>
     <div className="flex-1 min-w-0">
     <div className="flex items-center justify-between gap-2 mb-0.5">
      <span className="text-sm font-semibold text-foreground truncate">
      {humanTypeLabel(t.ticket_type)}
      </span>
      <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[t.status] ?? "badge-pending"}`}
      >
      {STATUS_LABEL[t.status] ?? t.status.replace(/_/g, " ")}
      </span>
     </div>
     <div className="text-[11px] text-muted-foreground flex flex-wrap gap-2 mb-1">
      <span className="font-mono text-primary/80">
      {t.ticket_id}
      </span>
      <span>· {t.requester_name}</span>
     </div>
     <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
      <MapPin size={11} />
      <span className="truncate">{t.location}</span>
     </div>
     <p className="text-xs text-muted-foreground line-clamp-2">
      {t.description}
     </p>
     </div>
     <div className="ml-2 flex flex-col items-end text-[10px] text-muted-foreground">
     <Clock size={11} className="mb-0.5" />
     <span>
      {new Date(t.created_at).toLocaleString("en-PH", {
      month: "short",
      day: "2-digit",
      })}
     </span>
     </div>
    </button>
    ))}
   </div>
   )}
  </CardContent>
  </Card>

  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
        {humanTypeLabel(selected.ticket_type)}
       </DialogTitle>
       <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">
        {selected.ticket_id}
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Applicant
         </div>
         <p className="text-sm font-semibold text-foreground">
          {selected.requester_name}
         </p>
         {selected.requester_contact && (
          <p className="text-xs text-muted-foreground mt-1">
           {selected.requester_contact}
          </p>
         )}
        </div>
        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Location
         </div>
         <p className="text-sm font-semibold text-foreground">{selected.location}</p>
        </div>
       </div>

       <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
         Citizen description
        </div>
        <p className="text-sm text-foreground whitespace-pre-wrap">
         {selected.description}
        </p>
       </div>

       <UtilityRequirementChecklist
        ticketId={selected.ticket_id}
        ticketTypeKey={selected.ticket_type}
        propertyType={wcrRow?.property_type}
        verifiedBy={user.full_name}
       />
      </div>

      <div className="mt-6 pt-6 border-t border-border/10 flex flex-col sm:flex-row flex-wrap gap-3 shrink-0">
       <button
        type="button"
        className="h-11 rounded-xl px-8 flex-1 sm:flex-none border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm order-4 sm:order-1"
        onClick={() => setSelected(null)}
       >
        Close
       </button>
       {selected.status === "submitted" && (
        <button
         type="button"
         disabled={actionLoading}
         onClick={() =>
          void updateStatus(
           selected.ticket_id,
           "under_review",
           "ticket_under_review",
           `Your utility request ${selected.ticket_id} is now under review by Utility Helpdesk.`
          )
         }
         className="h-11 rounded-xl flex-1 px-4 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all bg-slate-800 hover:bg-slate-700 disabled:opacity-50 order-3 sm:order-2"
        >
         Mark as Under Review
        </button>
       )}
       {(selected.status === "under_review" || selected.status === "submitted") && (
        <button
         type="button"
         disabled={actionLoading}
         onClick={() =>
          void updateStatus(
           selected.ticket_id,
           "incomplete",
           "ticket_incomplete",
           `Additional documents are required for your utility request ${selected.ticket_id}. Please check your notifications.`
          )
         }
         className="h-11 rounded-xl flex-1 px-4 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all bg-amber-600 hover:bg-amber-700 disabled:opacity-50 order-2 sm:order-3"
        >
         Mark Incomplete / Needs Docs
        </button>
       )}
       {isPathAType(selected.ticket_type) &&
        ["submitted", "open", "under_review", "incomplete", "triaged"].includes(selected.status) && (
        <button
         type="button"
         disabled={actionLoading || !wcrRow}
         title={!wcrRow ? "Loading water connection record…" : undefined}
         onClick={() => void validateDocsAndRoutePathA(selected)}
         className="h-11 rounded-xl flex-1 px-4 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-4"
        >
         <CheckCircle2 size={14} />
         Validate docs &amp; route
        </button>
       )}
       {isPathAType(selected.ticket_type) && selected.status === "hcdrd_pending" && (
        <button
         type="button"
         disabled={actionLoading || !wcrRow}
         onClick={() => void recordHcdrdClearance(selected)}
         className="h-11 rounded-xl flex-1 px-4 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
         Record HCDRD clearance
        </button>
       )}
       {!isPathAType(selected.ticket_type) &&
        ["submitted", "open", "under_review", "incomplete", "triaged"].includes(selected.status) && (
        <button
         type="button"
         disabled={actionLoading}
         onClick={() => void forwardToInspectionBC(selected)}
         className="h-11 rounded-xl flex-1 px-4 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg transition-all bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-4"
        >
         <CheckCircle2 size={14} />
         Forward to field inspection
        </button>
       )}
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 );
}
