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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TicketStatus =
  | "submitted"
  | "open"
  | "under_review"
  | "incomplete"
  | "triaged"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "rejected";

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

const STATUS_LABEL: Record<TicketStatus, string> = {
  submitted: "Submitted",
  open: "Open",
  under_review: "Under review",
  incomplete: "Incomplete / Needs docs",
  triaged: "Triaged",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved (for closing)",
  closed: "Closed",
  rejected: "Rejected",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  submitted: "badge-pending",
  open: "badge-pending",
  under_review: "badge-pending",
  incomplete: "badge-pending",
  triaged: "badge-pending",
  assigned: "badge-pending",
  in_progress: "badge-pending",
  resolved: "badge-approved",
  closed: "badge-completed",
  rejected: "badge-declined",
};

function humanTypeLabel(ticketType: string): string {
  const meta = (UTILITY_TICKET_TYPES as any)[ticketType];
  if (meta?.label) return meta.label;
  return ticketType.replace(/_/g, " ");
}

export default function TicketTriage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<ServiceTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<"all" | "submitted" | "under_review" | "incomplete" | "triaged">(
      "all",
    );
  const [selected, setSelected] = useState<ServiceTicketRow | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    void loadTickets();
  }, []);

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
        .in("status", ["submitted", "open", "under_review", "incomplete", "triaged"])
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
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in pb-12">
      <div className="mb-6">
        <span
          className="px-2.5 py-1 rounded-md text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="font-display text-2xl font-bold text-foreground mt-2">
          Utility Ticket Triage
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Review new utility requests, check completeness, and route them to
          Engineering.
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            className="input-field pl-9"
            placeholder="Search by ticket ID, applicant, location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-52">
          <Filter
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <select
            className="input-field pl-9"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under review</option>
            <option value="incomplete">Incomplete</option>
            <option value="triaged">Triaged</option>
          </select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Incoming Utility Tickets
            <span className="text-xs font-normal text-muted-foreground">
              {filtered.length} of {tickets.length}
            </span>
          </CardTitle>
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
                        {STATUS_LABEL[t.status] ?? t.status}
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border-strong shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div>
                <p className="text-[11px] text-muted-foreground font-mono mb-1">
                  {selected.ticket_id}
                </p>
                <h2 className="text-sm font-semibold text-foreground">
                  {humanTypeLabel(selected.ticket_type)}
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
                    Applicant
                  </p>
                  <p className="text-sm font-medium text-foreground">
                    {selected.requester_name}
                  </p>
                  {selected.requester_contact && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {selected.requester_contact}
                    </p>
                  )}
                </div>
                <div className="bg-muted/60 border border-border-subtle rounded-xl p-3">
                  <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                    Location
                  </p>
                  <p className="text-xs text-foreground">{selected.location}</p>
                </div>
              </div>

              <div className="bg-muted/60 border border-border-subtle rounded-xl p-3 mb-4">
                <p className="text-[11px] text-muted-foreground mb-1 uppercase tracking-wide">
                  Citizen description
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selected.description}
                </p>
              </div>

              <UtilityRequirementChecklist
                ticketId={selected.ticket_id}
                ticketType={
                  (UTILITY_TICKET_TYPES as any)[selected.ticket_type]
                    ?.category ?? "water_connection"
                }
                waterSubtype={
                  (UTILITY_TICKET_TYPES as any)[selected.ticket_type]?.subtype
                }
                propertyType={undefined}
                leakSubtype={
                  (UTILITY_TICKET_TYPES as any)[selected.ticket_type]?.subtype
                }
                verifiedBy={user.full_name}
              />

              <div className="mt-5 flex flex-wrap gap-2 justify-end border-t border-border-subtle pt-4">
                {selected.status === "submitted" && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      void updateStatus(
                        selected.ticket_id,
                        "under_review",
                        "ticket_under_review",
                        `Your utility request ${selected.ticket_id} is now under review by Utility Helpdesk.`,
                      )
                    }
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 hover:bg-slate-700"
                  >
                    Mark as Under Review
                  </button>
                )}
                {(selected.status === "submitted" ||
                  selected.status === "under_review" ||
                  selected.status === "incomplete") && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      void updateStatus(
                        selected.ticket_id,
                        "triaged",
                        "ticket_triaged",
                        `Your utility request ${selected.ticket_id} has passed document check and is queued for assignment.`,
                      )
                    }
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} />
                    Mark Complete &amp; Triaged
                  </button>
                )}
                {(selected.status === "under_review" ||
                  selected.status === "submitted") && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() =>
                      void updateStatus(
                        selected.ticket_id,
                        "incomplete",
                        "ticket_incomplete",
                        `Additional documents are required for your utility request ${selected.ticket_id}. Please check your notifications.`,
                      )
                    }
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 inline-flex items-center gap-1.5"
                  >
                    Mark Incomplete / Needs Docs
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
