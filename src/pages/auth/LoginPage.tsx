import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth, DEMO_USERS } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Eye, EyeOff, AlertCircle, Loader2, ChevronDown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showDemo, setShowDemo] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        const { error: err } = await login(email, password)
        setLoading(false)
        if (err) { setError(err); return }
        navigate('/dashboard')
    }

    const fillDemo = (demoEmail: string) => {
        const u = DEMO_USERS[demoEmail]
        setEmail(demoEmail)
        setPassword(u.password)
        setShowDemo(false)
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* ─── Left branding panel ─── */}
            <div className="hidden lg:flex flex-col justify-between w-[460px] flex-shrink-0 p-12 border-r border-border-subtle bg-surface-subtle">
                <div className="relative z-10">
                    <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg mb-8 shadow-sm">
                        BPM
                    </div>
                    <h1 className="font-display font-bold text-3xl text-text-primary-token leading-tight mb-4">
                        Public Assets &<br />Facilities Management
                    </h1>
                    <p className="text-sm text-text-muted-token leading-relaxed">
                        A unified civic operations platform for Quezon City — cemetery management, parks, barangay facilities, water supply, and asset tracking.
                    </p>
                </div>

                <div className="relative z-10 space-y-3">
                    {[
                        'Cemetery & burial management',
                        'Parks & recreation scheduling',
                        'Barangay facility reservations',
                        'Water supply & drainage',
                        'Asset inventory tracking',
                    ].map(label => (
                        <div key={label} className="flex items-center gap-3">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] text-muted-foreground">
                                •
                            </span>
                            <span className="text-xs text-text-muted-token">{label}</span>
                        </div>
                    ))}
                    <div className="mt-8 text-xs text-text-muted-token pt-4 border-t border-border-subtle">
                        © 2026 BPM System — Quezon City Government. All rights reserved.
                    </div>
                </div>
            </div>

            {/* ─── Right panel: Login form ─── */}
            <div className="flex-1 flex items-center justify-center px-4 py-6 sm:px-6 lg:px-12">
                <div className="w-full max-w-md space-y-6">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 lg:hidden">
                        <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">BPM</div>
                        <span className="font-display font-bold text-lg text-foreground">BPM System</span>
                    </div>

                    <Card className="shadow-xl border-border">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Shield className="size-4 text-primary" />
                                <Badge variant="secondary" className="text-xs">Secure Login</Badge>
                            </div>
                            <CardTitle className="text-2xl font-display">Welcome back</CardTitle>
                            <CardDescription>Sign in to your account to continue</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@bpm.gov.ph"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="password">Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPw ? 'text' : 'password'}
                                            placeholder="••••••••"
                                            className="pr-10"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPw(v => !v)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                                        <AlertCircle size={14} className="shrink-0" />
                                        {error}
                                    </div>
                                )}

                                <Button id="login-submit" type="submit" className="w-full" disabled={loading}>
                                    {loading ? <><Loader2 size={15} className="animate-spin" /> Signing in…</> : 'Sign In'}
                                </Button>
                            </form>

                            {/* Demo quick login */}
                            <div className="mt-5">
                                <button
                                    onClick={() => setShowDemo(v => !v)}
                                    className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs border border-dashed border-border text-muted-foreground hover:bg-accent transition-colors"
                                >
                                    <span>🔑 Demo — Quick Role Login</span>
                                    <ChevronDown size={12} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
                                </button>

                                {showDemo && (
                                    <div className="mt-2 rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
                                        {Object.entries(DEMO_USERS).map(([em, u]) => {
                                            const meta = ROLE_META[u.role]
                                            return (
                                                <button
                                                    key={em}
                                                    onClick={() => fillDemo(em)}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0"
                                                >
                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: meta.color }} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-xs font-semibold truncate text-foreground">{meta.label}</div>
                                                        <div className="text-[10px] truncate text-muted-foreground">{em}</div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-5 text-center text-xs text-muted-foreground">
                                New citizen?{' '}
                                <Link to="/signup" className="text-primary hover:underline font-medium">
                                    Create an account
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
