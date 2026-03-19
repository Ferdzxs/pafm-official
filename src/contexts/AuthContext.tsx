import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, UserRole, NotificationLog } from '@/types'
import { supabase } from '@/lib/supabase'
import { logAudit } from '@/lib/admin'

// ─── Mock demo users for the UI dropdown ───────────────────────────────────────
export const DEMO_USERS: Record<string, { role: UserRole, password: string }> = {
    'cemetery@bpm.qc.gov.ph': { role: 'cemetery_office', password: 'admin123' },
    'ssdd@bpm.qc.gov.ph': { role: 'ssdd', password: 'admin123' },
    'admin@bpm.qc.gov.ph': { role: 'system_admin', password: 'admin123' },
    'secretary@bpm.qc.gov.ph': { role: 'barangay_secretary', password: 'admin123' },
    'punong@bpm.qc.gov.ph': { role: 'punong_barangay', password: 'admin123' },
    'treasurer@bpm.qc.gov.ph': { role: 'treasurer', password: 'admin123' },
    'utility@bpm.qc.gov.ph': { role: 'utility_engineering', password: 'admin123' },
    'parks@bpm.qc.gov.ph': { role: 'parks_admin', password: 'admin123' },
    'desk@bpm.qc.gov.ph': { role: 'reservation_officer', password: 'admin123' },
    'deathreg@bpm.qc.gov.ph': { role: 'death_registration', password: 'admin123' },
    'famcd@bpm.qc.gov.ph': { role: 'famcd', password: 'admin123' },
    'citizen@bpm.qc.gov.ph': { role: 'citizen', password: 'admin123' },
    'juan.delacruz@email.com': { role: 'citizen', password: 'citizen123' }
}

function titleFromNotifType(t?: string | null) {
    const raw = (t ?? '').replace(/_/g, ' ').trim()
    if (!raw) return 'Notification'
    return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function levelFromNotifType(t?: string | null): NotificationLog['notif_type'] {
    if (!t) return 'info'
    if (t.includes('approved') || t.includes('validated') || t.includes('completed') || t.includes('settled')) return 'success'
    if (t.includes('rejected') || t.includes('disapproved') || t.includes('failed')) return 'error'
    if (t.includes('pending') || t.includes('incomplete')) return 'warning'
    return 'info'
}

async function fetchCitizenNotifications(accountId: string): Promise<NotificationLog[]> {
    const { data } = await supabase
        .from('notification_log')
        .select('notif_id, account_id, notif_type, message, sent_at')
        .eq('account_id', accountId)
        .order('sent_at', { ascending: false })
        .limit(30)

    return (data ?? []).map((n: any) => ({
        notif_id: n.notif_id,
        user_id: n.account_id,
        title: titleFromNotifType(n.notif_type),
        message: n.message ?? '',
        is_read: false, // DB schema in init_db.sql has no is_read; keep UI-local
        notif_type: levelFromNotifType(n.notif_type),
        created_at: n.sent_at ?? new Date().toISOString(),
    }))
}

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextType {
    user: AuthUser | null
    notifications: NotificationLog[]
    unreadCount: number
    login: (email: string, password: string) => Promise<{ error?: string }>
    signup: (fullName: string, email: string, password: string) => Promise<{ error?: string }>
    logout: () => void
    markNotifRead: (id: string) => void
    updateSessionUser: (patch: Partial<AuthUser>) => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [notifications, setNotifications] = useState<NotificationLog[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const updateSessionUser = (patch: Partial<AuthUser>) => {
        setUser(prev => {
            if (!prev) return prev
            const next = { ...prev, ...patch }
            localStorage.setItem('bpm_user', JSON.stringify(next))
            return next
        })
    }

    useEffect(() => {
        const stored = localStorage.getItem('bpm_user')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setUser(parsed)

                // Validate session remotely to ensure user isn't inactive/unverified 
                if (parsed.role === 'citizen') {
                    void supabase.from('citizen_account').select('verification_status').eq('account_id', parsed.id).maybeSingle().then(({ data }) => {
                        if (data && data.verification_status !== 'verified') {
                            setUser(null)
                            localStorage.removeItem('bpm_user')
                        } else {
                            void fetchCitizenNotifications(parsed.id).then(setNotifications)
                        }
                    })
                } else {
                    void supabase.from('system_users').select('is_active').eq('user_id', parsed.id).maybeSingle().then(({ data }) => {
                        if (data && !data.is_active) {
                            setUser(null)
                            localStorage.removeItem('bpm_user')
                        } else {
                            setNotifications([])
                        }
                    })
                }
            } catch { }
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)
        try {
            // First check system_users
            const { data: sysUser, error: sysErr } = await supabase
                .from('system_users')
                .select('*')
                .eq('email', email)
                .maybeSingle()

            if (sysUser) {
                const storedHash = (sysUser as any).password_hash as string | null
                const isSeedLike = !storedHash || storedHash === '' || storedHash.startsWith('$2b$')
                if (!sysUser.is_active) {
                    setIsLoading(false)
                    void logAudit({
                        action: 'login_failed',
                        module: 'auth',
                        status: 'error',
                        subject: sysUser.user_id,
                        performed_by: email,
                        details: { reason: 'account_inactive', is_citizen: false },
                    })
                    return { error: 'Your account is currently inactive. Please contact the administrator.' }
                }

                if (isSeedLike) {
                    if (password !== 'admin123' && password !== 'password') {
                        setIsLoading(false)
                        void logAudit({
                            action: 'login_failed',
                            module: 'auth',
                            status: 'error',
                            subject: sysUser.user_id,
                            performed_by: email,
                            details: { reason: 'invalid_password', is_citizen: false },
                        })
                        return { error: 'Invalid password. Try admin123' }
                    }
                } else {
                    if (storedHash !== password) {
                        setIsLoading(false)
                        void logAudit({
                            action: 'login_failed',
                            module: 'auth',
                            status: 'error',
                            subject: sysUser.user_id,
                            performed_by: email,
                            details: { reason: 'invalid_password', is_citizen: false },
                        })
                        return { error: 'Invalid password.' }
                    }
                }

                // Map legacy / seed roles to the frontend UserRole keys
                const normalizedRole = (() => {
                    switch (sysUser.role) {
                        case 'utility_engineer':
                            return 'utility_engineering'
                        case 'reservation_desk':
                            return 'reservation_officer'
                        default:
                            return sysUser.role
                    }
                })()

                const safeUser: AuthUser = {
                    id: sysUser.user_id,
                    email: sysUser.email,
                    role: normalizedRole as any,
                    full_name: sysUser.full_name,
                    is_citizen: false,
                    office: sysUser.department
                }
                setUser(safeUser)
                setNotifications([])
                localStorage.setItem('bpm_user', JSON.stringify(safeUser))
                setIsLoading(false)
                void logAudit({
                    action: 'login',
                    module: 'auth',
                    status: 'success',
                    subject: safeUser.id,
                    performed_by: safeUser.email,
                    details: { role: safeUser.role, is_citizen: false },
                })
                return {}
            }

            // Check citizen_account
            const { data: citAcc, error: citErr } = await supabase
                .from('citizen_account')
                .select('*, person(*)')
                .eq('email', email)
                .maybeSingle()

            if (citAcc) {
                const storedHash = citAcc.password_hash
                const isSeedData = storedHash?.startsWith('$2b$')
                if (isSeedData) {
                    if (password !== 'citizen123' && password !== 'admin123' && password !== 'password') {
                        setIsLoading(false)
                        void logAudit({
                            action: 'login_failed',
                            module: 'auth',
                            status: 'error',
                            subject: citAcc.account_id,
                            performed_by: email,
                            details: { reason: 'invalid_password', is_citizen: true },
                        })
                        return { error: 'Invalid password. Try citizen123' }
                    }
                } else {
                    if (storedHash !== password) {
                        setIsLoading(false)
                        void logAudit({
                            action: 'login_failed',
                            module: 'auth',
                            status: 'error',
                            subject: citAcc.account_id,
                            performed_by: email,
                            details: { reason: 'invalid_password', is_citizen: true },
                        })
                        return { error: 'Invalid password.' }
                    }
                }

                if (citAcc.verification_status !== 'verified') {
                    setIsLoading(false)
                    void logAudit({
                        action: 'login_failed',
                        module: 'auth',
                        status: 'error',
                        subject: citAcc.account_id,
                        performed_by: email,
                        details: { reason: 'account_inactive', is_citizen: true, status: citAcc.verification_status },
                    })
                    return { error: `Your account is ${citAcc.verification_status}. Please contact the administrator.` }
                }

                // If citizen_account doesn't embed `person` easily based on the type definition vs real db
                let fullName = 'Citizen'
                if (citAcc.person && !Array.isArray(citAcc.person)) {
                    fullName = (citAcc.person as any).full_name || 'Citizen'
                } else if (Array.isArray(citAcc.person) && citAcc.person.length > 0) {
                    fullName = (citAcc.person as any)[0].full_name || 'Citizen'
                }

                const safeUser: AuthUser = {
                    id: citAcc.account_id,
                    email: citAcc.email,
                    role: 'citizen',
                    full_name: fullName,
                    is_citizen: true
                }
                setUser(safeUser)
                setNotifications(await fetchCitizenNotifications(safeUser.id))
                localStorage.setItem('bpm_user', JSON.stringify(safeUser))
                setIsLoading(false)
                void logAudit({
                    action: 'login',
                    module: 'auth',
                    status: 'success',
                    subject: safeUser.id,
                    performed_by: safeUser.email,
                    details: { role: safeUser.role, is_citizen: true },
                })
                return {}
            }

            setIsLoading(false)
            void logAudit({
                action: 'login_failed',
                module: 'auth',
                status: 'error',
                subject: email,
                performed_by: email,
                details: { reason: 'user_not_found' },
            })
            return { error: 'User not found in the database.' }
        } catch (err: any) {
            setIsLoading(false)
            return { error: err.message || 'Error communicating with database.' }
        }
    }

    const signup = async (fullName: string, email: string, password: string) => {
        try {
            // Check if email already exists
            const { data: existing } = await supabase
                .from('citizen_account')
                .select('email')
                .eq('email', email)
                .maybeSingle()

            if (existing) return { error: 'Email is already registered.' }

            const accountId = 'ACC-' + Math.floor(Math.random() * 1000000)
            const personId = 'PER-' + Math.floor(Math.random() * 1000000)

            // Insert person first
            const { error: pErr } = await supabase.from('person').insert({
                person_id: personId,
                full_name: fullName,
                account_id: accountId
            })
            if (pErr) return { error: pErr.message }

            const currentYear = new Date().getFullYear()
            const registryRef = 'REG-' + currentYear + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0')

            // Insert citizen account
            const { error: cErr } = await supabase.from('citizen_account').insert({
                account_id: accountId,
                person_id: personId,
                email: email,
                password_hash: password, // For prototype purposes storing plain text to match our logic
                verification_status: 'verified',
                registered_date: new Date().toISOString().split('T')[0],
                registry_ref_no: registryRef
            })
            if (cErr) return { error: cErr.message }

            void logAudit({
                action: 'citizen_signup',
                module: 'auth',
                status: 'success',
                subject: accountId,
                performed_by: email,
                details: { email },
            })

            // Auto-login after signup
            return login(email, password)
        } catch (err: any) {
            return { error: err.message || 'Error creating account.' }
        }
    }

    const logout = () => {
        if (user) {
            void logAudit({
                action: 'logout',
                module: 'auth',
                status: 'success',
                subject: user.id,
                performed_by: user.email,
                details: { role: user.role, is_citizen: user.is_citizen },
            })
        }
        setUser(null)
        setNotifications([])
        localStorage.removeItem('bpm_user')
    }

    const markNotifRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.notif_id === id ? { ...n, is_read: true } : n))
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <AuthContext.Provider value={{ user, notifications, unreadCount, login, signup, logout, markNotifRead, updateSessionUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}

export function useRole(): UserRole | null {
    const { user } = useAuth()
    return user?.role ?? null
}

