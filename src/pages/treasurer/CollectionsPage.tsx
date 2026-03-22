/**
 * CollectionsPage.tsx — Treasurer: Unified Collections & Payments
 * Consolidates the Payment Queue (pending collections) and Transaction History.
 * BPMN Coordination: Handles Steps 10 & 12 of Parks & Recreation, and similar fee steps.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { settleParkReservationPayment } from "@/lib/settleParkReservationPayment"
import { settleBarangayReservationPayment } from "@/lib/settleBarangayReservationPayment"
import { settleUtilityConnectionPayment } from "@/lib/settleUtilityConnectionPayment"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import {
  Search, RefreshCw, CreditCard, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, BadgeCheck, DollarSign, FileText, User, Calendar as CalendarIcon,
  Filter, Package, X, Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import {
  ParkOrderOfPaymentAndReceipt,
  type ParkFeePaymentSnapshot,
  type ParkOpDocumentSnapshot,
} from "@/components/parks/ParkOrderOfPaymentAndReceipt"
import { formatReceiptModuleLabel } from "@/lib/parkTreasuryDocumentsPdf"
import { utilityTicketTypeLabel } from "@/config/utilityCitizenWorkflow"

// ─── Types ───────────────────────────────────────────────────────────────────
type Venue = { park_venue_id: string; park_venue_name: string }
type Person = { person_id: string; full_name: string; contact_number: string | null }
type PaymentRecord = {
  payment_id: string
  payment_status: string | null
  amount_paid: number | null
  digital_or_no: string | null
  payment_date: string | null
  payment_method: string | null
  transaction_ref_no: string | null
  document_id: string | null
}

type QueueModule = "parks" | "barangay" | "utility"

type BarangayFacilityRef = {
  barangay_facility_id: string
  facility_name: string
  rental_rate: number | null
}

type QueueRow = {
  module: QueueModule
  reservation_id: string
  park_venue_id: string | null
  barangay_facility_id?: string | null
  applicant_person_id: string | null
  reservation_date: string
  time_slot: string | null
  status: string | null
  payment_id: string | null
  venue?: Venue | null
  facility?: BarangayFacilityRef | null
  /** Barangay rental fee from facility (for OP / collection). */
  feeAmount?: number
  person?: Person | null
  payment?: PaymentRecord | null
  /** Path A water connection — technical assessment fee. */
  utility_ticket_type?: string | null
  water_request_id?: string | null
  installation_id?: string | null
}

type HistoryRow = PaymentRecord & {
  document_type: string | null
  document_ref_no: string | null
  person_name: string | null
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DEFAULT_FEE = 500
const TREASURY_OFFICE_ID = "OFF-006"

// ─── Component ────────────────────────────────────────────────────────────────
export default function CollectionsPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<"queue" | "history">("queue")
  
  // States for Queue
  const [queueRows, setQueueRows] = useState<QueueRow[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  
  // States for History
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  
  // UI States
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [selectedQueue, setSelectedQueue] = useState<QueueRow | null>(null)
  const [selectedHistory, setSelectedHistory] = useState<HistoryRow | null>(null)
  
  // Modal States
  const [processAmount, setProcessAmount] = useState("")
  const [processRef, setProcessRef] = useState("")
  const [processMethod, setProcessMethod] = useState("cash")
  const [queueOpDoc, setQueueOpDoc] = useState<ParkOpDocumentSnapshot>(null)
  const [queueOpDocLoading, setQueueOpDocLoading] = useState(false)
  const [historyOpDoc, setHistoryOpDoc] = useState<ParkOpDocumentSnapshot>(null)
  const [historyOpDocLoading, setHistoryOpDocLoading] = useState(false)

  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Data Feed: Queue ──────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    setQueueLoading(true)
    setError(null)
    try {
      const { data: recs, error: e1 } = await supabase
        .from("park_reservation_record")
        .select("reservation_id, park_venue_id, applicant_person_id, reservation_date, time_slot, status, payment_id")
        .in("status", ["application_validated", "order_of_payment_issued"])
        .order("reservation_date", { ascending: false })

      if (e1) throw new Error(e1.message)

      const venueIds = [...new Set((recs ?? []).map(r => r.park_venue_id).filter(Boolean))] as string[]
      const personIdsP = [...new Set((recs ?? []).map(r => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIdsP = [...new Set((recs ?? []).map(r => r.payment_id).filter(Boolean))] as string[]

      const { data: brRecs, error: e2 } = await supabase
        .from("barangay_reservation_record")
        .select(
          "reservation_id, barangay_facility_id, applicant_person_id, reservation_date, time_slot, status, payment_id",
        )
        .in("status", ["awaiting_treasury", "order_of_payment_issued"])
        .order("reservation_date", { ascending: false })

      if (e2) throw new Error(e2.message)

      const facIds = [...new Set((brRecs ?? []).map(r => r.barangay_facility_id).filter(Boolean))] as string[]
      const personIdsB = [...new Set((brRecs ?? []).map(r => r.applicant_person_id).filter(Boolean))] as string[]
      const paymentIdsB = [...new Set((brRecs ?? []).map(r => r.payment_id).filter(Boolean))] as string[]

      const personIds = [...new Set([...personIdsP, ...personIdsB])]
      const paymentIds = [...new Set([...paymentIdsP, ...paymentIdsB])]

      const [
        { data: venues },
        { data: persons },
        { data: payments },
        { data: facs },
      ] = await Promise.all([
        venueIds.length
          ? supabase.from("park_venue").select("park_venue_id, park_venue_name").in("park_venue_id", venueIds)
          : Promise.resolve({ data: [] }),
        personIds.length
          ? supabase.from("person").select("person_id, full_name, contact_number").in("person_id", personIds)
          : Promise.resolve({ data: [] }),
        paymentIds.length
          ? supabase.from("digital_payment").select("*").in("payment_id", paymentIds)
          : Promise.resolve({ data: [] }),
        facIds.length
          ? supabase
              .from("barangay_facility")
              .select("barangay_facility_id, facility_name, rental_rate")
              .in("barangay_facility_id", facIds)
          : Promise.resolve({ data: [] }),
      ])

      const venueMap = Object.fromEntries((venues ?? []).map(v => [v.park_venue_id, v]))
      const personMap = Object.fromEntries((persons ?? []).map(p => [p.person_id, p]))
      const paymentMap = Object.fromEntries((payments ?? []).map(p => [p.payment_id, p]))
      const facMap = Object.fromEntries(
        (facs ?? []).map(f => [f.barangay_facility_id, f as BarangayFacilityRef]),
      )

      const parkMerged: QueueRow[] = (recs ?? []).map(r => ({
        module: "parks",
        reservation_id: r.reservation_id,
        park_venue_id: r.park_venue_id,
        barangay_facility_id: null,
        applicant_person_id: r.applicant_person_id,
        reservation_date: r.reservation_date,
        time_slot: r.time_slot,
        status: r.status,
        payment_id: r.payment_id,
        venue: r.park_venue_id ? venueMap[r.park_venue_id] : null,
        facility: null,
        person: r.applicant_person_id ? personMap[r.applicant_person_id] : null,
        payment: r.payment_id ? paymentMap[r.payment_id] : null,
      }))

      const barangayMerged: QueueRow[] = (brRecs ?? []).map(r => {
        const fac = r.barangay_facility_id ? facMap[r.barangay_facility_id] : null
        const fee = fac?.rental_rate != null ? Number(fac.rental_rate) : DEFAULT_FEE
        return {
          module: "barangay" as const,
          reservation_id: r.reservation_id,
          park_venue_id: null,
          barangay_facility_id: r.barangay_facility_id,
          applicant_person_id: r.applicant_person_id,
          reservation_date: r.reservation_date,
          time_slot: r.time_slot,
          status: r.status,
          payment_id: r.payment_id,
          venue: null,
          facility: fac ?? null,
          feeAmount: fee > 0 ? fee : DEFAULT_FEE,
          person: r.applicant_person_id ? personMap[r.applicant_person_id] : null,
          payment: r.payment_id ? paymentMap[r.payment_id] : null,
        }
      })

      const pathAWaterTypes = ["water_connection:new", "water_connection:additional_meter", "water_connection"]
      const { data: utTickets, error: uErr } = await supabase
        .from("service_tickets")
        .select("ticket_id, ticket_type, requester_name, person_id, status, created_at")
        .in("ticket_type", pathAWaterTypes)
        .in("status", ["awaiting_treasury", "order_of_payment_issued"])

      if (uErr) throw new Error(uErr.message)

      let utilityMerged: QueueRow[] = []
      if (utTickets?.length) {
        const uTicketIds = utTickets.map(t => t.ticket_id)
        const { data: wcrs } = await supabase
          .from("water_connection_request")
          .select("water_request_id, ticket_id, person_id, status")
          .in("ticket_id", uTicketIds)

        const wcrList = wcrs ?? []
        const wrIds = wcrList.map(w => w.water_request_id)
        const { data: tas } = wrIds.length
          ? await supabase
              .from("technical_assessment")
              .select("assessment_id, water_request_id, feasibility_status, quotation_amount")
              .in("water_request_id", wrIds)
          : { data: [] as { water_request_id: string; feasibility_status: string | null; quotation_amount: number | null }[] }

        const taByWr = Object.fromEntries((tas ?? []).map(t => [t.water_request_id, t]))
        const { data: instRows } = wrIds.length
          ? await supabase
              .from("installation_record")
              .select("installation_id, water_request_id, payment_id")
              .in("water_request_id", wrIds)
          : { data: [] as { installation_id: string; water_request_id: string; payment_id: string | null }[] }

        const instByWr = Object.fromEntries((instRows ?? []).map(i => [i.water_request_id, i]))
        const payIdsU = [...new Set((instRows ?? []).map(i => i.payment_id).filter(Boolean))] as string[]
        const { data: payExtra } = payIdsU.length
          ? await supabase.from("digital_payment").select("*").in("payment_id", payIdsU)
          : { data: [] as PaymentRecord[] }

        const payExtraMap = Object.fromEntries((payExtra ?? []).map(p => [p.payment_id, p]))
        const uPersonIds = [
          ...new Set(
            utTickets.map(t => t.person_id).filter(Boolean).concat(wcrList.map(w => w.person_id).filter(Boolean)),
          ),
        ] as string[]
        const missingUPerson = uPersonIds.filter(pid => !personMap[pid])
        if (missingUPerson.length) {
          const { data: pu } = await supabase
            .from("person")
            .select("person_id, full_name, contact_number")
            .in("person_id", missingUPerson)
          ;(pu ?? []).forEach(p => {
            personMap[p.person_id] = p
          })
        }

        for (const t of utTickets) {
          const wcr = wcrList.find(w => w.ticket_id === t.ticket_id)
          if (!wcr) continue
          const ta = taByWr[wcr.water_request_id]
          if (!ta || String(ta.feasibility_status || "").toLowerCase() !== "feasible") continue
          const quote = Number(ta.quotation_amount ?? 0)
          if (!Number.isFinite(quote) || quote <= 0) continue

          const inst = instByWr[wcr.water_request_id]
          const pid = inst?.payment_id ?? null
          const paySnap = pid ? payExtraMap[pid] ?? paymentMap[pid] : null

          const personId = t.person_id || wcr.person_id
          utilityMerged.push({
            module: "utility",
            reservation_id: t.ticket_id,
            park_venue_id: null,
            barangay_facility_id: null,
            applicant_person_id: personId,
            reservation_date: (t.created_at || "").split("T")[0] || new Date().toISOString().split("T")[0],
            time_slot: null,
            status: t.status,
            payment_id: pid,
            venue: null,
            facility: null,
            feeAmount: quote,
            person: personId ? personMap[personId] : null,
            payment: paySnap ?? null,
            utility_ticket_type: t.ticket_type,
            water_request_id: wcr.water_request_id,
            installation_id: inst?.installation_id ?? null,
          })
        }
      }

      setQueueRows([...parkMerged, ...barangayMerged, ...utilityMerged])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setQueueLoading(false)
    }
  }, [])

  // ─── Data Feed: History ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setError(null)
    try {
      const { data: payments, error: pErr } = await supabase
        .from("digital_payment")
        .select("*")
        .order("payment_date", { ascending: false })
        .limit(200)

      if (pErr) throw new Error(pErr.message)

      const docIds = [...new Set((payments ?? []).map(p => p.document_id).filter(Boolean))] as string[]
      const { data: docs } = docIds.length
        ? await supabase.from("digital_document").select("document_id, document_type, reference_no, person_id").in("document_id", docIds)
        : { data: [] as any[] }

      const personIds = [...new Set((docs ?? []).map(d => d.person_id).filter(Boolean))] as string[]
      const { data: persons } = personIds.length
        ? await supabase.from("person").select("person_id, full_name").in("person_id", personIds)
        : { data: [] as any[] }

      const docMap = Object.fromEntries((docs ?? []).map(d => [d.document_id, d]))
      const personMap = Object.fromEntries((persons ?? []).map(p => [p.person_id, p.full_name]))

      const merged: HistoryRow[] = (payments ?? []).map(p => {
        const doc = p.document_id ? docMap[p.document_id] : null
        return {
          ...p,
          document_type: doc?.document_type ?? null,
          document_ref_no: doc?.reference_no ?? null,
          person_name: doc?.person_id ? personMap[doc.person_id] ?? null : null,
        }
      })
      setHistoryRows(merged)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "queue") void loadQueue()
    else void loadHistory()
  }, [activeTab, loadQueue, loadHistory])

  // Realtime: citizen portal payments and reservation updates refresh the active tab
  useEffect(() => {
    const schedule = () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
      refreshDebounceRef.current = setTimeout(() => {
        refreshDebounceRef.current = null
        if (activeTab === "queue") void loadQueue()
        else void loadHistory()
      }, 280)
    }

    const channel = supabase
      .channel("treasurer-collections-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "digital_payment" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "park_reservation_record" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "barangay_reservation_record" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_tickets" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "installation_record" },
        schedule,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "technical_assessment" },
        schedule,
      )
      .subscribe()

    return () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current)
      supabase.removeChannel(channel)
    }
  }, [activeTab, loadQueue, loadHistory])

  useEffect(() => {
    const docId = selectedQueue?.payment?.document_id
    if (!docId) {
      setQueueOpDoc(null)
      setQueueOpDocLoading(false)
      return
    }
    let cancelled = false
    setQueueOpDocLoading(true)
    void supabase
      .from("digital_document")
      .select("document_id, document_type, reference_no, date_created, status")
      .eq("document_id", docId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setQueueOpDocLoading(false)
        if (error) setQueueOpDoc(null)
        else setQueueOpDoc(data as ParkOpDocumentSnapshot)
      })
    return () => {
      cancelled = true
    }
  }, [selectedQueue])

  useEffect(() => {
    const docId = selectedHistory?.document_id
    if (!docId) {
      setHistoryOpDoc(null)
      setHistoryOpDocLoading(false)
      return
    }
    let cancelled = false
    setHistoryOpDocLoading(true)
    void supabase
      .from("digital_document")
      .select("document_id, document_type, reference_no, date_created, status")
      .eq("document_id", docId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setHistoryOpDocLoading(false)
        if (error) setHistoryOpDoc(null)
        else setHistoryOpDoc(data as ParkOpDocumentSnapshot)
      })
    return () => {
      cancelled = true
    }
  }, [selectedHistory])

  // ─── Actions: Queue ────────────────────────────────────────────────────────
  async function generateOP(row: QueueRow) {
    if (!row.applicant_person_id) {
      toast.error("This reservation has no applicant on file. Cannot issue an order of payment.")
      return
    }
    setActionLoading(row.reservation_id)
    try {
      const docId = `DOC-OP-${Date.now()}`
      const today = new Date().toISOString().split("T")[0]
      const amount =
        row.module === "utility"
          ? row.feeAmount ?? DEFAULT_FEE
          : row.module === "barangay"
            ? row.feeAmount ?? DEFAULT_FEE
            : DEFAULT_FEE
      const docType =
        row.module === "utility"
          ? "order_of_payment_utility"
          : row.module === "barangay"
            ? "order_of_payment_barangay_facility"
            : "order_of_payment_park"

      const { error: docErr } = await supabase.from("digital_document").insert({
        document_id: docId,
        person_id: row.applicant_person_id,
        document_type: docType,
        reference_no: row.reservation_id,
        created_by_office: TREASURY_OFFICE_ID,
        date_created: today,
        status: "issued",
      })
      if (docErr) throw new Error(docErr.message)

      const payId = `PAY-${Date.now()}`
      const { error: payErr } = await supabase.from("digital_payment").insert({
        payment_id: payId,
        document_id: docId,
        payment_status: "pending",
        amount_paid: amount,
      })
      if (payErr) throw new Error(payErr.message)

      if (row.module === "parks") {
        const { error: resErr } = await supabase
          .from("park_reservation_record")
          .update({ payment_id: payId, status: "order_of_payment_issued" })
          .eq("reservation_id", row.reservation_id)
        if (resErr) throw new Error(resErr.message)
        await supabase.from("audit_logs").insert({
          action: "GENERATE_OP",
          subject: row.reservation_id,
          module: "parks",
          performed_by: user?.full_name ?? "Treasurer",
          status: "success",
          details: `Order of Payment generated for park reservation ${row.reservation_id}. Amount: ₱${amount}.`,
        })
      } else if (row.module === "barangay") {
        const { error: resErr } = await supabase
          .from("barangay_reservation_record")
          .update({ payment_id: payId, status: "order_of_payment_issued" })
          .eq("reservation_id", row.reservation_id)
        if (resErr) throw new Error(resErr.message)
        await supabase.from("audit_logs").insert({
          action: "GENERATE_OP",
          subject: row.reservation_id,
          module: "barangay_facility",
          performed_by: user?.full_name ?? "Treasurer",
          status: "success",
          details: `Order of Payment generated for barangay facility reservation ${row.reservation_id}. Amount: ₱${amount}.`,
        })
      } else if (row.module === "utility") {
        if (!row.water_request_id) throw new Error("Missing water connection request.")
        let instId = row.installation_id
        if (!instId) {
          instId = `INST-${Date.now()}`
          const { error: insErr } = await supabase.from("installation_record").insert({
            installation_id: instId,
            water_request_id: row.water_request_id,
            activation_confirmed: false,
          })
          if (insErr) throw new Error(insErr.message)
        }
        const { error: linkErr } = await supabase
          .from("installation_record")
          .update({ payment_id: payId })
          .eq("installation_id", instId)
        if (linkErr) throw new Error(linkErr.message)
        const { error: stErr } = await supabase
          .from("service_tickets")
          .update({ status: "order_of_payment_issued" })
          .eq("ticket_id", row.reservation_id)
        if (stErr) throw new Error(stErr.message)
        const { error: wcErr } = await supabase
          .from("water_connection_request")
          .update({ status: "order_of_payment_issued" })
          .eq("water_request_id", row.water_request_id)
        if (wcErr) throw new Error(wcErr.message)
        await supabase.from("audit_logs").insert({
          action: "GENERATE_OP",
          subject: row.reservation_id,
          module: "utility",
          performed_by: user?.full_name ?? "Treasurer",
          status: "success",
          details: `Order of Payment generated for water connection ${row.reservation_id}. Amount: ₱${amount}.`,
        })
      }

      toast.success("Order of Payment issued successfully!")
      await loadQueue()
    } catch (e: any) {
      toast.error(e.message ?? "Could not generate order of payment.")
    } finally {
      setActionLoading(null)
    }
  }

  async function processPayment() {
    if (!selectedQueue || !selectedQueue.payment_id || !selectedQueue.applicant_person_id) return
    setActionLoading(selectedQueue.reservation_id)
    try {
      const defaultAmt =
        selectedQueue.module === "utility"
          ? selectedQueue.feeAmount ?? DEFAULT_FEE
          : selectedQueue.module === "barangay"
            ? selectedQueue.feeAmount ?? DEFAULT_FEE
            : DEFAULT_FEE
      const amount = parseFloat(processAmount) || defaultAmt

      let installationId = selectedQueue.installation_id ?? null
      let waterRequestId = selectedQueue.water_request_id ?? null
      if (selectedQueue.module === "utility" && (!installationId || !waterRequestId)) {
        const { data: instLookup } = await supabase
          .from("installation_record")
          .select("installation_id, water_request_id")
          .eq("payment_id", selectedQueue.payment_id)
          .maybeSingle()
        if (instLookup) {
          installationId = instLookup.installation_id
          waterRequestId = instLookup.water_request_id
        }
      }
      if (
        selectedQueue.module === "utility" &&
        (!waterRequestId || !installationId)
      ) {
        toast.error("Could not link payment to installation record.")
        setActionLoading(null)
        return
      }

      const result =
        selectedQueue.module === "parks"
          ? await settleParkReservationPayment(supabase, {
              reservationId: selectedQueue.reservation_id,
              paymentId: selectedQueue.payment_id,
              amount,
              paymentMethod: processMethod,
              transactionRef: processRef.trim() || null,
              performedBy: user?.full_name ?? "Treasurer",
              auditAction: "PROCESS_PAYMENT",
            })
          : selectedQueue.module === "barangay"
            ? await settleBarangayReservationPayment(supabase, {
                reservationId: selectedQueue.reservation_id,
                paymentId: selectedQueue.payment_id,
                amount,
                paymentMethod: processMethod,
                transactionRef: processRef.trim() || null,
                performedBy: user?.full_name ?? "Treasurer",
                auditAction: "PROCESS_PAYMENT",
              })
            : await settleUtilityConnectionPayment(supabase, {
                ticketId: selectedQueue.reservation_id,
                waterRequestId: waterRequestId!,
                installationId: installationId!,
                paymentId: selectedQueue.payment_id,
                amount,
                paymentMethod: processMethod,
                transactionRef: processRef.trim() || null,
                performedBy: user?.full_name ?? "Treasurer",
                auditAction: "PROCESS_PAYMENT",
              })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success(`Payment successful! OR: ${result.orNo}`)
      setSelectedQueue(null)
      await loadQueue()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Actions: History ──────────────────────────────────────────────────────
  async function reconcile(txn: HistoryRow) {
    setActionLoading(txn.payment_id)
    try {
      await supabase
        .from("digital_payment")
        .update({ payment_status: "reconciled" })
        .eq("payment_id", txn.payment_id)

      await supabase.from("audit_logs").insert({
        action: "RECONCILE_PAYMENT",
        subject: txn.payment_id,
        module: "treasury",
        performed_by: user?.full_name ?? "Treasurer",
        status: "success",
        details: `Transaction ${txn.payment_id} reconciled.`
      })

      toast.success("Transaction reconciled!")
      setSelectedHistory(null)
      await loadHistory()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ─── Filtering ─────────────────────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return queueRows
    return queueRows.filter(r => {
      const venueLabel =
        r.module === "parks"
          ? r.venue?.park_venue_name ?? ""
          : r.module === "barangay"
            ? r.facility?.facility_name ?? ""
            : r.module === "utility"
              ? utilityTicketTypeLabel(r.utility_ticket_type || "")
              : ""
      const modHint =
        r.module === "barangay" ? "barangay" : r.module === "utility" ? "utility" : "park"
      return (
        r.reservation_id.toLowerCase().includes(q) ||
        (r.person?.full_name.toLowerCase().includes(q) ?? false) ||
        venueLabel.toLowerCase().includes(q) ||
        modHint.includes(q)
      )
    })
  }, [queueRows, search])

  const filteredHistory = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return historyRows
    return historyRows.filter(r => 
      r.payment_id.toLowerCase().includes(q) || 
      (r.digital_or_no ?? "").toLowerCase().includes(q) ||
      (r.person_name ?? "").toLowerCase().includes(q) ||
      (r.transaction_ref_no ?? "").toLowerCase().includes(q)
    )
  }, [historyRows, search])

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter shadow-xs" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
              {meta.label.toUpperCase()}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" /> Collections & Payments
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Revenue Collection</h1>
          <p className="text-muted-foreground text-sm opacity-80">Manage the payment queue and browse all transaction records.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => activeTab === "queue" ? loadQueue() : loadHistory()} disabled={queueLoading || historyLoading} className="shadow-xs border-border/50">
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", (queueLoading || historyLoading) && "animate-spin")} /> Refresh
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex bg-muted/30 p-1.5 rounded-2xl w-fit border border-border/50 shadow-xs">
        {[
          { id: "queue", label: "Payment Queue", icon: Clock },
          { id: "history", label: "Transaction History", icon: DollarSign }
        ].map(t => {
          const Icon = t.icon
          const active = activeTab === t.id
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id as any); setSearch("") }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
                active ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/50" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon size={14} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input 
            className="pl-10 h-11 border-border/50 rounded-xl" 
            placeholder={activeTab === "queue" ? "Search queue..." : "Search history..."} 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            {activeTab === "queue" ? <Clock size={17} className="text-primary" /> : <DollarSign size={17} className="text-primary" />}
            {activeTab === "queue" ? "Pending Payments" : "Transaction Records"}
            <Badge variant="secondary" className="ml-1">{(activeTab === "queue" ? filteredQueue : filteredHistory).length}</Badge>
          </CardTitle>
          <CardDescription>
            {activeTab === "queue" ? "Items waiting for Order of Payment or final processing." : "History of all settled and failed transactions."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {(activeTab === "queue" ? queueLoading : historyLoading) ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-40" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Syncing with database...</p>
            </div>
          ) : (activeTab === "queue" ? filteredQueue : filteredHistory).length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <BadgeCheck className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <p className="font-bold text-foreground">Nothing here right now</p>
              <p className="text-xs text-muted-foreground">No records found matching your filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {activeTab === "queue" ? (
                // QUEUE RENDER
                filteredQueue.map(r => {
                  const placeLabel =
                    r.module === "parks"
                      ? r.venue?.park_venue_name ?? "Park reservation"
                      : r.module === "utility"
                        ? utilityTicketTypeLabel(r.utility_ticket_type || "water_connection")
                        : r.facility?.facility_name ?? "Barangay facility"
                  const needOp =
                    (r.module === "parks" && r.status === "application_validated") ||
                    (r.module === "barangay" && r.status === "awaiting_treasury") ||
                    (r.module === "utility" && r.status === "awaiting_treasury")
                  const defaultAmt =
                    r.module === "utility" || r.module === "barangay"
                      ? r.feeAmount ?? DEFAULT_FEE
                      : DEFAULT_FEE
                  return (
                  <div key={`${r.module}-${r.reservation_id}`} className="flex flex-col md:flex-row md:items-center justify-between p-5 hover:bg-muted/30 transition-colors gap-4">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs" style={{ background: "rgba(252,211,77,0.15)", color: "#fcd34d" }}>
                        {r.payment_id ? <DollarSign size={18} /> : <FileText size={18} />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[9px] uppercase font-bold">
                            {r.module === "parks" ? "Parks" : r.module === "utility" ? "Utility" : "Barangay"}
                          </Badge>
                          <p className="font-display font-bold text-foreground text-sm uppercase tracking-tight">{r.person?.full_name ?? "Anonymous Applicant"}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Package size={11} /> {r.module === "utility" ? `Service: ${placeLabel}` : placeLabel}</span>
                          <span className="flex items-center gap-1 font-mono">{r.reservation_id}</span>
                          <span className="flex items-center gap-1"><CalendarIcon size={11} /> {r.reservation_date}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      {needOp ? (
                        <Button 
                          size="sm" 
                          className="rounded-xl font-bold uppercase tracking-widest text-[9px] px-4 py-3 h-auto shadow-md"
                          onClick={() => generateOP(r)}
                          disabled={actionLoading === r.reservation_id}
                        >
                          {actionLoading === r.reservation_id ? <RefreshCw className="h-3 w-3 animate-spin mr-1.5" /> : <FileText className="h-3 w-3 mr-1.5" />}
                          Generate OP
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="rounded-xl font-bold uppercase tracking-widest text-[9px] px-4 py-3 h-auto bg-primary/5 border-primary/20 text-primary shadow-xs"
                          onClick={() => {
                            setSelectedQueue(r)
                            setProcessAmount(String(defaultAmt))
                            setProcessRef("")
                            setProcessMethod("cash")
                          }}
                        >
                          <DollarSign className="h-3 w-3 mr-1.5" /> Process Payment
                        </Button>
                      )}
                    </div>
                  </div>
                )})
              ) : (
                // HISTORY RENDER
                filteredHistory.map(r => {
                  const status = r.payment_status?.toLowerCase() || "pending"
                  return (
                    <div 
                      key={r.payment_id} 
                      className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => setSelectedHistory(r)}
                    >
                      <div className="flex gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 bg-muted/50 group-hover:bg-muted transition-colors">
                          <CreditCard size={17} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-foreground">{r.payment_id}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                            {r.person_name && <span className="flex items-center gap-1 font-medium"><User size={10} /> {r.person_name}</span>}
                            {r.digital_or_no && <span className="flex items-center gap-1 font-bold text-primary">OR: {r.digital_or_no}</span>}
                            <span>{r.payment_date}</span>
                            <span className="uppercase font-bold tracking-tighter bg-muted px-1 rounded">{r.document_type?.replace(/_/g, " ") ?? "General"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-foreground text-sm">₱{(r.amount_paid ?? 0).toLocaleString()}</p>
                          <Badge variant={status === "settled" ? "success" : status === "failed" ? "destructive" : "secondary"} className="text-[9px] px-1.5 py-0">
                            {status}
                          </Badge>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground opacity-50" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: Payment Processing */}
      <Dialog open={!!selectedQueue} onOpenChange={o => !o && setSelectedQueue(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full animate-in zoom-in-95 duration-200">
          {selectedQueue && (
            <div className="card-premium mx-auto w-full flex flex-col max-h-[90vh]">
              <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground">Process Payment</DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">{selectedQueue.reservation_id}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 overflow-y-auto flex-1 pr-1 pb-4">
                {selectedQueue.payment ? (
                  <ParkOrderOfPaymentAndReceipt
                    payorName={selectedQueue.person?.full_name ?? "—"}
                    reservationId={selectedQueue.reservation_id}
                    venueLabel={
                      selectedQueue.module === "parks"
                        ? selectedQueue.venue?.park_venue_name ?? null
                        : selectedQueue.module === "utility"
                          ? utilityTicketTypeLabel(selectedQueue.utility_ticket_type || "")
                          : selectedQueue.facility?.facility_name ?? null
                    }
                    reservationDate={selectedQueue.reservation_date}
                    timeSlot={selectedQueue.time_slot}
                    payment={selectedQueue.payment as ParkFeePaymentSnapshot}
                    opDocument={queueOpDoc}
                    opDocumentLoading={queueOpDocLoading}
                    showOrderOfPayment
                    orModuleLabel={formatReceiptModuleLabel(
                      selectedQueue.module === "utility"
                        ? "order_of_payment_utility"
                        : selectedQueue.module === "barangay"
                          ? "order_of_payment_barangay_facility"
                          : "order_of_payment_park",
                    )}
                  />
                ) : null}

                <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center shrink-0 shadow-xs text-primary"><DollarSign size={18}/></div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Amount to Collect</label>
                    <div className="relative mt-1">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-lg font-bold text-foreground">₱</span>
                      <input 
                        type="number" 
                        className="w-full bg-transparent border-none text-2xl font-extrabold text-foreground focus:ring-0 p-0 pl-6 appearance-none" 
                        value={processAmount}
                        onChange={e => setProcessAmount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment Method</label>
                    <select 
                      className="w-full bg-muted/40 border-border/50 rounded-xl h-11 text-sm font-semibold px-3 focus:ring-primary/20"
                      value={processMethod}
                      onChange={e => setProcessMethod(e.target.value)}
                    >
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Ref. No. (Optional)</label>
                    <Input 
                      className="rounded-xl h-11 border-border/50 bg-muted/40 text-sm font-semibold" 
                      placeholder="e.g. GCash Ref" 
                      value={processRef}
                      onChange={e => setProcessRef(e.target.value)}
                    />
                  </div>
                </div>

                <Separator className="opacity-50" />

                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">Applicant:</span> <span className="text-foreground">{selectedQueue.person?.full_name}</span></div>
                  <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">Venue / service:</span> <span className="text-foreground">{selectedQueue.module === "parks" ? selectedQueue.venue?.park_venue_name : selectedQueue.module === "utility" ? utilityTicketTypeLabel(selectedQueue.utility_ticket_type || "") : selectedQueue.facility?.facility_name}</span></div>
                  <div className="flex justify-between text-xs font-medium"><span className="text-muted-foreground">Order of Payment ID:</span> <span className="text-foreground font-mono">{selectedQueue.payment_id}</span></div>
                </div>
              </div>

              <div className="mt-4 pt-6 border-t border-border/10 flex gap-3">
                <Button variant="outline" className="h-12 rounded-2xl flex-1 font-bold uppercase tracking-widest text-[10px]" onClick={() => setSelectedQueue(null)}>Cancel</Button>
                <Button 
                  className="h-12 rounded-2xl flex-1 font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20" 
                  onClick={processPayment}
                  disabled={!!actionLoading}
                >
                  {actionLoading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <BadgeCheck className="h-4 w-4 mr-2" />}
                  Confirm Payment
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL: History Detail */}
      <Dialog open={!!selectedHistory} onOpenChange={o => !o && setSelectedHistory(null)}>
        <DialogContent className="max-w-md p-0 border-none bg-transparent shadow-none w-full animate-in fade-in zoom-in-95 duration-200">
          {selectedHistory && (
            <div className="card-premium mx-auto w-full flex flex-col max-h-[90vh]">
               <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground">Transaction Details</DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">{selectedHistory.payment_id}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 overflow-y-auto flex-1">
                <ParkOrderOfPaymentAndReceipt
                  payorName={selectedHistory.person_name ?? "—"}
                  reservationId={selectedHistory.document_ref_no ?? selectedHistory.payment_id}
                  venueLabel={null}
                  reservationDate={null}
                  timeSlot={null}
                  payment={selectedHistory as ParkFeePaymentSnapshot}
                  opDocument={historyOpDoc}
                  opDocumentLoading={historyOpDocLoading}
                  showOrderOfPayment={
                    selectedHistory.document_type === "order_of_payment_park" ||
                    selectedHistory.document_type === "order_of_payment_utility" ||
                    historyOpDoc?.document_type === "order_of_payment_park" ||
                    historyOpDoc?.document_type === "order_of_payment_utility"
                  }
                  orModuleLabel={formatReceiptModuleLabel(selectedHistory.document_type)}
                />

                <div className={cn(
                  "p-4 rounded-2xl border flex items-center gap-3",
                  selectedHistory.payment_status === "settled" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : 
                  selectedHistory.payment_status === "reconciled" ? "bg-blue-500/10 border-blue-500/20 text-blue-600" :
                  "bg-muted/50 border-border text-muted-foreground"
                )}>
                  {selectedHistory.payment_status === "reconciled" ? <CheckCircle2 size={18}/> : <Info size={18}/>}
                  <span className="text-xs font-bold uppercase tracking-wider">{selectedHistory.payment_status}</span>
                </div>

                {[
                  ["Recipient / Payor", selectedHistory.person_name ?? "—"],
                  ["Amount", `₱${(selectedHistory.amount_paid ?? 0).toLocaleString()}`],
                  ["Official Receipt", selectedHistory.digital_or_no ?? "NOT_ISSUED"],
                  ["Date", selectedHistory.payment_date ?? "—"],
                  ["Method", selectedHistory.payment_method ?? "—"],
                  ["Reference ID", selectedHistory.transaction_ref_no ?? "—"],
                  ["Module", selectedHistory.document_type?.replace(/_/g, " ").toUpperCase() ?? "GENERAL"],
                ].map(([l, v]) => (
                  <div key={l} className="bg-background border border-border/50 rounded-2xl p-4">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{l}</p>
                    <p className="text-sm font-semibold text-foreground">{v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-border/10 flex flex-wrap gap-2">
                <Button variant="outline" className="h-11 rounded-xl flex-1 font-bold uppercase tracking-widest text-[9px]" onClick={() => setSelectedHistory(null)}>Close</Button>
                {selectedHistory.payment_status === "settled" && (
                  <Button 
                    variant="outline" 
                    className="h-11 rounded-xl flex-1 font-bold uppercase tracking-widest text-[9px] text-destructive border-destructive/20 hover:bg-destructive/5"
                    onClick={() => {
                      toast.success("Transaction flagged for audit review.")
                      setSelectedHistory(null)
                    }}
                  >
                    Flag Issue
                  </Button>
                )}
                {selectedHistory.payment_status === "settled" && (
                  <Button 
                    className="h-11 rounded-xl flex-1 font-bold uppercase tracking-widest text-[9px] bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => reconcile(selectedHistory)}
                    disabled={!!actionLoading}
                  >
                    {actionLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-2" /> : <ChevronRight className="h-3.5 w-3.5 mr-2" />}
                    Mark Reconciled
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
