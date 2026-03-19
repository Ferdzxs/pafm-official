import React, { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { AlertCircle, CheckCircle2, FileText, Search, Send, X } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Venue = {
  park_venue_id: string
  park_venue_name: string
}
type Person = {
  person_id: string
  full_name: string
  contact_number: string | null
}
type Row = {
  reservation_id: string
  reservation_date: string
  time_slot: string | null
  status: string | null
  park_venue_id: string | null
  applicant_person_id: string | null
  application_form_doc: string | null
  venue?: Venue | null
  person?: Person | null
}

function normalizeParkStatus(s?: string | null) {
  if (!s) return "pending_loi"
  if (s === "pending") return "pending_loi"
  if (s === "approved") return "admin_approved"
  if (s === "rejected") return "admin_rejected"
  return s
}

async function notifyCitizenByPersonId(params: {
  personId: string | null
  referenceId: string
  notifType: string
  message: string
}) {
  if (!params.personId) return
  const { data: acct } = await supabase
    .from("citizen_account")
    .select("account_id")
    .eq("person_id", params.personId)
    .maybeSingle()
  if (!acct?.account_id) return
  await supabase.from("notification_log").insert({
    notif_id: `NLOG-${Date.now()}`,
    account_id: acct.account_id,
    module_reference: "parks",
    reference_id: params.referenceId,
    notif_type: params.notifType,
    message: params.message,
  })
}

export default function ReservationApprovalsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    void loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, reservation_date, time_slot, status, park_venue_id, applicant_person_id, application_form_doc")
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map((r: any) => r.park_venue_id).filter(Boolean))] as string[]
      const personIds = [...new Set((recs ?? []).map((r: any) => r.applicant_person_id).filter(Boolean))] as string[]

      const [{ data: venues }, { data: persons }] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] as any[] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, contact_number").in("person_id", personIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const venueMap: Record<string, Venue> = {}
      const personMap: Record<string, Person> = {}
      ;(venues ?? []).forEach((v: any) => (venueMap[v.park_venue_id] = v))
      ;(persons ?? []).forEach((p: any) => (personMap[p.person_id] = p))

      const merged = (recs ?? []).map((r: any) => ({
        ...r,
        venue: r.park_venue_id ? venueMap[r.park_venue_id] ?? null : null,
        person: r.applicant_person_id ? personMap[r.applicant_person_id] ?? null : null,
      })) as Row[]

      setRows(merged)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load approvals queue.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      const s = normalizeParkStatus(r.status)
      const inDeskScope = [
        "admin_approved",
        "application_form_issued",
        "application_submitted",
        "application_incomplete",
      ].includes(s)
      if (!inDeskScope) return false
      if (!q) return true
      const hay = [
        r.reservation_id,
        r.reservation_date,
        r.venue?.park_venue_name ?? "",
        r.person?.full_name ?? "",
        r.time_slot ?? "",
        s,
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  async function updateStatus(r: Row, status: string, notify?: { type: string; msg: string }) {
    setActionLoading(r.reservation_id)
    setError(null)
    try {
      const { error: e } = await supabase
        .from("park_reservation_record")
        .update({ status })
        .eq("reservation_id", r.reservation_id)
      if (e) throw new Error(e.message)

      if (notify) {
        await notifyCitizenByPersonId({
          personId: r.applicant_person_id,
          referenceId: r.reservation_id,
          notifType: notify.type,
          message: notify.msg,
        })
      }
      await loadData()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Update failed.")
    } finally {
      setActionLoading(null)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="mb-8">
        <span className="px-3 py-1 rounded text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Approvals (Desk)</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Parks &amp; Recreation Scheduling — BPMN Steps 7 · 8 · 9
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertCircle size={15} className="shrink-0" />
          <span className="font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-700">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="input-field pl-9"
            placeholder="Search by ID, venue, applicant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground">
          Queue: <span className="font-semibold text-foreground">{filtered.length}</span>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText size={16} /> Application Form Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="text-sm text-muted-foreground">No records awaiting action.</div>
          )}

          {!loading &&
            filtered.map((r) => {
              const s = normalizeParkStatus(r.status)
              const canIssue = s === "admin_approved"
              const canValidate = s === "application_submitted" || s === "application_incomplete"
              const canReturn = s === "application_submitted"
              return (
                <div key={r.reservation_id} className="rounded-xl border border-border-subtle bg-card px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {r.reservation_id} · {r.venue?.park_venue_name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.person?.full_name ?? "Unknown applicant"} · {r.reservation_date}
                      </div>
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Current status: <span className="font-semibold text-foreground">{s}</span>
                        {r.application_form_doc ? " · Application form attached" : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <button
                        className="btn-secondary"
                        disabled={!canIssue || actionLoading === r.reservation_id}
                        onClick={() =>
                          updateStatus(r, "application_form_issued", {
                            type: "application_form_issued",
                            msg: `Your park reservation ${r.reservation_id} was approved. Please complete the application form.`,
                          })
                        }
                        title="BPMN Step 7 — Issue digital application form"
                      >
                        <Send size={14} />
                        {actionLoading === r.reservation_id ? "Saving…" : "Issue Form"}
                      </button>

                      <button
                        className="btn-secondary"
                        disabled={!canReturn || actionLoading === r.reservation_id}
                        onClick={() =>
                          updateStatus(r, "application_incomplete", {
                            type: "application_incomplete",
                            msg: `Your application for ${r.reservation_id} is incomplete. Please correct and resubmit.`,
                          })
                        }
                        title="BPMN Step 9 — Return for correction"
                      >
                        Return for Correction
                      </button>

                      <button
                        className="btn-primary"
                        disabled={!canValidate || actionLoading === r.reservation_id}
                        onClick={() =>
                          updateStatus(r, "application_validated", {
                            type: "application_validated",
                            msg: `Your application for ${r.reservation_id} was validated. Payment processing may proceed if fees apply.`,
                          })
                        }
                        title="BPMN Step 9 — Mark complete"
                      >
                        <CheckCircle2 size={14} />
                        Validate Complete
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
        </CardContent>
      </Card>
    </div>
  )
}
