import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META } from "@/config/rbac";
import { supabase } from "@/lib/supabase";
import {
 AlertCircle,
 CheckCircle2,
 Loader2,
 MapPin,
 Search,
 X,
 Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ConnectionRow {
 ticket_id: string;
 status: string;
 requester_name: string;
 location: string;
 priority: string | null;
 created_at: string;
 water_request_id: string;
 property_type: string | null;
 water_status: string | null;
 assessment_findings: string | null;
 feasibility_status: string | null;
 quotation_amount: number | null;
 installation_date: string | null;
 activation_confirmed: boolean | null;
}

const STATUS_CLASS: Record<string, string> = {
 submitted: "badge-pending",
 open: "badge-pending",
 under_review: "badge-pending",
 triaged: "badge-pending",
 assigned: "badge-pending",
 for_inspection: "badge-pending",
 awaiting_treasury: "badge-pending",
 order_of_payment_issued: "badge-pending",
 for_installation: "badge-pending",
 in_progress: "badge-pending",
 pending_activation: "badge-pending",
 completed: "badge-approved",
 resolved: "badge-approved",
 closed: "badge-completed",
 rejected: "badge-declined",
};

export default function ConnectionStatus() {
 const { user } = useAuth();
 const [rows, setRows] = useState<ConnectionRow[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [search, setSearch] = useState("");
 const [selected, setSelected] = useState<ConnectionRow | null>(null);
 const [closing, setClosing] = useState(false);

 useEffect(() => {
 void load();
 }, []);

 async function load() {
 setLoading(true);
 setError(null);
 try {
  // 1. Load Path A tickets from service_tickets (source of truth for requester + status).
  const { data: ticketRows, error: ticketErr } = await supabase
  .from("service_tickets")
  .select(
   "ticket_id, status, requester_name, location, priority, created_at",
  )
  .or(
   "ticket_type.eq.water_connection:new,ticket_type.eq.water_connection:additional_meter,ticket_type.eq.water_connection",
  )
  .order("created_at", { ascending: false });
  if (ticketErr) throw ticketErr;

  const tickets = (ticketRows ?? []) as {
  ticket_id: string;
  status: string;
  requester_name: string;
  location: string;
  priority: string | null;
  created_at: string;
  }[];

  if (!tickets.length) {
  setRows([]);
  return;
  }

  const ticketIds = tickets.map((t) => t.ticket_id);

  // 2. Load water_connection_request + related assessment/installation by ticket_id.
  const { data: wcrRows, error: wcrErr } = await supabase
  .from("water_connection_request")
  .select(
   `
   water_request_id,
   ticket_id,
   property_type,
   status,
   technical_assessment:technical_assessment (
   findings,
   feasibility_status,
   quotation_amount
   ),
   installation_record:installation_record (
   installation_date,
   activation_confirmed
   )
  `,
  )
  .in("ticket_id", ticketIds);
  if (wcrErr) throw wcrErr;

  const byTicketId = new Map<
  string,
  {
   water_request_id: string;
   property_type: string | null;
   status: string | null;
   technical_assessment: any;
   installation_record: any;
  }
  >();

  (wcrRows ?? []).forEach((row: any) => {
  byTicketId.set(row.ticket_id, row);
  });

  const flat: ConnectionRow[] = tickets.map((t) => {
  const wc = byTicketId.get(t.ticket_id);
  const ta = wc?.technical_assessment?.[0] ?? wc?.technical_assessment;
  const ir = wc?.installation_record?.[0] ?? wc?.installation_record;
  return {
   ticket_id: t.ticket_id,
   status: t.status,
   requester_name: t.requester_name,
   location: t.location,
   priority: t.priority,
   created_at: t.created_at,
   water_request_id: wc?.water_request_id ?? "",
   property_type: (wc?.property_type as string | null) ?? null,
   water_status: (wc?.status as string | null) ?? null,
   assessment_findings: ta?.findings ?? null,
   feasibility_status: ta?.feasibility_status ?? null,
   quotation_amount: ta?.quotation_amount ?? null,
   installation_date: ir?.installation_date ?? null,
   activation_confirmed: ir?.activation_confirmed ?? null,
  };
  });

  setRows(flat);
 } catch (err: any) {
  setError(err?.message ?? "Failed to load water connection status.");
 } finally {
  setLoading(false);
 }
 }

 async function confirmActivationAndClose(row: ConnectionRow) {
 if (!user || !row.water_request_id) return;
 setClosing(true);
 try {
  const { error: irErr } = await supabase
  .from("installation_record")
  .update({ activation_confirmed: true })
  .eq("water_request_id", row.water_request_id);
  if (irErr) throw irErr;

  const { error: tErr } = await supabase
  .from("service_tickets")
  .update({ status: "completed", resolved_at: new Date().toISOString() })
  .eq("ticket_id", row.ticket_id);
  if (tErr) throw tErr;

  const { error: wErr } = await supabase
  .from("water_connection_request")
  .update({ status: "completed" })
  .eq("water_request_id", row.water_request_id);
  if (wErr) throw wErr;

  await supabase.from("notification_log").insert({
  notif_id: `NLOG-${Date.now()}`,
  account_id: user.id,
  module_reference: "utility",
  reference_id: row.ticket_id,
  notif_type: "service_activated",
  message: `Your water connection ${row.ticket_id} is active. Service activation confirmed.`,
  });

  setSelected(null);
  await load();
 } catch (err: any) {
  setError(err?.message ?? "Failed to confirm activation.");
 } finally {
  setClosing(false);
 }
 }

 if (!user) return null;
 const meta = ROLE_META[user.role];

 const filtered = rows.filter((r) => {
 const q = search.toLowerCase();
 return (
  !q ||
  r.ticket_id.toLowerCase().includes(q) ||
  r.requester_name.toLowerCase().includes(q) ||
  r.location.toLowerCase().includes(q)
 );
 });

 return (
 <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-6 pb-12">
  <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
   <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3">
     <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
      {meta.label.toUpperCase()}
     </Badge>
     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Connection tracking
     </span>
    </div>
    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Water connection status</h1>
    <p className="text-muted-foreground text-sm max-w-2xl">
     Monitor Path A water connection requests and confirm completion once installation is activated.
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

  <div className="relative max-w-md">
   <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
   <Input className="pl-10 h-10 border-border/50" placeholder="Search by ticket ID, applicant, or location…" value={search} onChange={e => setSearch(e.target.value)} />
  </div>

  <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
  <CardHeader className="pb-3 bg-muted/20 border-b">
   <CardTitle className="text-base flex items-center gap-2">
    <MapPin size={18} className="text-primary" />
    Water connection tickets
    <Badge variant="secondary" className="ml-auto sm:ml-1">{filtered.length}</Badge>
   </CardTitle>
   <CardDescription>Showing {filtered.length} of {rows.length} records.</CardDescription>
  </CardHeader>
  <CardContent className="p-0">
   {loading ? (
   <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
    <Loader2 size={16} className="mr-2 animate-spin" />
    Loading from Supabase…
   </div>
   ) : filtered.length === 0 ? (
   <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-sm">
    <p>No water connection records found.</p>
   </div>
   ) : (
   <div className="divide-y">
    {filtered.map((r) => (
    <button
     key={r.ticket_id}
     type="button"
     onClick={() => setSelected(r)}
     className="w-full text-left px-4 py-3 hover:bg-bg-hover transition flex items-start gap-3"
    >
     <div className="mt-1">
     <div className="w-2 h-2 rounded-full bg-primary" />
     </div>
     <div className="flex-1 min-w-0">
     <div className="flex items-center justify-between gap-2 mb-0.5">
      <span className="text-sm font-semibold text-foreground truncate">
      {r.requester_name}
      </span>
      <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASS[r.status] ?? "badge-pending"}`}
      >
      {r.status.replace("_", " ")}
      </span>
     </div>
     <p className="text-[11px] text-muted-foreground mb-1">
      {r.ticket_id} ·{" "}
      {r.property_type ? r.property_type.replace("_", " ") : ""}
     </p>
     <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
      <MapPin size={11} />
      <span className="truncate">{r.location}</span>
     </div>
     <p className="text-xs text-muted-foreground">
      Water status: {r.water_status ?? "—"} ·{" "}
      {r.activation_confirmed
      ? "Activation confirmed"
      : "Activation pending"}
     </p>
     </div>
    </button>
    ))}
   </div>
   )}
  </CardContent>
  </Card>

  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
        Water Connection — {selected.requester_name}
       </DialogTitle>
       <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">
        {selected.ticket_id}
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Ticket
         </div>
         <p className="text-sm font-semibold text-foreground">
          Status: {selected.status.replace("_", " ")}
         </p>
         <p className="text-xs text-muted-foreground mt-1">
          Created: {new Date(selected.created_at).toLocaleString("en-PH")}
         </p>
        </div>
        <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          Connection
         </div>
         <p className="text-sm font-semibold text-foreground">
          Request ID: {selected.water_request_id || "—"}
         </p>
         <p className="text-xs text-muted-foreground mt-1">
          Property type: {selected.property_type ? selected.property_type.replace("_", " ") : "—"}
         </p>
        </div>
       </div>

       <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
         Technical Assessment
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
         <div>
          <span className="text-xs text-muted-foreground font-medium">Feasibility: </span>
          <span className="text-xs font-semibold text-foreground">{selected.feasibility_status ?? "—"}</span>
         </div>
         {selected.quotation_amount != null && (
          <div>
           <span className="text-xs text-muted-foreground font-medium">Estimated fees: </span>
           <span className="text-xs font-semibold text-foreground">₱{Number(selected.quotation_amount).toLocaleString("en-PH")}</span>
          </div>
         )}
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-wrap pt-2 border-t border-border/10">
         {selected.assessment_findings || "No assessment notes yet."}
        </p>
       </div>

       <div className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
         Installation
        </div>
        <div className="grid grid-cols-2 gap-2">
         <div>
          <span className="text-xs text-muted-foreground font-medium">Installation date: </span>
          <span className="text-xs font-semibold text-foreground">{selected.installation_date ?? "—"}</span>
         </div>
         <div>
          <span className="text-xs text-muted-foreground font-medium">Activation confirmed: </span>
          <span className="text-xs font-semibold text-foreground">{selected.activation_confirmed ? "Yes" : "No"}</span>
         </div>
        </div>
       </div>
      </div>

      <div className="mt-6 pt-6 border-t border-border/10 flex flex-col sm:flex-row gap-3 shrink-0">
       <button
        onClick={() => setSelected(null)}
        className="h-11 rounded-xl px-8 flex-1 sm:flex-none border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm order-2 sm:order-1"
       >
        Close
       </button>
       <button
        disabled={closing || selected.status === "closed" || selected.status !== "pending_activation"}
        onClick={() => void confirmActivationAndClose(selected)}
        className="h-11 rounded-xl flex-1 px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg flex items-center justify-center transition-all bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 order-1 sm:order-2"
       >
        {closing ? (
         <>
          <Loader2 size={14} className="animate-spin mr-2" />
          Saving…
         </>
        ) : (
         <>
          <CheckCircle2 size={14} className="mr-2" />
          Confirm service activation
         </>
        )}
       </button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 );
}
