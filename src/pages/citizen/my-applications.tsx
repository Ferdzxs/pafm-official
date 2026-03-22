import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Loader2, Search, Filter, X, Clock, CheckCircle2, ChevronRight, Calendar, User, AlignLeft } from 'lucide-react'
import { CITIZEN_STEP_MAP, UTILITY_TICKET_TYPES } from '@/config/utilityRequest'
import { useNavigate } from 'react-router-dom'

type UnifiedApplication = {
  id: string
  module: 'burial' | 'parks' | 'barangay' | 'utility'
  typeLabel: string
  status: string
  date: string
  details?: string
  priority?: string
  raw?: Record<string, unknown>
}



const MODULE_COLORS: Record<string, { bg: string, text: string }> = {
  burial: { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa' },
  parks: { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' },
  barangay: { bg: 'rgba(232, 121, 249, 0.15)', text: '#e879f9' },
  utility: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8' },
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

  // Interactive Modal State
  const [selectedApp, setSelectedApp] = useState<UnifiedApplication | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const loadAllApplications = async () => {
      setLoading(true)
      setError(null)
      try {
        let personId = 'UNKNOWN'
        if (user.is_citizen) {
          const { data: citAcc } = await supabase
            .from('citizen_account')
            .select('person_id')
            .eq('account_id', user.id)
            .maybeSingle()

          if (citAcc?.person_id) {
            personId = citAcc.person_id
          }
        }

        const consolidated: UnifiedApplication[] = []

        // 1. Fetch Burial
        const { data: burials } = await supabase
          .from('online_burial_application')
          .select(`
            application_id,
            application_status,
            submission_date,
            deceased:deceased_id ( full_name )
          `)
          .eq('person_id', personId)

        if (burials) {
          burials.forEach(b => {
            const deceasedRef = Array.isArray(b.deceased) ? b.deceased[0] : b.deceased
            const decName = deceasedRef?.full_name || 'Unknown'
            consolidated.push({
              id: b.application_id,
              module: 'burial',
              typeLabel: 'Burial Application',
              status: b.application_status,
              date: b.submission_date,
              details: `For: ${decName}`,
              raw: b
            })
          })
        }

        // 2. Fetch Parks
        const { data: parks } = await supabase
          .from('park_reservation_record')
          .select('*')
          .eq('applicant_person_id', personId)

        if (parks) {
          parks.forEach(p => {
            consolidated.push({
              id: p.reservation_id,
              module: 'parks',
              typeLabel: 'Park Reservation',
              status: p.status,
              date: p.reservation_date,
              details: `Time slot: ${p.time_slot}`,
              raw: p
            })
          })
        }

        // 3. Fetch Barangay
        const { data: brgys } = await supabase
          .from('barangay_reservation_record')
          .select('*')
          .eq('applicant_person_id', personId)

        if (brgys) {
          brgys.forEach(b => {
            consolidated.push({
              id: b.reservation_id,
              module: 'barangay',
              typeLabel: 'Brgy. Facility Reservation',
              status: b.status,
              date: b.reservation_date,
              details: `Time slot: ${b.time_slot}`,
              raw: b
            })
          })
        }

        // 4. Fetch Utilities
        const { data: utilities } = await supabase
          .from('service_tickets')
          .select('*')
          .ilike('requester_name', `%${user.full_name}%`)

        if (utilities) {
          utilities.forEach(u => {
            const rawType = (u.ticket_type as string) || ''
            const meta = (UTILITY_TICKET_TYPES as Record<string, { label: string }>)[rawType]
            const label = meta?.label ?? rawType.replace('_', ' ')
            consolidated.push({
              id: u.ticket_id,
              module: 'utility',
              typeLabel: label,
              status: u.status,
              date: u.created_at,
              details: u.location,
              priority: u.priority,
              raw: u
            })
          })
        }

        consolidated.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        if (!cancelled) {
          setApps(consolidated)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load your applications.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAllApplications()
    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    const q = search.toLowerCase()
    const next = apps.filter(app => {
      const matchesSearch =
        !q ||
        app.id.toLowerCase().includes(q) ||
        app.typeLabel.toLowerCase().includes(q) ||
        (app.details && app.details.toLowerCase().includes(q))

      const matchesModule = moduleFilter === 'all' || app.module === moduleFilter

      return matchesSearch && matchesModule
    })
    setFiltered(next)
  }, [apps, search, moduleFilter])

  // Helpers for timeline visualization
  const getProgressSteps = (app: UnifiedApplication) => {
    const isError = app.status === 'rejected'

    // Default mapping used by all existing modules
    let stepIndex = 0
    const s = app.status

    if (app.module === 'utility') {
      // Use CITIZEN_STEP_MAP so richer utility statuses still land on 4 safe stages
      const mapped = CITIZEN_STEP_MAP[s] ?? 0
      stepIndex = mapped
    } else {
      if (s === 'open' || s === 'pending') stepIndex = 0
      else if (s === 'under_review' || s === 'triaged' || s === 'assigned') stepIndex = 1
      else if (s === 'in_progress' || s === 'approved' || s === 'confirmed') stepIndex = 2
      else if (s === 'resolved' || s === 'completed' || s === 'closed' || s === 'rejected') stepIndex = 3
    }

    const steps = [
      { label: 'Submitted', active: false, done: false },
      { label: 'Under Review', active: false, done: false },
      { label: 'Action Required / Processed', active: false, done: false },
      { label: isError ? 'Rejected' : 'Completed', active: false, done: false }
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

  if (!user) return null

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-6xl mx-auto pb-12">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Unified Applications</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Track all your requests across burial, parks, barangay facilities, and utility services in one place.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input-field pl-9"
            placeholder="Search by ID, type, or details…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <select
            className="input-field pl-9 transition-colors"
            value={moduleFilter}
            onChange={e => setModuleFilter(e.target.value as 'all' | 'burial' | 'parks' | 'barangay' | 'utility')}
          >
            <option value="all">All Modules</option>
            <option value="burial">Burial & Cemetery</option>
            <option value="parks">Parks Reservation</option>
            <option value="barangay">Barangay Facilities</option>
            <option value="utility">Utility Services</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading your applications from the database…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border-subtle p-6 text-center bg-surface-subtle">
          <p className="text-sm text-foreground mb-1">No applications found.</p>
          <p className="text-xs text-muted-foreground mb-4">
            You have not submitted any requests targeting the active filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(app => (
            <div
              key={app.id}
              onClick={() => setSelectedApp(app)}
              className="rounded-2xl p-4 cursor-pointer border border-border-subtle bg-card hover:bg-bg-hover hover:-translate-y-1 hover:shadow-md transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <span
                  className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: MODULE_COLORS[app.module].bg, color: MODULE_COLORS[app.module].text }}
                >
                  {app.module}
                </span>
                <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide">
                  {app.status.replace('_', ' ')}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-foreground capitalize mb-1 flex items-center gap-2">
                {app.typeLabel}
                {app.priority && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-muted text-muted-foreground border border-border-subtle">
                    {app.priority}
                  </span>
                )}
              </h3>

              <p className="text-xs text-muted-foreground mb-3 truncate" title={app.details}>{app.details || '—'}</p>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                  <Calendar size={12} />
                  <span>
                    {new Date(app.date).toLocaleDateString('en-PH', {
                      month: 'short', day: '2-digit', year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  View Track <ChevronRight size={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/30" onClick={() => setSelectedApp(null)}>
          <div
            className="w-full max-w-2xl bg-card rounded-2xl shadow-lg overflow-hidden border border-border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-muted/60">
              <div>
                <p className="text-[11px] font-mono text-muted-foreground mb-1">
                  {selectedApp.id}
                </p>
                <h2 className="text-base font-display font-semibold text-foreground capitalize">
                  {selectedApp.typeLabel} tracking
                </h2>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 rounded-full hover:bg-bg-hover text-muted-foreground transition-colors"
                aria-label="Close tracking"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5">
              {/* Context info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-muted/40 rounded-xl p-3 border border-border-subtle">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <User size={13} /> Applicant
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {(selectedApp.raw?.applicant_name as string) || (selectedApp.raw?.requester_name as string) || user.full_name}
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-3 border border-border-subtle">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <AlignLeft size={13} /> Context
                  </div>
                  <div className="text-sm font-medium text-foreground truncate" title={selectedApp.details}>
                    {selectedApp.details || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Progress Timeline Tracker */}
              <h3 className="text-[13px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">
                Application timeline
              </h3>
              <div className="relative ml-1">
                <div className="absolute top-3 left-[11px] bottom-4 w-px bg-border-subtle"></div>
                {getProgressSteps(selectedApp).map((step, idx) => {
                  const isLast = idx === 3
                  const colorClass = step.done
                    ? (selectedApp.status === 'rejected' && isLast ? 'text-state-danger' : 'text-state-success')
                    : step.active
                      ? 'text-primary'
                      : 'text-muted-foreground'

                  const bgClass = step.done
                    ? (selectedApp.status === 'rejected' && isLast ? 'bg-state-danger-soft border-state-danger/30' : 'bg-state-success-soft border-state-success/30')
                    : step.active
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card border-border-subtle'

                  return (
                    <div key={idx} className="relative flex items-start mb-4 last:mb-0">
                      <div className={`relative z-10 flex items-center justify-center w-6 h-6 rounded-full border shadow-sm ${bgClass} ${colorClass}`}>
                        {step.done ? (
                          <CheckCircle2 size={12} className="stroke-3" />
                        ) : (
                          <Clock size={12} className={step.active ? 'animate-pulse' : ''} />
                        )}
                      </div>
                      <div className="ml-4 pt-0.5">
                        <div className={`text-sm font-medium ${step.active || step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </div>
                        {step.active && step.label === 'Submitted' && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Your request was received on {new Date(selectedApp.date).toLocaleDateString()}
                          </div>
                        )}
                        {step.active && step.label !== 'Submitted' && (
                          <div className="text-[11px] text-muted-foreground mt-1">
                            Current status:{' '}
                            <span className="font-semibold px-1 rounded bg-muted text-foreground">
                              {selectedApp.status.replace('_', ' ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Actions Footer */}
              <div className="mt-6 pt-4 border-t border-border-subtle flex justify-end gap-3">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-bg-hover hover:text-foreground transition-colors"
                >
                  Close
                </button>
                {selectedApp.module === 'parks' &&
                  (selectedApp.status === 'application_form_issued' || selectedApp.status === 'application_incomplete') && (
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all"
                      onClick={() => {
                        navigate(`/citizen/parks/${selectedApp.id}/application`)
                        setSelectedApp(null)
                      }}
                    >
                      Submit application form
                    </button>
                  )}
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/15 shadow-sm transition-all">
                  Contact office
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
