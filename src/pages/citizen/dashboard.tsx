import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import {
  Loader2,
  Clock,
  CheckCircle,
  FileText,
  ChevronRight,
  LayoutDashboard,
  Droplets,
  Bell,
  ExternalLink,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import { UTILITY_TICKET_TYPES } from '@/config/utilityRequest'
import type { NotificationLog } from '@/types'

type AppRow = {
  id: string
  action: string
  subject: string
  time: string
  status: string
  sortDate: number
  /** Barangay facility PDF when status is permit_issued */
  permitUrl?: string | null
}

const QUICK_ACTIONS: { label: string; emoji: string; to: string }[] = [
  { label: 'Apply for Burial', emoji: '⚰️', to: '/citizen/apply/burial' },
  { label: 'Reserve a Park', emoji: '🌳', to: '/citizen/apply/park' },
  { label: 'Barangay facility', emoji: '🏛️', to: '/citizen/apply/barangay' },
  { label: 'Water / utility request', emoji: '💧', to: '/citizen/apply/water' },
]

function normalizeStatus(s: string) {
  return (s || '').toLowerCase().replace(/\s+/g, '_')
}

function isPendingStatus(s: string) {
  const x = normalizeStatus(s)
  return (
    new Set([
      'pending',
      'open',
      'under_review',
      'triaged',
      'assigned',
      'in_progress',
      'application_incomplete',
      'application_form_issued',
    ]).has(x) || x.includes('pending')
  )
}

function isCompletedSuccess(s: string) {
  const x = normalizeStatus(s)
  return new Set([
    'approved',
    'confirmed',
    'resolved',
    'completed',
    'closed',
    'validated',
    'settled',
    'permit_issued',
    'permit_released',
  ]).has(x)
}

function notifBadgeVariant(
  t: NotificationLog['notif_type']
): 'warning' | 'success' | 'destructive' | 'secondary' | 'info' {
  if (t === 'success') return 'success'
  if (t === 'error') return 'destructive'
  if (t === 'warning') return 'warning'
  if (t === 'info') return 'info'
  return 'secondary'
}

function activityBadge(s: string): 'warning' | 'success' | 'destructive' | 'secondary' {
  const x = normalizeStatus(s)
  if (x === 'rejected' || x.includes('reject')) return 'destructive'
  if (isCompletedSuccess(s)) return 'success'
  if (isPendingStatus(s)) return 'warning'
  return 'secondary'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

function firstName(full: string) {
  const t = full.trim()
  if (!t) return 'there'
  return t.split(/\s+/)[0]
}

export default function CitizenDashboard() {
  const { user, notifications } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalApps: 0,
    pending: 0,
    completed: 0,
    documents: 0,
    pendingPayments: 0,
  })
  const [recentFallback, setRecentFallback] = useState<AppRow[]>([])

  useEffect(() => {
    if (!user?.is_citizen) return
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const personId = await getCitizenPersonIdForSession(supabase, user)
        const namePat = (user.full_name || '').trim()

        const rows: Array<{
          status: string
          date: string
          id: string
          label: string
          detail: string
          permitUrl?: string | null
        }> = []

        if (personId) {
          const { data: online } = await supabase
            .from('online_burial_application')
            .select('application_id, application_status, submission_date')
            .eq('person_id', personId)
          for (const r of online ?? []) {
            rows.push({
              id: r.application_id,
              status: r.application_status ?? 'pending',
              date: r.submission_date ?? '',
              label: 'Online burial',
              detail: r.application_id,
            })
          }
        }

        if (namePat.length > 0) {
          const { data: burials } = await supabase
            .from('burial_applications')
            .select('application_id, status, created_at, deceased_name')
            .ilike('applicant_name', `%${namePat}%`)
          for (const b of burials ?? []) {
            rows.push({
              id: b.application_id,
              status: b.status ?? 'pending',
              date: b.created_at ?? '',
              label: 'Burial application',
              detail: b.deceased_name ? `For: ${b.deceased_name}` : b.application_id,
            })
          }
        }

        if (personId) {
          const { data: parks } = await supabase
            .from('park_reservation_record')
            .select('reservation_id, status, reservation_date, time_slot')
            .eq('applicant_person_id', personId)
          for (const p of parks ?? []) {
            rows.push({
              id: p.reservation_id,
              status: p.status ?? 'pending',
              date: p.reservation_date ?? '',
              label: 'Park reservation',
              detail: p.time_slot ? `Slot: ${p.time_slot}` : p.reservation_id,
            })
          }

          const { data: brgys } = await supabase
            .from('barangay_reservation_record')
            .select('reservation_id, status, reservation_date, time_slot, digital_permit_url')
            .eq('applicant_person_id', personId)
          for (const b of brgys ?? []) {
            rows.push({
              id: b.reservation_id,
              status: b.status ?? 'pending',
              date: b.reservation_date ?? '',
              label: 'Barangay facility',
              detail: b.time_slot ? `Slot: ${b.time_slot}` : b.reservation_id,
              permitUrl:
                b.status === 'permit_issued' && (b as { digital_permit_url?: string | null }).digital_permit_url
                  ? (b as { digital_permit_url?: string | null }).digital_permit_url
                  : null,
            })
          }
        }

        let utilities: any[] | null = null
        if (personId) {
          const { data: byPerson, error: uErr } = await supabase
            .from('service_tickets')
            .select('ticket_id, ticket_type, status, created_at, location')
            .eq('person_id', personId)
          if (!uErr) utilities = byPerson
        }
        if ((!utilities || utilities.length === 0) && namePat.length > 0) {
          const { data: byName } = await supabase
            .from('service_tickets')
            .select('ticket_id, ticket_type, status, created_at, location')
            .ilike('requester_name', `%${namePat}%`)
          utilities = byName
        }
        for (const u of utilities ?? []) {
          const rawType = (u.ticket_type as string) || ''
          const meta = (UTILITY_TICKET_TYPES as Record<string, { label?: string }>)[rawType]
          const typeLabel = meta?.label ?? rawType.replace(/_/g, ' ')
          rows.push({
            id: u.ticket_id,
            status: u.status ?? 'open',
            date: u.created_at ?? '',
            label: typeLabel || 'Utility request',
            detail: u.location ?? u.ticket_id,
          })
        }

        let documents = 0
        let pendingPayments = 0
        if (personId) {
          const { data: docs } = await supabase
            .from('digital_document')
            .select('document_id')
            .eq('person_id', personId)
          const docIds = (docs ?? []).map(d => d.document_id).filter(Boolean)
          documents = docIds.length
          if (docIds.length > 0) {
            const { data: pays } = await supabase
              .from('digital_payment')
              .select('payment_id, payment_status')
              .in('document_id', docIds)
            pendingPayments = (pays ?? []).filter(
              p => p.payment_status && String(p.payment_status).toLowerCase() !== 'settled'
            ).length
          }
        }

        const totalApps = rows.length
        let pending = 0
        let completed = 0
        for (const r of rows) {
          const st = r.status
          if (isCompletedSuccess(st)) completed += 1
          else if (normalizeStatus(st) === 'rejected') {
            /* terminal — excluded from pending/completed success */
          } else pending += 1
        }

        const recentSorted = [...rows]
          .sort((a, b) => {
            const ta = new Date(a.date).getTime()
            const tb = new Date(b.date).getTime()
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0)
          })
          .slice(0, 6)
          .map(r => {
            const ts = new Date(r.date).getTime()
            return {
              id: r.id,
              action: r.label,
              subject: r.detail,
              time: Number.isFinite(ts)
                ? formatDistanceToNow(new Date(r.date), { addSuffix: true })
                : '—',
              status: r.status,
              sortDate: ts,
              permitUrl: r.permitUrl ?? null,
            }
          })

        if (!cancelled) {
          setStats({
            totalApps,
            pending,
            completed,
            documents,
            pendingPayments,
          })
          setRecentFallback(recentSorted)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load dashboard data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const meta = user ? ROLE_META[user.role] : null

  const activityItems = useMemo(() => {
    const fromNotif = (notifications ?? []).slice(0, 8).map(n => ({
      kind: 'notif' as const,
      id: n.notif_id,
      title: n.title,
      message: n.message,
      time: n.created_at,
      level: n.notif_type,
    }))
    if (fromNotif.length > 0) return { primary: fromNotif, useFallback: false }
    return { primary: [] as typeof fromNotif, useFallback: true }
  }, [notifications])

  if (!user) return null

  const toneClasses = {
    info: 'bg-state-info-soft text-state-info',
    warning: 'bg-state-warning-soft text-state-warning',
    success: 'bg-state-success-soft text-state-success',
    danger: 'bg-state-danger-soft text-state-danger',
    muted: 'bg-muted text-muted-foreground',
  } as const

  const kpis = [
    {
      label: 'Total requests',
      value: stats.totalApps,
      sub: 'Burial, parks, barangay, utility',
      icon: LayoutDashboard,
      tone: 'info' as const,
      to: '/citizen/applications',
    },
    {
      label: 'In progress',
      value: stats.pending,
      sub: 'Awaiting office action',
      icon: Clock,
      tone: 'warning' as const,
      to: '/citizen/applications',
    },
    {
      label: 'Completed',
      value: stats.completed,
      sub: 'Approved or closed',
      icon: CheckCircle,
      tone: 'success' as const,
      to: '/citizen/applications',
    },
    {
      label: 'My documents',
      value: stats.documents,
      sub:
        stats.pendingPayments > 0
          ? `${stats.pendingPayments} payment(s) not settled`
          : 'Permits & certificates',
      icon: FileText,
      tone: 'info' as const,
      to: '/citizen/documents',
    },
  ]

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            {meta && (
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="px-2.5 py-1 rounded-md text-xs font-semibold"
                  style={{ background: meta.bgColor, color: meta.color }}
                >
                  {meta.label}
                </span>
              </div>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
              Good {getGreeting()}, {firstName(user.full_name)}!
            </h1>
            <p className="text-muted-foreground text-sm mt-2 max-w-xl">
              {new Date().toLocaleDateString('en-PH', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {user.office && ` · ${user.office}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/citizen/applications"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              My applications
              <ChevronRight size={16} />
            </Link>
            <Link
              to="/citizen/documents"
              className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
            >
              Documents
              <FileText size={16} />
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {kpis.map(kpi => {
          const Icon = kpi.icon
          return (
            <Link key={kpi.label} to={kpi.to} className="group block min-h-[120px]">
              <Card className="h-full border-border transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClasses[kpi.tone]}`}
                    >
                      <Icon size={18} />
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    />
                  </div>
                  {loading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-xs">Loading…</span>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl font-bold text-foreground tabular-nums mb-1">{kpi.value}</div>
                      <div className="text-xs font-medium text-foreground/90">{kpi.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{kpi.sub}</div>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-border-subtle">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Recent activity</CardTitle>
              <span className="text-xs text-muted-foreground">From your account</span>
            </div>
          </CardHeader>
          <CardContent>
            {!activityItems.useFallback && activityItems.primary.length > 0 ? (
              <div className="space-y-1">
                {activityItems.primary.map(n => (
                  <div
                    key={n.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-border-subtle hover:bg-bg-hover transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Bell size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={notifBadgeVariant(n.level)} className="text-[10px] px-1.5 py-0">
                        {n.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.time), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : loading && recentFallback.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground text-sm gap-2">
                <Loader2 size={18} className="animate-spin" />
                Loading recent requests…
              </div>
            ) : recentFallback.length > 0 ? (
              <div className="space-y-1">
                {recentFallback.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-transparent hover:border-border-subtle hover:bg-bg-hover transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-surface-subtle flex items-center justify-center text-xs font-bold text-foreground shrink-0">
                      {item.id.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                      {item.permitUrl ? (
                        <a
                          href={item.permitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          View facility permit (PDF)
                        </a>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={activityBadge(item.status)} className="text-[10px] px-1.5 py-0">
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-border-subtle bg-muted/20">
                <p className="text-sm text-foreground font-medium">No activity yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Submit a request or check back after offices update your applications. Notifications will appear here
                  when logged.
                </p>
                <Link
                  to="/citizen/applications"
                  className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary hover:underline"
                >
                  View my applications
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border-subtle">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {QUICK_ACTIONS.map(qa => (
                  <Link
                    key={qa.label}
                    to={qa.to}
                    className="group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border"
                  >
                    <EmojiIcon symbol={qa.emoji} className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{qa.label}</span>
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-muted">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/20 p-2 text-primary">
                  <Droplets size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Need help?</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Visit the barangay or city office that handles your request. You can track status anytime under
                    My applications.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
