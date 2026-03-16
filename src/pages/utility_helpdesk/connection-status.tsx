import React, { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META } from "@/config/rbac";
import { supabase } from "@/lib/supabase";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Search,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  in_progress: "badge-pending",
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

  async function markClosed(row: ConnectionRow) {
    if (!user) return;
    setClosing(true);
    try {
      const { error: e } = await supabase
        .from("service_tickets")
        .update({ status: "closed", resolved_at: new Date().toISOString() })
        .eq("ticket_id", row.ticket_id);
      if (e) throw e;

      await supabase.from("notification_log").insert({
        notif_id: `NLOG-${Date.now()}`,
        account_id: user.id,
        module_reference: "utility",
        reference_id: row.ticket_id,
        notif_type: "ticket_closed",
        message: `Your water connection request ${row.ticket_id} has been completed and closed.`,
      });

      setSelected(null);
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Failed to close ticket.");
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
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="mb-6">
        <span
          className="px-2.5 py-1 rounded-md text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground mt-2">
          Water connection status
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Monitor new water connection requests (Path A) and confirm completion
          once installation is activated.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-700"
          >
            <X size={13} />
          </button>
        </div>
      )}

      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          className="input-field pl-9"
          placeholder="Search by ticket ID, applicant, or location…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Water Connection Tickets
            <span className="text-xs font-normal text-muted-foreground">
              {filtered.length} of {rows.length}
            </span>
          </CardTitle>
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border-strong shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div>
                <p className="text-[11px] text-muted-foreground font-mono mb-1">
                  {selected.ticket_id}
                </p>
                <h2 className="text-sm font-semibold text-foreground">
                  Water Connection — {selected.requester_name}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-muted/60 border border-border-subtle rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                    Ticket
                  </p>
                  <p className="text-sm text-foreground">
                    Status: {selected.status.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created:{" "}
                    {new Date(selected.created_at).toLocaleString("en-PH")}
                  </p>
                </div>
                <div className="bg-muted/60 border border-border-subtle rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                    Connection
                  </p>
                  <p className="text-sm text-foreground">
                    Request ID: {selected.water_request_id || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Property type:{" "}
                    {selected.property_type
                      ? selected.property_type.replace("_", " ")
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="bg-muted/60 border border-border-subtle rounded-xl p-3 mb-4">
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                  Technical Assessment
                </p>
                <p className="text-xs text-foreground mb-1">
                  Feasibility: {selected.feasibility_status ?? "—"}
                </p>
                {selected.quotation_amount != null && (
                  <p className="text-xs text-foreground mb-1">
                    Estimated fees: ₱
                    {Number(selected.quotation_amount).toLocaleString("en-PH")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {selected.assessment_findings || "No assessment notes yet."}
                </p>
              </div>

              <div className="bg-muted/60 border border-border-subtle rounded-xl p-3 mb-4">
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                  Installation
                </p>
                <p className="text-xs text-foreground mb-1">
                  Installation date: {selected.installation_date ?? "—"}
                </p>
                <p className="text-xs text-foreground">
                  Activation confirmed:{" "}
                  {selected.activation_confirmed ? "Yes" : "No"}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border-subtle flex justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-bg-hover"
                  onClick={() => setSelected(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={
                    closing ||
                    selected.status === "closed" ||
                    !selected.activation_confirmed
                  }
                  onClick={() => void markClosed(selected)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5 disabled:opacity-60"
                >
                  {closing ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={12} />
                      Confirm Activation &amp; Close
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
