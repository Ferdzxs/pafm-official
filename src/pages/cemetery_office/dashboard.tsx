import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { Clock, Users, FileText, Layout, AlertCircle, ArrowUpRight, Loader2 } from 'lucide-react'
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
  { label: 'Total Applications', value: stats.totalApplications, icon: FileText, color: '#60a5fa' },
  { label: 'Pending Review', value: stats.pendingApps, icon: AlertCircle, color: '#fbbf24' },
  { label: 'Available Niches', value: stats.availableNiches, icon: Layout, color: '#34d399' },
  { label: 'Deceased Registry', value: stats.totalDeceased, icon: Users, color: '#a78bfa' },
 ]

 return (
  <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-foreground">
   {/* Header */}
   <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
    <div>
     <div className="flex items-center gap-2 mb-2">
      <span className="px-2.5 py-1 rounded-md text-xs font-semibold" style={{ background: meta.bgColor, color: meta.color }}>
       {meta.label}
      </span>
     </div>
     <h1 className="font-display text-2xl font-bold">Good Day, {user.full_name.split(' ')[0]}! 👋</h1>
     <p className="text-muted-foreground text-sm mt-1">
      {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      {user.office && ` · ${user.office}`}
     </p>
    </div>
    <button 
     onClick={() => window.location.href = '/burial/reports'}
     className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-500/40 hover:scale-[1.02] transition-all flex items-center gap-2 self-start sm:self-auto"
    >
     Generate Report <ArrowUpRight size={16} />
    </button>
   </div>

   {/* KPI Grid */}
   <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
    {kpis.map((kpi, i) => (
     <Card key={i} className="border-border bg-card overflow-hidden shadow-sm">
      <CardContent className="pt-5 p-4">
       <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${kpi.color}25` }}>
         <kpi.icon size={18} style={{ color: kpi.color }} />
        </div>
       </div>
       <div className="text-2xl font-bold">{loading ? <Loader2 className="animate-spin" size={20} /> : kpi.value}</div>
       <div className="text-xs text-muted-foreground mt-1 uppercase tracking-tight">{kpi.label}</div>
      </CardContent>
     </Card>
    ))}
   </div>

   <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    {/* Recent Activity */}
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
         <div key={app.application_id} className="flex items-center gap-3 p-4 hover:bg-muted transition-colors cursor-pointer">
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
         </div>
        ))}
       </div>
      )}
     </CardContent>
    </Card>

    {/* Sidebar */}
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
        <a key={link.label} href={link.path} className="flex items-center gap-3 p-3 rounded-xl bg-muted hover:bg-muted transition-all border border-border">
         <link.icon size={16} className={link.color} />
         <span className="text-xs font-semibold text-muted-foreground">{link.label}</span>
        </a>
       ))}
      </div>
     </Card>
    </div>
   </div>
  </div>
 )
}
