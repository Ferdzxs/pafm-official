import React, { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import toast from "react-hot-toast"
import { AlertCircle, CheckCircle2, FileText, Loader2, Upload } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"

const BUCKET_PARKS_DOCS = "parks-docs"

function normalizeParkStatus(s?: string | null) {
  if (!s) return "pending_loi"
  if (s === "pending") return "pending_loi"
  if (s === "approved") return "admin_approved"
  if (s === "rejected") return "admin_rejected"
  return s
}

export default function CitizenParkApplicationFormPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<any | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const status = useMemo(() => normalizeParkStatus(row?.status), [row?.status])
  const canSubmit = status === "application_form_issued" || status === "application_incomplete"

  useEffect(() => {
    if (!reservationId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, reservation_date, time_slot, status, application_form_doc, applicant_person_id, park_venue(park_venue_name)")
        .eq("reservation_id", reservationId)
        .maybeSingle()
      if (e) throw new Error(e.message)
      if (!data) throw new Error("Reservation not found.")
      setRow(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reservation.")
    } finally {
      setLoading(false)
    }
  }

  async function submit() {
    if (!reservationId) return
    if (!file) {
      toast.error("Please attach your application form (PDF or image).")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `application_forms/${reservationId}/${Date.now()}-${safeName}`
      const { error: upErr } = await supabase.storage.from(BUCKET_PARKS_DOCS).upload(path, file, { upsert: true })

      let fileUrl = ""
      if (!upErr) {
        const { data: urlData } = supabase.storage.from(BUCKET_PARKS_DOCS).getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }

      const docId = `DDOC-${Date.now()}`
      const { error: docErr } = await supabase.from("digital_document").insert({
        document_id: docId,
        document_type: "park_application_form",
        reference_no: `PAF-${reservationId}`,
        date_created: new Date().toISOString().split("T")[0],
        status: "active",
        created_by_office: null,
        received_by_employee: null,
        person_id: row?.applicant_person_id ?? null,
        file_url: fileUrl,
      })

      if (docErr) throw new Error(docErr.message)

      const { error: e2 } = await supabase
        .from("park_reservation_record")
        .update({ application_form_doc: docId, status: "application_submitted" })
        .eq("reservation_id", reservationId)
      if (e2) throw new Error(e2.message)

      toast.success("Application form submitted.")
      navigate("/citizen/applications")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit application form.")
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Park Application Form</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          BPMN Step 8 — Complete &amp; Submit Application
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200 flex items-start gap-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="glass rounded-2xl p-6" style={{ border: "1px solid rgba(148,163,184,0.1)" }}>
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="mb-5 text-sm text-foreground">
              <div className="text-xs text-muted-foreground">Reservation</div>
              <div className="font-semibold">
                {row?.reservation_id} · {row?.park_venue?.park_venue_name ?? "—"} · {row?.reservation_date}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Current status: <span className="font-semibold text-foreground">{status}</span>
              </div>
            </div>

            {!canSubmit ? (
              <div className="rounded-xl border border-border-subtle bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                This reservation is not currently accepting an application form. Please wait for the Reservation Desk to issue the form.
              </div>
            ) : (
              <>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Upload completed application form (PDF or image) *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="input-field"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-[11px] text-muted-foreground mt-2">
                  After submission, the Reservation Desk will validate completeness (BPMN Step 9).
                </p>

                <button
                  className="btn-primary w-full justify-center mt-5"
                  disabled={saving}
                  onClick={submit}
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin mr-2" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" />
                      Submit Application Form
                    </>
                  )}
                </button>
              </>
            )}

            {row?.application_form_doc && (
              <div className="mt-6 rounded-xl border border-border-subtle bg-muted/20 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
                <FileText size={14} />
                Application form already attached: <span className="font-mono">{row.application_form_doc}</span>
                <span className="ml-auto inline-flex items-center gap-1 text-state-success">
                  <CheckCircle2 size={14} /> received
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

