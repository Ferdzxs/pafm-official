// src/pages/punong_barangay/pending-approvals.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

type Reservation = {
  id: string;
  user_id: string;
  facility_name: string;
  event_name: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  status: "pending" | "approved" | "rejected" | "completed";
};

const STATUS_BADGE: Record<
  string,
  "warning" | "success" | "destructive" | "secondary"
> = {
  pending: "warning",
  approved: "success",
  rejected: "destructive",
  completed: "success",
};

export default function PunongBarangayPendingApprovals() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPending = async () => {
      const { data, error } = await supabase
        .from("facility_reservations")
        .select("*")
        .eq("status", "pending")
        .order("reservation_date", { ascending: true });

      if (error) toast.error("Failed to fetch reservations");
      if (data) setReservations(data as Reservation[]);
      setLoading(false);
    };
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    const { error } = await supabase
      .from("facility_reservations")
      .update({ status: "approved" })
      .eq("id", id);
    if (error) return toast.error("Failed to approve");
    setReservations((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reservation approved!");
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase
      .from("facility_reservations")
      .update({ status: "rejected" })
      .eq("id", id);
    if (error) return toast.error("Failed to reject");
    setReservations((prev) => prev.filter((r) => r.id !== id));
    toast.success("Reservation rejected!");
  };

  if (loading)
    return (
      <div className="text-center py-10">Loading pending reservations…</div>
    );

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Pending Reservations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review reservations submitted by citizens for final approval.
        </p>
      </div>

      <div
        className="glass rounded-2xl p-6 overflow-x-auto"
        style={{ border: "1px solid rgba(148,163,184,0.1)" }}
      >
        {reservations.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            No pending reservations found.
          </p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  ID
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Citizen ID
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Facility
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Event
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Date
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Time
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Status
                </th>
                <th className="text-xs font-semibold text-slate-400 uppercase tracking-wide pb-2">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr
                  key={r.id}
                  className="hover:bg-accent rounded-lg transition-colors"
                >
                  <td className="py-2 text-sm text-foreground">{r.id}</td>
                  <td className="py-2 text-sm text-foreground">{r.user_id}</td>
                  <td className="py-2 text-sm text-foreground">
                    {r.facility_name}
                  </td>
                  <td className="py-2 text-sm text-foreground">
                    {r.event_name}
                  </td>
                  <td className="py-2 text-sm text-foreground">
                    {r.reservation_date}
                  </td>
                  <td className="py-2 text-sm text-foreground">
                    {r.start_time} - {r.end_time}
                  </td>
                  <td className="py-2 text-sm">
                    <Badge
                      variant={STATUS_BADGE[r.status]}
                      className="text-[10px] px-2 py-1"
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-2 text-sm flex gap-2">
                    <button
                      className="btn-primary btn-sm"
                      onClick={() => handleApprove(r.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn-destructive btn-sm"
                      onClick={() => handleReject(r.id)}
                    >
                      Reject
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
