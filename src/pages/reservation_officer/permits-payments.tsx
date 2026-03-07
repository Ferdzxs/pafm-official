import React, { useState } from 'react'
import { Search, Filter, Eye, CheckCircle, Clock, MapPin, Calendar, AlertTriangle } from 'lucide-react'

type PaymentStatus = 'unpaid' | 'paid'
type PermitStatus = 'waiting_admin' | 'ready_to_release' | 'released'

interface ParkPermitRow {
  reservation_id: string
  venue: string
  event_name: string
  organizer: string
  schedule_date: string
  payment_status: PaymentStatus
  payment_reference?: string
  permit_status: PermitStatus
}

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  unpaid: 'badge-rejected',
  paid: 'badge-approved',
}

const PERMIT_BADGE: Record<PermitStatus, string> = {
  waiting_admin: 'badge-pending',
  ready_to_release: 'badge-pending',
  released: 'badge-completed',
}

const MOCK_PERMITS: ParkPermitRow[] = [
  {
    reservation_id: 'PR-2024-023',
    venue: 'Quezon Memorial Circle – Open Grounds',
    event_name: 'Night Market & Food Bazaar',
    organizer: 'QC Tourism',
    schedule_date: '2024-03-08T18:00:00Z',
    payment_status: 'paid',
    payment_reference: 'OR-2024-77890',
    permit_status: 'ready_to_release',
  },
  {
    reservation_id: 'PR-2024-022',
    venue: 'City Park Amphitheater',
    event_name: 'Cultural Dance Festival',
    organizer: 'QC Cultural Affairs',
    schedule_date: '2024-03-06T16:00:00Z',
    payment_status: 'paid',
    payment_reference: 'OR-2024-77861',
    permit_status: 'released',
  },
  {
    reservation_id: 'PR-2024-021',
    venue: 'People\'s Park – Central Field',
    event_name: 'Youth Sports Tournament',
    organizer: 'District 3 Youth Council',
    schedule_date: '2024-03-10T08:00:00Z',
    payment_status: 'unpaid',
    permit_status: 'waiting_admin',
  },
]

export default function PermitsPayments() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PermitStatus>('all')
  const [rows, setRows] = useState<ParkPermitRow[]>(MOCK_PERMITS)
  const [selected, setSelected] = useState<ParkPermitRow | null>(null)

  const filtered = rows.filter(row => {
    const q = search.toLowerCase()
    const matchSearch =
      row.reservation_id.toLowerCase().includes(q) ||
      row.venue.toLowerCase().includes(q) ||
      row.event_name.toLowerCase().includes(q) ||
      row.organizer.toLowerCase().includes(q)

    const matchStatus = statusFilter === 'all' || row.permit_status === statusFilter
    return matchSearch && matchStatus
  })

  const waitingCount = rows.filter(r => r.permit_status === 'waiting_admin').length
  const readyCount = rows.filter(r => r.permit_status === 'ready_to_release').length
  const releasedCount = rows.filter(r => r.permit_status === 'released').length

  const handleReleasePermit = (id: string) => {
    setRows(prev =>
      prev.map(row =>
        row.reservation_id === id && row.permit_status === 'ready_to_release'
          ? { ...row, permit_status: 'released' }
          : row,
      ),
    )
    if (selected && selected.reservation_id === id) {
      setSelected({ ...selected, permit_status: 'released' })
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Permits & Payments (Parks)</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Park_Reservation_Permits — Release digital park event permits only after Parks Admin approval and confirmed
            payment from Treasurer.
          </p>
        </div>
        <div className="text-xs text-right text-slate-400 max-w-xs">
          <p>Payments and reconciliation are handled exclusively in the Treasurer module.</p>
          <p>Reservation Desk only reads payment status and releases permits.</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(148,163,184,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Clock size={13} className="text-slate-300" />
              Awaiting Admin / Payment
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-200">{waitingCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Pending admin decision or payment confirmation</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(250,204,21,0.45)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} className="text-amber-300" />
              Ready to Release
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-300">{readyCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Approved by Parks Admin and fully paid</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(52,211,153,0.45)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <CheckCircle size={13} className="text-emerald-400" />
              Permits Released
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{releasedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Digital permits already issued to applicants</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search by reservation ID, venue, event, or organizer…"
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
            <option value="all">All Status</option>
            <option value="waiting_admin">Awaiting Admin / Payment</option>
            <option value="ready_to_release">Ready to Release</option>
            <option value="released">Released</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                {[
                  'Reservation ID',
                  'Venue',
                  'Event',
                  'Organizer',
                  'Schedule',
                  'Payment Status',
                  'Permit Status',
                  'Payment Ref. (read-only)',
                  'Actions',
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
              {filtered.map(row => (
                <tr
                  key={row.reservation_id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-400">{row.reservation_id}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-slate-500" />
                      <span className="truncate">{row.venue}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{row.event_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.organizer}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    <div className="flex items-center gap-1 text-xs">
                      <Calendar size={13} className="text-slate-500" />
                      <span>
                        {new Date(row.schedule_date).toLocaleString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PAYMENT_BADGE[row.payment_status]
                        }`}
                    >
                      {row.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${PERMIT_BADGE[row.permit_status]
                        }`}
                    >
                      {row.permit_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.payment_reference ?? '—'}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <button
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="View details"
                        onClick={() => setSelected(row)}
                      >
                        <Eye size={14} />
                      </button>
                      {row.permit_status === 'ready_to_release' && (
                        <button
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Mark permit released"
                          onClick={() => handleReleasePermit(row.reservation_id)}
                        >
                          <CheckCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-slate-500">No records match your filters.</div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in"
            style={{ border: '1px solid rgba(148,163,184,0.15)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-white text-lg">{selected.event_name}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selected.reservation_id} · {selected.venue}
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
                  new Date(selected.schedule_date).toLocaleString('en-PH', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                ],
                ['Payment Status', selected.payment_status],
                ['Payment Reference (read-only)', selected.payment_reference ?? '—'],
                ['Permit Status', selected.permit_status.replace('_', ' ')],
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
                Payment amounts and Official Receipts are maintained in the Treasurer module. Reservation Desk should
                only release permits once Parks Admin has approved the reservation and payment status is confirmed as
                paid.
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              {selected.permit_status === 'ready_to_release' && (
                <button
                  className="btn-success flex-1 justify-center"
                  onClick={() => handleReleasePermit(selected.reservation_id)}
                >
                  <CheckCircle size={14} /> Mark Permit Released
                </button>
              )}
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
