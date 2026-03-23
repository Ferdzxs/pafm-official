import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Package, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface DashboardStats {
  totalProperties: number
  pendingInspections: number
  reportsSubmitted: number
  approvedReports: number
}

interface RecentActivityItem {
  id: string
  action: string
  subject: string
  time?: string
  status?: string
}

interface InventoryRequestRow {
  inventory_request_id: string
  property_id?: string
  preparation_date?: string
  approval_status?: string
  property?: {
    property_name?: string
  }
}

const QUICK_ACTIONS = [
  { label: 'Asset requests', emoji: '', path: '/assets/requests' },
  { label: 'New Inspection', emoji: '', path: '/assets/inspections' },
  { label: 'View Reports', emoji: '', path: '/assets/reports' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
  pending: 'warning',
  approved: 'success',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

export default function CgsdManagementDashboard() {
  const { user } = useAuth()

  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    pendingInspections: 0,
    reportsSubmitted: 0,
    approvedReports: 0,
  })

  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([])

  useEffect(() => {
    async function fetchDashboardData() {
      const { count: propCount, error: propError } = await supabase
        .from('property')
        .select('*', { count: 'exact', head: true })

      if (propError) {
        console.error('Error fetching property count:', propError)
      }

      const { data, error } = await supabase
        .from('inventory_request')
        .select(`
          inventory_request_id,
          property_id,
          preparation_date,
          approval_status,
          property ( property_name )
        `)
        .order('preparation_date', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching recent activities:', error)
      }

      const activities = data?.map((r) => ({
        id: r.inventory_request_id,
        action: 'Report Submitted',
        subject: Array.isArray(r.property) && r.property.length > 0 ? r.property[0].property_name : (r as any).property?.property_name || 'General Asset Inventory',
        time: r.preparation_date,
        status: r.approval_status,
      }))

      if (activities && activities.length > 0) {
        setRecentActivity(activities)
      }

      const { count: reportCount } = await supabase
        .from('inventory_report')
        .select('*', { count: 'exact', head: true })

      const { count: approvedCount } = await supabase
        .from('inventory_report')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved')

      const { count: reqCount } = await supabase
        .from('inventory_request')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      setStats({
        totalProperties: propCount || 0,
        pendingInspections: reqCount || 0,
        reportsSubmitted: reportCount || 0,
        approvedReports: approvedCount || 0,
      })
    }

    fetchDashboardData()
  }, [])

  if (!user) return null
  const meta = ROLE_META[user.role]

  const KPI_DATA = [
    { label: 'Total Properties', value: stats.totalProperties, change: 0, icon: Package, color: '#f472b6' },
    { label: 'Pending Inspections', value: stats.pendingInspections, change: 0, icon: Clock, color: '#fbbf24' },
    { label: 'Reports Submitted', value: stats.reportsSubmitted, change: 0, icon: FileText, color: '#60a5fa' },
    { label: 'Approved Reports', value: stats.approvedReports, change: 0, icon: CheckCircle, color: '#34d399' },
  ]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      <header className="space-y-1">
        <Badge variant="outline" className="px-2 py-0.5" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
          {meta.label}
        </Badge>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Good {getGreeting()}, {user.full_name.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground text-sm max-w-2xl">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {user.office ? ` · ${user.office}` : ''}
        </p>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon
          const isPositive = kpi.change >= 0
          return (
            <Card key={i} className="card-hover">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                    <Icon size={18} style={{ color: kpi.color }} />
                  </div>
                  {kpi.change !== 0 && (
                    <div className={`flex items-center gap-1 text-xs font-semibold ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
                      {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(kpi.change)}
                    </div>
                  )}
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Activity</CardTitle>
              <span className="text-xs text-muted-foreground">Live updates</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No recent activity found.</div>
              ) : (
                recentActivity.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {item.id.slice(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
                      <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_BADGE[item.status ?? ''] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5 uppercase">{item.status}</Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {QUICK_ACTIONS.map(qa => (
                  <a key={qa.label} href={qa.path} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-all border border-transparent hover:border-border">
                    <span>{qa.emoji}</span>
                    <span>{qa.label}</span>
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}