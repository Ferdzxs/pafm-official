import React, { useState } from 'react'
import { Search, Filter, Eye, Calendar, MapPin, Clock, AlertTriangle, CheckCircle, UserCheck } from 'lucide-react'

type UsageStatus = 'upcoming' | 'ongoing' | 'completed' | 'incident' | 'no_show'

interface ParkUsageLog {
  id: string
  venue: string
  event_name: string
  organizer: string
  schedule_start: string
  schedule_end: string
  status: UsageStatus
  compliance_rating?: 'compliant' | 'minor_issue' | 'major_issue'
  monitor_name: string
  notes?: string
  logged_at: string
}

const STATUS_BADGE: Record<UsageStatus, string> = {
  upcoming: 'badge-pending',
  ongoing: 'badge-pending',
  completed: 'badge-completed',
  incident: 'badge-rejected',
  no_show: 'badge-rejected',
}

const COMPLIANCE_BADGE: Record<NonNullable<ParkUsageLog['compliance_rating']>, string> = {
  compliant: 'badge-approved',
  minor_issue: 'badge-pending',
  major_issue: 'badge-rejected',
}

const MOCK_LOGS: ParkUsageLog[] = [
  {
    id: 'LOG-2024-031',
    venue: 'Quezon Memorial Circle – Open Grounds',
    event_name: 'Night Market & Food Bazaar',
    organizer: 'QC Tourism',
    schedule_start: '2024-03-06T18:00:00Z',
    schedule_end: '2024-03-06T23:00:00Z',
    status: 'ongoing',
    compliance_rating: 'minor_issue',
    monitor_name: 'Event Mon. Team 03',
    notes: 'Crowd volume within limits; sound system slightly above agreed level.',
    logged_at: '2024-03-06T19:30:00Z',
  },
  {
    id: 'LOG-2024-030',
    venue: 'City Park Amphitheater',
    event_name: 'Cultural Dance Festival',
    organizer: 'QC Cultural Affairs',
    schedule_start: '2024-03-05T16:00:00Z',
    schedule_end: '2024-03-05T20:00:00Z',
    status: 'completed',
    compliance_rating: 'compliant',
    monitor_name: 'Event Mon. Team 02',
    notes: 'No incidents. Clean-up completed on time.',
    logged_at: '2024-03-05T20:15:00Z',
  },
  {
    id: 'LOG-2024-029',
    venue: 'People\'s Park – Central Field',
    event_name: 'Youth Sports Tournament',
    organizer: 'Brgy. 123 Sangguniang Kabataan',
    schedule_start: '2024-03-04T08:00:00Z',
    schedule_end: '2024-03-04T17:00:00Z',
    status: 'incident',
    compliance_rating: 'major_issue',
    monitor_name: 'Event Mon. Team 01',
    notes: 'Minor altercation reported; coordinated with barangay security. Extended clean-up beyond schedule.',
    logged_at: '2024-03-04T17:30:00Z',
  },
  {
    id: 'LOG-2024-028',
    venue: 'Eco Park – Picnic Grounds',
    event_name: 'Family Day Picnic',
    organizer: 'Private Organization',
    schedule_start: '2024-03-03T09:00:00Z',
    schedule_end: '2024-03-03T15:00:00Z',
    status: 'no_show',
    monitor_name: 'Event Mon. Team 02',
    notes: 'Organizer did not arrive. Slot freed for walk-in users.',
    logged_at: '2024-03-03T12:00:00Z',
  },
  {
    id: 'LOG-2024-032',
    venue: 'Quezon Memorial Circle – Oval Track',
    event_name: 'Fun Run for a Cause',
    organizer: 'NGO Partner',
    schedule_start: '2024-03-07T05:00:00Z',
    schedule_end: '2024-03-07T09:00:00Z',
    status: 'upcoming',
    monitor_name: 'Event Mon. Team 03',
    notes: 'Pre-event coordination completed. Awaiting day-of monitoring.',
    logged_at: '2024-03-05T10:00:00Z',
  },
]

const STATUS_OPTIONS: Array<{ value: 'all' | UsageStatus; label: string }> = [
  { value: 'all', label: 'All Status' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'incident', label: 'Incident' },
  { value: 'no_show', label: 'No-show' },
]

export default function ParkUsageLogs() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | UsageStatus>('all')
  const [selected, setSelected] = useState<ParkUsageLog | null>(null)

  const filtered = MOCK_LOGS.filter(log => {
    const q = search.toLowerCase()
    const matchSearch =
      log.id.toLowerCase().includes(q) ||
      log.venue.toLowerCase().includes(q) ||
      log.event_name.toLowerCase().includes(q) ||
      log.organizer.toLowerCase().includes(q)

    const matchStatus = statusFilter === 'all' || log.status === statusFilter
    return matchSearch && matchStatus
  })

  const ongoingCount = MOCK_LOGS.filter(l => l.status === 'ongoing').length
  const incidentsCount = MOCK_LOGS.filter(l => l.status === 'incident').length
  const completedCount = MOCK_LOGS.filter(l => l.status === 'completed').length

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Park Usage Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Park_Usage_Log — Event Monitoring interface for tracking actual usage, compliance, and incidents.
          </p>
        </div>
        <div className="text-xs text-right text-slate-400 max-w-xs">
          <div className="flex items-center justify-end gap-1">
            <UserCheck size={12} />
            <span>Event monitoring responsibility:</span>
          </div>
          <span className="font-semibold">Parks Administrator / Event Monitoring Team</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(96,165,250,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Clock size={13} className="text-sky-400" />
              Ongoing / Today
            </span>
          </div>
          <div className="text-2xl font-bold text-sky-400">{ongoingCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Events currently monitored on-site</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(248,113,113,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} className="text-red-400" />
              Incidents
            </span>
          </div>
          <div className="text-2xl font-bold text-red-400">{incidentsCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Logs with reported incidents or major issues</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(52,211,153,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <CheckCircle size={13} className="text-emerald-400" />
              Completed & Compliant
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Events fully compliant with park rules</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search by log ID, venue, event, or organizer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Filter size={14} className="text-slate-500" />
          <select
            className="input-field w-full sm:w-auto"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                {[
                  'Log ID',
                  'Venue',
                  'Event',
                  'Organizer',
                  'Scheduled Time',
                  'Status',
                  'Compliance',
                  'Monitor',
                  'Logged At',
                  'Details',
                ].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(log => (
                <tr
                  key={log.id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelected(log)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-400">{log.id}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-500" />
                      <span className="truncate">{log.venue}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{log.event_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.organizer}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    <div className="flex flex-col text-xs">
                      <span>
                        {new Date(log.schedule_start).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-slate-500">
                        to{' '}
                        {new Date(log.schedule_end).toLocaleTimeString('en-PH', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        STATUS_BADGE[log.status]
                      }`}
                    >
                      {log.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.compliance_rating ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          COMPLIANCE_BADGE[log.compliance_rating]
                        }`}
                      >
                        {log.compliance_rating.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{log.monitor_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {new Date(log.logged_at).toLocaleString('en-PH')}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="View details"
                      onClick={() => setSelected(log)}
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-500">No logs match your filters.</div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-xl animate-fade-in"
            style={{ border: '1px solid rgba(148,163,184,0.15)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-white text-lg">{selected.event_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selected.id} · {selected.venue}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                ['Organizer', selected.organizer],
                [
                  'Schedule',
                  `${new Date(selected.schedule_start).toLocaleString('en-PH')} to ${new Date(
                    selected.schedule_end,
                  ).toLocaleTimeString('en-PH')}`,
                ],
                ['Status', selected.status.replace('_', ' ')],
                [
                  'Compliance',
                  selected.compliance_rating ? selected.compliance_rating.replace('_', ' ') : 'Not yet assessed',
                ],
                ['Monitor', selected.monitor_name],
                ['Logged At', new Date(selected.logged_at).toLocaleString('en-PH')],
                ['Notes', selected.notes ?? '—'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between py-2"
                  style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}
                >
                  <span className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</span>
                  <span className="text-sm text-white text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 text-[11px] text-slate-500">
              <p>
                This log supports the Parks Administrator in monitoring actual field usage against approved reservations,
                including incidents, no-shows, and compliance with park rules.
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
