import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { AuthUser, UserRole, NotificationLog } from '@/types'

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
}

// ─── Mock notifications ────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: NotificationLog[] = [
    { notif_id: 'n1', user_id: 'u1', title: 'New Burial Application', message: 'Application #BA-2024-001 submitted by Pedro Bautista', is_read: false, notif_type: 'info', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { notif_id: 'n2', user_id: 'u1', title: 'Document Verified', message: 'Death certificate for Maria Dela Cruz has been validated', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { notif_id: 'n3', user_id: 'u1', title: 'Payment Received', message: 'Payment of ₱2,500 settled via GCash for Burial #BR-001', is_read: true, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { notif_id: 'n4', user_id: 'u4', title: 'Application Approved', message: 'Your burial application has been approved. Please proceed to pay.', is_read: false, notif_type: 'success', created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
]

// ─── Context ──────────────────────────────────────────────────────────────────
interface AuthContextType {
    user: AuthUser | null
    notifications: NotificationLog[]
    unreadCount: number
    login: (email: string, password: string) => Promise<{ error?: string }>
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
        const demoUser = DEMO_USERS[email.toLowerCase()]
        if (!demoUser || demoUser.password !== password) {
            return { error: 'Invalid email or password.' }
        }
        const { password: _pw, ...safeUser } = demoUser
        setUser(safeUser)
        setNotifications(MOCK_NOTIFICATIONS.filter(n => n.user_id === safeUser.id))
        localStorage.setItem('bpm_user', JSON.stringify(safeUser))
        return {}
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
        <AuthContext.Provider value={{ user, notifications, unreadCount, login, logout, markNotifRead, isLoading }}>
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
