import { supabase } from "@/lib/supabase";
import { Archive, BarChart3, Building2, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Reservation {
  reservation_id: string;
  citizen_name: string;
  facility_name: string;
  event_date: string;
  status: string;
}

interface Document {
  document_id: string;
  document_type: string;
  issued_to: string;
  status: string;
  created_at: string;
}

interface BurialApp {
  application_id: string;
  applicant_name: string;
  deceased_name: string;
  date_of_death: string;
  status: string;
  created_at: string;
}

export default function BarangaySecretaryReports() {
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [burialApps, setBurialApps] = useState<BurialApp[]>([]);
  const [stats, setStats] = useState({
    totalReservations: 0,
    pendingReservations: 0,
    approvedReservations: 0,
    forwardedToPB: 0,
    totalDocuments: 0,
    totalBurials: 0,
    citizens: 0,
  });
  const isMounted = useRef(true);

  const loadReports = useCallback(async () => {
    try {
      const [
        { data: resData, error: resErr },
        { data: docData, error: docErr },
        { data: burialData, error: burialErr },
        { count: citizenCount, error: citizenErr },
      ] = await Promise.all([
        supabase
          .from("barangay_reservation_record")
          .select(
            `
            reservation_id,
            status,
            created_at,
            reservation_date,
            purpose,
            barangay_facility ( facility_name ),
            constituent_records ( full_name )
          `,
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("barangay_documents")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("burial_applications")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("constituent_records")
          .select("*", { count: "exact", head: true }),
      ]);

      if (resErr) throw resErr;
      if (docErr) throw docErr;
      if (burialErr) throw burialErr;
      if (citizenErr) throw citizenErr;

      if (isMounted.current) {
        const formattedReservations: Reservation[] = (resData || []).map(
          (r) => {
            const facility = Array.isArray(r.barangay_facility) ? r.barangay_facility[0] : r.barangay_facility;
            const constituent = Array.isArray(r.constituent_records) ? r.constituent_records[0] : r.constituent_records;
            return {
              reservation_id: r.reservation_id,
              citizen_name: constituent?.full_name || "N/A",
              facility_name: facility?.facility_name || "N/A",
              event_date: r.reservation_date || "",
              status: r.status,
            };
          },
        );

        const formattedDocuments: Document[] = (docData || []).map(
          (d: {
            document_id: string;
            document_type: string;
            recipient_name: string | null;
            status: string;
            created_at: string;
          }) => ({
            document_id: d.document_id,
            document_type: d.document_type,
            issued_to: d.recipient_name || "N/A",
            status: d.status,
            created_at: d.created_at,
          }),
        );

        setReservations(formattedReservations);
        setDocuments(formattedDocuments);
        setBurialApps(burialData || []);

        setStats({
          totalReservations: formattedReservations.length,
          pendingReservations: formattedReservations.filter(
            (r) => r.status === "pending",
          ).length,
          approvedReservations: formattedReservations.filter(
            (r) => r.status === "confirmed" || r.status === "approved",
          ).length,
          forwardedToPB: formattedReservations.filter(
            (r) => r.status === "forwarded",
          ).length,
          totalDocuments: formattedDocuments.length,
          totalBurials: (burialData || []).length,
          citizens: citizenCount || 0,
        });
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading reports:", error);
      if (isMounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    loadReports();
    return () => {
      isMounted.current = false;
    };
  }, [loadReports]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="animate-spin text-blue-400" />
      </div>
    );
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: "text-yellow-400",
    approved: "text-emerald-400",
    confirmed: "text-emerald-400",
    rejected: "text-red-400",
    forwarded: "text-purple-400",
    forwarded_to_pb: "text-purple-400",
    completed: "text-blue-400",
    processing: "text-blue-400",
    released: "text-green-400",
    draft: "text-slate-400",
    filed: "text-blue-400",
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 size={22} /> Barangay Reports
      </h1>

      {/* STAT CARDS */}
      <div className="grid md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Reservations",
            value: stats.totalReservations,
            color: "#60a5fa",
          },
          {
            label: "Pending Review",
            value: stats.pendingReservations,
            color: "#fbbf24",
          },
          {
            label: "Forwarded to PB",
            value: stats.forwardedToPB,
            color: "#a78bfa",
          },
          {
            label: "Approved",
            value: stats.approvedReservations,
            color: "#34d399",
          },
          {
            label: "Documents Issued",
            value: stats.totalDocuments,
            color: "#60a5fa",
          },
          {
            label: "Burial Applications",
            value: stats.totalBurials,
            color: "#fb923c",
          },
          {
            label: "Registered Citizens",
            value: stats.citizens,
            color: "#e879f9",
          },
        ].map((s) => (
          <div key={s.label} className="glass p-5 rounded-xl">
            <div className="text-slate-400 text-xs mb-1">{s.label}</div>
            <div className="text-2xl font-bold" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* RESERVATION REPORT */}
      <div className="glass rounded-2xl overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-700/40 text-white font-semibold flex items-center gap-2">
          <Building2 size={18} /> Reservation Records (latest 15)
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700/40">
              {[
                "Reservation ID",
                "Citizen",
                "Facility",
                "Event Date",
                "Status",
              ].map((h) => (
                <th key={h} className="p-4 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reservations.slice(0, 15).map((r) => (
              <tr
                key={r.reservation_id}
                className="border-t border-slate-700/30 hover:bg-white/5"
              >
                <td className="p-4 font-mono text-white text-xs">
                  {r.reservation_id}
                </td>
                <td className="p-4 text-slate-300">{r.citizen_name || "—"}</td>
                <td className="p-4 text-slate-300">{r.facility_name || "—"}</td>
                <td className="p-4 text-slate-400">
                  {r.event_date
                    ? new Date(r.event_date).toLocaleDateString("en-PH")
                    : "—"}
                </td>
                <td className="p-4">
                  <span
                    className={`capitalize text-xs ${STATUS_COLOR[r.status] || "text-slate-400"}`}
                  >
                    {r.status === "forwarded_to_pb"
                      ? "For PB Approval"
                      : r.status}
                  </span>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <Building2 size={28} className="mx-auto mb-2 opacity-20" />
                  No reservation records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* DOCUMENT REPORT */}
      <div className="glass rounded-2xl overflow-hidden mb-8">
        <div className="p-4 border-b border-slate-700/40 text-white font-semibold flex items-center gap-2">
          <FileText size={18} /> Barangay Documents (latest 10)
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700/40">
              {["Document ID", "Type", "Issued To", "Status", "Date"].map(
                (h) => (
                  <th key={h} className="p-4 text-left">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {documents.slice(0, 10).map((d) => (
              <tr
                key={d.document_id}
                className="border-t border-slate-700/30 hover:bg-white/5"
              >
                <td className="p-4 font-mono text-white text-xs">
                  {d.document_id}
                </td>
                <td className="p-4 text-slate-300">{d.document_type}</td>
                <td className="p-4 text-slate-400">{d.issued_to || "—"}</td>
                <td className="p-4">
                  <span
                    className={`capitalize text-xs ${STATUS_COLOR[d.status] || "text-slate-400"}`}
                  >
                    {d.status}
                  </span>
                </td>
                <td className="p-4 text-slate-400">
                  {new Date(d.created_at).toLocaleDateString("en-PH")}
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <FileText size={28} className="mx-auto mb-2 opacity-20" />
                  No documents have been filed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BURIAL REPORT */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/40 text-white font-semibold flex items-center gap-2">
          <Archive size={18} /> Burial Applications (latest 10)
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700/40">
              {[
                "App. ID",
                "Applicant",
                "Deceased",
                "Date of Death",
                "Status",
              ].map((h) => (
                <th key={h} className="p-4 text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {burialApps.slice(0, 10).map((b) => (
              <tr
                key={b.application_id}
                className="border-t border-slate-700/30 hover:bg-white/5"
              >
                <td className="p-4 font-mono text-white text-xs">
                  {b.application_id}
                </td>
                <td className="p-4 text-slate-300">{b.applicant_name}</td>
                <td className="p-4 text-slate-300">{b.deceased_name}</td>
                <td className="p-4 text-slate-400">
                  {new Date(b.date_of_death).toLocaleDateString("en-PH")}
                </td>
                <td className="p-4">
                  <span
                    className={`capitalize text-xs ${STATUS_COLOR[b.status] || "text-slate-400"}`}
                  >
                    {b.status}
                  </span>
                </td>
              </tr>
            ))}
            {burialApps.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-500">
                  <Archive size={28} className="mx-auto mb-2 opacity-20" />
                  No burial applications on record.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
