import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, UserRole, NotificationLog } from '@/types'
import { supabase } from '@/lib/supabase'

// ─── Mock demo users for the UI dropdown ───────────────────────────────────────
export const DEMO_USERS: Record<string, { role: UserRole, password: string, id?: string }> = {
    'cemetery@bpm.qc.gov.ph': { role: 'cemetery_office', password: 'admin123', id: 'EMP-008' },
    'ssdd@bpm.qc.gov.ph': { role: 'ssdd', password: 'admin123', id: 'EMP-012' },
    'admin@bpm.qc.gov.ph': { role: 'system_admin', password: 'admin123', id: 'EMP-001' },
    'secretary@bpm.qc.gov.ph': { role: 'barangay_secretary', password: 'admin123', id: 'EMP-002' },
    'punong@bpm.qc.gov.ph': { role: 'punong_barangay', password: 'admin123', id: 'EMP-003' },
    'treasurer@bpm.qc.gov.ph': { role: 'treasurer', password: 'admin123', id: 'EMP-010' },
    'utility@bpm.qc.gov.ph': { role: 'utility_engineering', password: 'admin123', id: 'EMP-005' },
    'parks@bpm.qc.gov.ph': { role: 'parks_admin', password: 'admin123', id: 'EMP-009' },
    'desk@bpm.qc.gov.ph': { role: 'reservation_officer', password: 'admin123', id: 'EMP-011' },
    'deathreg@bpm.qc.gov.ph': { role: 'death_registration', password: 'admin123', id: 'EMP-006' },
    'cgsd@bpm.qc.gov.ph': { role: 'cgsd_management', password: 'admin123', id: 'EMP-007' },
    'famcd@bpm.qc.gov.ph': { role: 'famcd', password: 'admin123', id: 'EMP-004' },
    'rmcd@bpm.qc.gov.ph': { role: 'rmcd', password: 'admin123', id: 'EMP-013' },
    'citizen@bpm.qc.gov.ph': { role: 'citizen', password: 'admin123', id: 'CZN-001' },
    'juan.delacruz@email.com': { role: 'citizen', password: 'citizen123', id: 'CZN-002' }
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
    isLoading: boolean
    login: (email: string, password: string) => Promise<{ error?: string }>
    signup: (fullName: string, email: string, password: string) => Promise<{ error?: string }>
    logout: () => void
    markNotifRead: (id: string) => void
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [notifications, setNotifications] = useState<NotificationLog[]>(MOCK_NOTIFICATIONS)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('bpm_user')
        if (stored) {
            try { setUser(JSON.parse(stored)) } catch (e) {}
        }
        setIsLoading(false)
    }, [])

    const login = async (email: string, password: string) => {
        const demo = DEMO_USERS[email]
        if (!demo || demo.password !== password) return { error: 'Invalid credentials' }
        const u: AuthUser = { id: demo.id || 'u1', email, role: demo.role as UserRole, full_name: email.split('@')[0], is_citizen: demo.role === 'citizen' }
        setUser(u)
        localStorage.setItem('bpm_user', JSON.stringify(u))
        return {}
    }

    const signup = async (fullName: string, email: string, password: string) => {
        return { error: 'Signup not implemented in demo' }
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
