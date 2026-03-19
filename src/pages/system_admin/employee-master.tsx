import React, { useEffect, useMemo, useState } from 'react'
import { Search, UserPlus, Building2, Link2, ShieldAlert } from 'lucide-react'
import {
  fetchEmployees,
  fetchGovernmentOffices,
  upsertEmployee,
  linkEmployeeToSystemUser,
  type EmployeeRow,
  type GovernmentOfficeRow,
  fetchSystemUsers,
} from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { logAudit } from '@/lib/admin'

interface SystemUserLite {
  user_id: string
  email: string
  full_name: string
}

export default function EmployeeMaster() {
  const { user } = useAuth()
  const canManage = user?.role === 'system_admin'
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [offices, setOffices] = useState<GovernmentOfficeRow[]>([])
  const [systemUsers, setSystemUsers] = useState<SystemUserLite[]>([])
  const [search, setSearch] = useState('')
  const [officeFilter, setOfficeFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)
  const [editing, setEditing] = useState<EmployeeRow | null>(null)
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setIsLoading(true)
      try {
        const [emp, off, sys] = await Promise.all([
          fetchEmployees(),
          fetchGovernmentOffices(),
          fetchSystemUsers(),
        ])
        setEmployees(emp)
        setOffices(off)
        setSystemUsers(
          sys.map(u => ({
            user_id: u.user_id,
            email: u.email,
            full_name: u.full_name,
          })),
        )
      } finally {
        setIsLoading(false)
      }
    }
    void run()
  }, [])

  const officeName = (id: string | null) =>
    id ? offices.find(o => o.office_id === id)?.office_name ?? '—' : '—'

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return employees.filter(e => {
      const matchesSearch =
        e.full_name.toLowerCase().includes(q) ||
        (e.employee_no ?? '').toLowerCase().includes(q) ||
        (e.department ?? '').toLowerCase().includes(q) ||
        (e.position_title ?? '').toLowerCase().includes(q) ||
        (e.email ?? '').toLowerCase().includes(q)
      const matchesOffice = officeFilter === 'all' || e.office_id === officeFilter
      return matchesSearch && matchesOffice
    })
  }, [employees, officeFilter, search])

  const employeesByOffice = useMemo(() => {
    const map = new Map<string, EmployeeRow[]>()
    for (const e of filtered) {
      const key = e.office_id ?? 'unassigned'
      const arr = map.get(key) ?? []
      arr.push(e)
      map.set(key, arr)
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.full_name.localeCompare(b.full_name))
      map.set(k, arr)
    }
    return map
  }, [filtered])

  const startCreate = () => {
    if (!canManage) return
    setEditing({
      employee_id: '',
      office_id: null,
      full_name: '',
      position_title: '',
      department: '',
      employee_no: '',
      contact_number: '',
      is_active: true,
      email: '',
      system_user_id: null,
    })
  }

  const handleSave = async () => {
    if (!editing) return
    if (!editing.full_name.trim()) return
    if (!canManage) return
    setIsLoading(true)
    try {
      await upsertEmployee(editing)
      await logAudit({
        action: editing.employee_id ? 'employee_updated' : 'employee_created',
        module: 'admin_employees',
        performed_by: user?.email,
        subject: editing.full_name,
        details: editing,
      })
      const latest = await fetchEmployees()
      setEmployees(latest)
      setEditing(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLink = async (row: EmployeeRow, systemUserId: string | null) => {
    if (!canManage) return
    setIsLoading(true)
    try {
      await linkEmployeeToSystemUser(row.employee_id, systemUserId)
      await logAudit({
        action: systemUserId ? 'employee_linked_user' : 'employee_unlinked_user',
        module: 'admin_employees',
        performed_by: user?.email,
        subject: row.full_name,
        details: { employee_id: row.employee_id, system_user_id: systemUserId },
      })
      const latest = await fetchEmployees()
      setEmployees(latest)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Government Directory</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Browse offices, staff directory, and linked system accounts.
          </p>
        </div>
        {canManage ? (
          <button className="btn-primary self-start sm:self-auto" onClick={startCreate}>
            <UserPlus size={15} /> Add Employee
          </button>
        ) : (
          <div className="glass rounded-xl px-3 py-2 text-xs text-slate-300 self-start sm:self-auto" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
            <span className="inline-flex items-center gap-2">
              <ShieldAlert size={14} className="text-slate-400" />
              View-only (admin can manage directory)
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Employees', value: employees.length },
          { label: 'Active', value: employees.filter(e => e.is_active).length },
          { label: 'With System User', value: employees.filter(e => e.system_user_id).length },
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

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            className="input-field pl-9"
            placeholder="Search by name, ID, or department…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-full sm:w-72"
          value={officeFilter}
          onChange={e => setOfficeFilter(e.target.value)}
        >
          <option value="all">All Offices</option>
          <option value="unassigned">Unassigned</option>
          {offices.map(o => (
            <option key={o.office_id} value={o.office_id}>
              {o.office_name}
            </option>
          ))}
        </select>
      </div>

      {editing && (
        <div
          className="glass rounded-2xl p-4 mb-6"
          style={{ border: '1px solid rgba(148,163,184,0.18)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">
              {editing.employee_id ? 'Edit Employee' : 'Create Employee'}
            </h2>
            <button
              className="text-slate-400 text-xs hover:text-white"
              onClick={() => setEditing(null)}
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <input
              className="input-field"
              placeholder="Full name"
              value={editing.full_name}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, full_name: e.target.value } : prev,
                )
              }
            />
            <input
              className="input-field"
              placeholder="Employee no."
              value={editing.employee_no ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, employee_no: e.target.value } : prev,
                )
              }
            />
            <input
              className="input-field"
              placeholder="Position title"
              value={editing.position_title ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, position_title: e.target.value } : prev,
                )
              }
            />
            <input
              className="input-field"
              placeholder="Department"
              value={editing.department ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, department: e.target.value } : prev,
                )
              }
            />
            <select
              className="input-field"
              value={editing.office_id ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev
                    ? {
                        ...prev,
                        office_id: e.target.value || null,
                      }
                    : prev,
                )
              }
            >
              <option value="">No office assigned</option>
              {offices.map(o => (
                <option key={o.office_id} value={o.office_id}>
                  {o.office_name}
                </option>
              ))}
            </select>
            <input
              className="input-field"
              placeholder="Contact number"
              value={editing.contact_number ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, contact_number: e.target.value } : prev,
                )
              }
            />
            <input
              className="input-field"
              placeholder="Email"
              value={editing.email ?? ''}
              onChange={e =>
                setEditing(prev =>
                  prev ? { ...prev, email: e.target.value } : prev,
                )
              }
            />
            <select
              className="input-field"
              value={editing.is_active ? 'active' : 'inactive'}
              onChange={e =>
                setEditing(prev =>
                  prev
                    ? { ...prev, is_active: e.target.value === 'active' }
                    : prev,
                )
              }
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2 text-xs">
            <button
              className="btn-secondary"
              onClick={() => setEditing(null)}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isLoading || !canManage}
            >
              {isLoading ? 'Saving…' : 'Save Employee'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {Array.from(employeesByOffice.entries()).map(([officeId, list]) => {
          const isExpanded = expandedOffice === officeId
          const label =
            officeId === 'unassigned'
              ? 'Unassigned'
              : officeName(officeId === 'unassigned' ? null : officeId)
          return (
            <div key={officeId} className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
              <button
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/3 transition-colors"
                onClick={() => setExpandedOffice(prev => (prev === officeId ? null : officeId))}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center text-white">
                    <Building2 size={16} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">{label}</div>
                    <div className="text-xs text-slate-400">{list.length} employee(s)</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{isExpanded ? 'Hide' : 'View'}</div>
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[840px]">
                    <thead>
                      <tr style={{ borderTop: '1px solid rgba(148,163,184,0.08)', borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                        {['Employee', 'Position', 'Department', 'Email', 'Status', 'Linked Account', 'Actions'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(e => {
                        const linkedUser = e.system_user_id
                          ? systemUsers.find(s => s.user_id === e.system_user_id)
                          : undefined
                        return (
                          <tr key={e.employee_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                                  {e.full_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-white">{e.full_name}</div>
                                  <div className="text-xs text-slate-500">{e.employee_no ?? '—'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">{e.position_title ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">{e.department ?? '—'}</td>
                            <td className="px-4 py-3 text-sm text-slate-400">{e.email ?? '—'}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${e.is_active ? 'badge-active' : 'badge-rejected'}`}>
                                {e.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-400">
                              {linkedUser ? (
                                <span className="inline-flex items-center gap-2">
                                  <Link2 size={14} className="text-slate-500" />
                                  {linkedUser.email}
                                </span>
                              ) : (
                                <span className="text-slate-500">Not linked</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                {canManage && (
                                  <>
                                    <button
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
                                      onClick={() => setEditing(e)}
                                    >
                                      Edit
                                    </button>
                                    <select
                                      className="input-field text-xs w-52"
                                      value={e.system_user_id ?? ''}
                                      onChange={ev => handleLink(e, ev.target.value || null)}
                                    >
                                      <option value="">
                                        {linkedUser ? 'Unlink account' : 'Link to system user'}
                                      </option>
                                      {systemUsers.map(su => (
                                        <option key={su.user_id} value={su.user_id}>
                                          {su.email}
                                        </option>
                                      ))}
                                    </select>
                                  </>
                                )}
                                {!canManage && <span className="text-xs text-slate-500">—</span>}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="glass rounded-2xl p-6 text-center text-sm text-slate-400" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
            {isLoading ? 'Loading directory…' : 'No employees match your filters.'}
          </div>
        )}
      </div>
    </div>
  )
}
