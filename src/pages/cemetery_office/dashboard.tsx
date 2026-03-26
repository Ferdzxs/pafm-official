import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, Users, FileText, Layout, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import {
 ResponsiveContainer,
 PieChart,
 Pie,
 Cell,
 Tooltip
} from 'recharts'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const toneClasses = {
  info: 'bg-state-info-soft text-state-info',
  warning: 'bg-state-warning-soft text-state-warning',
  success: 'bg-state-success-soft text-state-success',
  danger: 'bg-state-danger-soft text-state-danger',
} as const

export default function CemeteryOfficeDashboard() {
 const { user } = useAuth()
 const [loading, setLoading] = useState(true)
 const [stats, setStats] = useState({
  totalApplications: 0,
  pendingApps: 0,
  availableNiches: 0,
  occupiedNiches: 0,
  totalDeceased: 0,
 })
 const [recentApplications, setRecentApplications] = useState<any[]>([])

 useEffect(() => {
  if (user) fetchDashboardData()
 }, [user])

 async function fetchDashboardData() {
  setLoading(true)
  try {
   const [appsCount, pendingCount, nichesCount, occupiedCount, deceasedCount, recents] = await Promise.all([
    supabase.from('online_burial_application').select('*', { count: 'exact', head: true }),
    supabase.from('online_burial_application').select('*', { count: 'exact', head: true }).eq('application_status', 'pending'),
    supabase.from('niche_record').select('*', { count: 'exact', head: true }).eq('status', 'available'),
    supabase.from('niche_record').select('*', { count: 'exact', head: true }).eq('status', 'occupied'),
    supabase.from('deceased').select('*', { count: 'exact', head: true }),
    supabase.from('online_burial_application').select(`
     *,
     person:person_id (full_name),
     deceased:deceased_id (full_name)
    `).order('submission_date', { ascending: false }).limit(5)
   ])

   setStats({
    totalApplications: appsCount.count || 0,
    pendingApps: pendingCount.count || 0,
    availableNiches: nichesCount.count || 0,
    occupiedNiches: occupiedCount.count || 0,
    totalDeceased: deceasedCount.count || 0,
   })
   setRecentApplications(recents.data || [])
  } catch (error) {
   toast.error('Failed to fetch dashboard data: ' + (error as any).message)
  } finally {
   setLoading(false)
  }
 }

 if (!user) return null
 const meta = ROLE_META[user.role]

 const kpis = [
  { label: 'Total applications', value: stats.totalApplications, sub: 'All online burial requests', icon: FileText, tone: 'info' as const, to: '/burial/applications' },
  { label: 'Pending review', value: stats.pendingApps, sub: 'Awaiting cemetery action', icon: AlertCircle, tone: 'warning' as const, to: '/burial/applications' },
  { label: 'Niche availability', value: stats.availableNiches, sub: `${stats.occupiedNiches} occupied · view map`, icon: Layout, tone: 'success' as const, to: '/burial/niches' },
  { label: 'Deceased registry', value: stats.totalDeceased, sub: 'Recorded in system', icon: Users, tone: 'info' as const, to: '/burial/deceased' },
 ]

 return (
  <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-foreground max-w-6xl mx-auto pb-12">
   <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 mb-8 shadow-sm">
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
     <div>
      <div className="flex items-center gap-2 mb-3">
       <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
        {meta.label}
       </span>
      </div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Good Day, {user.full_name.split(' ')[0]}!</h1>
      <p className="text-muted-foreground text-sm mt-2 max-w-xl">
       {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
       {user.office && ` · ${user.office}`}
      </p>
     </div>
     <div className="flex flex-wrap gap-2">
      <Link
       to="/burial/applications"
       className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
      >
       Burial applications
       <ChevronRight size={16} />
      </Link>
      <Link
       to="/burial/niches"
       className="inline-flex items-center gap-2 rounded-xl border border-border-subtle bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
      >
       Niche map
       <Layout size={16} />
      </Link>
     </div>
    </div>
   </div>

   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
    {kpis.map(kpi => {
     const Icon = kpi.icon
     return (
      <Link key={kpi.label} to={kpi.to} className="group block min-h-[120px]">
       <Card className="h-full border-border transition-all duration-200 hover:border-primary hover:shadow-md hover:-translate-y-0.5">
        <CardContent className="pt-5 pb-4">
         <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${toneClasses[kpi.tone]}`}>
           <Icon size={18} />
          </div>
          <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
         </div>
         {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
           <Loader2 size={18} className="animate-spin" />
           <span className="text-xs">Loading…</span>
          </div>
         ) : (
          <>
           <div className="text-2xl font-bold text-foreground tabular-nums mb-1">{kpi.value}</div>
           <div className="text-xs font-medium text-foreground/90">{kpi.label}</div>
           <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{kpi.sub}</div>
          </>
         )}
        </CardContent>
       </Card>
      </Link>
     )
    })}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <Card className="lg:col-span-2 border-border bg-card shadow-sm">
     <CardHeader className="pb-3 border-b border-border">
      <CardTitle className="text-base font-bold flex items-center gap-2"><Clock size={16} className="text-blue-400" /> Recent Activity</CardTitle>
     </CardHeader>
     <CardContent className="p-0">
      {loading ? (
       <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : recentApplications.length === 0 ? (
       <div className="py-20 text-center text-muted-foreground">No recent activity found.</div>
      ) : (
       <div className="divide-y divide-border">
        {recentApplications.map(app => (
         <Link
          key={app.application_id}
          to="/burial/applications"
          className="flex items-center gap-3 p-4 hover:bg-muted transition-colors"
         >
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-400 text-xs font-bold shrink-0">BA</div>
          <div className="flex-1 min-w-0">
           <div className="text-sm font-medium text-foreground truncate">New Burial Application: {app.deceased?.full_name}</div>
           <div className="text-xs text-muted-foreground truncate">Submitted by {app.person?.full_name}</div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
           <Badge className={`text-[10px] px-2 py-0.5 font-bold uppercase ${
            app.application_status === 'pending' ? 'bg-amber-50 text-amber-500 border-amber-500' : 'bg-emerald-50 text-emerald-500 border-emerald-500'
           }`}>
            {app.application_status}
           </Badge>
           <span className="text-[10px] text-muted-foreground font-mono">{new Date(app.submission_date).toLocaleDateString()}</span>
          </div>
         </Link>
        ))}
       </div>
      )}
     </CardContent>
    </Card>

    <div className="space-y-6">
     <Card className="border-border bg-card shadow-sm">
      <CardHeader className="pb-2">
       <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Niche Distribution</CardTitle>
      </CardHeader>
      <CardContent>
       <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
         <PieChart>
          <Pie
           data={[
            { name: 'Occupied', value: stats.occupiedNiches },
            { name: 'Available', value: stats.availableNiches },
           ]}
           innerRadius={60}
           outerRadius={80}
           paddingAngle={5}
           dataKey="value"
          >
           <Cell fill="#f87171" />
           <Cell fill="#34d399" />
          </Pie>
          <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
         </PieChart>
        </ResponsiveContainer>
       </div>
       <div className="flex justify-center gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[10px] text-muted-foreground">Available</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[10px] text-muted-foreground">Occupied</span></div>
       </div>
      </CardContent>
     </Card>

     <Card className="border-border bg-card shadow-sm p-4">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Quick Links</h3>
      <div className="space-y-2">
       {[
        { label: 'Review Applications', path: '/burial/applications', icon: FileText, color: 'text-blue-400' },
        { label: 'Check Niche Status', path: '/burial/niches', icon: Layout, color: 'text-emerald-400' },
        { label: 'Deceased Registry', path: '/burial/deceased', icon: Users, color: 'text-purple-400' },
       ].map(link => (
        <Link key={link.label} to={link.path} className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted/80 transition-all border border-border">
         <link.icon size={16} className={link.color} />
         <span className="text-xs font-semibold text-muted-foreground">{link.label}</span>
         <ChevronRight size={14} className="ml-auto text-muted-foreground opacity-60" />
        </Link>
       ))}
      </div>
     </Card>
    </div>
   </div>
  </div>
 )
}
