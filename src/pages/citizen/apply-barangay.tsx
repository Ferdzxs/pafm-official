/**
 * Barangay facility reservation — Citizen (BPMN: submit facility, date, purpose, upload ID).
 */
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  Home,
  Loader2,
  Upload,
  User,
} from "lucide-react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import toast from "react-hot-toast"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { getCitizenPersonIdForSession } from "@/lib/citizenBpmIdentity"
import {
  BPM_PERSON_SELECT_MINIMAL,
  computePersonFullName,
  profileDisplayName,
} from "@/lib/citizenProfileDisplay"
import { BARANGAY_SCHEDULE_BLOCKING_STATUSES } from "@/config/barangayCitizenWorkflow"
import { cn } from "@/lib/utils"

const BUCKET_DOCS = "parks-docs"

type Step = 1 | 2 | 3

const TIME_SLOTS = [
  { id: "slot1", label: "08:00 AM - 10:00 AM", value: "08:00-10:00" },
  { id: "slot2", label: "10:00 AM - 12:00 PM", value: "10:00-12:00" },
  { id: "slot3", label: "01:00 PM - 03:00 PM", value: "13:00-15:00" },
  { id: "slot4", label: "03:00 PM - 05:00 PM", value: "15:00-17:00" },
  { id: "slot5", label: "06:00 PM - 08:00 PM", value: "18:00-20:00" },
]

const PURPOSE_QUICK_FILLS = [
  "Barangay assembly / public meeting",
  "Wedding reception / social event",
  "Birthday / family gathering",
  "Livelihood training / seminar",
  "Religious activity",
  "Sports / recreational use",
  "Government / NGO activity",
  "Health / vaccination / medical mission",
] as const

function buildNextDateOptions(days: number): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  for (let i = 1; i <= days; i++) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString("en-PH", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    })
    out.push({ value: iso, label })
  }
  return out
}

function genReservationId() {
  return `BRR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
}

function genDocumentId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `DDOC-BR-${crypto.randomUUID()}`
  }
  return `DDOC-BR-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type FacilityRow = {
  barangay_facility_id: string
  facility_name: string
  rental_rate: number | null
}

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 text-foreground">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="pt-4 space-y-4 border-t border-border">{children}</div>
    </section>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground leading-snug">
      {children}
      {required && (
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

export default function ApplyBarangayFacility() {
  const { user } = useAuth()
  const personMerged = useRef(false)
  const [purposeQuickKey, setPurposeQuickKey] = useState(0)
  const dateOptions = useMemo(() => buildNextDateOptions(21), [])
  const [step, setStep] = useState<Step>(1)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [reservationId, setReservationId] = useState("")
  const [facilities, setFacilities] = useState<FacilityRow[]>([])
  const [loadingFacilities, setLoadingFacilities] = useState(true)
  const [idFile, setIdFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)

  const [form, setForm] = useState({
    applicant_name: "",
    applicant_contact: "",
    facility_id: "",
    reservation_date: "",
    time_slot: "",
    purpose: "",
  })

  const update = useCallback((k: string, v: string) => setForm(prev => ({ ...prev, [k]: v })), [])

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from("barangay_facility")
        .select("barangay_facility_id, facility_name, rental_rate")
        .order("facility_name")
      if (error) console.error("Facilities:", error.message)
      setFacilities((data as FacilityRow[]) ?? [])
      setLoadingFacilities(false)
    })()
  }, [])

  useEffect(() => {
    if (!user?.is_citizen || personMerged.current) return
    let cancelled = false
    void (async () => {
      const pid = await getCitizenPersonIdForSession(supabase, user)
      if (!pid || cancelled) return
      const { data, error } = await supabase
        .from("person")
        .select(BPM_PERSON_SELECT_MINIMAL)
        .eq("person_id", pid)
        .maybeSingle()
      if (cancelled || error || !data) return
      personMerged.current = true
      const row = data as unknown as Record<string, unknown>
      const full =
        (typeof row.full_name === "string" && row.full_name.trim()) ||
        computePersonFullName(row) ||
        profileDisplayName(row, user.email ?? "")
      const contact =
        typeof row.contact_number === "string" && row.contact_number.trim()
          ? row.contact_number.trim()
          : ""
      setForm(prev => ({
        ...prev,
        applicant_name: prev.applicant_name.trim() || full,
        applicant_contact: prev.applicant_contact.trim() || contact,
      }))
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const selectedFacility = facilities.find(f => f.barangay_facility_id === form.facility_id)

  const handleSubmit = async () => {
    if (!user?.is_citizen) {
      toast.error("Sign in with a citizen account to submit a reservation.")
      return
    }
    if (!idFile) {
      toast.error("Upload a valid government-issued ID (PDF or image).")
      return
    }
    setSubmitting(true)
    let uploadedStoragePath: string | null = null
    let docIdForRollback: string | null = null
    try {
      const personId = await getCitizenPersonIdForSession(supabase, user)
      if (!personId) {
        toast.error("Could not link your profile (person_id). Sign out and sign in again.")
        return
      }

      const { data: taken } = await supabase
        .from("barangay_reservation_record")
        .select("reservation_id, status")
        .eq("barangay_facility_id", form.facility_id)
        .eq("reservation_date", form.reservation_date)
        .eq("time_slot", form.time_slot)
        .in("status", BARANGAY_SCHEDULE_BLOCKING_STATUSES)

      if (taken && taken.length > 0) {
        toast.error("This facility is already reserved for that schedule.")
        return
      }

      const id = genReservationId()
      const ext = idFile.name.split(".").pop()?.toLowerCase() || "jpg"
      const safeExt = ["pdf", "png", "jpg", "jpeg", "webp"].includes(ext) ? ext : "jpg"
      const path = `barangay-id/${id}/${Date.now()}-id.${safeExt}`
      const contentType =
        safeExt === "pdf"
          ? "application/pdf"
          : safeExt === "png"
            ? "image/png"
            : safeExt === "webp"
              ? "image/webp"
              : "image/jpeg"

      const { error: upErr } = await supabase.storage.from(BUCKET_DOCS).upload(path, idFile, {
        contentType,
        upsert: true,
      })
      if (upErr) {
        const hint =
          /bucket not found/i.test(upErr.message)
            ? " Run sql/supabase_storage_parks_docs.sql in Supabase."
            : /row-level security/i.test(upErr.message)
              ? " Ensure storage policies allow uploads (same SQL file)."
              : ""
        throw new Error(`${upErr.message}${hint}`)
      }
      uploadedStoragePath = path
      const { data: urlData } = supabase.storage.from(BUCKET_DOCS).getPublicUrl(path)
      const fileUrl = urlData.publicUrl

      const docId = genDocumentId()
      docIdForRollback = docId
      const refNo = `ID-${id}-${Date.now()}`
      const { error: docErr } = await supabase.from("digital_document").insert({
        document_id: docId,
        document_type: "barangay_valid_id",
        reference_no: refNo,
        date_created: new Date().toISOString().split("T")[0],
        status: "active",
        created_by_office: null,
        received_by_employee: null,
        person_id: personId,
        file_url: fileUrl,
      })
      if (docErr) {
        const hint =
          /row-level security|violates row-level security/i.test(docErr.message)
            ? " Ask your admin to allow anon inserts on digital_document (see sql/barangay_facility_rls_notes.sql)."
            : /unique|duplicate key/i.test(docErr.message)
              ? " Reference number conflict — try submitting again."
              : ""
        throw new Error(`Could not save ID document record: ${docErr.message}.${hint}`)
      }

      const { error: insErr } = await supabase.from("barangay_reservation_record").insert({
        reservation_id: id,
        barangay_facility_id: form.facility_id,
        applicant_person_id: personId,
        reservation_date: form.reservation_date,
        time_slot: form.time_slot,
        status: "submitted",
        purpose: form.purpose.trim() || null,
        request_slip_doc: docId,
      })
      if (insErr) {
        await supabase.from("digital_document").delete().eq("document_id", docId)
        docIdForRollback = null
        const hint =
          /row-level security|violates row-level security/i.test(insErr.message)
            ? " Ask your admin to allow inserts on barangay_reservation_record for citizens."
            : ""
        throw new Error(`Could not save reservation: ${insErr.message}.${hint}`)
      }

      uploadedStoragePath = null
      docIdForRollback = null

      setReservationId(id)
      setSubmitted(true)
      toast.success("Reservation submitted.")
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submission failed."
      toast.error(msg)
    } finally {
      if (uploadedStoragePath) {
        await supabase.storage.from(BUCKET_DOCS).remove([uploadedStoragePath])
      }
      if (docIdForRollback) {
        await supabase.from("digital_document").delete().eq("document_id", docIdForRollback)
      }
      setSubmitting(false)
    }
  }

  const resetAfterSuccess = () => {
    setSubmitted(false)
    setReservationId("")
    setIdFile(null)
    setFileInputKey(k => k + 1)
    setStep(1)
    setPurposeQuickKey(k => k + 1)
  }

  if (!user) return null

  if (submitted)
    return (
      <div className="px-4 py-8 sm:px-6 lg:px-8 animate-fade-in flex items-center justify-center min-h-[75vh] text-foreground">
        <div className="w-full max-w-lg text-center rounded-2xl border border-border bg-card p-8 shadow-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--state-success-soft)] border border-[color:var(--state-success)]/35">
            <CheckCircle size={32} className="text-[color:var(--state-success)]" aria-hidden />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Request received</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-balance">
            Your barangay facility reservation is queued for the Barangay Secretary (intake and availability check), then
            Punong Barangay approval when applicable.
          </p>
          {reservationId && (
            <div className="mt-5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reservation ID</p>
              <p className="font-mono text-sm font-semibold text-foreground mt-0.5 break-all">{reservationId}</p>
            </div>
          )}
          <div className="mt-5 rounded-lg border border-border text-left space-y-2 px-4 py-3 text-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requirements on file</p>
            <ul className="space-y-1.5 text-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[color:var(--state-success)] shrink-0" />
                Applicant contact: {form.applicant_contact || "—"}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[color:var(--state-success)] shrink-0" />
                Facility: {selectedFacility?.facility_name ?? form.facility_id}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[color:var(--state-success)] shrink-0" />
                Date &amp; time: {form.reservation_date}{" "}
                {TIME_SLOTS.find(s => s.value === form.time_slot)?.label ?? form.time_slot}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[color:var(--state-success)] shrink-0" />
                Purpose: {form.purpose.trim() ? form.purpose.trim().slice(0, 80) + (form.purpose.length > 80 ? "…" : "") : "—"}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[color:var(--state-success)] shrink-0" />
                Valid ID uploaded (digital record)
              </li>
            </ul>
          </div>
          <button type="button" className="btn-primary w-full justify-center mt-8" onClick={resetAfterSuccess}>
            Submit another request
          </button>
        </div>
      </div>
    )

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 animate-fade-in pb-14 text-foreground">
      <header className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Home size={12} className="text-primary shrink-0" aria-hidden />
            Barangay facility
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          Facility reservation
        </h1>
        <p className="text-sm sm:text-base mt-2 text-muted-foreground max-w-lg leading-relaxed text-balance">
          Select a facility and schedule, describe your purpose, and upload a valid ID. Staff will validate, check the
          calendar, and route fees and approval per BPMN.
        </p>
      </header>

      <nav
        className="mb-8 flex rounded-xl border border-border bg-muted/40 p-1 gap-1"
        aria-label="Steps"
      >
        {[
          { n: 1 as Step, t: "Applicant" },
          { n: 2 as Step, t: "Schedule & purpose" },
          { n: 3 as Step, t: "ID & submit" },
        ].map(s => (
          <button
            key={s.n}
            type="button"
            onClick={() => {
              if (s.n < step) setStep(s.n)
            }}
            className={cn(
              "flex flex-1 flex-col sm:flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 px-2 text-center transition-colors",
              step === s.n
                ? "bg-card text-foreground shadow-sm border border-border"
                : "text-muted-foreground",
              s.n < step && "cursor-pointer hover:bg-muted/80",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                step === s.n
                  ? "bg-primary text-primary-foreground"
                  : step > s.n
                    ? "bg-[color:var(--state-success-soft)] text-[color:var(--state-success)] border border-[color:var(--state-success)]/30"
                    : "bg-card border border-border text-muted-foreground",
              )}
            >
              {step > s.n ? <CheckCircle className="h-3.5 w-3.5" /> : s.n}
            </span>
            <span
              className={cn(
                "text-[11px] sm:text-xs font-medium leading-tight",
                step === s.n ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.t}
            </span>
          </button>
        ))}
      </nav>

      <div className="space-y-6">
        {step === 1 && (
          <FormSection icon={User} title="Applicant" description="Contact details for this reservation.">
            <div className="space-y-2">
              <FieldLabel required>Full name</FieldLabel>
              <input
                className="input-field"
                value={form.applicant_name}
                onChange={e => update("applicant_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <FieldLabel required>Contact number</FieldLabel>
              <input
                type="tel"
                className="input-field"
                placeholder="09xxxxxxxxx"
                value={form.applicant_contact}
                onChange={e => update("applicant_contact", e.target.value)}
                required
              />
            </div>
            <button
              type="button"
              className="btn-primary"
              disabled={!form.applicant_name.trim() || !form.applicant_contact.trim()}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </FormSection>
        )}

        {step === 2 && (
          <FormSection
            icon={Building2}
            title="Facility & schedule"
            description="Choose a facility and time. Conflicts are blocked after the office confirms availability."
          >
            <div className="space-y-2">
              <FieldLabel required>Facility</FieldLabel>
              {loadingFacilities ? (
                <div className="input-field flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 size={14} className="animate-spin" /> Loading facilities…
                </div>
              ) : facilities.length === 0 ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                  <AlertCircle size={16} /> No facilities configured.
                </div>
              ) : (
                <select
                  className="input-field"
                  value={form.facility_id}
                  onChange={e => update("facility_id", e.target.value)}
                  required
                >
                  <option value="">Select facility…</option>
                  {facilities.map(f => (
                    <option key={f.barangay_facility_id} value={f.barangay_facility_id}>
                      {f.facility_name}
                      {f.rental_rate != null && Number(f.rental_rate) > 0
                        ? ` (rental ₱${Number(f.rental_rate).toLocaleString()})`
                        : " (no rental fee)"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <FieldLabel required>Reservation date</FieldLabel>
              <select
                className="input-field mb-2"
                value={
                  !form.reservation_date
                    ? ""
                    : dateOptions.some(o => o.value === form.reservation_date)
                      ? form.reservation_date
                      : "__manual__"
                }
                onChange={e => {
                  const v = e.target.value
                  if (v === "" || v === "__manual__") {
                    if (v === "") update("reservation_date", "")
                  } else update("reservation_date", v)
                }}
              >
                <option value="">Quick pick (next 3 weeks)…</option>
                {dateOptions.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
                <option value="__manual__">Other date…</option>
              </select>
              <input
                type="date"
                className="input-field"
                value={form.reservation_date}
                onChange={e => update("reservation_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <FieldLabel required>Time slot</FieldLabel>
              <select
                className="input-field"
                value={form.time_slot}
                onChange={e => update("time_slot", e.target.value)}
                required
              >
                <option value="">Select time slot…</option>
                {TIME_SLOTS.map(slot => (
                  <option key={slot.id} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <FieldLabel required>Purpose</FieldLabel>
              <select
                key={purposeQuickKey}
                className="input-field mb-2"
                defaultValue=""
                onChange={e => {
                  const v = e.target.value
                  if (v) {
                    update("purpose", v)
                    setPurposeQuickKey(k => k + 1)
                  }
                }}
              >
                <option value="">Quick-fill (optional)…</option>
                {PURPOSE_QUICK_FILLS.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <textarea
                className="input-field min-h-[88px]"
                placeholder="Describe the activity or purpose"
                value={form.purpose}
                onChange={e => update("purpose", e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                disabled={
                  !form.facility_id ||
                  !form.reservation_date ||
                  !form.time_slot ||
                  !form.purpose.trim()
                }
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </FormSection>
        )}

        {step === 3 && (
          <FormSection
            icon={Upload}
            title="Valid ID & review"
            description="Upload a government-issued ID (PDF, JPG, PNG). Required before your request can be validated."
          >
            <div className="space-y-2">
              <FieldLabel required>Valid ID</FieldLabel>
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground text-center px-2 break-all">
                  {idFile ? idFile.name : "Click to choose file (PDF, JPG, PNG, WebP)"}
                </span>
                {idFile && (
                  <span className="text-xs text-muted-foreground">{formatFileSize(idFile.size)}</span>
                )}
                <input
                  key={fileInputKey}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*"
                  className="sr-only"
                  onChange={e => {
                    const f = e.target.files?.[0] ?? null
                    setIdFile(f)
                    e.target.value = ""
                  }}
                />
              </label>
              {idFile && (
                <button
                  type="button"
                  className="text-xs text-destructive hover:underline"
                  onClick={() => {
                    setIdFile(null)
                    setFileInputKey(k => k + 1)
                  }}
                >
                  Remove file
                </button>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm space-y-1">
              <p className="font-semibold text-foreground">Summary</p>
              <p>
                <span className="text-muted-foreground">Name:</span> {form.applicant_name}
              </p>
              <p>
                <span className="text-muted-foreground">Facility:</span> {selectedFacility?.facility_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">When:</span> {form.reservation_date}{" "}
                {TIME_SLOTS.find(s => s.value === form.time_slot)?.label}
              </p>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              Submission does not confirm the schedule until the Barangay Secretary completes intake and availability.
            </div>

            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => setStep(2)}>
                Back
              </button>
              <button
                type="button"
                className="btn-primary flex-1 justify-center"
                onClick={handleSubmit}
                disabled={submitting || !idFile}
              >
                {submitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit reservation"
                )}
              </button>
            </div>
          </FormSection>
        )}
      </div>
    </div>
  )
}
