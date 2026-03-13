// src/pages/punong_barangay/pending-approvals.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar as CalendarIcon, 
  User, 
  MapPin,
  Search
} from "lucide-react";

interface Reservation {
  reservation_id: string;
  applicant_person_id: string;
  barangay_facility: {
    facility_name: string;
  } | null;
  reservation_date: string;
  time_slot: string;
  status: "pending" | "confirmed" | "rejected" | "completed";
  created_at?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pending Review", color: "text-amber-500 bg-amber-500/10 border-amber-500/20", icon: Clock },
  confirmed: { label: "Confirmed", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-rose-500 bg-rose-500/10 border-rose-500/20", icon: XCircle },
  completed: { label: "Completed", color: "text-blue-500 bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
};

export default function PunongBarangayPendingApprovals() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = React.useCallback(async (isRefresh = false) => {
    if (isRefresh) setLoading(true);
    const { data, error } = await supabase
      .from("barangay_reservation_record")
      .select(`
        reservation_id,
        applicant_person_id,
        reservation_date,
        time_slot,
        status,
        created_at,
        barangay_facility (
          facility_name
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    console.log("Pending Reservations Data:", data);

    const typedData = (data as unknown as Reservation[]) || [];
    setReservations(typedData);
    if (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to fetch reservations");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function fetchOnMount() {
      const { data, error } = await supabase
        .from("barangay_reservation_record")
        .select(`
          reservation_id,
          applicant_person_id,
          reservation_date,
          time_slot,
          status,
          created_at,
          barangay_facility (
            facility_name
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (data) setReservations(data as unknown as Reservation[]);
      if (error) {
        console.error("Fetch Error:", error);
        toast.error("Failed to fetch reservations");
      }
      setLoading(false);
    }
    fetchOnMount();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "confirmed" | "rejected") => {
    const { error } = await supabase
      .from("barangay_reservation_record")
      .update({ 
        status: newStatus,
        approved_by_office: "OFF-004" // Hardcoded for PB office for now
      })
      .eq("reservation_id", id);

    if (error) {
      console.error("Update Error:", error);
      return toast.error(`Failed to ${newStatus}`);
    }
    
    setReservations((prev) => prev.filter((r) => r.reservation_id !== id));
    toast.success(`Reservation ${newStatus === "confirmed" ? "confirmed" : "rejected"}!`);
  };


  const filteredReservations = reservations.filter(r => 
    (r.reservation_id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (r.barangay_facility?.facility_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (r.applicant_person_id?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight" style={{ color: "var(--color-text-primary)" }}>
            Pending Approvals
          </h1>
          <p className="text-slate-500 mt-1" style={{ color: "var(--color-text-muted)" }}>
            Manage and review facility reservation requests
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Search reservations..."
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-64 shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            />
          </div>
          <button 
            onClick={() => fetchData(true)}
            className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            <Clock className="w-4 h-4 text-slate-600" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">Loading requests...</p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 flex flex-col items-center text-center shadow-sm" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900" style={{ color: "var(--color-text-primary)" }}>All caught up!</h3>
          <p className="text-slate-500 max-w-xs mt-1" style={{ color: "var(--color-text-muted)" }}>No pending reservations require your attention at this moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReservations.map((r) => (
            <div 
              key={r.reservation_id}
              className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
                    <MapPin className="w-6 h-6 text-blue-500 group-hover:text-white" />
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5 ${STATUS_CONFIG[r.status].color}`}>
                    {React.createElement(STATUS_CONFIG[r.status].icon, { className: "w-3 h-3" })}
                    {STATUS_CONFIG[r.status].label}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-1 lg:truncate" style={{ color: "var(--color-text-primary)" }}>
                  {r.barangay_facility?.facility_name || "Facility"}
                </h3>
                <div className="flex items-center text-slate-400 text-xs mb-4">
                  <span className="font-mono">ID: {r.reservation_id}</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm text-slate-600" style={{ color: "var(--color-text-muted)" }}>
                    <User className="w-4 h-4 opacity-50" />
                    <span className="truncate">Applicant: {r.applicant_person_id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600" style={{ color: "var(--color-text-muted)" }}>
                    <CalendarIcon className="w-4 h-4 opacity-50" />
                    <span>{new Date(r.reservation_date).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600" style={{ color: "var(--color-text-muted)" }}>
                    <Clock className="w-4 h-4 opacity-50" />
                    <span>{r.time_slot}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-50" style={{ borderTop: "1px solid var(--color-border)" }}>
                  <button 
                    onClick={() => handleUpdateStatus(r.reservation_id, "confirmed")}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirm
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(r.reservation_id, "rejected")}
                    className="px-4 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    title="Reject Request"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

