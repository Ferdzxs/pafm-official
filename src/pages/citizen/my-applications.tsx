import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import { settleParkReservationPayment } from '@/lib/settleParkReservationPayment'
import { settleBarangayReservationPayment } from '@/lib/settleBarangayReservationPayment'
import { settleUtilityConnectionPayment } from '@/lib/settleUtilityConnectionPayment'
import { cn } from '@/lib/utils'
import { CITIZEN_STEP_MAP, UTILITY_TICKET_TYPES } from '@/config/utilityRequest'
import {
  PARK_CITIZEN_WORKFLOW_STEPS,
  parkReservationWorkflowStepIndex,
  isParkReservationTerminalFailure,
} from '@/config/parkCitizenWorkflow'
import {
  BARANGAY_CITIZEN_WORKFLOW_STEPS,
  barangayReservationWorkflowStepIndex,
  isBarangayReservationTerminalFailure,
} from '@/config/barangayCitizenWorkflow'
import {
  utilityCitizenSteps,
  utilityCitizenWorkflowStepIndex,
  utilityPathForTicketType,
  isUtilityTerminalFailure,
  utilityTicketTypeLabel,
} from '@/config/utilityCitizenWorkflow'
import {
  resolveUtilityDocumentViewUrls,
  type UtilityDocRowForView,
} from '@/lib/utilityRequestDocuments'
import {
  Loader2,
  Search,
  Filter,
  X,
  Clock,
  CheckCircle2,
  ChevronRight,
  Calendar,
  User,
  AlignLeft,
  FileText,
  Building2,
  DollarSign,
  MapPin,
  Receipt,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ParkOrderOfPaymentAndReceipt,
  type ParkFeePaymentSnapshot,
  type ParkOpDocumentSnapshot,
} from '@/components/parks/ParkOrderOfPaymentAndReceipt'
import { formatReceiptModuleLabel } from '@/lib/parkTreasuryDocumentsPdf'

type UnifiedApplication = {
  id: string
  module: 'burial' | 'parks' | 'barangay' | 'utility'
  typeLabel: string
  status: string
  /** Shown on the card (e.g. event date for parks/barangay). */
  date: string
  /** ISO-ish timestamp for ordering — newest submissions first. */
  sortAt: string
  details?: string
  priority?: string
  raw?: any
}

function compareNewestFirst(a: UnifiedApplication, b: UnifiedApplication): number {
  const ta = new Date(a.sortAt).getTime()
  const tb = new Date(b.sortAt).getTime()
  const fa = Number.isFinite(ta)
  const fb = Number.isFinite(tb)
  if (fa && fb && tb !== ta) return tb - ta
  if (fa && !fb) return -1
  if (!fa && fb) return 1
  return (b.id || '').localeCompare(a.id || '')
}

const MODULE_LABEL: Record<UnifiedApplication['module'], string> = {
  burial: 'Cemetery',
  parks: 'Parks',
  barangay: 'Facility',
  utility: 'Utility',
}

function formatModuleLabel(m: UnifiedApplication['module']) {
  return MODULE_LABEL[m]
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ')
}

function applicantNameFromRaw(raw: unknown, fallback: string) {
  const r = raw as Record<string, unknown> | null | undefined
  if (!r) return fallback
  const person = r.person as { full_name?: string } | null | undefined
  return (
    person?.full_name?.trim()
    || (typeof r.applicant_name === 'string' ? r.applicant_name : '')
    || (typeof r.requester_name === 'string' ? r.requester_name : '')
    || fallback
  )
}

function CitizenUtilityUploads({ ticketId }: { ticketId: string }) {
  const [rows, setRows] = useState<
    {
      id: string
      requirement_key: string
      file_name: string
      file_url: string
      verified_at: string | null
    }[]
  >([])
  const [viewUrls, setViewUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('utility_request_document')
        .select('id, requirement_key, file_name, file_url, verified_at')
        .eq('ticket_id', ticketId)
      if (cancelled) return
      if (error) {
        setRows([])
        setViewUrls({})
        setLoading(false)
        return
      }
      const list =
        (data as {
          id: string
          requirement_key: string
          file_name: string
          file_url: string
          verified_at: string | null
        }[]) ?? []
      if (list.length === 0) {
        setRows([])
        setViewUrls({})
        setLoading(false)
        return
      }
      const mapped: UtilityDocRowForView[] = list.map(r => ({
        id: r.id,
        requirement_key: r.requirement_key,
        file_name: r.file_name,
        file_url: r.file_url,
      }))
      const resolved = await resolveUtilityDocumentViewUrls(mapped, ticketId)
      if (cancelled) return
      setRows(list)
      setViewUrls(resolved)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [ticketId])
  if (loading || rows.length === 0) return null
  return (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Your submitted requirements
      </p>
      <ul className="space-y-2 text-sm">
        {rows.map(r => {
          const href = viewUrls[r.id]
          return (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-2 justify-between border-b border-border/30 pb-2 last:border-0"
            >
              <span className="font-medium capitalize text-foreground">
                {r.requirement_key.replace(/_/g, ' ')}
              </span>
              <div className="flex items-center gap-2">
                {r.file_url ? (
                  href ? (
                    <a
                      href={href}
                      className="text-xs font-semibold text-primary hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View file
                    </a>
                  ) : (
                    <span
                      className="text-xs text-amber-700 dark:text-amber-500"
                      title="Ensure the utility-docs bucket exists in Supabase (sql/supabase_storage_all_buckets.sql)."
                    >
                      File link unavailable
                    </span>
                  )
                ) : (
                  <span className="text-xs text-amber-600">Upload pending</span>
                )}
                {r.verified_at ? (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-700">
                    Verified
                  </Badge>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function toParkFeeSnapshot(p: Record<string, unknown> | null): ParkFeePaymentSnapshot | null {
  if (!p || p.payment_id == null) return null
  return {
    payment_id: String(p.payment_id),
    payment_status: (p.payment_status as string) ?? null,
    amount_paid: p.amount_paid != null ? Number(p.amount_paid) : null,
    digital_or_no: (p.digital_or_no as string) ?? null,
    payment_date: (p.payment_date as string) ?? null,
    payment_method: (p.payment_method as string) ?? null,
    transaction_ref_no: (p.transaction_ref_no as string) ?? null,
    document_id: (p.document_id as string) ?? null,
  }
}

export default function MyApplications() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [apps, setApps] = useState<UnifiedApplication[]>([])
  const [filtered, setFiltered] = useState<UnifiedApplication[]>([])
  const [search, setSearch] = useState('')
  const [moduleFilter, setModuleFilter] = useState<'all' | 'burial' | 'parks' | 'barangay' | 'utility'>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedApp, setSelectedApp] = useState<UnifiedApplication | null>(null)
  const [citizenPersonId, setCitizenPersonId] = useState<string | null>(null)
  const [opPayment, setOpPayment] = useState<Record<string, unknown> | null>(null)
  const [opPaymentLoading, setOpPaymentLoading] = useState(false)
  const [opDocument, setOpDocument] = useState<ParkOpDocumentSnapshot>(null)
  const [parkVenueName, setParkVenueName] = useState<string | null>(null)
  const [barangayFacilityName, setBarangayFacilityName] = useState<string | null>(null)
  const [feeOpOpen, setFeeOpOpen] = useState(false)
  const [feeReceiptOpen, setFeeReceiptOpen] = useState(false)
  const [feePayOpen, setFeePayOpen] = useState(false)
  const [citizenPayMethod, setCitizenPayMethod] = useState('gcash')
  const [citizenPayRef, setCitizenPayRef] = useState('')
  const [citizenPaySubmitting, setCitizenPaySubmitting] = useState(false)

  const loadAllApplications = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)
    try {
      let personId: string | null = null
      if (user.is_citizen) {
        personId = await getCitizenPersonIdForSession(supabase, user)
      }

      if (user.is_citizen) {
        setCitizenPersonId(prev => (prev === personId ? prev : personId))
      } else {
        setCitizenPersonId(null)
      }

      const consolidated: UnifiedApplication[] = []
      const namePat = (user.full_name || '').trim()

      /** Legacy paper-style applications matched by applicant name (no person_id on table). */
      if (namePat.length > 0) {
        const { data: burials } = await supabase
          .from('burial_applications')
          .select('*')
          .ilike('applicant_name', `%${namePat}%`)

        if (burials) {
          burials.forEach(b => {
            const sortAt = b.created_at ?? b.application_id
            consolidated.push({
              id: b.application_id,
              module: 'burial',
              typeLabel: 'Cemetery application (legacy)',
              status: b.status,
              date: b.created_at,
              sortAt,
              details: `For: ${b.deceased_name}`,
              raw: { ...b, _source: 'burial_applications' as const },
            })
          })
        }
      }

      /** Online cemetery / burial workflow tied to citizen person_id (integrated BPM + deceased registry). */
      if (personId) {
        const { data: onlineBurials } = await supabase
          .from('online_burial_application')
          .select(
            `
            application_id,
            application_status,
            submission_date,
            deceased_id,
            deceased:deceased_id (full_name),
            person:person_id (full_name)
          `,
          )
          .eq('person_id', personId)

        if (onlineBurials) {
          onlineBurials.forEach((row: Record<string, unknown>) => {
            const deceased = row.deceased as { full_name?: string } | null | undefined
            const deceasedName = deceased?.full_name?.trim() || '—'
            const sub = row.submission_date as string | undefined
            const sortAt = sub ?? (row.application_id as string)
            consolidated.push({
              id: row.application_id as string,
              module: 'burial',
              typeLabel: 'Cemetery / burial application',
              status: (row.application_status as string) ?? 'pending',
              date: sub ?? new Date().toISOString(),
              sortAt,
              details: `Deceased: ${deceasedName}`,
              raw: { ...row, _source: 'online_burial_application' as const },
            })
          })
        }
      }

        if (personId) {
          const { data: parks } = await supabase
            .from('park_reservation_record')
            .select('*')
            .eq('applicant_person_id', personId)

          if (parks) {
            parks.forEach(p => {
              const sortAt = (p as any).created_at ?? p.reservation_id
              consolidated.push({
                id: p.reservation_id,
                module: 'parks',
                typeLabel: 'Park reservation',
                status: p.status,
                date: p.reservation_date,
                sortAt,
                details: p.time_slot ? `Time slot: ${p.time_slot}` : 'Park venue reservation',
                raw: p,
              })
            })
          }

          const { data: brgys } = await supabase
            .from('barangay_reservation_record')
            .select('*')
            .eq('applicant_person_id', personId)

          if (brgys) {
            brgys.forEach(b => {
              const sortAt =
                (b as { created_at?: string }).created_at ??
                (b.reservation_date ? `${b.reservation_date}T00:00:00.000Z` : b.reservation_id)
              consolidated.push({
                id: b.reservation_id,
                module: 'barangay',
                typeLabel: 'Facility reservation (barangay)',
                status: b.status,
                date: b.reservation_date,
                sortAt,
                details: b.time_slot ? `Time slot: ${b.time_slot}` : 'Facility reservation',
                raw: b,
              })
            })
          }
        }

        /** Prefer person_id (integrated citizen record); fall back to requester name match. */
        const utilitySeen = new Set<string>()
        let utilityRows: Record<string, unknown>[] = []
        if (personId) {
          const { data: byPerson } = await supabase.from('service_tickets').select('*').eq('person_id', personId)
          for (const u of byPerson ?? []) {
            utilitySeen.add(u.ticket_id as string)
            utilityRows.push(u as Record<string, unknown>)
          }
        }
        if (namePat.length > 0) {
          const { data: byName } = await supabase
            .from('service_tickets')
            .select('*')
            .ilike('requester_name', `%${namePat}%`)
          for (const u of byName ?? []) {
            const tid = u.ticket_id as string
            if (utilitySeen.has(tid)) continue
            utilitySeen.add(tid)
            utilityRows.push(u as Record<string, unknown>)
          }
        }

        const utilTids = utilityRows.map(u => u.ticket_id as string)
        const { data: wcrUtil } =
          utilTids.length > 0
            ? await supabase
                .from('water_connection_request')
                .select('ticket_id, water_request_id')
                .in('ticket_id', utilTids)
            : { data: [] as { ticket_id: string; water_request_id: string }[] }
        const ticketToWr = Object.fromEntries((wcrUtil ?? []).map(w => [w.ticket_id, w.water_request_id]))
        const wrIdsU = (wcrUtil ?? []).map(w => w.water_request_id)
        const { data: instUtil } =
          wrIdsU.length > 0
            ? await supabase
                .from('installation_record')
                .select('installation_id, water_request_id, payment_id')
                .in('water_request_id', wrIdsU)
            : { data: [] as { installation_id: string; water_request_id: string; payment_id: string | null }[] }
        const wrToInst = Object.fromEntries(
          (instUtil ?? []).map(i => [i.water_request_id, i]),
        )

        utilityRows.forEach(u => {
          const rawType = (u.ticket_type as string) || ''
          const tid = u.ticket_id as string
          const wr = ticketToWr[tid]
          const inst = wr ? wrToInst[wr] : undefined
          const enriched = {
            ...u,
            ...(wr ? { _water_request_id: wr } : {}),
            ...(inst?.installation_id ? { _installation_id: inst.installation_id } : {}),
            ...(inst?.payment_id ? { payment_id: inst.payment_id } : {}),
          }
          const meta = (UTILITY_TICKET_TYPES as Record<string, { label?: string }>)[rawType]
          const label = meta?.label ?? rawType.replace(/_/g, ' ')
          consolidated.push({
            id: tid,
            module: 'utility',
            typeLabel: label || 'Utility request',
            status: (u.status as string) ?? 'open',
            date: (u.created_at as string) ?? '',
            sortAt: (u.created_at as string) ?? tid,
            details: (u.location as string) || undefined,
            priority: u.priority as string | undefined,
            raw: enriched,
          })
        })

        consolidated.sort(compareNewestFirst)

        setApps(consolidated)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load your applications.')
      } finally {
        setLoading(false)
      }
  }, [user])

  useEffect(() => {
    void loadAllApplications()
  }, [loadAllApplications])

  useEffect(() => {
    if (!user?.is_citizen || !citizenPersonId) return
    let t: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(t)
      t = setTimeout(() => void loadAllApplications(), 300)
    }
    const channel = supabase
      .channel(`citizen-park-payments-${citizenPersonId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'park_reservation_record',
          filter: `applicant_person_id=eq.${citizenPersonId}`,
        },
        schedule,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'barangay_reservation_record',
          filter: `applicant_person_id=eq.${citizenPersonId}`,
        },
        schedule,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_tickets',
          filter: `person_id=eq.${citizenPersonId}`,
        },
        schedule,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'installation_record' },
        schedule,
      )
      .subscribe()
    return () => {
      clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [user?.is_citizen, citizenPersonId, loadAllApplications])

  const isUtilityPathA = (raw: unknown) => {
    const tt = (raw as { ticket_type?: string })?.ticket_type || ''
    return ['water_connection:new', 'water_connection:additional_meter', 'water_connection'].includes(tt)
  }

  useEffect(() => {
    if (!selectedApp) {
      setOpPayment(null)
      setOpPaymentLoading(false)
      setOpDocument(null)
      setParkVenueName(null)
      setBarangayFacilityName(null)
      return
    }
    if (selectedApp.module !== 'parks' && selectedApp.module !== 'barangay' && selectedApp.module !== 'utility') {
      setOpPayment(null)
      setOpPaymentLoading(false)
      setOpDocument(null)
      setParkVenueName(null)
      setBarangayFacilityName(null)
      return
    }
    const feeStatusesPark = ['order_of_payment_issued', 'payment_settled', 'permit_released']
    const feeStatusesBarangay = [
      'order_of_payment_issued',
      'payment_pending',
      'pending_pb_approval',
      'pb_approved',
      'permit_issued',
      'completed',
    ]
    const feeStatusesUtility = [
      'order_of_payment_issued',
      'payment_settled',
      'for_installation',
      'in_progress',
      'pending_activation',
      'completed',
      'resolved',
    ]
    let feeOk = false
    if (selectedApp.module === 'parks') feeOk = feeStatusesPark.includes(selectedApp.status)
    else if (selectedApp.module === 'barangay') feeOk = feeStatusesBarangay.includes(selectedApp.status)
    else if (selectedApp.module === 'utility')
      feeOk = isUtilityPathA(selectedApp.raw) && feeStatusesUtility.includes(selectedApp.status)

    if (!feeOk) {
      setOpPayment(null)
      setOpPaymentLoading(false)
      setOpDocument(null)
      setParkVenueName(null)
      setBarangayFacilityName(null)
      return
    }
    const payId = selectedApp.raw?.payment_id as string | undefined
    if (!payId) {
      setOpPayment(null)
      setOpPaymentLoading(false)
      setOpDocument(null)
      return
    }
    let cancelled = false
    setOpPaymentLoading(true)
    void supabase
      .from('digital_payment')
      .select('*')
      .eq('payment_id', payId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        setOpPaymentLoading(false)
        if (error) setOpPayment(null)
        else setOpPayment(data as Record<string, unknown> | null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedApp])

  useEffect(() => {
    const docId = opPayment?.document_id as string | undefined
    if (!docId) {
      setOpDocument(null)
      return
    }
    let cancelled = false
    void supabase
      .from('digital_document')
      .select('document_id, document_type, reference_no, date_created, status')
      .eq('document_id', docId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setOpDocument(null)
        else setOpDocument(data as ParkOpDocumentSnapshot)
      })
    return () => {
      cancelled = true
    }
  }, [opPayment?.document_id])

  useEffect(() => {
    if (!selectedApp || selectedApp.module !== 'parks') {
      setParkVenueName(null)
      return
    }
    const vid = (selectedApp.raw as { park_venue_id?: string } | undefined)?.park_venue_id
    if (!vid) {
      setParkVenueName(null)
      return
    }
    let cancelled = false
    void supabase
      .from('park_venue')
      .select('park_venue_name')
      .eq('park_venue_id', vid)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setParkVenueName(data?.park_venue_name ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedApp])

  useEffect(() => {
    if (!selectedApp || selectedApp.module !== 'barangay') {
      setBarangayFacilityName(null)
      return
    }
    const fid = (selectedApp.raw as { barangay_facility_id?: string } | undefined)?.barangay_facility_id
    if (!fid) {
      setBarangayFacilityName(null)
      return
    }
    let cancelled = false
    void supabase
      .from('barangay_facility')
      .select('facility_name')
      .eq('barangay_facility_id', fid)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        setBarangayFacilityName(data?.facility_name ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedApp])

  useEffect(() => {
    setCitizenPayRef('')
    setCitizenPayMethod('gcash')
  }, [selectedApp?.id, selectedApp?.status])

  useEffect(() => {
    setFeeOpOpen(false)
    setFeeReceiptOpen(false)
    setFeePayOpen(false)
  }, [selectedApp?.id])

  useEffect(() => {
    const q = search.toLowerCase()
    const next = apps
      .filter(app => {
        const matchesSearch =
          !q ||
          app.id.toLowerCase().includes(q) ||
          app.typeLabel.toLowerCase().includes(q) ||
          (app.details && app.details.toLowerCase().includes(q))
        const matchesModule = moduleFilter === 'all' || app.module === moduleFilter
        return matchesSearch && matchesModule
      })
      .sort(compareNewestFirst)
    setFiltered(next)
  }, [apps, search, moduleFilter])

  const getProgressSteps = (app: UnifiedApplication) => {
    const isError = app.status === 'rejected'
    let stepIndex = 0
    const s = app.status

    if (app.module === 'utility') {
      stepIndex = CITIZEN_STEP_MAP[s] ?? 0
      // coarse strip kept for fallback only; dialog uses utilityCitizenWorkflow
    } else {
      if (s === 'open' || s === 'pending' || s === 'pending_loi') stepIndex = 0
      else if (s === 'under_review' || s === 'triaged' || s === 'assigned') stepIndex = 1
      else if (s === 'in_progress' || s === 'approved' || s === 'confirmed') stepIndex = 2
      else if (s === 'resolved' || s === 'completed' || s === 'closed' || s === 'rejected') stepIndex = 3
    }

    const steps = [
      { label: 'Submitted', active: false, done: false },
      { label: 'Under review', active: false, done: false },
      { label: 'In process', active: false, done: false },
      { label: isError ? 'Closed' : 'Completed', active: false, done: false },
    ]

    for (let i = 0; i < steps.length; i++) {
      if (i < stepIndex) steps[i].done = true
      if (i === stepIndex) {
        steps[i].active = true
        steps[i].done = true
      }
    }

    return steps
  }

  async function submitCitizenFeePayment() {
    if (
      !selectedApp ||
      (selectedApp.module !== 'parks' &&
        selectedApp.module !== 'barangay' &&
        selectedApp.module !== 'utility') ||
      !opPayment?.payment_id
    )
      return
    const payId = String(opPayment.payment_id)
    const amount = Number(opPayment.amount_paid) || 500
    setCitizenPaySubmitting(true)
    try {
      let orNo = ''
      if (selectedApp.module === 'parks') {
        const result = await settleParkReservationPayment(supabase, {
          reservationId: selectedApp.id,
          paymentId: payId,
          amount,
          paymentMethod: citizenPayMethod,
          transactionRef: citizenPayRef.trim() || null,
          performedBy: user?.full_name?.trim() || user?.email || 'Citizen',
          auditAction: 'CITIZEN_ONLINE_PAYMENT',
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        orNo = result.orNo
        toast.success(`Payment posted. Digital OR: ${orNo}`)
        setFeePayOpen(false)
        setSelectedApp(prev =>
          prev && prev.id === selectedApp.id
            ? { ...prev, status: 'payment_settled', raw: { ...prev.raw, status: 'payment_settled' } }
            : prev,
        )
      } else if (selectedApp.module === 'barangay') {
        const result = await settleBarangayReservationPayment(supabase, {
          reservationId: selectedApp.id,
          paymentId: payId,
          amount,
          paymentMethod: citizenPayMethod,
          transactionRef: citizenPayRef.trim() || null,
          performedBy: user?.full_name?.trim() || user?.email || 'Citizen',
          auditAction: 'CITIZEN_ONLINE_PAYMENT',
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        orNo = result.orNo
        toast.success(`Payment posted. Digital OR: ${orNo}`)
        setFeePayOpen(false)
        setSelectedApp(prev =>
          prev && prev.id === selectedApp.id
            ? { ...prev, status: 'pending_pb_approval', raw: { ...prev.raw, status: 'pending_pb_approval' } }
            : prev,
        )
      } else if (selectedApp.module === 'utility') {
        const raw = selectedApp.raw as {
          _water_request_id?: string
          _installation_id?: string
        }
        if (!raw._water_request_id || !raw._installation_id) {
          toast.error('Missing installation link. Refresh the page or contact support.')
          return
        }
        const result = await settleUtilityConnectionPayment(supabase, {
          ticketId: selectedApp.id,
          waterRequestId: raw._water_request_id,
          installationId: raw._installation_id,
          paymentId: payId,
          amount,
          paymentMethod: citizenPayMethod,
          transactionRef: citizenPayRef.trim() || null,
          performedBy: user?.full_name?.trim() || user?.email || 'Citizen',
          auditAction: 'CITIZEN_ONLINE_PAYMENT',
        })
        if (!result.ok) {
          toast.error(result.error)
          return
        }
        orNo = result.orNo
        toast.success(`Payment posted. Digital OR: ${orNo}`)
        setFeePayOpen(false)
        setSelectedApp(prev =>
          prev && prev.id === selectedApp.id
            ? { ...prev, status: 'for_installation', raw: { ...prev.raw, status: 'for_installation' } }
            : prev,
        )
      }
      setOpPayment(prev =>
        prev
          ? {
              ...prev,
              payment_status: 'settled',
              digital_or_no: orNo,
              payment_method: citizenPayMethod,
            }
          : prev,
      )
      await loadAllApplications()
    } finally {
      setCitizenPaySubmitting(false)
    }
  }

  if (!user) return null

  const feeSnap =
    (selectedApp?.module === 'parks' ||
      selectedApp?.module === 'barangay' ||
      selectedApp?.module === 'utility') ?
      toParkFeeSnapshot(opPayment)
    : null
  const canCitizenViewOp =
    (selectedApp?.module === 'parks' ||
      selectedApp?.module === 'barangay' ||
      selectedApp?.module === 'utility') &&
    !!feeSnap?.document_id &&
    !opPaymentLoading &&
    !!selectedApp &&
    (selectedApp.module === 'parks'
      ? ['order_of_payment_issued', 'payment_settled', 'permit_released'].includes(selectedApp.status)
      : selectedApp.module === 'barangay'
        ? [
            'order_of_payment_issued',
            'payment_pending',
            'pending_pb_approval',
            'pb_approved',
            'permit_issued',
            'completed',
          ].includes(selectedApp.status)
        : (isUtilityPathA(selectedApp.raw) &&
            [
              'order_of_payment_issued',
              'for_installation',
              'in_progress',
              'pending_activation',
              'completed',
              'resolved',
            ].includes(selectedApp.status))) &&
    (!opDocument?.document_type ||
      (selectedApp.module === 'parks' && opDocument.document_type === 'order_of_payment_park') ||
      (selectedApp.module === 'barangay' && opDocument.document_type === 'order_of_payment_barangay_facility') ||
      (selectedApp.module === 'utility' && opDocument.document_type === 'order_of_payment_utility'))
  const canCitizenViewOr =
    (selectedApp?.module === 'parks' ||
      selectedApp?.module === 'barangay' ||
      selectedApp?.module === 'utility') &&
    !!feeSnap &&
    String(feeSnap.payment_status || '').toLowerCase() === 'settled' &&
    !!feeSnap.digital_or_no?.trim()
  const canCitizenPayFees =
    !!feeSnap &&
    String(feeSnap.payment_status || '').toLowerCase() !== 'settled' &&
    selectedApp?.status === 'order_of_payment_issued' &&
    !!selectedApp &&
    (selectedApp.module === 'parks' ||
      selectedApp.module === 'barangay' ||
      (selectedApp.module === 'utility' && isUtilityPathA(selectedApp.raw)))

  return (
    <div className="w-full animate-fade-in px-4 pb-10 pt-4 sm:px-6 sm:pb-12 sm:pt-6">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <header className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            My applications
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
            Cemetery (online and legacy), parks, barangay facilities, and utility requests — pulled from your linked
            profile where the database supports it.
          </p>
        </header>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive bg-destructive/20 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="relative flex-1 min-w-0">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <input
                className="input-field"
                style={{ paddingLeft: '3rem' }}
                placeholder="Search by ID, title, or details"
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label="Search applications"
              />
            </div>
            <div className="relative sm:w-[200px] shrink-0">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <select
                className="input-field"
                style={{ paddingLeft: '3rem' }}
                value={moduleFilter}
                onChange={e => setModuleFilter(e.target.value as typeof moduleFilter)}
                aria-label="Filter by service"
              >
                <option value="all">All services</option>
                <option value="burial">Cemetery</option>
                <option value="parks">Parks</option>
                <option value="barangay">Facility</option>
                <option value="utility">Utility</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
              <span>Loading applications…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">No applications match</p>
              <p className="mt-1 text-sm text-muted-foreground">Try another search or filter.</p>
            </div>
          ) : (
            <ul className="space-y-2" role="list">
              {filtered.map(app => (
                <li key={`${app.module}-${app.id}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedApp(app)}
                    className={cn(
                      'w-full rounded-xl border border-border bg-background text-left transition-colors',
                      'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      'px-4 py-3.5 sm:px-4'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {formatModuleLabel(app.module)}
                          </span>
                          <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-xs text-foreground">
                            {formatStatus(app.status)}
                          </span>
                          {app.priority && (
                            <span className="text-[11px] text-muted-foreground">{app.priority}</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground leading-snug">{app.typeLabel}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 sm:line-clamp-1">
                          {app.details || '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Calendar className="h-3.5 w-3.5" aria-hidden />
                          {new Date(app.date).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-foreground">
                          <span className="hidden sm:inline">Details</span>
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          {selectedApp && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6 space-y-1 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-foreground">
                    {formatModuleLabel(selectedApp.module)}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate">{selectedApp.id}</span>
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground capitalize leading-tight">
                  {selectedApp.typeLabel}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="surface-box group border border-border/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <User className="h-3 w-3" /> Applicant
                    </p>
                    <p className="text-sm font-bold text-foreground truncate">
                      {applicantNameFromRaw(selectedApp.raw, user.full_name || '')}
                    </p>
                  </div>
                  <div className="surface-box group border border-border/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 group-hover:text-primary transition-colors flex items-center gap-1.5">
                      <AlignLeft className="h-3.5 w-3.5 shrink-0" aria-hidden /> Details
                    </p>
                    <p className="text-sm font-bold text-foreground truncate" title={selectedApp.details}>
                      {selectedApp.details || '—'}
                    </p>
                  </div>
                </div>

                <div className="admin-box group !p-4 !rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      {selectedApp.module === 'parks' ||
                      selectedApp.module === 'barangay' ||
                      selectedApp.module === 'utility'
                        ? 'Process & roles'
                        : 'Progress'}
                    </span>
                  </div>
                  {selectedApp.module === 'parks' ? (
                    <div className="relative pl-1 px-1 max-h-[min(55vh,420px)] overflow-y-auto pr-1">
                      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" aria-hidden />
                      {isParkReservationTerminalFailure(selectedApp.status) && (
                        <p className="text-xs font-semibold text-destructive mb-3 pl-9">
                          This request did not proceed: {formatStatus(selectedApp.status)}.
                        </p>
                      )}
                      {PARK_CITIZEN_WORKFLOW_STEPS.map((step, idx) => {
                        const currentIdx = parkReservationWorkflowStepIndex(selectedApp.status)
                        const failed = isParkReservationTerminalFailure(selectedApp.status)
                        const done = !failed && currentIdx > idx
                        const active = !failed && currentIdx === idx
                        const ring = cn(
                          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                          done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          !done && active && 'border-primary bg-primary/20 text-primary',
                          !done && !active && 'border-border bg-card text-muted-foreground'
                        )
                        return (
                          <div key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                            <div className={ring}>
                              {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <Clock className={cn('h-3.5 w-3.5', active && 'animate-pulse')} aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  'text-sm font-bold leading-snug',
                                  active || done ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {step.label}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
                                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                                {step.role}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
                              {active && (
                                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Current:{' '}
                                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
                                    {formatStatus(selectedApp.status)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : selectedApp.module === 'barangay' ? (
                    <div className="relative pl-1 px-1 max-h-[min(55vh,420px)] overflow-y-auto pr-1">
                      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" aria-hidden />
                      {isBarangayReservationTerminalFailure(selectedApp.status) && (
                        <p className="text-xs font-semibold text-destructive mb-3 pl-9">
                          This request did not proceed: {formatStatus(selectedApp.status)}.
                        </p>
                      )}
                      {BARANGAY_CITIZEN_WORKFLOW_STEPS.map((step, idx) => {
                        const currentIdx = barangayReservationWorkflowStepIndex(selectedApp.status)
                        const failed = isBarangayReservationTerminalFailure(selectedApp.status)
                        const done = !failed && currentIdx > idx
                        const active = !failed && currentIdx === idx
                        const ring = cn(
                          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                          done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          !done && active && 'border-primary bg-primary/20 text-primary',
                          !done && !active && 'border-border bg-card text-muted-foreground'
                        )
                        return (
                          <div key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                            <div className={ring}>
                              {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <Clock className={cn('h-3.5 w-3.5', active && 'animate-pulse')} aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  'text-sm font-bold leading-snug',
                                  active || done ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {step.label}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
                                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                                {step.role}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
                              {active && (
                                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Current:{' '}
                                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
                                    {formatStatus(selectedApp.status)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : selectedApp.module === 'utility' ? (
                    <div className="relative pl-1 px-1 max-h-[min(55vh,420px)] overflow-y-auto pr-1">
                      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" aria-hidden />
                      {isUtilityTerminalFailure(selectedApp.status) && (
                        <p className="text-xs font-semibold text-destructive mb-3 pl-9">
                          This request did not proceed: {formatStatus(selectedApp.status)}.
                        </p>
                      )}
                      {utilityCitizenSteps(
                        utilityPathForTicketType((selectedApp.raw as { ticket_type?: string })?.ticket_type),
                      ).map((step, idx) => {
                        const tt = (selectedApp.raw as { ticket_type?: string })?.ticket_type
                        const currentIdx = utilityCitizenWorkflowStepIndex(tt, selectedApp.status)
                        const failed = isUtilityTerminalFailure(selectedApp.status)
                        const done = !failed && currentIdx > idx
                        const active = !failed && currentIdx === idx
                        const ring = cn(
                          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                          done && 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
                          !done && active && 'border-primary bg-primary/20 text-primary',
                          !done && !active && 'border-border bg-card text-muted-foreground',
                        )
                        return (
                          <div key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                            <div className={ring}>
                              {done ? (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <Clock className={cn('h-3.5 w-3.5', active && 'animate-pulse')} aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  'text-sm font-bold leading-snug',
                                  active || done ? 'text-foreground' : 'text-muted-foreground',
                                )}
                              >
                                {step.label}
                              </p>
                              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
                                <Building2 className="h-3 w-3 shrink-0" aria-hidden />
                                {step.role}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                              {active && (
                                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                  Current:{' '}
                                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground">
                                    {formatStatus(selectedApp.status)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="relative pl-1 px-1">
                      <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border" aria-hidden />
                      {getProgressSteps(selectedApp).map((step, idx) => {
                        const isLast = idx === 3
                        const rejected = selectedApp.status === 'rejected' && isLast
                        const ring = cn(
                          'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                          step.done && !rejected && 'border-border bg-muted text-foreground',
                          step.done && rejected && 'border-border bg-muted text-muted-foreground',
                          !step.done && step.active && 'border-primary bg-primary/20 text-primary',
                          !step.done && !step.active && 'border-border bg-card text-muted-foreground'
                        )

                        return (
                          <div key={idx} className="relative flex gap-3 pb-4 last:pb-0">
                            <div className={ring}>
                              {step.done ? (
                                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <Clock className={cn('h-3.5 w-3.5', step.active && 'animate-pulse')} aria-hidden />
                              )}
                            </div>
                            <div className="min-w-0 pt-0.5">
                              <p
                                className={cn(
                                  'text-sm font-bold',
                                  step.active || step.done ? 'text-foreground' : 'text-muted-foreground'
                                )}
                              >
                                {step.label}
                                {rejected && ' (rejected)'}
                              </p>
                              {step.active && step.label === 'Submitted' && (
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                  Received {new Date(selectedApp.date).toLocaleDateString()}
                                </p>
                              )}
                              {step.active && step.label !== 'Submitted' && (
                                <p className="mt-1 text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                                  Status:
                                  <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-foreground font-bold uppercase tracking-wider text-[9px]">
                                    {formatStatus(selectedApp.status)}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {selectedApp.module === 'utility' && <CitizenUtilityUploads ticketId={selectedApp.id} />}

              {((selectedApp.module === 'parks' &&
                ['order_of_payment_issued', 'payment_settled', 'permit_released'].includes(selectedApp.status)) ||
                (selectedApp.module === 'barangay' &&
                  [
                    'order_of_payment_issued',
                    'payment_pending',
                    'pending_pb_approval',
                    'pb_approved',
                    'permit_issued',
                    'completed',
                  ].includes(selectedApp.status)) ||
                (selectedApp.module === 'utility' &&
                  isUtilityPathA(selectedApp.raw) &&
                  [
                    'order_of_payment_issued',
                    'for_installation',
                    'in_progress',
                    'pending_activation',
                    'completed',
                    'resolved',
                  ].includes(selectedApp.status))) &&
                (selectedApp.raw as { payment_id?: string })?.payment_id && (
                  <div className="mt-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
                      Fees & treasury documents
                    </p>
                    {opPaymentLoading && !opPayment ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Loading fee record…
                      </div>
                    ) : feeSnap ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        {canCitizenViewOp && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-center gap-2 font-bold uppercase tracking-wider text-[10px] h-10"
                            onClick={() => setFeeOpOpen(true)}
                          >
                            <FileText className="h-4 w-4 shrink-0" aria-hidden />
                            Order of payment
                          </Button>
                        )}
                        {canCitizenViewOr && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="justify-center gap-2 font-bold uppercase tracking-wider text-[10px] h-10"
                            onClick={() => setFeeReceiptOpen(true)}
                          >
                            <Receipt className="h-4 w-4 shrink-0" aria-hidden />
                            Official receipt
                          </Button>
                        )}
                        {canCitizenPayFees && (
                          <Button
                            type="button"
                            size="sm"
                            className="justify-center gap-2 font-bold uppercase tracking-wider text-[10px] h-10"
                            onClick={() => setFeePayOpen(true)}
                          >
                            <DollarSign className="h-4 w-4 shrink-0" aria-hidden />
                            Pay fees
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-xs text-muted-foreground py-2">
                        Payment record not found. Refresh or contact support.
                      </p>
                    )}
                  </div>
                )}

              <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:items-center">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                   className="rounded-xl border border-border bg-background h-11 px-8 text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
                >
                  Close
                </button>
                {selectedApp.module === 'parks' &&
                  (selectedApp.status === 'application_form_issued' ||
                    selectedApp.status === 'application_incomplete') && (
                    <button
                      type="button"
                       className="rounded-xl bg-primary h-11 px-8 text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground hover:bg-primary transition-all shadow-lg shadow-primary/20"
                      onClick={() => {
                        navigate(`/citizen/parks/${selectedApp.id}/application`)
                        setSelectedApp(null)
                      }}
                    >
                      Submit Application Form
                    </button>
                  )}
              </div>
              
              {selectedApp.module === 'parks' && selectedApp.status === 'permit_released' && selectedApp.raw?.digital_permit_url && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-[11px] font-bold text-primary text-center mb-2">Your digital permit is ready</p>
                  <a
                    href={selectedApp.raw.digital_permit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-semibold text-primary underline underline-offset-2"
                  >
                    Open permit (PDF)
                  </a>
                </div>
              )}
              {selectedApp.module === 'barangay' && selectedApp.status === 'permit_issued' && selectedApp.raw?.digital_permit_url && (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-[11px] font-bold text-primary text-center mb-2">Your facility permit is ready</p>
                  <a
                    href={selectedApp.raw.digital_permit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-sm font-semibold text-primary underline underline-offset-2"
                  >
                    Open permit (PDF)
                  </a>
                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    A copy is also saved under My documents.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={feeOpOpen} onOpenChange={setFeeOpOpen}>
        <DialogContent className="max-w-lg border-none bg-transparent p-0 shadow-none sm:max-w-xl">
          <div className="card-premium mx-auto w-full max-h-[min(90vh,820px)] max-w-full animate-in zoom-in-95 duration-300 overflow-y-auto sidebar-scrollbar">
            <DialogHeader className="sr-only">
              <DialogTitle>Order of payment</DialogTitle>
              <DialogDescription>
                Issued by Revenue Collection & Treasury after your application is validated.
              </DialogDescription>
            </DialogHeader>
            {canCitizenViewOp &&
            feeSnap &&
            (selectedApp?.module === 'parks' ||
              selectedApp?.module === 'barangay' ||
              selectedApp?.module === 'utility') ? (
              <ParkOrderOfPaymentAndReceipt
                viewMode="order_only"
                payorName={user.full_name?.trim() || user.email || 'Applicant'}
                reservationId={selectedApp!.id}
                venueLabel={
                  selectedApp!.module === 'parks'
                    ? parkVenueName
                    : selectedApp!.module === 'utility'
                      ? utilityTicketTypeLabel(
                          (selectedApp!.raw as { ticket_type?: string })?.ticket_type || '',
                        )
                      : barangayFacilityName
                }
                reservationDate={(selectedApp!.raw as { reservation_date?: string })?.reservation_date}
                timeSlot={(selectedApp!.raw as { time_slot?: string })?.time_slot}
                payment={feeSnap}
                opDocument={opDocument}
                opDocumentLoading={opPaymentLoading}
                orModuleLabel={formatReceiptModuleLabel(
                  selectedApp!.module === 'utility'
                    ? 'order_of_payment_utility'
                    : selectedApp!.module === 'barangay'
                      ? 'order_of_payment_barangay_facility'
                      : 'order_of_payment_park',
                )}
              />
            ) : (
              <div className="admin-box border-dashed border-border/60 bg-muted/20 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The digital order of payment is not available yet. It appears after the Treasurer issues an order of
                  payment for your reservation.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feeReceiptOpen} onOpenChange={setFeeReceiptOpen}>
        <DialogContent className="max-w-lg border-none bg-transparent p-0 shadow-none sm:max-w-xl">
          <div className="card-premium mx-auto w-full max-h-[min(90vh,820px)] max-w-full animate-in zoom-in-95 duration-300 overflow-y-auto sidebar-scrollbar">
            <DialogHeader className="sr-only">
              <DialogTitle>Official receipt</DialogTitle>
              <DialogDescription>Issued when your fee is posted as settled in treasury.</DialogDescription>
            </DialogHeader>
            {canCitizenViewOr &&
            feeSnap &&
            (selectedApp?.module === 'parks' ||
              selectedApp?.module === 'barangay' ||
              selectedApp?.module === 'utility') ? (
              <ParkOrderOfPaymentAndReceipt
                viewMode="receipt_only"
                payorName={user.full_name?.trim() || user.email || 'Applicant'}
                reservationId={selectedApp!.id}
                venueLabel={
                  selectedApp!.module === 'parks'
                    ? parkVenueName
                    : selectedApp!.module === 'utility'
                      ? utilityTicketTypeLabel(
                          (selectedApp!.raw as { ticket_type?: string })?.ticket_type || '',
                        )
                      : barangayFacilityName
                }
                reservationDate={(selectedApp!.raw as { reservation_date?: string })?.reservation_date}
                timeSlot={(selectedApp!.raw as { time_slot?: string })?.time_slot}
                payment={feeSnap}
                opDocument={opDocument}
                opDocumentLoading={opPaymentLoading}
                orModuleLabel={formatReceiptModuleLabel(
                  selectedApp!.module === 'utility'
                    ? 'order_of_payment_utility'
                    : selectedApp!.module === 'barangay'
                      ? 'order_of_payment_barangay_facility'
                      : 'order_of_payment_park',
                )}
              />
            ) : (
              <div className="admin-box border-dashed border-border/60 bg-muted/20 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your official receipt is available only after the fee is settled (online or at the Treasury counter).
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={feePayOpen} onOpenChange={setFeePayOpen}>
        <DialogContent className="max-w-md gap-0 border-none bg-transparent p-0 shadow-none sm:max-w-lg">
          <div className="card-premium mx-auto w-full max-h-[min(90vh,640px)] animate-in zoom-in-95 duration-300 overflow-y-auto sidebar-scrollbar">
            <DialogHeader className="mb-6 space-y-1 text-left">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {(selectedApp?.module === 'parks' ||
                  selectedApp?.module === 'barangay' ||
                  selectedApp?.module === 'utility') && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {selectedApp.id}
                  </Badge>
                )}
                <Badge
                  variant="warning"
                  className="border-amber-500/40 bg-amber-500/10 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200"
                >
                  Simulated
                </Badge>
              </div>
              <DialogTitle className="font-display text-2xl font-extrabold leading-tight tracking-tight text-foreground">
                Pay fees
              </DialogTitle>
              <DialogDescription className="text-sm font-medium leading-relaxed text-muted-foreground">
                Online payment (simulated). You may also pay at the Treasury counter with your order of payment.
              </DialogDescription>
            </DialogHeader>

            {(selectedApp?.module === 'parks' ||
              selectedApp?.module === 'barangay' ||
              selectedApp?.module === 'utility') &&
            canCitizenPayFees &&
            opPayment ? (
              <>
                <div className="admin-box group relative mb-6 overflow-hidden">
                  <Building2
                    className="absolute right-4 top-4 h-12 w-12 text-primary/5 transition-transform duration-500 group-hover:scale-110"
                    aria-hidden
                  />
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner">
                      <Building2 className="h-4 w-4" aria-hidden />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                      Revenue &amp; Treasury
                    </span>
                  </div>
                  <p className="px-1 text-sm font-extrabold leading-tight text-foreground">
                    Confirm here to post your payment as settled in BPM (demo).
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    For real collections, present your digital order of payment at the City Treasury during business hours.
                  </p>
                  <div className="sep mt-4">
                    <div className="flex items-center gap-2 text-[11px] font-medium italic text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0 text-primary/40" aria-hidden />
                      Walk-in: Treasury counter — same order of payment reference
                    </div>
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="group rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-primary/30">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Amount due
                    </p>
                    <p className="text-xl font-black tabular-nums text-foreground sm:text-2xl">
                      ₱{(Number(opPayment.amount_paid) || 500).toLocaleString()}
                    </p>
                  </div>
                  <div className="group rounded-xl border border-border/50 bg-muted/30 p-4 transition-colors hover:border-primary/30">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Channel
                    </p>
                    <label htmlFor="citizen-pay-channel" className="sr-only">
                      Payment channel
                    </label>
                    <select
                      id="citizen-pay-channel"
                      className="input-field mt-1 w-full border-border/60 bg-background/80 text-sm font-bold text-foreground"
                      value={citizenPayMethod}
                      onChange={e => setCitizenPayMethod(e.target.value)}
                      disabled={citizenPaySubmitting}
                    >
                      <option value="gcash">GCash</option>
                      <option value="maya">Maya</option>
                      <option value="card">Card</option>
                      <option value="bank_transfer">Bank transfer</option>
                    </select>
                  </div>
                </div>

                <div className="mb-8 space-y-1.5">
                  <label
                    htmlFor="citizen-pay-ref"
                    className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                  >
                    Reference <span className="font-normal normal-case text-muted-foreground/80">(optional)</span>
                  </label>
                  <Input
                    id="citizen-pay-ref"
                    className="h-10 border-border/60 text-sm"
                    placeholder="e.g. e-wallet or bank ref no."
                    value={citizenPayRef}
                    onChange={e => setCitizenPayRef(e.target.value)}
                    disabled={citizenPaySubmitting}
                  />
                </div>

                <div className="mt-2 flex flex-col-reverse gap-3 border-t border-border/10 pt-6 sm:flex-row sm:justify-end sm:gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 rounded-xl px-8 text-[11px] font-extrabold uppercase tracking-widest"
                    onClick={() => setFeePayOpen(false)}
                    disabled={citizenPaySubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-11 rounded-xl px-8 text-[11px] font-extrabold uppercase tracking-widest"
                    onClick={() => void submitCitizenFeePayment()}
                    disabled={citizenPaySubmitting}
                  >
                    {citizenPaySubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Processing…
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" aria-hidden />
                        Confirm payment
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="admin-box border-dashed border-border/60 bg-muted/20 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {String(opPayment?.payment_status || '').toLowerCase() === 'settled'
                    ? 'This fee is already settled. Open “Official receipt” to view your OR.'
                    : 'Payment opens when an order of payment is issued and the fee is still pending.'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
