import React, { useState } from 'react'
import { Search, Plus, UserPlus, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { ROLE_META } from '@/config/rbac'
import type { UserRole } from '@/types'
import { clsx } from 'clsx'

interface UserRow {
    id: string
    full_name: string
    email: string
    role: UserRole
    office?: string
    is_active: boolean
    created_at: string
}

const MOCK_USERS: UserRow[] = [
    { id: 'u1', full_name: 'Maria Santos', email: 'cemetery@bpm.gov', role: 'cemetery_office', office: 'Cemetery Management Office', is_active: true, created_at: '2024-01-01' },
    { id: 'u2', full_name: 'Juan dela Cruz', email: 'ssdd@bpm.gov', role: 'ssdd', office: 'Social Services Dev. Dept.', is_active: true, created_at: '2024-01-01' },
    { id: 'u3', full_name: 'Ana Reyes', email: 'death@bpm.gov', role: 'death_registration', office: 'Death Registration Division', is_active: true, created_at: '2024-01-01' },
    { id: 'u4', full_name: 'Pedro Bautista', email: 'citizen@gmail.com', role: 'citizen', office: undefined, is_active: true, created_at: '2024-01-15' },
    { id: 'u5', full_name: 'Lena Gosiengfiao', email: 'parks@bpm.gov', role: 'parks_admin', office: 'Parks & Recreation Administration', is_active: true, created_at: '2024-01-01' },
    { id: 'u6', full_name: 'Carlos Ramos', email: 'reservation@bpm.gov', role: 'reservation_officer', office: 'Barangay Reservation Desk', is_active: true, created_at: '2024-01-01' },
    { id: 'u7', full_name: 'Hon. Roberto Flores', email: 'barangay@bpm.gov', role: 'punong_barangay', office: 'Barangay 123 Office', is_active: true, created_at: '2024-01-01' },
    { id: 'u8', full_name: 'Engr. Rafael Cruz', email: 'utility@bpm.gov', role: 'utility_engineering', office: 'Utility Engineering Division', is_active: true, created_at: '2024-01-01' },
    { id: 'u9', full_name: 'Sharon Enriquez', email: 'helpdesk@bpm.gov', role: 'utility_helpdesk', office: 'Utility Business Area', is_active: true, created_at: '2024-01-01' },
    { id: 'u10', full_name: 'Dir. Carmela Ortiz', email: 'cgsd@bpm.gov', role: 'cgsd_management', office: 'CGSD Management', is_active: true, created_at: '2024-01-01' },
    { id: 'u11', full_name: 'Edwin Villanueva', email: 'famcd@bpm.gov', role: 'famcd', office: 'FAMCD', is_active: false, created_at: '2024-01-01' },
    { id: 'u12', full_name: 'Treasurer Marites Lim', email: 'treasurer@bpm.gov', role: 'treasurer', office: 'Finance Office', is_active: true, created_at: '2024-02-01' },
    { id: 'u13', full_name: 'System Administrator', email: 'admin@bpm.gov', role: 'system_admin', office: 'IT Department', is_active: true, created_at: '2024-01-01' },
]

export default function UserRoleManagement() {
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [users, setUsers] = useState(MOCK_USERS)

    const filtered = users.filter(u => {
        const q = search.toLowerCase()
        return (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            && (roleFilter === 'all' || u.role === roleFilter)
    })

    const toggleActive = (id: string) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u))
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">User & Role Management</h1>
                    <p className="text-slate-400 text-sm mt-0.5">RBAC — Employee & Citizen_Account registry</p>
                </div>
                <button className="btn-primary self-start sm:self-auto"><UserPlus size={15} /> Add User</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Users', value: users.length },
                    { label: 'Active', value: users.filter(u => u.is_active).length },
                    { label: 'Inactive', value: users.filter(u => !u.is_active).length },
                    { label: 'Citizen Accounts', value: users.filter(u => u.role === 'citizen').length },
                ].map(s => (
                    <div key={s.label} className="glass rounded-xl p-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <div className="text-2xl font-bold text-white">{s.value}</div>
                        <div className="text-xs text-slate-400">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                    <option value="all">All Roles</option>
                    {Object.entries(ROLE_META).map(([key, meta]) => (
                        <option key={key} value={key}>{meta.label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            {['User', 'Email', 'Role', 'Office', 'Status', 'Actions'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(u => {
                            const meta = ROLE_META[u.role]
                            return (
                                <tr key={u.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-white text-xs font-bold">
                                                {u.full_name.charAt(0)}
                                            </div>
                                            <span className="text-sm font-medium text-white">{u.full_name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{u.email}</td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
                                            {meta.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{u.office ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'badge-active' : 'badge-rejected'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => toggleActive(u.id)}
                                                className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-slate-500 hover:bg-white/10'}`}
                                                title={u.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {u.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Manage Roles">
                                                <Shield size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
