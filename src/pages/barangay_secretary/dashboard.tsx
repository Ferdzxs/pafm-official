import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import {
    ClipboardList, CheckSquare, BookOpen, FileText, Users,
    TrendingUp, TrendingDown, Clock, AlertTriangle, BarChart3
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Link } from 'react-router-dom'

const KPI_DATA = [
    { label: 'Pending Approvals', value: 3, change: +1, icon: Clock, color: '#fbbf24', path: '/barangay/pending' },
    { label: 'Approved This Month', value: 18, change: +4, icon: CheckSquare, color: '#34d399', path: '/barangay/records' },
    { label: 'Ordinances on File', value: 34, change: 0, icon: BookOpen, color: '#e879f9', path: '/barangay/ordinances' },
    { label: 'Documents Filed', value: 152, change: +9, icon: FileText, color: '#60a5fa', path: '/barangay/documents' },
    { label: 'Requests This Month', value: 22, change: +3, icon: ClipboardList, color: '#fb923c', path: '/barangay/requests' },
    { label: 'Constituents Served', value: 87, change: +12, icon: Users, color: '#a78bfa', path: '/barangay/records' },
]

const MONTHLY_DATA = [
    { month: 'Sep', reservations: 14, approved: 12 },
    { month: 'Oct', reservations: 18, approved: 15 },
    { month: 'Nov', reservations: 11, approved: 10 },
    { month: 'Dec', reservations: 23, approved: 20 },
    { month: 'Jan', reservations: 16, approved: 14 },
    { month: 'Feb', reservations: 22, approved: 18 },
]

const REQUEST_TYPES = [
    { name: 'Facility Reservations', value: 38 },
    { name: 'Document Requests', value: 27 },
    { name: 'Certificate Issuance', value: 21 },
    { name: 'Other Requests', value: 14 },
]
const PIE_COLORS = ['#e879f9', '#a78bfa', '#60a5fa', '#34d399']

const RECENT_ACTIVITY = [
    { id: 'REC-2024-028', action: 'Reservation Request Filed', subject: 'Multi-Purpose Hall — Community Meeting', time: '20 min ago', status: 'pending' },
    { id: 'REC-2024-027', action: 'Approved & Permit Issued', subject: 'Covered Court — Graduation Practice', time: '2 hrs ago', status: 'approved' },
    { id: 'DOC-2024-041', action: 'Document Filed', subject: 'Ordinance #34 — Noise Ordinance', time: '4 hrs ago', status: 'completed' },
    { id: 'REC-2024-026', action: 'Forwarded for Approval', subject: 'Basketball Court — Tournament', time: '1 day ago', status: 'pending' },
    { id: 'CERT-2024-015', action: 'Certificate Issued', subject: 'Brgy. Clearance — Juan Santos', time: '1 day ago', status: 'completed' },
]

const STATUS_CLASS: Record<string, string> = {
    pending: 'badge-pending', approved: 'badge-approved',
    completed: 'badge-completed', rejected: 'badge-rejected',
}

function getGreeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function BarangaySecretaryDashboardPage() {
    const { user } = useAuth()
    if (!user) return null
    const meta = ROLE_META[user.role]

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-1">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
                        {meta.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>
                <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {getGreeting()}, {user.full_name.split(' ').slice(-1)[0]}! 👋
                </h1>
                <p style={{ color: 'var(--color-text-muted)' }} className="text-sm mt-1">
                    {user.office} · Barangay Records & Affairs
                </p>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {KPI_DATA.map((kpi, i) => {
                    const Icon = kpi.icon
                    const isUp = kpi.change >= 0
                    return (
                        <Link
                            key={i}
                            to={kpi.path}
                            className="rounded-2xl p-5 card-hover block transition-all"
                            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                                    <Icon size={18} style={{ color: kpi.color }} />
                                </div>
                                {kpi.change !== 0 && (
                                    <div className={`flex items-center gap-1 text-xs font-semibold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                                        {Math.abs(kpi.change)}
                                    </div>
                                )}
                            </div>
                            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{kpi.value}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{kpi.label}</div>
                        </Link>
                    )
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Monthly chart */}
                <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-semibold mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>Monthly Requests vs. Approvals</h2>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={MONTHLY_DATA} barGap={4}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis dataKey="month" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} />
                            <Tooltip
                                contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-primary)' }}
                            />
                            <Bar dataKey="reservations" name="Requests" fill="#e879f9" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="approved" name="Approved" fill="#34d399" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Request type pie */}
                <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-semibold mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>Request Breakdown</h2>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={REQUEST_TYPES} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                {REQUEST_TYPES.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-3">
                        {REQUEST_TYPES.map((t, i) => (
                            <div key={t.name} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                                <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{t.name}</span>
                                <span className="text-xs font-semibold ml-auto" style={{ color: 'var(--color-text-primary)' }}>{t.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Activity</h2>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Live updates</span>
                    </div>
                    <div className="space-y-1">
                        {RECENT_ACTIVITY.map(item => (
                            <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer hover:opacity-80" style={{ background: 'var(--color-bg-hover)' }}>
                                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                    {item.id.slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.action}</div>
                                    <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{item.subject}</div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLASS[item.status]}`}>{item.status}</span>
                                    <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl p-5" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                    <h2 className="font-semibold mb-4 text-sm" style={{ color: 'var(--color-text-primary)' }}>Quick Actions</h2>
                    <div className="space-y-2">
                        {[
                            { emoji: '📋', label: 'Review Pending Approvals', path: '/barangay/pending' },
                            { emoji: '📁', label: 'File New Document', path: '/barangay/documents' },
                            { emoji: '📜', label: 'View Ordinances', path: '/barangay/ordinances' },
                            { emoji: '📊', label: 'Generate Report', path: '/barangay/reports' },
                            { emoji: '👥', label: 'Manage Records', path: '/barangay/records' },
                        ].map(qa => (
                            <Link
                                key={qa.label}
                                to={qa.path}
                                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                            >
                                <span>{qa.emoji}</span>
                                <span>{qa.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Pending alert */}
                    <div className="mt-4 px-3 py-3 rounded-xl" style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)' }}>
                        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: '#e879f9' }}>
                            <AlertTriangle size={14} />
                            3 requests need your attention
                        </div>
                        <Link to="/barangay/pending" className="text-xs underline mt-1 block" style={{ color: '#e879f9' }}>
                            View pending approvals →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
