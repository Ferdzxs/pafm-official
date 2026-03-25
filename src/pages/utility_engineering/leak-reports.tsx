import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { listTickets, updateTicket, logTicketEvent } from '@/lib/serviceTickets'
import { supabase } from '@/lib/supabase'
import type { ServiceTicket, TicketStatus } from '@/types'
import { Loader2, MapPin, User, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CitizenUploadsDialogTrigger } from '@/components/utility/CitizenUploadsDialog'

const LEAK_TYPES = ['leak_report', 'leak:owner', 'leak:representative'] as const

export default function LeakReports() {
 const { user } = useAuth()
 const [tickets, setTickets] = useState<ServiceTicket[]>([])
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)

 useEffect(() => {
 if (!user) return
 let cancelled = false
 const load = async () => {
  setLoading(true)
  setError(null)
  try {
  const data = await listTickets({ assigned_to: user.full_name })
  if (!cancelled) {
   setTickets(data.filter(t => (LEAK_TYPES as readonly string[]).includes(t.ticket_type)))
  }
  } catch (err: any) {
  if (!cancelled) setError(err?.message || 'Failed to load leak reports.')
  } finally {
  if (!cancelled) setLoading(false)
  }
 }
 load()
 return () => {
  cancelled = true
 }
 }, [user])

 if (!user) return null
 const meta = ROLE_META[user.role]

 const handleAdvanceStatus = async (ticket: ServiceTicket) => {
 let next: TicketStatus | null = null
 if (ticket.status === 'for_inspection' || ticket.status === 'assigned') next = 'in_progress'
 else if (ticket.status === 'in_progress') next = 'resolved'

 if (!next || next === ticket.status) return

 setLoading(true)
 try {
  const resolvedAt = new Date().toISOString()
  const patch: Record<string, unknown> = { status: next }
  if (next === 'resolved' && !ticket.resolved_at) {
  patch.resolved_at = resolvedAt
  }
  await updateTicket(ticket.ticket_id, patch as any)
  if (next === 'resolved') {
  const { data: lr } = await supabase
   .from('leak_report')
   .select('leak_report_id')
   .eq('ticket_id', ticket.ticket_id)
   .maybeSingle()
  if (lr?.leak_report_id) {
   const excav = window.confirm('Record excavation as required for this repair? (Cancel = no)')
   const today = new Date().toISOString().split('T')[0]
   await supabase.from('leak_repair_record').insert({
   repair_id: `LR-${Date.now()}`,
   leak_report_id: lr.leak_report_id,
   completion_date: today,
   completion_status: 'completed',
   excavation_required: excav,
   })
   if (excav) {
   await supabase.from('excavation_clearance').insert({
    excav_clearance_id: `EX-${Date.now()}`,
    leak_report_id: lr.leak_report_id,
    issued_by_office: 'OFF-005',
    clearance_type: 'excavation',
    issue_date: today,
    digital_clearance_url: null,
   })
   }
  }
  await supabase
   .from('leak_report')
   .update({ status: 'closed' })
   .eq('ticket_id', ticket.ticket_id)
  await logTicketEvent({
   ticket_id: ticket.ticket_id,
   event: 'resolved',
   message: 'Leak repair completed; ticket ready for helpdesk verification.',
  })
  }
  setTickets(prev =>
  prev.map(t =>
   t.ticket_id === ticket.ticket_id
   ? {
    ...t,
    status: next,
    resolved_at: (patch.resolved_at as string | undefined) ?? t.resolved_at,
   }
   : t,
  ),
  )
  toast.success(`Leak report marked as ${next.replace('_', ' ')}.`)
 } catch (err: any) {
  toast.error(err?.message || 'Failed to update leak report.')
 } finally {
  setLoading(false)
 }
 }

 return (
 <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-6 pb-12">
  <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
   <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-3">
     <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
      {meta.label.toUpperCase()}
     </Badge>
     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
      <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Path B — leaks
     </span>
    </div>
    <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Leak reports</h1>
    <p className="text-muted-foreground text-sm max-w-2xl">
     To-Be Path B: site validation, optional excavation clearance, repair, then return to Helpdesk for closure. Open citizen
     documents to confirm IDs or authorization before field work.
    </p>
   </div>
  </header>

  {error && (
  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
  )}

  {loading && tickets.length === 0 ? (
  <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
   <Loader2 size={16} className="mr-2 animate-spin" />
   Loading leak reports…
  </div>
  ) : tickets.length === 0 ? (
  <Card className="border-border/50 shadow-sm border-dashed bg-card/50">
   <CardContent className="py-16 text-center">
    <p className="text-sm font-semibold text-foreground mb-1">No leak reports assigned to you</p>
    <p className="text-xs text-muted-foreground max-w-md mx-auto">
     Leak-related tickets assigned to you will appear here for monitoring and updates.
    </p>
   </CardContent>
  </Card>
  ) : (
  <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
   <CardHeader className="pb-3 bg-muted/20 border-b">
    <CardTitle className="text-base flex items-center gap-2">
     Active leak tickets
     <Badge variant="secondary">{tickets.length}</Badge>
    </CardTitle>
    <CardDescription>Advance status as you inspect and complete repairs.</CardDescription>
   </CardHeader>
   <CardContent className="p-0 divide-y divide-border/40">
    {tickets.map(ticket => (
    <div key={ticket.ticket_id} className="p-5 hover:bg-muted/40 transition-colors">
     <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
     <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs font-mono font-bold text-primary">{ticket.ticket_id}</span>
      <Badge variant="outline" className="text-[10px] border-rose-500/40 text-rose-600 bg-rose-500/5">
       {ticket.priority.toUpperCase()}
      </Badge>
      <Badge variant="secondary" className="text-[10px] capitalize">
       {ticket.status.replace('_', ' ')}
      </Badge>
      </div>
      <p className="text-sm text-foreground line-clamp-2">{ticket.description}</p>
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
       <User size={12} className="shrink-0 opacity-70" />
       {ticket.requester_name}
      </span>
      <span className="inline-flex items-center gap-1 min-w-0">
       <MapPin size={12} className="shrink-0 opacity-70" />
       <span className="truncate">{ticket.location}</span>
      </span>
      </div>
      {ticket.image_url && (
      <div className="pt-2">
       <img
       src={ticket.image_url}
       alt="Leak proof"
       className="w-24 h-24 rounded-lg object-cover border border-border hover:border-primary transition-colors cursor-pointer"
       onClick={() => window.open(ticket.image_url, '_blank')}
       />
      </div>
      )}
     </div>
     <div className="flex flex-wrap items-center gap-2 shrink-0 lg:self-start">
      <CitizenUploadsDialogTrigger ticketId={ticket.ticket_id} ticketTypeKey={ticket.ticket_type} />
      {(ticket.status === 'for_inspection' || ticket.status === 'assigned' || ticket.status === 'in_progress') && (
      <Button type="button" disabled={loading} onClick={() => void handleAdvanceStatus(ticket)}>
       {ticket.status === 'in_progress' ? 'Mark repaired' : 'Start leak repair'}
      </Button>
      )}
     </div>
     </div>
    </div>
    ))}
   </CardContent>
  </Card>
  )}
 </div>
 )
}
