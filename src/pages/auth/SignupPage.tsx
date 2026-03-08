import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
    const { signup } = useAuth()
    const navigate = useNavigate()
    const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
        if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
        setLoading(true)

        const { error: err } = await signup(form.full_name, form.email, form.password)
        setLoading(false)
        if (err) { setError(err); return }

        navigate('/dashboard')
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:px-6" style={{ background: 'var(--color-bg)' }}>
            <div className="w-full max-w-md">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">BPM</div>
                    <span className="font-display font-bold text-white text-lg">BPM System</span>
                </div>

                <div className="glass rounded-2xl p-8" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                    <h2 className="font-display font-bold text-2xl text-white mb-1">Create Account</h2>
                    <p className="text-slate-400 text-sm mb-8">Register as a citizen to access public services</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {[
                            { id: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Juan Dela Cruz' },
                            { id: 'email', label: 'Email Address', type: 'email', placeholder: 'you@gmail.com' },
                        ].map(f => (
                            <div key={f.id}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label}</label>
                                <input
                                    type={f.type}
                                    className="input-field"
                                    placeholder={f.placeholder}
                                    value={(form as any)[f.id]}
                                    onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                                    required
                                />
                            </div>
                        ))}

                        {['password', 'confirm'].map(field => (
                            <div key={field}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                                    {field === 'password' ? 'Password' : 'Confirm Password'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        className="input-field pr-10"
                                        placeholder="••••••••"
                                        value={(form as any)[field]}
                                        onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                                        required
                                    />
                                    {field === 'password' && (
                                        <button type="button" onClick={() => setShowPw(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-red-400 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                <AlertCircle size={14} /> {error}
                            </div>
                        )}

                        <button type="submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
                            {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create Account'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-xs text-slate-600">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
