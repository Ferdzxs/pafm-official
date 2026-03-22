import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Package, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { EmojiIcon } from '@/components/ui/emoji-icon'

const QUICK_ACTIONS = [
 { label: 'New Inspection', emoji: '🔍', path: '/assets/inspections' },
 { label: 'View Reports', emoji: '📊', path: '/assets/reports' },
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
 
 const [stats, setStats] = useState({
  totalProperties: 0,
  pendingInspections: 0,
  reportsSubmitted: 0,
  approvedReports: 0,
 })
 
 // Using explicit any to avoid TS errors on dynamic properties
 const [recentActivity, setRecentActivity] = useState<any[]>([])

 useEffect(() => {
  const fetchDashboardData = async () => {
   // Fetch total properties
   const { count: propCount } = await supabase
    .from('property')
    .select('*', { count: 'exact', head: true })

   // Fetch pending inspections
   const { data, error } = await supabase
    .from('inventory_request')
    .select(`
     inventory_request_id,
     property_id,
     property (
      property_name,
      location,
      asset_condition,
      acquisition_date
     )
    `)
    .order('preparation_date', { ascending: false })
    .limit(5)
    
   if (error) {
    console.error('Error fetching recent activities:', error)
   }

   // Ensure activities is not undefined before setting state
   const activities = data?.map((r: any) => ({
    id: r.inventory_request_id,
    action: 'Report Submitted',
    subject: r.property?.property_name || 'General Asset Inventory',
    time: r.preparation_date,
    status: r.approval_status
   }))
   if (activities) {
    setRecentActivity(activities);
   }

   // Fetch total reports submitted
   const { count: reportCount } = await supabase
    .from('inventory_report')
    .select('*', { count: 'exact', head: true })

   // Fetch total approved reports
   const { count: approvedCount } = await supabase
    .from('inventory_report')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'approved')

   // Fetch total pending inspections
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
  <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
   <div className="mb-8">
    <div className="flex items-center gap-2 mb-2">
     <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
      {meta.label}
     </span>
    </div>
    <h1 className="font-display text-2xl font-bold text-foreground">
     Good {getGreeting()}, {user.full_name.split(' ')[0]}! 👋
    </h1>
    <p className="text-muted-foreground text-sm mt-1">
     {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
     {user.office && ` · ${user.office}`}
    </p>
   </div>

   <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
    {KPI_DATA.map((kpi, i) => {
     const Icon = kpi.icon
     const isPositive = kpi.change >= 0
     return (
      <Card key={i} className="border-border bg-card shadow-sm hover:shadow-md transition-shadow">
       <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
         <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
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
    <Card className="lg:col-span-2 border-border bg-card shadow-sm">
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
         <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
           {item.id.slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
           <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
           <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
           <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5 uppercase">{item.status}</Badge>
           <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
         </div>
        ))
       )}
      </div>
     </CardContent>
    </Card>

    <div className="space-y-4">
     <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
       <CardTitle className="text-sm">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="space-y-1.5">
        {QUICK_ACTIONS.map(qa => (
         <a key={qa.label} href={qa.path} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border">
          <EmojiIcon symbol={qa.emoji} className='h-4 w-4 text-muted-foreground' />
          <span>{qa.label}</span>
         </a>
        ))}
       </div>
      </CardContent>
     </Card>
    </div>
   </div>
  </div>
 )}
