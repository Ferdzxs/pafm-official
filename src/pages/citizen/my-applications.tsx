import React, { useEffect, useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Application = {
  id: string;
  type: string;
  status: string;
  created_at: string;
};

export default function MyApplications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadApplications() {
      const all: Application[] = [];

      /* ───────── FACILITY RESERVATIONS ───────── */

      const { data: reservations, error: resErr } = await supabase
        .from("barangay_reservation_record")
        .select("reservation_id, status, created_at");

      if (resErr) {
        console.error("Error fetching reservations:", resErr);
      } else {
        reservations?.forEach((r: any) => {
          all.push({
            id: r.reservation_id,
            type: "Facility Reservation",
            status: r.status || "pending",
            created_at: r.created_at,
          });
        });
      }

      /* ───────── BURIAL APPLICATIONS ───────── */

      const { data: burial } = await supabase
        .from("burial_applications")
        .select("application_id, status, created_at");

      burial?.forEach((b: any) => {
        all.push({
          id: b.application_id,
          type: "Burial Application",
          status: b.status || "pending",
          created_at: b.created_at,
        });
      });

      /* ───────── UTILITY TICKETS ───────── */

      const { data: tickets } = await supabase
        .from("service_tickets")
        .select("ticket_id, service_type, status, created_at");

      tickets?.forEach((t: any) => {
        all.push({
          id: t.ticket_id,
          type: `Utility: ${t.service_type}`,
          status: t.status || "submitted",
          created_at: t.created_at,
        });
      });

      /* ───────── BARANGAY DOCUMENTS ───────── */

      const { data: docs } = await supabase
        .from("barangay_documents")
        .select("document_id, document_type, status, created_at");

      docs?.forEach((d: any) => {
        all.push({
          id: d.document_id,
          type: `Document: ${d.document_type}`,
          status: d.status || "processing",
          created_at: d.created_at,
        });
      });

  
      all.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      if (!ignore) {
        setApps(all);
        setLoading(false);
      }
    }

    loadApplications();
    return () => {
      ignore = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Loader2 className="animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">My Applications</h1>

      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 text-slate-400">
              <th className="text-left p-4">Application ID</th>
              <th className="text-left p-4">Service</th>
              <th className="text-left p-4">Date Submitted</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>

          <tbody>
            {apps.map((app) => (
              <tr
                key={app.id}
                className="border-t border-slate-700/30 hover:bg-white/5"
              >
                <td className="p-4 font-mono text-white">{app.id}</td>

                <td className="p-4 text-slate-300 flex gap-2 items-center">
                  <FileText size={14} />
                  {app.type}
                </td>

                <td className="p-4 text-slate-400">
                  {new Date(app.created_at).toLocaleDateString()}
                </td>

                <td className="p-4">
                  <StatusBadge status={app.status} />
                </td>
              </tr>
            ))}

            {apps.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center p-10 text-slate-500">
                  No applications submitted yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* STATUS UI */

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();

  if (s === "approved")
    return <span className="text-emerald-400">Approved</span>;

  if (s === "rejected") return <span className="text-red-400">Rejected</span>;

  if (s === "processing")
    return <span className="text-blue-400">Processing</span>;

  if (s === "completed")
    return <span className="text-green-400">Completed</span>;

  return <span className="text-yellow-400">Pending</span>;
}
