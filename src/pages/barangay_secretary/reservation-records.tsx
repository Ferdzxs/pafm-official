/**
 * Barangay Secretary — Reservation records & issue digital permit (BPMN step after PB approval).
 */
import React, { useCallback, useEffect, useState } from "react"
import {
  Search,
  Eye,
  Building2,
  Calendar,
  Loader2,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { formatBarangayReservationStatus } from "@/config/barangayCitizenWorkflow"
import { generateBarangayFacilityPermitPdfBlob } from "@/lib/barangayFacilityPermitPdf"

const BUCKET_DOCS = "parks-docs"

function genPermitDocId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `DDOC-BR-PERM-${crypto.randomUUID()}`
  }
  return `DDOC-BR-PERM-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

interface ReservationRecord {
  reservation_id: string
  facility_name: string
  applicant_name: string
  purpose: string
  time_slot: string
  reservation_date: string
  status: string
  created_at: string
  digital_permit_url: string | null
}

const STATUS_OPTIONS = [
  "all",
  "submitted",
  "awaiting_treasury",
  "order_of_payment_issued",
  "payment_pending",
  "pending_pb_approval",
  "pb_approved",
  "permit_issued",
  "completed",
  "returned_incomplete",
  "availability_failed",
  "pb_rejected",
  "pending",
  "confirmed",
  "rejected",
]

function statusBadgeClass(status: string) {
  const s = status.toLowerCase()
  if (s === "permit_issued" || s === "completed" || s === "confirmed") return "badge-approved"
  if (s === "pb_rejected" || s === "rejected" || s === "returned_incomplete" || s === "availability_failed")
    return "badge-rejected"
  if (s === "submitted" || s === "awaiting_treasury" || s === "order_of_payment_issued" || s === "payment_pending")
    return "badge-pending"
  return "badge-pending"
}

export default function BarangaySecretaryReservationRecords() {
  const [reservations, setReservations] = useState<ReservationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selected, setSelected] = useState<ReservationRecord | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("barangay_reservation_record")
        .select(
          `
          reservation_id,
          reservation_date,
          time_slot,
          status,
          purpose,
          created_at,
          digital_permit_url,
          barangay_facility ( facility_name ),
          person:applicant_person_id ( full_name )
        `,
        )
        .order("created_at", { ascending: false })

      if (error) throw error

      const formatted: ReservationRecord[] = (
        (data as {
          reservation_id: string
          reservation_date: string
          time_slot: string | null
          status: string
          purpose: string | null
          created_at: string
          digital_permit_url?: string | null
          barangay_facility: { facility_name: string } | { facility_name: string }[] | null
          person: { full_name: string } | { full_name: string }[] | null
        }[]) || []
      ).map(item => {
        const facility = Array.isArray(item.barangay_facility)
          ? item.barangay_facility[0]
          : item.barangay_facility
        const applicant = Array.isArray(item.person) ? item.person[0] : item.person
        return {
          reservation_id: item.reservation_id,
          facility_name: facility?.facility_name || "N/A",
          applicant_name: applicant?.full_name || "N/A",
          time_slot: item.time_slot ?? "—",
          reservation_date: item.reservation_date,
          status: item.status,
          purpose: (item.purpose ?? "").trim() || "—",
          created_at: item.created_at,
          digital_permit_url: item.digital_permit_url ?? null,
        }
      })

      setReservations(formatted)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to load"
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const issuePermit = async (id: string) => {
    setUpdating(id)
    let uploadedStoragePath: string | null = null
    let docIdForRollback: string | null = null
    try {
      const { data: row, error: fetchErr } = await supabase
        .from("barangay_reservation_record")
        .select(
          `
          reservation_id,
          applicant_person_id,
          reservation_date,
          time_slot,
          purpose,
          payment_id,
          barangay_facility ( facility_name ),
          person:applicant_person_id ( full_name, contact_number )
        `,
        )
        .eq("reservation_id", id)
        .eq("status", "pb_approved")
        .maybeSingle()

      if (fetchErr) throw fetchErr
      if (!row) {
        toast.error("Reservation not found or no longer awaiting permit issuance.")
        return
      }

      const r = row as {
        reservation_id: string
        applicant_person_id: string | null
        reservation_date: string
        time_slot: string | null
        purpose: string | null
        payment_id: string | null
        barangay_facility: { facility_name: string } | { facility_name: string }[] | null
        person: { full_name: string; contact_number: string | null } | { full_name: string; contact_number: string | null }[] | null
      }

      if (!r.applicant_person_id) {
        toast.error("Applicant profile (person_id) is missing.")
        return
      }

      const facility = Array.isArray(r.barangay_facility) ? r.barangay_facility[0] : r.barangay_facility
      const person = Array.isArray(r.person) ? r.person[0] : r.person

      let orNo: string | null = null
      if (r.payment_id) {
        const { data: pay } = await supabase
          .from("digital_payment")
          .select("digital_or_no")
          .eq("payment_id", r.payment_id)
          .maybeSingle()
        orNo = (pay as { digital_or_no?: string | null } | null)?.digital_or_no ?? null
      }

      const permitRefNo = `BFP-${r.reservation_id}`
      const issuedAtLabel = new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })

      const blob = generateBarangayFacilityPermitPdfBlob({
        reservationId: r.reservation_id,
        permitRefNo,
        facilityName: facility?.facility_name ?? "—",
        applicantName: person?.full_name ?? "—",
        applicantContact: person?.contact_number ?? null,
        purpose: (r.purpose ?? "").trim() || "—",
        reservationDate: r.reservation_date,
        timeSlot: r.time_slot ?? "—",
        issuedAtLabel,
        orNo,
      })

      const path = `barangay-permit/${r.reservation_id}/${Date.now()}-permit.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET_DOCS).upload(path, blob, {
        contentType: "application/pdf",
        upsert: true,
      })
      if (upErr) {
        const hint =
          /bucket not found/i.test(upErr.message) || /row-level security/i.test(upErr.message)
            ? " Run sql/supabase_storage_parks_docs.sql in Supabase."
            : ""
        throw new Error(`${upErr.message}${hint}`)
      }
      uploadedStoragePath = path

      const { data: urlData } = supabase.storage.from(BUCKET_DOCS).getPublicUrl(path)
      const fileUrl = urlData.publicUrl

      const docId = genPermitDocId()
      docIdForRollback = docId

      const { error: docErr } = await supabase.from("digital_document").insert({
        document_id: docId,
        document_type: "barangay_facility_permit",
        // Must differ from treasury OOP rows (reference_no = reservation_id) — unique constraint on reference_no
        reference_no: permitRefNo,
        date_created: new Date().toISOString().split("T")[0],
        status: "active",
        created_by_office: "OFF-004",
        received_by_employee: null,
        person_id: r.applicant_person_id,
        file_url: fileUrl,
      })
      if (docErr) throw new Error(`Could not save permit document: ${docErr.message}`)

      const { error: updErr } = await supabase
        .from("barangay_reservation_record")
        .update({
          status: "permit_issued",
          digital_permit_url: fileUrl,
          approved_by_office: "OFF-004",
        })
        .eq("reservation_id", id)
        .eq("status", "pb_approved")

      if (updErr) {
        await supabase.from("digital_document").delete().eq("document_id", docId)
        docIdForRollback = null
        throw new Error(updErr.message)
      }

      uploadedStoragePath = null
      docIdForRollback = null

      toast.success("Digital permit issued, uploaded, and linked to the citizen’s documents.")
      setReservations(prev =>
        prev.map(x => (x.reservation_id === id ? { ...x, status: "permit_issued", digital_permit_url: fileUrl } : x)),
      )
      setSelected(prev =>
        prev?.reservation_id === id
          ? { ...prev, status: "permit_issued", digital_permit_url: fileUrl }
          : prev,
      )
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to issue permit")
    } finally {
      if (uploadedStoragePath) {
        await supabase.storage.from(BUCKET_DOCS).remove([uploadedStoragePath])
      }
      if (docIdForRollback) {
        await supabase.from("digital_document").delete().eq("document_id", docIdForRollback)
      }
      setUpdating(null)
    }
  }

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase()
    const matches =
      !q ||
      r.reservation_id.toLowerCase().includes(q) ||
      r.applicant_name.toLowerCase().includes(q) ||
      r.facility_name.toLowerCase().includes(q) ||
      r.purpose.toLowerCase().includes(q)
    const st = statusFilter === "all" || r.status === statusFilter
    return matches && st
  })

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 font-medium">Loading records...</p>
      </div>
    )
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Reservation records
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            Track facility reservations and issue the digital permit after Punong Barangay approval.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          {
            label: "Awaiting permit",
            count: reservations.filter(r => r.status === "pb_approved").length,
            color: "#fbbf24",
          },
          {
            label: "Permit issued",
            count: reservations.filter(r => ["permit_issued", "completed", "confirmed"].includes(r.status)).length,
            color: "#34d399",
          },
          {
            label: "In pipeline",
            count: reservations.filter(r =>
              ["submitted", "awaiting_treasury", "order_of_payment_issued", "payment_pending", "pending_pb_approval"].includes(
                r.status,
              ),
            ).length,
            color: "#60a5fa",
          },
          { label: "Total", count: reservations.length, color: "#a78bfa" },
        ].map(s => (
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
            <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-row items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--color-text-muted)" }}
          />
          <input
            className="input-field pl-10"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field flex-1 max-w-xs"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          {STATUS_OPTIONS.map(s => (
            <option key={s} value={s}>
              {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div
        className="rounded-2xl overflow-hidden shadow-sm"
        style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  background: "var(--color-bg-hover)",
                }}
              >
                {["ID", "Facility", "Applicant", "Purpose", "Date", "Slot", "Status", "Actions"].map(h => (
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
              {filtered.map(rec => (
                <tr
                  key={rec.reservation_id}
                  className="transition-colors cursor-pointer group"
                  style={{ borderBottom: "1px solid var(--color-border)" }}
                  onClick={() => setSelected(rec)}
                >
                  <td className="px-4 py-3 text-sm font-mono" style={{ color: "#e879f9" }}>
                    {rec.reservation_id}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-primary)" }}>
                    <div className="flex items-center gap-2">
                      <Building2 size={13} style={{ color: "var(--color-text-muted)" }} /> {rec.facility_name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                    {rec.applicant_name}
                  </td>
                  <td
                    className="px-4 py-3 text-sm max-w-48 truncate"
                    title={rec.purpose}
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {rec.purpose}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-muted)" }}>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} /> {new Date(rec.reservation_date).toLocaleDateString("en-PH")}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-32 truncate" style={{ color: "var(--color-text-muted)" }}>
                    {rec.time_slot}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusBadgeClass(rec.status)}`}
                    >
                      {formatBarangayReservationStatus(rec.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {updating === rec.reservation_id ? (
                        <Loader2 size={14} className="animate-spin text-blue-500 m-1.5" />
                      ) : (
                        <>
                          <button
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: "var(--color-text-muted)" }}
                            onClick={() => setSelected(rec)}
                            title="View"
                            type="button"
                          >
                            <Eye size={14} />
                          </button>
                          {rec.status === "pb_approved" && (
                            <button
                              type="button"
                              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors text-xs font-semibold"
                              title="Issue permit"
                              onClick={() => void issuePermit(rec.reservation_id)}
                            >
                              <CheckCircle size={14} />
                            </button>
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
          <div className="py-24 text-center" style={{ color: "var(--color-text-muted)" }}>
            <div className="mb-2">No records found.</div>
            <button
              type="button"
              className="text-xs text-blue-400 underline"
              onClick={() => {
                setSearch("")
                setStatusFilter("all")
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

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
              <h2 className="font-bold text-lg" style={{ color: "var(--color-text-primary)" }}>
                {selected.reservation_id}
              </h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ color: "var(--color-text-muted)" }}
                className="text-xl hover:opacity-80"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1">
              {(
                [
                  ["Facility", selected.facility_name],
                  ["Applicant", selected.applicant_name],
                  ["Purpose", selected.purpose],
                  ["Time slot", selected.time_slot],
                  ["Event date", new Date(selected.reservation_date).toLocaleDateString("en-PH")],
                  ["Status", formatBarangayReservationStatus(selected.status)],
                  ["Submitted", new Date(selected.created_at).toLocaleString("en-PH")],
                ] as const
              ).map(([l, v]) => (
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
                  <span className="text-sm font-medium text-right max-w-[60%]">{v}</span>
                </div>
              ))}
              {selected.status === "permit_issued" && selected.digital_permit_url && (
                <div className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2">
                    Digital permit file
                  </p>
                  <a
                    href={selected.digital_permit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                  >
                    <ExternalLink size={16} />
                    Open permit PDF
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-8">
              {selected.status === "pb_approved" && (
                <button
                  type="button"
                  className="btn-primary flex-1 justify-center"
                  disabled={updating === selected.reservation_id}
                  onClick={() => void issuePermit(selected.reservation_id)}
                >
                  {updating === selected.reservation_id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      <CheckCircle size={14} /> Issue digital permit
                    </>
                  )}
                </button>
              )}
              <button type="button" className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
