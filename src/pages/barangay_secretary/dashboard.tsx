import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { supabase } from '@/lib/supabase'
import {
    ClipboardList, CheckSquare, BookOpen, FileText, Users,
    TrendingUp, TrendingDown, Clock, AlertTriangle
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Link } from 'react-router-dom'

interface ActivityItem {
    id: string
    action: string
    subject: string
    status: string
    time: string
}

interface RequestType {
    name: string
    value: number
}

interface MonthlyData {
    month: string
    reservations: number
    approved: number
}

const PIE_COLORS = ['#e879f9', '#a78bfa', '#60a5fa', '#34d399']

const STATUS_CLASS: Record<string, string> = {
    pending: 'badge-pending', approved: 'badge-confirmed',
    completed: 'badge-completed', rejected: 'badge-rejected',
    confirmed: 'badge-confirmed',
}

function getGreeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export default function BarangaySecretaryDashboardPage() {
    const { user } = useAuth()
    
    const [KPI_DATA, setKpiData] = useState([
        { label: 'Pending Approvals', value: 0, change: 0, icon: Clock, color: '#fbbf24', path: '/barangay/pending' },
        { label: 'Approved This Month', value: 0, change: 0, icon: CheckSquare, color: '#34d399', path: '/barangay/records' },
        { label: 'Ordinances on File', value: 0, change: 0, icon: BookOpen, color: '#e879f9', path: '/barangay/ordinances' },
        { label: 'Documents Filed', value: 0, change: 0, icon: FileText, color: '#60a5fa', path: '/barangay/documents' },
        { label: 'Requests This Month', value: 0, change: 0, icon: ClipboardList, color: '#fb923c', path: '/barangay/requests' },
        { label: 'Constituents Served', value: 0, change: 0, icon: Users, color: '#a78bfa', path: '/barangay/records' },
    ])

    const [MONTHLY_DATA, setMonthlyData] = useState<MonthlyData[]>([])
    const [REQUEST_TYPES, setRequestTypes] = useState<RequestType[]>([])
    const [RECENT_ACTIVITY, setRecentActivity] = useState<ActivityItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchDashboardData() {
            setLoading(true)
            try {
                const currentMonth = new Date().getMonth() + 1
                const currentYear = new Date().getFullYear()
                const firstDayOfMonth = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`

                // 1. Fetch KPIs
                const [
                    pendingRes, 
                    approvedThisMonth, 
                    ordinances, 
                    documents, 
                    requestsThisMonth, 
                    constituents
                ] = await Promise.all([
                    supabase.from('barangay_reservation_record').select('reservation_id', { count: 'exact', head: true }).eq('status', 'pending'),
                    supabase.from('barangay_reservation_record').select('reservation_id', { count: 'exact', head: true }).eq('status', 'confirmed').gte('created_at', firstDayOfMonth),
                    supabase.from('barangay_ordinances').select('ordinance_id', { count: 'exact', head: true }),
                    supabase.from('barangay_documents').select('document_id', { count: 'exact', head: true }),
                    supabase.from('barangay_reservation_record').select('reservation_id', { count: 'exact', head: true }).gte('created_at', firstDayOfMonth),
                    supabase.from('constituent_records').select('record_id', { count: 'exact', head: true })
                ])

                setKpiData(prev => [
                    { ...prev[0], value: pendingRes.count || 0 },
                    { ...prev[1], value: approvedThisMonth.count || 0 },
                    { ...prev[2], value: ordinances.count || 0 },
                    { ...prev[3], value: documents.count || 0 },
                    { ...prev[4], value: requestsThisMonth.count || 0 },
                    { ...prev[5], value: constituents.count || 0 },
                ])

                // 2. Fetch Monthly Data
                const { data: monthlyRes } = await supabase.from('barangay_reservation_record').select('created_at, status')
                const monthMap: Record<string, MonthlyData> = {}
                const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                
                monthlyRes?.forEach(r => {
                    const m = new Date(r.created_at).toLocaleString('en-US', { month: 'short' })
                    if (!monthMap[m]) monthMap[m] = { month: m, reservations: 0, approved: 0 }
                    monthMap[m].reservations++
                    if (r.status === 'confirmed') monthMap[m].approved++
                })
                
                setMonthlyData(Object.values(monthMap).sort((a,b) => monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month)))

                // 3. Fetch Request Types (Breakdown)
                const { data: docTypes } = await supabase.from('barangay_documents').select('document_type')
                const breakdown = [
                    { name: 'Facility Reservations', value: (await supabase.from('barangay_reservation_record').select('reservation_id', { count: 'exact', head: true })).count || 0 },
                    { name: 'Document Requests', value: docTypes?.filter(d => ['clearance', 'permit'].includes(d.document_type)).length || 0 },
                    { name: 'Certificate Issuance', value: docTypes?.filter(d => d.document_type === 'certificate').length || 0 },
                    { name: 'Other Requests', value: docTypes?.filter(d => !['clearance', 'permit', 'certificate'].includes(d.document_type)).length || 0 },
                ]
                setRequestTypes(breakdown)

                // 4. Fetch Recent Activity
                const [resActivity, docActivity] = await Promise.all([
                    supabase.from('barangay_reservation_record').select('reservation_id, status, created_at').order('created_at', { ascending: false }).limit(5),
                    supabase.from('barangay_documents').select('document_id, title, created_at').order('created_at', { ascending: false }).limit(5)
                ])

                const combined = [
                    ...(resActivity.data?.map(r => ({
                        id: r.reservation_id,
                        action: 'Reservation Request Filed',
                        subject: 'Barangay Facility',
                        status: r.status,
                        time: new Date(r.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })
                    })) || []),
                    ...(docActivity.data?.map(d => ({
                        id: d.document_id,
                        action: 'Document Filed',
                        subject: d.title,
                        status: 'completed',
                        time: new Date(d.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })
                    })) || [])
                ].sort((a,b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5)

                setRecentActivity(combined)

            } catch (error) {
                console.error("Dashboard error:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchDashboardData()
    }, [])

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
                            <div className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>{loading ? '...' : kpi.value}</div>
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
                                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i] }} />
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
                        {loading && <Clock size={14} className="animate-spin text-blue-400" />}
                        {!loading && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Live updates</span>}
                    </div>
                    <div className="space-y-1">
                        {RECENT_ACTIVITY.length > 0 ? RECENT_ACTIVITY.map(item => (
                            <div key={item.id + item.time} className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer hover:opacity-80" style={{ background: 'var(--color-bg-hover)' }}>
                                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {item.id.slice(0, 2)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{item.action}</div>
                                    <div className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{item.subject}</div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLASS[item.status] || 'badge-pending'}`}>{item.status}</span>
                                    <span className="text-[10px] whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>{item.time}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10 text-slate-500 text-sm">No recent activity</div>
                        )}
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
                            {KPI_DATA[0].value} requests need your attention
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
