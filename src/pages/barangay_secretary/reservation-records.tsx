import React, { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Eye,
  Building2,
  Calendar,
  Loader2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

interface ReservationRecord {
  reservation_id: string;
  facility_name: string;
  applicant_name: string;
  time_slot: string;
  reservation_date: string;
  status: "pending" | "confirmed" | "rejected" | "completed";
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-pending",
  confirmed: "badge-approved",
  rejected: "badge-rejected",
  completed: "badge-completed",
};

const STATUS_OPTIONS = [
  "all",
  "pending",
  "confirmed",
  "rejected",
  "completed",
];

interface RawReservationData {
  reservation_id: string;
  reservation_date: string;
  time_slot: string | null;
  status: "pending" | "confirmed" | "rejected" | "completed";
  created_at: string;
  barangay_facility:
    | { facility_name: string }
    | { facility_name: string }[]
    | null;
  person: { full_name: string } | { full_name: string }[] | null;
  applicant_person_id: string | null;
}

export default function BarangaySecretaryReservationRecords() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ReservationRecord | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [constituents, setConstituents] = useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = useState({
    facility_id: "",
    applicant_person_id: "",
    time_slot: "",
    reservation_date: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("barangay_reservation_record")
        .select(
          `
                    reservation_id,
                    reservation_date,
                    time_slot,
                    status,
                    created_at,
                    barangay_facility ( facility_name ),
                    person:applicant_person_id ( full_name ),
                    applicant_person_id
                `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: ReservationRecord[] = (
        (data as unknown as RawReservationData[]) || []
      ).map((item) => {
        const facility = Array.isArray(item.barangay_facility)
          ? item.barangay_facility[0]
          : item.barangay_facility;
        const applicant = Array.isArray(item.person)
          ? item.person[0]
          : item.person;

        return {
          reservation_id: item.reservation_id,
          facility_name: facility?.facility_name || "N/A",
          applicant_name: applicant?.full_name || "N/A",
          time_slot: item.time_slot ?? "—",
          reservation_date: item.reservation_date,
          status: item.status,
          created_at: item.created_at,
        };
      });

      setReservations(formatted);
    } catch (error: unknown) {
      console.error("Error fetching reservations:", error);
      const message =
        error instanceof Error ? error.message : "Failed to load reservations";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchSupportData();
  }, [fetchData]);

  const fetchSupportData = async () => {
    try {
      const [{ data: facs }, { data: persons }] = await Promise.all([
        supabase.from("barangay_facility").select("barangay_facility_id, facility_name"),
        supabase.from("person").select("person_id, full_name"),
      ]);
      if (facs) setFacilities(facs.map((f: any) => ({ id: f.barangay_facility_id, name: f.facility_name })));
      if (persons) setConstituents(persons.map((p: any) => ({ id: p.person_id, name: p.full_name })));
    } catch (err) {
      console.error("Error fetching support data:", err);
    }
  };

  const handleCreateReservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facility_id || !formData.applicant_person_id || !formData.time_slot || !formData.reservation_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from("barangay_reservation_record").insert({
        barangay_facility_id: formData.facility_id,
        applicant_person_id: formData.applicant_person_id,
        reservation_date: formData.reservation_date,
        time_slot: formData.time_slot,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Reservation record created successfully");
      setShowAddModal(false);
      setFormData({
        facility_id: "",
        applicant_person_id: "",
        time_slot: "",
        reservation_date: "",
      });
      fetchData();
    } catch (error: unknown) {
      console.error("Error creating reservation:", error);
      const message = error instanceof Error ? error.message : "Failed to create reservation";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (
    id: string,
    newStatus: "confirmed" | "rejected",
  ) => {
    try {
      setUpdating(id);
      const { error } = await supabase
        .from("barangay_reservation_record")
        .update({ status: newStatus })
        .eq("reservation_id", id);

      if (error) throw error;

      toast.success(
        `Reservation ${newStatus === "confirmed" ? "confirmed" : "rejected"} successfully`,
      );
      setReservations((prev) =>
        prev.map((r) =>
          r.reservation_id === id ? { ...r, status: newStatus } : r,
        ),
      );
      if (selected?.reservation_id === id)
        setSelected((prev) => (prev ? { ...prev, status: newStatus } : null));
    } catch (error: unknown) {
      console.error("Error updating status:", error);
      const message =
        error instanceof Error ? error.message : "Failed to update reservation";
      toast.error(message);
    } finally {
      setUpdating(null);
    }
  };

  const filtered = reservations.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.reservation_id.toLowerCase().includes(q) ||
        r.applicant_name.toLowerCase().includes(q) ||
        r.facility_name.toLowerCase().includes(q)) &&
      (statusFilter === "all" || r.status === statusFilter)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium">Loading records...</p>
      </div>
    );
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-display text-2xl font-bold"
            style={{ color: "var(--color-text-primary)" }}
          >
            Barangay Reservations
          </h1>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--color-text-muted)" }}
          >
            Barangay_Reservation_Record — Reservations
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} /> New Record
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {
            label: "Pending Approval",
            count: reservations.filter((r) => r.status === "pending").length,
            color: "#fbbf24",
          },
          {
            label: "Confirmed",
            count: reservations.filter((r) => r.status === "confirmed").length,
            color: "#34d399",
          },
          {
            label: "Total Records",
            count: reservations.length,
            color: "#60a5fa",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.count}
            </div>
            <div
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-row items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            className="input-field pl-9"
            placeholder="Search by ID, applicant or facility…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field flex-1"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "all"
                ? "All Status"
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-180">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-bg-hover)",
                }}
              >
                {[
                  "Rec. ID",
                  "Facility",
                  "Applicant",
                  "Purpose",
                  "Event Date",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rec) => (
                <tr
                  key={rec.reservation_id}
                  className="transition-colors cursor-pointer group"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                  onClick={() => setSelected(rec)}
                >
                  <td
                    className="px-4 py-3 text-sm font-mono"
                    style={{ color: "#e879f9" }}
                  >
                    {rec.reservation_id}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <div className="flex items-center gap-2">
                      <Building2
                        size={13}
                        style={{ color: "var(--color-text-muted)" }}
                      />{" "}
                      {rec.facility_name}
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {rec.applicant_name}
                  </td>
                  <td
                    className="px-4 py-3 text-sm max-w-45 truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {rec.time_slot}
                  </td>
                  <td
                    className="px-4 py-3 text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />{" "}
                      {new Date(rec.reservation_date).toLocaleDateString(
                        "en-PH",
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[rec.status] || "badge-pending"}`}
                    >
                      {rec.status}
                    </span>
                  </td>
                  <td
                    className="px-4 py-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1 overflow-visible">
                      {updating === rec.reservation_id ? (
                        <Loader2
                          size={14}
                          className="animate-spin text-blue-500 m-1.5"
                        />
                      ) : (
                        <>
                          <button
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: "var(--color-text-muted)" }}
                            onClick={() => setSelected(rec)}
                            title="View"
                          >
                            <Eye size={14} />
                          </button>
                          {rec.status === "pending" && (
                            <>
                              <button
                                className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                                title="Reject"
                                onClick={() =>
                                  handleUpdateStatus(
                                    rec.reservation_id,
                                    "rejected",
                                  )
                                }
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div
            className="py-24 text-center"
            style={{ color: "var(--color-text-muted)" }}
          >
            <div className="mb-2">No records found.</div>
            <button
              className="text-xs text-blue-400 underline"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-lg animate-fade-in"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2
                className="font-bold text-lg"
                style={{ color: "var(--color-text-primary)" }}
              >
                {selected.reservation_id}
              </h2>
              <button
                onClick={() => setSelected(null)}
                style={{ color: "var(--color-text-muted)" }}
                className="text-xl hover:opacity-80"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {[
                ["Facility", selected.facility_name],
                ["Applicant", selected.applicant_name],
                ["Time Slot", selected.time_slot],
                [
                  "Event Date",
                  new Date(selected.reservation_date).toLocaleDateString(
                    "en-PH",
                  ),
                ],
                ["Status", selected.status],
                [
                  "Submitted",
                  new Date(selected.created_at).toLocaleString("en-PH"),
                ],
              ].map(([l, v]) => (
                <div
                  key={l}
                  className="flex justify-between py-2.5"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                >
                  <span
                    className="text-[10px] uppercase tracking-wider font-semibold"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {l}
                  </span>
                  <span
                    className="text-sm font-medium capitalize"
                    style={{
                      color:
                        l === "Status"
                          ? "var(--color-text-primary)"
                          : "var(--color-text-primary)",
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-8">
              {updating === selected.reservation_id ? (
                <div className="flex-1 flex justify-center py-2.5">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : (
                <>
                  {selected.status === "pending" && (
                    <>
                      <button
                        className="btn-danger flex-1 justify-center"
                        onClick={() =>
                          handleUpdateStatus(
                            selected.reservation_id,
                            "rejected",
                          )
                        }
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}
                  <button
                    className="btn-secondary flex-1 justify-center"
                    onClick={() => setSelected(null)}
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Reservation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>New Reservation Record</h2>
              <button onClick={() => setShowAddModal(false)} style={{ color: "var(--color-text-muted)" }} className="text-xl">✕</button>
            </div>
            <form onSubmit={handleCreateReservation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Facility *</label>
                  <select 
                    className="input-field" 
                    value={formData.facility_id} 
                    onChange={e => setFormData({...formData, facility_id: e.target.value})}
                  >
                    <option value="" disabled>Select Facility</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Applicant *</label>
                  <select 
                    className="input-field" 
                    value={formData.applicant_person_id} 
                    onChange={e => setFormData({...formData, applicant_person_id: e.target.value})}
                  >
                    <option value="" disabled>Select Constituent</option>
                    {constituents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Event Date *</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={formData.reservation_date} 
                  onChange={e => setFormData({...formData, reservation_date: e.target.value})}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Time Slot / Details *</label>
                <textarea 
                  className="input-field min-h-20" 
                  placeholder="e.g. 08:00-12:00 | Community meeting" 
                  value={formData.time_slot} 
                  onChange={e => setFormData({...formData, time_slot: e.target.value})}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button type="submit" className="btn-primary flex-1 justify-center py-2.5" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                  Record Reservation
                </button>
                <button type="button" className="btn-secondary flex-1 justify-center py-2.5" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
