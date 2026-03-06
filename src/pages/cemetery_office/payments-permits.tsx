import React, { useState } from 'react'
import { Search, Filter, Eye, CreditCard, Receipt, Clock, AlertTriangle, CheckCircle } from 'lucide-react'

type PaymentStatus = 'unpaid' | 'partial' | 'paid'
type PermitStatus = 'pending' | 'issued'

interface BurialPaymentPermitRow {
  application_id: string
  applicant_name: string
  deceased_name: string
  oop_no: string
  oop_amount: number
  or_no?: string
  payment_channel: string
  payment_status: PaymentStatus
  permit_status: PermitStatus
  last_update: string
}

const MOCK_ROWS: BurialPaymentPermitRow[] = [
  {
    application_id: 'BA-2024-045',
    applicant_name: 'Pedro Bautista',
    deceased_name: 'Maria Bautista',
    oop_no: 'OOP-2024-1189',
    oop_amount: 2500,
    payment_channel: 'GCash',
    payment_status: 'paid',
    or_no: 'OR-2024-55801',
    permit_status: 'issued',
    last_update: '2024-03-02T10:15:00Z',
  },
  {
    application_id: 'BA-2024-044',
    applicant_name: 'Jose Santos',
    deceased_name: 'Lolita Santos',
    oop_no: 'OOP-2024-1182',
    oop_amount: 2500,
    payment_channel: 'Landbank OTC',
    payment_status: 'partial',
    permit_status: 'pending',
    last_update: '2024-03-01T15:45:00Z',
  },
  {
    application_id: 'BA-2024-043',
    applicant_name: 'Ana Reyes',
    deceased_name: 'Ramon Reyes',
    oop_no: 'OOP-2024-1179',
    oop_amount: 2500,
    payment_channel: 'City Cashier',
    payment_status: 'unpaid',
    permit_status: 'pending',
    last_update: '2024-02-29T09:10:00Z',
  },
  {
    application_id: 'BA-2024-042',
    applicant_name: 'Carlos Flores',
    deceased_name: 'Gloria Flores',
    oop_no: 'OOP-2024-1174',
    oop_amount: 0,
    payment_channel: 'Indigent / SSDD Guarantee',
    payment_status: 'paid',
    or_no: 'COG-2024-0092',
    permit_status: 'issued',
    last_update: '2024-02-27T13:20:00Z',
  },
]

const PAYMENT_BADGE: Record<PaymentStatus, string> = {
  unpaid: 'badge-rejected',
  partial: 'badge-pending',
  paid: 'badge-approved',
}

const PERMIT_BADGE: Record<PermitStatus, string> = {
  pending: 'badge-pending',
  issued: 'badge-approved',
}

export default function PaymentsPermits() {
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentStatus>('all')
  const [permitFilter, setPermitFilter] = useState<'all' | PermitStatus>('all')
  const [selected, setSelected] = useState<BurialPaymentPermitRow | null>(null)

  const filtered = MOCK_ROWS.filter(row => {
    const q = search.toLowerCase()
    const matchSearch =
      row.application_id.toLowerCase().includes(q) ||
      row.applicant_name.toLowerCase().includes(q) ||
      row.deceased_name.toLowerCase().includes(q)

    const matchPayment = paymentFilter === 'all' || row.payment_status === paymentFilter
    const matchPermit = permitFilter === 'all' || row.permit_status === permitFilter

    return matchSearch && matchPayment && matchPermit
  })

  const unpaidCount = MOCK_ROWS.filter(r => r.payment_status === 'unpaid').length
  const awaitingPermitCount = MOCK_ROWS.filter(r => r.payment_status === 'paid' && r.permit_status === 'pending').length
  const issuedCount = MOCK_ROWS.filter(r => r.permit_status === 'issued').length

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Payments & Permits Status</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Burial_Payment_Permit_Status — Read-only dashboard for monitoring Treasurer and Death Registration updates.
          </p>
        </div>
        <div className="text-xs text-right text-slate-400 max-w-xs">
          <div className="flex items-center justify-end gap-1">
            <CreditCard size={12} />
            <span>Collections / OR issuance:</span>
          </div>
          <span className="font-semibold">Treasurer</span>
          <div className="flex items-center justify-end gap-1 mt-1">
            <Receipt size={12} />
            <span>Burial permits:</span>
          </div>
          <span className="font-semibold">Death Registration Division (CCRD)</span>
        </div>
      </div>

      {/* At-a-glance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(248,113,113,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <AlertTriangle size={13} className="text-red-400" />
              Unpaid
            </span>
          </div>
          <div className="text-2xl font-bold text-red-400">{unpaidCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting payment posting by Treasurer</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(250,204,21,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Clock size={13} className="text-amber-300" />
              Paid, Awaiting Permit
            </span>
          </div>
          <div className="text-2xl font-bold text-amber-300">{awaitingPermitCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Payment is complete; CCRD to issue burial permit</p>
        </div>

        <div className="rounded-xl p-4 glass" style={{ border: '1px solid rgba(52,211,153,0.35)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <CheckCircle size={13} className="text-emerald-400" />
              Permits Issued
            </span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{issuedCount}</div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for scheduling, niche assignment, and burial</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search by application ID, applicant, or deceased…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs text-slate-400">Payment:</span>
          </div>
          <select
            className="input-field w-full sm:w-auto"
            value={paymentFilter}
            onChange={e => setPaymentFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <span className="text-xs text-slate-400 self-center ml-1">Permit:</span>
          <select
            className="input-field w-full sm:w-auto"
            value={permitFilter}
            onChange={e => setPermitFilter(e.target.value as any)}
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="issued">Issued</option>
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
                  'Application ID',
                  'Applicant',
                  'Deceased',
                  'OOP No. / Amount',
                  'OR / COG No.',
                  'Payment Status',
                  'Permit Status',
                  'Channel',
                  'Last Update',
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
              {filtered.map(row => (
                <tr
                  key={row.application_id}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => setSelected(row)}
                >
                  <td className="px-4 py-3 text-sm font-mono text-blue-400">{row.application_id}</td>
                  <td className="px-4 py-3 text-sm text-white">{row.applicant_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.deceased_name}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    <div className="flex flex-col">
                      <span className="font-mono text-slate-400">{row.oop_no}</span>
                      <span className="text-xs text-slate-500">
                        {row.oop_amount > 0 ? `₱${row.oop_amount.toLocaleString('en-PH')}` : 'Indigent / 0.00'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{row.or_no ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        PAYMENT_BADGE[row.payment_status]
                      }`}
                    >
                      {row.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        PERMIT_BADGE[row.permit_status]
                      }`}
                    >
                      {row.permit_status === 'issued' ? 'permit issued' : 'awaiting permit'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400">{row.payment_channel}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {new Date(row.last_update).toLocaleString('en-PH')}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <button
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="View details"
                      onClick={() => setSelected(row)}
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
          <div className="py-16 text-center text-slate-500">No records match your filters.</div>
        )}
      </div>

      {/* Detail panel (read-only) */}
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
                <h2 className="font-bold text-white text-lg">{selected.application_id}</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Read-only view. For updates, coordinate with the Treasurer and Death Registration Division.
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {[
                ['Applicant', selected.applicant_name],
                ['Deceased', selected.deceased_name],
                ['OOP No.', selected.oop_no],
                [
                  'OOP Amount',
                  selected.oop_amount > 0
                    ? `₱${selected.oop_amount.toLocaleString('en-PH')}`
                    : 'Indigent / 0.00 (via SSDD Certificate of Guarantee)',
                ],
                ['Payment Channel', selected.payment_channel],
                ['OR / COG No.', selected.or_no ?? '—'],
                ['Payment Status', selected.payment_status],
                ['Permit Status', selected.permit_status === 'issued' ? 'Burial permit issued' : 'Awaiting permit'],
                ['Last Update', new Date(selected.last_update).toLocaleString('en-PH')],
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
                This dashboard is for monitoring only. Posting of payments, issuing Official Receipts, and generation of
                burial permits are handled in the Finance and Death Registration modules.
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
