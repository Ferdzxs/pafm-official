import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { TrendingUp, TrendingDown, Clock, CheckCircle, Package, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmojiIcon } from '@/components/ui/emoji-icon'

const KPI_DATA = [
 { label: 'Total Properties', value: 284, change: 3, icon: Package, color: '#a3e635' },
 { label: 'Inventory Requests', value: 6, change: 2, icon: Clock, color: '#fbbf24' },
 { label: 'Reports Submitted', value: 12, change: 4, icon: FileText, color: '#60a5fa' },
 { label: 'Submissions Done', value: 5, change: 1, icon: CheckCircle, color: '#34d399' },
]

const RECENT_ACTIVITY = [
 { id: 'INV-2024-011', action: 'Inventory Request Filed', subject: 'IT Equipment', time: '2 hrs ago', status: 'pending' },
]

const QUICK_ACTIONS = [
 { label: 'Asset requests (all units)', emoji: '📋', path: '/assets/requests' },
 { label: 'Schedule Inspections', emoji: '📅', path: '/assets/inspections' },
 { label: 'Track Assets', emoji: '📊', path: '/assets/inventory' },
]

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'destructive' | 'secondary'> = {
 pending: 'warning',
 approved: 'success',
 completed: 'success',
}

function getGreeting() {
 const h = new Date().getHours()
 if (h < 12) return 'morning'
 if (h < 17) return 'afternoon'
 return 'evening'
}

export default function FamcdDashboard() {
 const { user } = useAuth()
 if (!user) return null

 const meta = ROLE_META[user.role]

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
       {RECENT_ACTIVITY.map(item => (
        <div key={item.id} className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-accent transition-colors cursor-pointer">
         <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
          {item.id.slice(0, 2)}
         </div>
         <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground truncate">{item.action}</div>
          <div className="text-xs text-muted-foreground truncate">{item.subject}</div>
         </div>
         <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_BADGE[item.status] ?? 'secondary'} className="text-[10px] px-1.5 py-0.5">{item.status}</Badge>
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
         </div>
        </div>
       ))}
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
 )
}
