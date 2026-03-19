import React, { useEffect, useState } from 'react'
import { fetchAuditLogs } from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { Search } from 'lucide-react'

interface AuditRow {
  id: string
  action: string
  subject?: string | null
  performed_by?: string | null
  timestamp: string
  status: string
  module: string
  ip_address?: string | null
  details?: string | null
}

export default function SystemAuditLogs() {
  const { user } = useAuth()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [moduleFilter, setModuleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AuditRow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const run = async () => {
      setIsLoading(true)
      try {
        const data = await fetchAuditLogs({ limit: 200 })
        setRows(data as any)
      } finally {
        setIsLoading(false)
      }
    }
    void run()
  }, [])

  const filtered = rows.filter(r => {
    if (moduleFilter !== 'all' && r.module !== moduleFilter) return false
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    const q = search.toLowerCase()
    if (!q) return true
    return (
      r.action.toLowerCase().includes(q) ||
      (r.subject ?? '').toLowerCase().includes(q) ||
      (r.performed_by ?? '').toLowerCase().includes(q)
    )
  })

  const modules = Array.from(new Set(rows.map(r => r.module))).sort()
  const statuses = Array.from(new Set(rows.map(r => r.status))).sort()

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">System Audit Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Immutable trail of sensitive actions across the BPM platform for Quezon City.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Entries Loaded', value: rows.length },
          { label: 'Filtered', value: filtered.length },
        ].map(s => (
          <div
            key={s.label}
            className="glass rounded-xl p-4"
            style={{ border: '1px solid rgba(148,163,184,0.08)' }}
          >
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            className="input-field pl-9"
            placeholder="Search by action, subject, or user…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-full md:w-52"
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
        >
          <option value="all">All modules</option>
          {modules.map(m => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="input-field w-full md:w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          {statuses.map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div
        className="glass rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(148,163,184,0.08)' }}
      >
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full min-w-[800px] text-xs">
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid rgba(148,163,184,0.08)',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                {[
                  'Time',
                  'Module',
                  'Action',
                  'Subject',
                  'User',
                  'Status',
                  'IP',
                ].map(h => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr
                  key={r.id}
                  className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-3 py-2 text-slate-300">
                    {new Date(r.timestamp).toLocaleString('en-PH')}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{r.module}</td>
                  <td className="px-3 py-2 text-slate-300">{r.action}</td>
                  <td className="px-3 py-2 text-slate-300">
                    {r.subject ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {r.performed_by ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {r.status}
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {r.ip_address ?? '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    {isLoading
                      ? 'Loading audit logs…'
                      : 'No audit entries match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
          <div className="bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-xl shadow-xl border border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {selected.action}
                </h3>
                <p className="text-xs text-slate-400">
                  {selected.module} ·{' '}
                  {new Date(selected.timestamp).toLocaleString('en-PH')}
                </p>
              </div>
              <button
                className="text-slate-400 text-xs hover:text-white"
                onClick={() => setSelected(null)}
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-slate-400">Subject</div>
                <div className="text-slate-200">
                  {selected.subject ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Performed by</div>
                <div className="text-slate-200">
                  {selected.performed_by ?? '—'}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Status</div>
                <div className="text-slate-200">{selected.status}</div>
              </div>
              <div>
                <div className="text-slate-400">IP Address</div>
                <div className="text-slate-200">
                  {selected.ip_address ?? '—'}
                </div>
              </div>
            </div>

            <div className="text-xs">
              <div className="text-slate-400 mb-1">Details (JSON)</div>
              <pre className="bg-slate-950/60 rounded-xl p-3 text-[11px] text-slate-200 overflow-auto max-h-56">
                {selected.details
                  ? (() => {
                      try {
                        const parsed = JSON.parse(selected.details)
                        return JSON.stringify(parsed, null, 2)
                      } catch {
                        return selected.details
                      }
                    })()
                  : '—'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
