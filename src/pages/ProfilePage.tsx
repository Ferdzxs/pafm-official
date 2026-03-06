import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Save, Camera, Loader2, CheckCircle } from 'lucide-react'

export default function ProfilePage() {
    const { user } = useAuth()
    const [saved, setSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        full_name: user?.full_name ?? '',
        email: user?.email ?? '',
        contact: '09171234567',
        address: 'Quezon City',
        current_password: '',
        new_password: '',
        confirm_password: '',
    })

    const handleSave = () => {
        setSaving(true)
        setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 3000) }, 1200)
    }

    if (!user) return null
    const meta = ROLE_META[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Profile</h1>
                <p className="text-slate-400 text-sm mt-0.5">Manage your account information</p>
            </div>

            {/* Avatar section */}
            <div className="glass rounded-2xl p-6 mb-5" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                <div className="flex items-center gap-5">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center text-white text-3xl font-bold">
                            {user.full_name.charAt(0)}
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-white border-2 border-slate-900">
                            <Camera size={12} />
                        </button>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">{user.full_name}</h2>
                        <p className="text-slate-400 text-sm">{user.email}</p>
                        <div className="mt-2 px-2.5 py-1 rounded-lg text-xs font-semibold inline-block" style={{ background: meta.bgColor, color: meta.color }}>
                            {meta.label}
                        </div>
                        {user.office && <p className="text-slate-500 text-xs mt-1">{user.office}</p>}
                    </div>
                </div>
            </div>

            {/* Personal info */}
            <div className="glass rounded-2xl p-6 mb-5" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Personal Information</h3>
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
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Password */}
            <div className="glass rounded-2xl p-6 mb-5" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                <h3 className="text-sm font-semibold text-white mb-4">Change Password</h3>
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
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? <><CheckCircle size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
            </button>
        </div>
    )
}
