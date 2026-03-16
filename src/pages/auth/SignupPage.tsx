import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AlertCircle, Loader2, Eye, EyeOff, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        <div className="min-h-screen flex bg-background">
            {/* Left branding panel for large screens */}
            <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 bg-surface-subtle border-r border-border-subtle">
                <div>
                    <div className="w-11 h-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-sm">
                        BPM
                    </div>
                    <h1 className="font-display font-bold text-3xl text-text-primary-token leading-snug mb-3">
                        Citizen Account
                    </h1>
                    <p className="text-sm text-text-muted-token">
                        Register as a citizen to access Quezon City public services, including barangay facilities, parks, burial assistance, and more.
                    </p>
                </div>

                <div className="space-y-2 text-xs text-text-muted-token">
                    <div className="flex items-center gap-2">
                        <Shield className="size-3.5 text-primary" />
                        <span>Data is encrypted and handled according to city ICT policies.</span>
                    </div>
                    <p>© 2026 BPM System — Quezon City Government.</p>
                </div>
            </div>

            {/* Right: signup form */}
            <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-12">
                <div className="w-full max-w-md space-y-6">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                            BPM
                        </div>
                        <span className="font-display font-bold text-lg text-text-primary-token">BPM System</span>
                    </div>

                    <Card className="shadow-sm">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-2xl font-display">Create account</CardTitle>
                            <CardDescription>Register as a citizen to access public services.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {[
                                    { id: 'full_name', label: 'Full name', type: 'text', placeholder: 'Juan Dela Cruz' },
                                    { id: 'email', label: 'Email address', type: 'email', placeholder: 'you@gmail.com' },
                                ].map(f => (
                                    <div key={f.id} className="space-y-1.5">
                                        <Label htmlFor={f.id}>{f.label}</Label>
                                        <Input
                                            id={f.id}
                                            type={f.type}
                                            placeholder={f.placeholder}
                                            value={(form as any)[f.id]}
                                            onChange={e => setForm(prev => ({ ...prev, [f.id]: e.target.value }))}
                                            required
                                        />
                                    </div>
                                ))}

                                {['password', 'confirm'].map(field => (
                                    <div key={field} className="space-y-1.5">
                                        <Label htmlFor={field}>{field === 'password' ? 'Password' : 'Confirm password'}</Label>
                                        <div className="relative">
                                            <Input
                                                id={field}
                                                type={showPw ? 'text' : 'password'}
                                                className="pr-10"
                                                placeholder="••••••••"
                                                value={(form as any)[field]}
                                                onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                                                required
                                            />
                                            {field === 'password' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPw(v => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {error && (
                                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                                        <AlertCircle size={14} className="shrink-0" /> {error}
                                    </div>
                                )}

                                <Button type="submit" className="w-full justify-center" disabled={loading}>
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : 'Create account'}
                                </Button>
                            </form>

                            <div className="mt-5 text-center text-xs text-muted-foreground">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary hover:underline font-medium">
                                    Sign in
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
