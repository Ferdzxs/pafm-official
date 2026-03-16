import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, UserRole, NotificationLog } from '@/types'
import { supabase } from '@/lib/supabase'

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

// ─── Mock notifications ────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: NotificationLog[] = [
    { notif_id: 'n1', user_id: 'u1', title: 'New Burial Application', message: 'Application #BA-2024-001 submitted.', is_read: false, notif_type: 'info', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { notif_id: 'n2', user_id: 'u1', title: 'Document Verified', message: 'Death certificate has been validated', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
]

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextType {
    user: AuthUser | null
    notifications: NotificationLog[]
    unreadCount: number
    login: (email: string, password: string) => Promise<{ error?: string }>
    signup: (fullName: string, email: string, password: string) => Promise<{ error?: string }>
    logout: () => void
    markNotifRead: (id: string) => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [notifications, setNotifications] = useState<NotificationLog[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Check persisted session
        const stored = localStorage.getItem('bpm_user')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setUser(parsed)
                setNotifications(MOCK_NOTIFICATIONS.filter(n => n.user_id === parsed.id))
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
                // Since system_users has no password in the DB seed, we use a placeholder check
                if (password !== 'admin123' && password !== 'password') {
                    setIsLoading(false)
                    return { error: 'Invalid password. Try admin123' }
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
                setNotifications(MOCK_NOTIFICATIONS) // just assign mock for now
                localStorage.setItem('bpm_user', JSON.stringify(safeUser))
                setIsLoading(false)
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
                        return { error: 'Invalid password. Try citizen123' }
                    }
                } else {
                    if (storedHash !== password) {
                        setIsLoading(false)
                        return { error: 'Invalid password.' }
                    }
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
                setNotifications(MOCK_NOTIFICATIONS)
                localStorage.setItem('bpm_user', JSON.stringify(safeUser))
                setIsLoading(false)
                return {}
            }

            setIsLoading(false)
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

            // Auto-login after signup
            return login(email, password)
        } catch (err: any) {
            return { error: err.message || 'Error creating account.' }
        }
    }

    const logout = () => {
        setUser(null)
        setNotifications([])
        localStorage.removeItem('bpm_user')
    }

    const markNotifRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.notif_id === id ? { ...n, is_read: true } : n))
    }

    const unreadCount = notifications.filter(n => !n.is_read).length

    return (
        <AuthContext.Provider value={{ user, notifications, unreadCount, login, signup, logout, markNotifRead, isLoading }}>
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

