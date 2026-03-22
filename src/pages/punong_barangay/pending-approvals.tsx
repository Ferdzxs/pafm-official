// Punong Barangay — approvals after secretary intake and treasury (when fee applies). Queue: pending_pb_approval
import React, { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import toast from "react-hot-toast"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar as CalendarIcon,
  User,
  MapPin,
  Search,
} from "lucide-react"
import { formatBarangayReservationStatus } from "@/config/barangayCitizenWorkflow"

/** Barangay Secretariat / Punong Barangay office (see init_db government_office). */
const BARANGAY_OFFICE_ID = "OFF-004"

interface Reservation {
  reservation_id: string
  applicant_person_id: string
  purpose: string | null
  barangay_facility: { facility_name: string } | null
  person: { full_name: string } | null
  reservation_date: string
  time_slot: string
  status: string
  created_at?: string
}

export default function PunongBarangayPendingApprovals() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("barangay_reservation_record")
      .select(
        `
        reservation_id,
        applicant_person_id,
        reservation_date,
        time_slot,
        status,
        purpose,
        created_at,
        barangay_facility ( facility_name ),
        person:applicant_person_id ( full_name )
      `,
      )
      .eq("status", "pending_pb_approval")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Fetch Error:", error)
      toast.error("Failed to fetch reservations")
    }
    setReservations((data as unknown as Reservation[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const handleDecision = async (id: string, approve: boolean) => {
    const today = new Date().toISOString().split("T")[0]
    const approvalId = `BRA-${Date.now()}`
    const newStatus = approve ? "pb_approved" : "pb_rejected"

    const { error: uErr } = await supabase
      .from("barangay_reservation_record")
      .update({
        status: newStatus,
        approved_by_office: BARANGAY_OFFICE_ID,
      })
      .eq("reservation_id", id)
      .eq("status", "pending_pb_approval")

    if (uErr) {
      console.error("Update Error:", uErr)
      return toast.error(uErr.message)
    }

    const { error: aErr } = await supabase.from("barangay_reservation_approval").insert({
      approval_id: approvalId,
      reservation_id: id,
      approved_by_office: BARANGAY_OFFICE_ID,
      approved_by_employee: null,
      approval_date: today,
      decision: approve ? "approved" : "rejected",
      remarks: null,
    })
    if (aErr) console.warn("Approval log insert:", aErr.message)

    setReservations(prev => prev.filter(r => r.reservation_id !== id))
    toast.success(approve ? "Approved. Secretary may now issue the digital permit." : "Reservation declined.")
  }

  const filteredReservations = reservations.filter(
    r =>
      (r.reservation_id?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (r.barangay_facility?.facility_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (r.person?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Pending approvals
          </h1>
          <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
            Facility reservations ready for Punong Barangay decision (after secretary intake and payment when required).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              className="pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64 shadow-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => void fetchData()}
            className="p-2 rounded-xl shadow-sm"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            <Clock className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="font-medium animate-pulse" style={{ color: "var(--color-text-muted)" }}>
            Loading requests...
          </p>
        </div>
      ) : filteredReservations.length === 0 ? (
        <div
          className="rounded-3xl p-12 border flex flex-col items-center text-center shadow-sm"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
        >
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-slate-300" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            All caught up
          </h3>
          <p className="max-w-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            No reservations await Punong Barangay approval.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReservations.map(r => (
            <div
              key={r.reservation_id}
              className="group rounded-3xl overflow-hidden border transition-all duration-300 hover:border-blue-500/30 hover:shadow-xl"
              style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <MapPin className="w-6 h-6 text-blue-500 group-hover:text-white" />
                  </div>
                  <div className="px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider text-amber-600 bg-amber-500/10 border-amber-500/20 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    {formatBarangayReservationStatus(r.status)}
                  </div>
                </div>

                <h3
                  className="text-lg font-bold mb-1 lg:truncate"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {r.barangay_facility?.facility_name || "Facility"}
                </h3>
                <div className="flex items-center text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
                  <span className="font-mono">ID: {r.reservation_id}</span>
                </div>

                {r.purpose && (
                  <p className="text-xs mb-4 line-clamp-3" style={{ color: "var(--color-text-muted)" }}>
                    {r.purpose}
                  </p>
                )}

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <User className="w-4 h-4 opacity-50 shrink-0" />
                    <span className="truncate">{r.person?.full_name ?? r.applicant_person_id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <CalendarIcon className="w-4 h-4 opacity-50 shrink-0" />
                    <span>{new Date(r.reservation_date).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <Clock className="w-4 h-4 opacity-50 shrink-0" />
                    <span>{r.time_slot}</span>
                  </div>
                </div>

                <div
                  className="flex items-center gap-3 pt-4 border-t"
                  style={{ borderTop: "1px solid var(--color-border)" }}
                >
                  <button
                    type="button"
                    onClick={() => void handleDecision(r.reservation_id, true)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecision(r.reservation_id, false)}
                    className="px-4 bg-rose-50 hover:bg-rose-100 text-rose-500 font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center"
                    title="Decline"
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
  )
}
