import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Save, Camera, Loader2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/admin'
import {
    EXTERNAL_AUTH_PASSWORD_PLACEHOLDER,
    externalCitizenSupabase,
    persistExternalCitizenSessionFromClient,
    pickContactFromProfile,
    verifyCitizenPortalPassword,
} from '@/lib/externalCitizenPortal'
import {
    BPM_PERSON_SELECT_MINIMAL,
    computePersonAddress,
    computePersonFullName,
    fetchExternalCitizenProfileRow,
    pickAddressFromProfile,
    profileDisplayName,
} from '@/lib/citizenProfileDisplay'

const pickProfileValue = (profile: Record<string, any> | null, keys: string[]): string => {
    if (!profile) return 'Not provided'
    for (const key of keys) {
        const value = profile[key]
        if (value === null || value === undefined) continue
        if (typeof value === 'string' && value.trim()) return value
        if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    }
    return 'Not provided'
}

const pickProfileRawValue = (profile: Record<string, any> | null, keys: string[]): string => {
    if (!profile) return ''
    for (const key of keys) {
        const value = profile[key]
        if (value === null || value === undefined) continue
        if (typeof value === 'string' && value.trim()) return value.trim()
        if (typeof value === 'number' || typeof value === 'boolean') return String(value)
    }
    return ''
}

export default function ProfilePage() {
    const { user, updateSessionUser } = useAuth()
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [loadingProfile, setLoadingProfile] = useState(false)
    const [personId, setPersonId] = useState<string | null>(null)
    const [storedPassword, setStoredPassword] = useState<string | null>(null)
    const [externalLoading, setExternalLoading] = useState(false)
    /** Subsystem `profiles` row — loaded once per profile visit (personal info only). */
    const [externalProfile, setExternalProfile] = useState<Record<string, any> | null>(null)
    /** Local `person` row (and after successful external sync, merged from DB). */
    const [personRow, setPersonRow] = useState<Record<string, any> | null>(null)
    const [form, setForm] = useState({
        full_name: user?.full_name ?? '',
        email: user?.email ?? '',
        contact: '',
        address: '',
        current_password: '',
        new_password: '',
        confirm_password: '',
    })

    const canEditAddress = useMemo(() => !!user?.is_citizen, [user?.is_citizen])

    /** Password for linked citizens is validated in citizen portal Auth, not BPM `password_hash`. */
    const usesCitizenPortalPassword = useMemo(() => {
        if (!user?.is_citizen) return false
        if (!externalCitizenSupabase) return false
        if (user.id.startsWith('EXT-')) return true
        return storedPassword === EXTERNAL_AUTH_PASSWORD_PLACEHOLDER
    }, [user?.is_citizen, user?.id, storedPassword])

    useEffect(() => {
        if (!user) return
        const run = async () => {
            setLoadingProfile(true)
            try {
                if (user.is_citizen) {
                    const personSelect = BPM_PERSON_SELECT_MINIMAL
                    const acctSelect = `account_id, person_id, email, password_hash, person(${personSelect})`

                    // ① BPM database: citizen_account + person — single authoritative query.
                    //    full_name and address are auto-computed by the DB trigger from structured
                    //    fields (first_name / last_name / street_address etc.), so BPM is the
                    //    single source of truth for those two editable fields.
                    let { data: acctData, error: acctErr } = await supabase
                        .from('citizen_account')
                        .select(acctSelect)
                        .eq('account_id', user.id)
                        .maybeSingle()
                    if (acctErr) throw acctErr
                    if (!acctData && user.email?.trim()) {
                        const second = await supabase
                            .from('citizen_account')
                            .select(acctSelect)
                            .eq('email', user.email.trim())
                            .maybeSingle()
                        if (second.error) throw second.error
                        acctData = second.data
                    }
                    if (!acctData) throw new Error('Citizen account not found.')

                    const p = Array.isArray((acctData as any).person)
                        ? (acctData as any).person[0]
                        : (acctData as any).person
                    const pid = (acctData as any).person_id ?? p?.person_id ?? null
                    setPersonId(pid)
                    setStoredPassword((acctData as any).password_hash ?? null)

                    const localRow = p ?? null
                    setPersonRow(localRow)

                    // BPM person.full_name is the trigger-computed canonical name.
                    // If it is blank (trigger hadn't fired / old row), compute it client-side
                    // from the same component parts the trigger uses.
                    const computedName = computePersonFullName(localRow)
                    const bpmName =
                        (typeof localRow?.full_name === 'string' && localRow.full_name.trim()
                            ? localRow.full_name.trim()
                            : computedName) ||
                        user.full_name ||
                        user.email.split('@')[0] ||
                        'Citizen'

                    const bpmContact =
                        (typeof localRow?.contact_number === 'string' ? localRow.contact_number : '') || ''

                    // BPM person.address is the trigger-computed canonical address.
                    // Fall back to computing it client-side from the structured parts when blank.
                    const computedAddr = computePersonAddress(localRow)
                    const bpmAddr =
                        (typeof localRow?.address === 'string' && localRow.address.trim()
                            ? localRow.address.trim()
                            : computedAddr) || ''

                    setForm((prev) => ({
                        ...prev,
                        full_name: bpmName,
                        email: (acctData as any).email ?? user.email ?? prev.email,
                        contact: bpmContact,
                        address: bpmAddr,
                    }))
                    updateSessionUser({ full_name: bpmName })

                    // ② External citizen portal — read-only identity display only.
                    //    Loaded AFTER the form is set so the UI is never blocked waiting for it.
                    const extClient = externalCitizenSupabase
                    if (extClient) {
                        setExternalLoading(true)
                        fetchExternalCitizenProfileRow(extClient, {
                            accountId: user.id,
                            email: user.email,
                        })
                            .then((row) => setExternalProfile(row?.profile ?? null))
                            .catch((e) => {
                                console.warn('External citizen profile fetch failed; using BPM data only.', e)
                                setExternalProfile(null)
                            })
                            .finally(() => setExternalLoading(false))
                    } else {
                        setExternalProfile(null)
                    }
                } else {
                    const { data, error } = await supabase
                        .from('system_users')
                        .select('user_id, full_name, email, contact_no, password_hash')
                        .eq('user_id', user.id)
                        .maybeSingle()
                    if (error) throw error
                    if (!data) throw new Error('System user not found.')
                    setStoredPassword((data as any).password_hash ?? null)
                    setForm(prev => ({
                        ...prev,
                        full_name: (data as any).full_name ?? user.full_name ?? '',
                        email: (data as any).email ?? user.email ?? '',
                        contact: (data as any).contact_no ?? '',
                        address: prev.address ?? '',
                    }))
                }
            } catch (err: any) {
                console.error('Failed to load profile', err)
                toast.error(err?.message ?? 'Failed to load profile.')
            } finally {
                setLoadingProfile(false)
            }
        }
        void run()
    }, [user])

    const isSeedLikePassword = (hash: string | null) => !hash || hash === '' || hash.startsWith('$2b$')

    const verifyCurrentPasswordAsync = async (current: string): Promise<boolean> => {
        if (!current) return false
        if (user?.is_citizen && usesCitizenPortalPassword) {
            const ok = await verifyCitizenPortalPassword(user.email, current)
            return ok
        }
        if (isSeedLikePassword(storedPassword)) {
            if (user?.is_citizen) return current === 'citizen123' || current === 'admin123' || current === 'password'
            return current === 'admin123' || current === 'password'
        }
        return storedPassword === current
    }

    const handleSave = async () => {
        if (!user) return
        if (!form.full_name.trim() || !form.email.trim()) {
            toast.error('Full name and email are required.')
            return
        }
        if (form.new_password || form.confirm_password || form.current_password) {
            if (!(await verifyCurrentPasswordAsync(form.current_password))) {
                toast.error(
                    user?.is_citizen && usesCitizenPortalPassword
                        ? 'Current password is incorrect (use your citizen portal password).'
                        : 'Current password is incorrect.'
                )
                return
            }
            if (!form.new_password || form.new_password.length < 4) {
                toast.error('New password is too short.')
                return
            }
            if (form.new_password !== form.confirm_password) {
                toast.error('New password and confirmation do not match.')
                return
            }
        }

        setSaving(true)
        try {
            if (user.is_citizen) {
                const pid = personId
                if (!pid) throw new Error('Missing person record for this citizen.')

                const { error: pErr } = await supabase
                    .from('person')
                    .update({
                        full_name: form.full_name,
                        address: form.address || null,
                        contact_number: form.contact || null,
                    })
                    .eq('person_id', pid)
                if (pErr) throw pErr

                const { data: afterSave } = await supabase
                    .from('person')
                    .select(BPM_PERSON_SELECT_MINIMAL)
                    .eq('person_id', pid)
                    .maybeSingle()
                if (afterSave) setPersonRow(afterSave)

                const updates: any = { email: form.email }
                if (form.new_password) {
                    if (usesCitizenPortalPassword && externalCitizenSupabase) {
                        const { error: extPwdErr } = await externalCitizenSupabase.auth.updateUser({
                            password: form.new_password,
                        })
                        if (extPwdErr) throw new Error(extPwdErr.message ?? 'Failed to update password in citizen portal.')
                        await persistExternalCitizenSessionFromClient()
                        updates.password_hash = EXTERNAL_AUTH_PASSWORD_PLACEHOLDER
                    } else {
                        updates.password_hash = form.new_password
                    }
                }

                const { error: cErr } = await supabase
                    .from('citizen_account')
                    .update(updates)
                    .eq('account_id', user.id)
                if (cErr) throw cErr

                await logAudit({
                    action: 'profile_updated',
                    module: 'profile',
                    performed_by: user.email,
                    subject: user.id,
                    details: { is_citizen: true, email_changed: form.email !== user.email, password_changed: !!form.new_password },
                })
            } else {
                const updates: any = {
                    full_name: form.full_name,
                    email: form.email,
                    contact_no: form.contact || null,
                }
                if (form.new_password) updates.password_hash = form.new_password

                const { error } = await supabase
                    .from('system_users')
                    .update(updates)
                    .eq('user_id', user.id)
                if (error) throw error

                await logAudit({
                    action: 'profile_updated',
                    module: 'profile',
                    performed_by: user.email,
                    subject: user.id,
                    details: { is_citizen: false, email_changed: form.email !== user.email, password_changed: !!form.new_password },
                })
            }

            updateSessionUser({ full_name: form.full_name, email: form.email })
            if (form.new_password) {
                if (user.is_citizen && usesCitizenPortalPassword) {
                    setStoredPassword(EXTERNAL_AUTH_PASSWORD_PLACEHOLDER)
                } else {
                    setStoredPassword(form.new_password)
                }
            }
            setForm(prev => ({ ...prev, current_password: '', new_password: '', confirm_password: '' }))
            setSaved(true)
            toast.success('Profile updated.')
            setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            console.error('Failed to save profile', err)
            toast.error(err?.message ?? 'Failed to save profile.')
        } finally {
            setSaving(false)
        }
    }

    /** BPM `person` row (now includes all structured fields) is the primary source.
     *  External `profiles` is a fallback only for read-only identity display. */
    const displaySource = useMemo(() => {
        const row = personRow
        const ext = externalProfile
        const pick = (keys: string[]) => {
            // BPM person is authoritative — the DB trigger auto-computes fields from structured data.
            const fromRow = pickProfileValue(row, keys)
            if (fromRow !== 'Not provided') return fromRow
            // Fall back to external portal profile for display-only fields not yet synced into BPM.
            const fromExt = pickProfileValue(ext, keys)
            if (fromExt !== 'Not provided') return fromExt
            return 'Not provided'
        }
        return { row, ext, pick }
    }, [personRow, externalProfile])

    const citizenIdentityFields = [
        { label: 'First Name', value: displaySource.pick(['first_name', 'firstname', 'given_name']) },
        { label: 'Middle Name', value: displaySource.pick(['middle_name', 'middlename']) },
        { label: 'Last Name', value: displaySource.pick(['last_name', 'lastname', 'surname']) },
        { label: 'Suffix', value: displaySource.pick(['suffix', 'name_suffix']) },
        { label: 'Birth Date', value: displaySource.pick(['birth_date', 'date_of_birth', 'birthday']) },
        { label: 'Sex / Gender', value: displaySource.pick(['sex', 'gender']) },
        { label: 'Civil Status', value: displaySource.pick(['civil_status', 'marital_status']) },
    ]

    const citizenAddressFields = [
        { label: 'House / Street', value: displaySource.pick(['street_address', 'Street_address', 'address', 'full_address', 'residential_address']) },
        { label: 'Barangay', value: displaySource.pick(['barangay', 'barangay_name']) },
        { label: 'City / Municipality', value: displaySource.pick(['city', 'municipality']) },
        { label: 'Province', value: displaySource.pick(['province']) },
        { label: 'Postal Code', value: displaySource.pick(['postal_code', 'zip_code']) },
    ]

    if (!user) return null
    const meta = ROLE_META[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in ">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
                <p className="text-slate-400 text-sm mt-0.5">Manage your account information</p>
            </div>

            {/* Avatar section */}
            <div className="glass rounded-2xl p-6 mb-5">
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-3xl font-bold">
                            {(form.full_name || user.full_name || '?').charAt(0)}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white border-2 border-slate-900">
                            <Camera size={12} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{form.full_name || user.full_name}</h2>
                        <p className="text-slate-400 text-sm">{form.email || user.email}</p>
                        <div className="mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold inline-block" style={{ background: meta.bgColor, color: meta.color }}>
                            {meta.label}
                        </div>
                        {user.office && <p className="text-slate-500 text-xs mt-1">{user.office}</p>}
                    </div>
                </div>
            </div>

            {/* Personal info */}
            <div className="glass rounded-2xl p-6 mb-5">
                <h3 className="text-sm font-semibold text-white mb-4">Personal Information</h3>
                {user.is_citizen ? (
                    <div className="space-y-5">
                        <div>
                            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Identity Details</div>
                            {externalLoading ? (
                                <div className="text-sm text-slate-400 flex items-center gap-2">
                                    <Loader2 size={14} className="animate-spin" />
                                    Loading citizen details...
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {citizenIdentityFields.map((field) => (
                                        <div key={field.label}>
                                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{field.label}</label>
                                            <input className="input-field bg-surface-base" type="text" value={field.value} disabled />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email Address</label>
                                <input
                                    type="email"
                                    className="input-field"
                                    value={form.email}
                                    disabled={loadingProfile}
                                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Contact Number</label>
                                <input
                                    type="tel"
                                    className="input-field"
                                    value={form.contact}
                                    disabled={loadingProfile}
                                    onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
                                />

                            </div>
                        </div>

                        <div>
                            <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">Registered Address</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                {citizenAddressFields.map((field) => (
                                    <div key={field.label}>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{field.label}</label>
                                        <input className="input-field bg-slate-900/50" type="text" value={field.value} disabled />
                                    </div>
                                ))}
                            </div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Current Address </label>
                            <input
                                type="text"
                                className="input-field"
                                value={form.address}
                                disabled={loadingProfile || !canEditAddress}
                                onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {[
                            { key: 'full_name', label: 'Full Name', type: 'text' },
                            { key: 'email', label: 'Email Address', type: 'email' },
                            { key: 'contact', label: 'Contact Number', type: 'tel' },
                            { key: 'address', label: 'Address', type: 'text' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                                <input
                                    type={f.type}
                                    className="input-field"
                                    value={(form as any)[f.key]}
                                    disabled={loadingProfile || (f.key === 'address' && !canEditAddress)}
                                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                                />
                            </div>
                        ))}
                        {!canEditAddress && (
                            <div className="text-xs text-slate-500">
                                Address is managed at the citizen/person record level.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Password */}
            <div className="glass rounded-2xl p-6 mb-5">
                <h3 className="text-sm font-semibold text-white mb-4">Change Password</h3>
                {user.is_citizen && usesCitizenPortalPassword && (
                    <p className="text-xs text-slate-400 mb-3">
                        Current and new passwords apply to your <strong className="text-slate-300">citizen portal</strong> account.
                    </p>
                )}
                <div className="space-y-4">
                    {[
                        { key: 'current_password', label: 'Current Password' },
                        { key: 'new_password', label: 'New Password' },
                        { key: 'confirm_password', label: 'Confirm New Password' },
                    ].map(f => (
                        <div key={f.key}>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                            <input type="password" className="input-field" placeholder="••••••••" value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Save button */}
            <button className="btn-primary" onClick={() => { void handleSave() }} disabled={saving || loadingProfile}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
            </button>
        </div>
    )
}
