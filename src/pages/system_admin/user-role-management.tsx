import React, { useEffect, useState } from 'react'
import { Search, UserPlus, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { ROLE_META } from '@/config/rbac'
import type { UserRole } from '@/types'
import { fetchSystemUsers, createSystemUser, toggleSystemUserActive, logAudit, updateSystemUser } from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function UserRoleManagement() {
    const { user } = useAuth()
    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState('all')
    const [users, setUsers] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [showAdd, setShowAdd] = useState(false)
    const [managingUser, setManagingUser] = useState<any | null>(null)
    const [manageDraft, setManageDraft] = useState<{ role: UserRole | ''; department: string; email: string; password: string }>({
        role: '',
        department: '',
        email: '',
        password: '',
    })
    const [newUser, setNewUser] = useState<{ full_name: string; email: string; role: UserRole | ''; department: string; contact_no: string; password: string }>({
        full_name: '',
        email: '',
        role: '',
        department: '',
        contact_no: '',
        password: '',
    })

    const loadAllUsers = async () => {
        // 1) Load internal system users
        const coreUsers = await fetchSystemUsers()

        // 2) Load citizen accounts joined to person for full_name
        const { data: people, error } = await supabase
            .from('person')
            .select('person_id, full_name, citizen_account(account_id, email, verification_status, registered_date)')
            .order('full_name', { ascending: true })

        if (error) throw error

        const citizenUsers: any[] =
            (people ?? []).flatMap((p: any) => {
                const acc = (p.citizen_account && p.citizen_account[0]) || null
                if (!acc) return []
                return [{
                    user_id: acc.account_id,
                    full_name: p.full_name ?? '(No name)',
                    email: acc.email,
                    role: 'citizen',
                    department: 'Citizen',
                    contact_no: null,
                    is_active: acc.verification_status === 'verified',
                    created_at: acc.registered_date ?? null,
                }]
            })

        setUsers([...coreUsers, ...citizenUsers])
    }

    useEffect(() => {
        const run = async () => {
            setIsLoading(true)
            try {
                await loadAllUsers()
            } catch (err: any) {
                console.error('Failed to load users', err)
                toast.error('Failed to load users. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }
        void run()
    }, [])

    const filtered = users.filter(u => {
        const q = search.toLowerCase()
        return (u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
            && (roleFilter === 'all' || u.role === roleFilter)
    })

    const handleToggleActive = async (row: any) => {
        const next = !row.is_active

        try {
            // Optimistic UI update
            setUsers(prev => prev.map(u => u.user_id === row.user_id ? { ...u, is_active: next } : u))

            if (row.role === 'citizen') {
                // Toggle verification_status on citizen_account
                const nextStatus = next ? 'verified' : 'pending'
                const { error } = await supabase
                    .from('citizen_account')
                    .update({ verification_status: nextStatus })
                    .eq('account_id', row.user_id)

                if (error) throw error

                await logAudit({
                    action: next ? 'citizen_verified' : 'citizen_verification_reverted',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: row.email,
                    details: { account_id: row.user_id, next_status: nextStatus },
                })
            } else {
                // Toggle active flag on system_users
                await toggleSystemUserActive(row.user_id, next)
                await logAudit({
                    action: next ? 'user_activated' : 'user_deactivated',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: row.email,
                    details: { user_id: row.user_id, next_active: next },
                })
            }

            toast.success(next ? 'User activated.' : 'User deactivated.')
        } catch (err: any) {
            // Revert optimistic update on error
            setUsers(prev => prev.map(u => u.user_id === row.user_id ? { ...u, is_active: !next } : u))
            console.error('Toggle failed', err)
            toast.error('Failed to update status. Please try again.')
        }
    }

    const handleAddUser = async () => {
        if (!newUser.full_name || !newUser.email || !newUser.role) return
        setIsLoading(true)
        try {
            if (newUser.role === 'citizen') {
                // Prevent conflicts across both registries
                const { data: existingCitizen } = await supabase
                    .from('citizen_account')
                    .select('email')
                    .eq('email', newUser.email)
                    .maybeSingle()
                if (existingCitizen) throw new Error('Email is already registered as a citizen account.')

                const { data: existingSystem } = await supabase
                    .from('system_users')
                    .select('email')
                    .eq('email', newUser.email)
                    .maybeSingle()
                if (existingSystem) throw new Error('Email is already registered as a system user.')

                const accountId = 'ACC-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
                const personId = 'PER-' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0')

                // Insert person first (ties to citizen_account via person_id)
                const { error: pErr } = await supabase.from('person').insert({
                    person_id: personId,
                    full_name: newUser.full_name,
                    contact_number: newUser.contact_no || null,
                    account_id: accountId,
                })
                if (pErr) throw pErr

                const currentYear = new Date().getFullYear()
                const registryRef = 'REG-' + currentYear + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')

                // Insert citizen account
                const today = new Date().toISOString().split('T')[0]
                const { error: cErr } = await supabase.from('citizen_account').insert({
                    account_id: accountId,
                    person_id: personId,
                    email: newUser.email,
                    password_hash: (newUser.password || 'admin123'),
                    verification_status: 'pending',
                    registered_date: today,
                    registry_ref_no: registryRef,
                })

                if (cErr) {
                    // Best-effort cleanup if the second insert fails
                    await supabase.from('person').delete().eq('person_id', personId)
                    throw cErr
                }

                await logAudit({
                    action: 'citizen_account_created',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: newUser.email,
                    details: { role: 'citizen', account_id: accountId, person_id: personId, verification_status: 'pending' },
                })
            } else {
                await createSystemUser({
                    full_name: newUser.full_name,
                    email: newUser.email,
                    role: newUser.role,
                    department: newUser.department,
                    contact_no: newUser.contact_no,
                    password: newUser.password || 'admin123',
                })
                await logAudit({
                    action: 'user_created',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: newUser.email,
                    details: { role: newUser.role, department: newUser.department },
                })
            }

            await loadAllUsers()
            setShowAdd(false)
            setNewUser({ full_name: '', email: '', role: '', department: '', contact_no: '', password: '' })
            toast.success('User created and registry refreshed.')
        } catch (err: any) {
            console.error('Failed to create user', err)
            toast.error('Failed to create user. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    const openManageRoles = (row: any) => {
        setManagingUser(row)
        setManageDraft({
            role: row.role as UserRole,
            department: row.department ?? '',
            email: row.email ?? '',
            password: '',
        })
    }

    const handleSaveManageRoles = async () => {
        if (!managingUser || !manageDraft.role || !manageDraft.email) return
        setIsLoading(true)
        try {
            const before = { role: managingUser.role, department: managingUser.department, email: managingUser.email }

            if (managingUser.role === 'citizen') {
                const updates: any = { email: manageDraft.email }
                if (manageDraft.password) {
                    updates.password_hash = manageDraft.password
                }
                const { error } = await supabase
                    .from('citizen_account')
                    .update(updates)
                    .eq('account_id', managingUser.user_id)

                if (error) throw error

                await logAudit({
                    action: 'citizen_credentials_updated',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: manageDraft.email,
                    details: {
                        account_id: managingUser.user_id,
                        before,
                        after: { role: managingUser.role, department: manageDraft.department, email: manageDraft.email },
                        password_changed: !!manageDraft.password,
                    },
                })
            } else {
                const patch: any = {
                    role: manageDraft.role,
                    department: manageDraft.department || null,
                    email: manageDraft.email,
                }
                if (manageDraft.password) {
                    patch.password_hash = manageDraft.password
                }
                await updateSystemUser(managingUser.user_id, patch as any)

                await logAudit({
                    action: 'user_role_or_credentials_updated',
                    module: 'admin_users',
                    performed_by: user?.email,
                    subject: manageDraft.email,
                    details: {
                        user_id: managingUser.user_id,
                        before,
                        after: { role: manageDraft.role, department: manageDraft.department, email: manageDraft.email },
                        password_changed: !!manageDraft.password,
                    },
                })
            }

            await loadAllUsers()
            setManagingUser(null)
            toast.success('User account updated.')
        } catch (err: any) {
            console.error('Failed to update account', err)
            toast.error('Failed to update account. Please try again.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">User & Role Management</h1>
                    <p className="text-slate-400 text-sm mt-0.5">RBAC — Employee & Citizen_Account registry</p>
                </div>
                <button
                    className="btn-primary self-start sm:self-auto"
                    onClick={() => setShowAdd(true)}
                >
                    <UserPlus size={15} /> Add User
                </button>
            </div>

            {showAdd && (
                <div className="glass rounded-2xl p-4 mb-6" style={{ border: '1px solid rgba(148,163,184,0.18)' }}>
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-semibold text-white">Create System User</h2>
                        <button className="text-slate-400 text-xs hover:text-white" onClick={() => setShowAdd(false)}>Close</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <input
                            className="input-field"
                            placeholder="Full name"
                            value={newUser.full_name}
                            onChange={e => setNewUser(v => ({ ...v, full_name: e.target.value }))}
                        />
                        <input
                            className="input-field"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser(v => ({ ...v, email: e.target.value }))}
                        />
                        <select
                            className="input-field"
                            value={newUser.role}
                            onChange={e => setNewUser(v => ({ ...v, role: e.target.value as UserRole }))}
                        >
                            <option value="">Select role…</option>
                            {Object.entries(ROLE_META).map(([key, meta]) => (
                                <option key={key} value={key}>{meta.label}</option>
                            ))}
                        </select>
                        <input
                            className="input-field"
                            placeholder="Department / Office"
                            value={newUser.department}
                            onChange={e => setNewUser(v => ({ ...v, department: e.target.value }))}
                        />
                        <input
                            className="input-field"
                            placeholder="Contact number"
                            value={newUser.contact_no}
                            onChange={e => setNewUser(v => ({ ...v, contact_no: e.target.value }))}
                        />
                        <input
                            className="input-field"
                            type="password"
                            placeholder="Initial password (optional, defaults to admin123)"
                            value={newUser.password}
                            onChange={e => setNewUser(v => ({ ...v, password: e.target.value }))}
                        />
                    </div>
                    <div className="mt-4 flex justify-end gap-2 text-xs">
                        <button className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
                        <button className="btn-primary" onClick={handleAddUser} disabled={isLoading}>
                            {isLoading ? 'Saving…' : 'Save User'}
                        </button>
                    </div>
                </div>
            )}

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
                <div className="relative flex-1 sm:flex-[2]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-64" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
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
                            const meta = ROLE_META[u.role as UserRole]
                            const badgeStyle = meta
                                ? { background: meta.bgColor, color: meta.color }
                                : { background: 'rgba(148,163,184,0.16)', color: '#e5e7eb' }
                            const label = meta?.label ?? (u.role || 'Unknown')
                            return (
                                <tr key={u.user_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
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
                                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={badgeStyle}>
                                            {label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{u.department ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.is_active ? 'badge-active' : 'badge-rejected'}`}>
                                            {u.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => { void handleToggleActive(u) }}
                                                className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-slate-500 hover:bg-white/10'}`}
                                                title={u.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {u.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                            </button>
                                            <button
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                title="Manage Account & Roles"
                                                onClick={() => openManageRoles(u)}
                                            >
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

            {managingUser && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-700 p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-semibold text-white">Manage Roles & Office</h2>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    {managingUser.full_name} · {managingUser.email}
                                </p>
                            </div>
                            <button
                                className="text-slate-400 text-xs hover:text-white"
                                onClick={() => setManagingUser(null)}
                            >
                                Close
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                            <div>
                                <label className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                    Role
                                </label>
                                <select
                                    className="input-field text-sm"
                                    value={manageDraft.role}
                                    onChange={e => setManageDraft(prev => ({ ...prev, role: e.target.value as UserRole }))}
                                >
                                    <option value="">Select role…</option>
                                    {Object.entries(ROLE_META).map(([key, meta]) => (
                                        <option key={key} value={key}>{meta.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                    Email
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="Email"
                                    value={manageDraft.email}
                                    onChange={e => setManageDraft(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                    Department / Office
                                </label>
                                <input
                                    className="input-field"
                                    placeholder="Department / Office"
                                    value={manageDraft.department}
                                    onChange={e => setManageDraft(prev => ({ ...prev, department: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                                    Reset Password
                                </label>
                                <input
                                    className="input-field"
                                    type="password"
                                    placeholder="Leave blank to keep current password"
                                    value={manageDraft.password}
                                    onChange={e => setManageDraft(prev => ({ ...prev, password: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 text-xs mt-2">
                            <button
                                className="btn-secondary"
                                onClick={() => setManagingUser(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveManageRoles}
                                disabled={isLoading || !manageDraft.role}
                            >
                                {isLoading ? 'Saving…' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
