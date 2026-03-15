import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, UserRole, NotificationLog } from '@/types'
<<<<<<< HEAD
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
    'cgsd@bpm.qc.gov.ph': { role: 'cgsd_management', password: 'admin123' },
    'famcd@bpm.qc.gov.ph': { role: 'famcd', password: 'admin123' },
    'rmcd@bpm.qc.gov.ph': { role: 'rmcd', password: 'admin123' },
    'citizen@bpm.qc.gov.ph': { role: 'citizen', password: 'admin123' },
    'juan.delacruz@email.com': { role: 'citizen', password: 'citizen123' }
=======

// ─── Mock auth users for demo ─────────────────────────────────────────────────
export const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
    'cemetery@bpm.gov': {
        id: 'u1', email: 'cemetery@bpm.gov', password: 'admin123',
        role: 'cemetery_office', full_name: 'Maria Santos', is_citizen: false,
        office: 'Cemetery Management Office'
    },
    'ssdd@bpm.gov': {
        id: 'u2', email: 'ssdd@bpm.gov', password: 'admin123',
        role: 'ssdd', full_name: 'Juan dela Cruz', is_citizen: false,
        office: 'Social Services Development Department'
    },
    'death@bpm.gov': {
        id: 'u3', email: 'death@bpm.gov', password: 'admin123',
        role: 'death_registration', full_name: 'Ana Reyes', is_citizen: false,
        office: 'Death Registration Division'
    },
    'citizen@gmail.com': {
        id: 'u4', email: 'citizen@gmail.com', password: 'citizen123',
        role: 'citizen', full_name: 'Pedro Bautista', is_citizen: true
    },
    'parks@bpm.gov': {
        id: 'u5', email: 'parks@bpm.gov', password: 'admin123',
        role: 'parks_admin', full_name: 'Lena Gosiengfiao', is_citizen: false,
        office: 'Parks & Recreation Administration'
    },
    'reservation@bpm.gov': {
        id: 'u6', email: 'reservation@bpm.gov', password: 'admin123',
        role: 'reservation_officer', full_name: 'Carlos Ramos', is_citizen: false,
        office: 'Barangay Reservation Desk'
    },
    'barangay@bpm.gov': {
        id: 'u7', email: 'barangay@bpm.gov', password: 'admin123',
        role: 'punong_barangay', full_name: 'Hon. Roberto Flores', is_citizen: false,
        office: 'Barangay 123 Office'
    },
    'secretary@bpm.gov': {
        id: 'u14', email: 'secretary@bpm.gov', password: 'admin123',
        role: 'barangay_secretary', full_name: 'Sec. Maribel Reyes', is_citizen: false,
        office: 'Barangay 123 Secretariat'
    },
    'utility@bpm.gov': {
        id: 'u8', email: 'utility@bpm.gov', password: 'admin123',
        role: 'utility_engineering', full_name: 'Engr. Rafael Cruz', is_citizen: false,
        office: 'Utility Engineering Division'
    },
    'helpdesk@bpm.gov': {
        id: 'u9', email: 'helpdesk@bpm.gov', password: 'admin123',
        role: 'utility_helpdesk', full_name: 'Sharon Enriquez', is_citizen: false,
        office: 'Utility Business Area / Helpdesk'
    },
    'cgsd@bpm.gov': {
        id: 'u10', email: 'cgsd@bpm.gov', password: 'admin123',
        role: 'cgsd_management', full_name: 'Dir. Carmela Ortiz', is_citizen: false,
        office: 'CGSD Management'
    },
    'famcd@bpm.gov': {
        id: 'u11', email: 'famcd@bpm.gov', password: 'admin123',
        role: 'famcd', full_name: 'Edwin Villanueva', is_citizen: false,
        office: 'FAMCD'
    },
    'treasurer@bpm.gov': {
        id: 'u12', email: 'treasurer@bpm.gov', password: 'admin123',
        role: 'treasurer', full_name: 'Treasurer Marites Lim', is_citizen: false,
        office: 'Finance Office'
    },
    'admin@bpm.gov': {
        id: 'u13', email: 'admin@bpm.gov', password: 'admin123',
        role: 'system_admin', full_name: 'System Administrator', is_citizen: false,
        office: 'IT Department'
    },
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
}

// ─── Mock notifications ────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: NotificationLog[] = [
<<<<<<< HEAD
    { notif_id: 'n1', user_id: 'u1', title: 'New Burial Application', message: 'Application #BA-2024-001 submitted.', is_read: false, notif_type: 'info', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { notif_id: 'n2', user_id: 'u1', title: 'Document Verified', message: 'Death certificate has been validated', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
=======
    { notif_id: 'n1', user_id: 'u1', title: 'New Burial Application', message: 'Application #BA-2024-001 submitted by Pedro Bautista', is_read: false, notif_type: 'info', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { notif_id: 'n2', user_id: 'u1', title: 'Document Verified', message: 'Death certificate for Maria Dela Cruz has been validated', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { notif_id: 'n3', user_id: 'u1', title: 'Payment Received', message: 'Payment of ₱2,500 settled via GCash for Burial #BR-001', is_read: true, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { notif_id: 'n4', user_id: 'u4', title: 'Application Approved', message: 'Your burial application has been approved. Please proceed to pay.', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
]

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextType {
    user: AuthUser | null
    notifications: NotificationLog[]
    unreadCount: number
    login: (email: string, password: string) => Promise<{ error?: string }>
<<<<<<< HEAD
    signup: (fullName: string, email: string, password: string) => Promise<{ error?: string }>
=======
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
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
<<<<<<< HEAD
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
                const safeUser: AuthUser = {
                    id: sysUser.user_id,
                    email: sysUser.email,
                    role: sysUser.role as any,
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
=======
        const demoUser = DEMO_USERS[email.toLowerCase()]
        if (!demoUser || demoUser.password !== password) {
            return { error: 'Invalid email or password.' }
        }
        const { password: _pw, ...safeUser } = demoUser
        setUser(safeUser)
        setNotifications(MOCK_NOTIFICATIONS.filter(n => n.user_id === safeUser.id))
        localStorage.setItem('bpm_user', JSON.stringify(safeUser))
        return {}
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
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
<<<<<<< HEAD
        <AuthContext.Provider value={{ user, notifications, unreadCount, login, signup, logout, markNotifRead, isLoading }}>
=======
        <AuthContext.Provider value={{ user, notifications, unreadCount, login, logout, markNotifRead, isLoading }}>
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
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
<<<<<<< HEAD

=======
>>>>>>> 58930893a1e4d46885dc70105cdb332ee473e3b4
