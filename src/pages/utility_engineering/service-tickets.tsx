import React, { useEffect, useState } from 'react'
import type { ServiceTicket, TicketPriority, TicketStatus } from '@/types'
import { Search, AlertTriangle, Clock, CheckCircle, User, Loader2, Zap, ClipboardCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UtilityRequirementChecklist } from '@/pages/citizen/apply-utility_request'

function isPathAWater(ticketType: string) {
  return ['water_connection:new', 'water_connection:additional_meter', 'water_connection'].includes(ticketType)
}

const PRIORITY_COLOR: Record<TicketPriority, string> = {
 low: '#34d399', medium: '#fbbf24', high: '#fb923c', critical: '#f87171',
}

const STATUS_BADGE: Partial<Record<TicketStatus, string>> = {
 open: 'badge-pending',
 triaged: 'badge-pending',
 assigned: 'badge-pending',
 in_progress: 'badge-pending',
 resolved: 'badge-approved',
 closed: 'badge-completed',
}

export default function ServiceTickets() {
 const { user } = useAuth()
 const [tickets, setTickets] = useState<ServiceTicket[]>([])
 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')
 const [selected, setSelected] = useState<ServiceTicket | null>(null)
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [wcrId, setWcrId] = useState<string | null>(null)
 const [assessFindings, setAssessFindings] = useState('')
 const [assessFeasible, setAssessFeasible] = useState(true)
 const [assessQuote, setAssessQuote] = useState('')
 const [resolveDialogOpen, setResolveDialogOpen] = useState(false)
 const [ticketForResolve, setTicketForResolve] = useState<ServiceTicket | null>(null)
 const [resolutionNote, setResolutionNote] = useState('')

 useEffect(() => {
  if (!user) return
  let cancelled = false
  const load = async () => {
   setLoading(true)
   setError(null)
   try {
    const data = await listTickets({ assigned_to: user.full_name })
    if (!cancelled) setTickets(data)
   } catch (err: any) {
    if (!cancelled) setError(err?.message || 'Failed to load assigned tickets.')
   } finally {
    if (!cancelled) setLoading(false)
   }
  }
  load()
  return () => {
   cancelled = true
  }
 }, [user])

 useEffect(() => {
  if (!selected || !isPathAWater(selected.ticket_type)) {
   setWcrId(null)
   return
  }
  void supabase
   .from('water_connection_request')
   .select('water_request_id')
   .eq('ticket_id', selected.ticket_id)
   .maybeSingle()
   .then(({ data }) => setWcrId(data?.water_request_id ?? null))
 }, [selected])

 if (!user) return null
 const meta = ROLE_META[user.role]

 const filtered = tickets.filter(t => {
  const q = search.toLowerCase()
  const match = t.requester_name.toLowerCase().includes(q) || t.ticket_id.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)
  return match && (statusFilter === 'all' || t.status === statusFilter)
 })

 const summary = {
  open: tickets.filter(t => t.status === 'open').length,
  in_progress: tickets.filter(t => t.status === 'in_progress').length,
  assigned: tickets.filter(t => t.status === 'assigned').length,
  resolved: tickets.filter(t => t.status === 'resolved').length,
 }

 const handleStartJob = async (ticket: ServiceTicket) => {
  setLoading(true)
  try {
   await updateTicket(ticket.ticket_id, { status: 'in_progress' } as any)
   await logTicketEvent({
    ticket_id: ticket.ticket_id,
    event: 'in_progress',
    message: 'Engineering started work on this ticket.',
   })
   setTickets(prev => prev.map(t => (t.ticket_id === ticket.ticket_id ? { ...t, status: 'in_progress' } : t)))
   toast.success('Job marked as in progress.')
  } catch (err: any) {
   toast.error(err?.message || 'Failed to start job.')
  } finally {
   setLoading(false)
  }
 }

 const submitPathAAssessment = async () => {
  if (!selected || !wcrId || !user) return
  const quoteNum = parseFloat(assessQuote.replace(/,/g, ''))
  if (assessFeasible && (!Number.isFinite(quoteNum) || quoteNum <= 0)) {
   toast.error('Enter a valid connection fee quotation.')
   return
  }
  setLoading(true)
  try {
   const aid = `ASM-${Date.now()}`
   const { error: aErr } = await supabase.from('technical_assessment').insert({
    assessment_id: aid,
    water_request_id: wcrId,
    findings: assessFindings.trim() || null,
    feasibility_status: assessFeasible ? 'feasible' : 'not_feasible',
    quotation_amount: assessFeasible ? quoteNum : null,
    assessed_by_employee: user.employee_id ?? null,
   })
   if (aErr) throw aErr

   if (assessFeasible) {
    const { error: tErr } = await supabase
     .from('service_tickets')
     .update({ status: 'awaiting_treasury' })
     .eq('ticket_id', selected.ticket_id)
    if (tErr) throw tErr
    const { error: wErr } = await supabase
     .from('water_connection_request')
     .update({ status: 'awaiting_treasury' })
     .eq('water_request_id', wcrId)
    if (wErr) throw wErr
    await logTicketEvent({
     ticket_id: selected.ticket_id,
     event: 'assessment_feasible',
     message: `Site assessment: feasible. Quotation ₱${quoteNum}. Awaiting treasury order of payment.`,
    })
    toast.success('Assessment saved. Request sent to Treasury queue.')
   } else {
    const { error: tErr } = await supabase
     .from('service_tickets')
     .update({ status: 'rejected' })
     .eq('ticket_id', selected.ticket_id)
    if (tErr) throw tErr
    const { error: wErr } = await supabase
     .from('water_connection_request')
     .update({ status: 'not_feasible' })
     .eq('water_request_id', wcrId)
    if (wErr) throw wErr
    await logTicketEvent({
     ticket_id: selected.ticket_id,
     event: 'assessment_not_feasible',
     message: 'Site assessment: connection not feasible.',
    })
    toast.success('Assessment recorded as not feasible.')
   }
   setTickets(prev =>
    prev.map(t => (t.ticket_id === selected.ticket_id ? { ...t, status: assessFeasible ? 'awaiting_treasury' : 'rejected' } : t)),
   )
   setSelected(null)
   setAssessFindings('')
   setAssessQuote('')
  } catch (err: any) {
   toast.error(err?.message || 'Failed to save assessment.')
  } finally {
   setLoading(false)
  }
 }

 const openResolveDialog = (ticket: ServiceTicket) => {
  setTicketForResolve(ticket)
  setResolutionNote(ticket.description?.trim() || '')
  setResolveDialogOpen(true)
  setSelected(null)
 }

 const confirmResolve = async () => {
  const ticket = ticketForResolve
  if (!ticket) return
  const note = resolutionNote.trim()
  const resolved_at = new Date().toISOString()
  setLoading(true)
  try {
   await updateTicket(ticket.ticket_id, {
    status: 'resolved',
    resolved_at,
    resolution_note: note || ticket.description,
   } as any)
   await logTicketEvent({
    ticket_id: ticket.ticket_id,
    event: 'resolved',
    message: 'Ticket resolved by engineering.',
   })
   setTickets(prev =>
    prev.map(t =>
     t.ticket_id === ticket.ticket_id ? { ...t, status: 'resolved', resolved_at } : t,
    ),
   )
   toast.success('Ticket marked as resolved.')
   setResolveDialogOpen(false)
   setTicketForResolve(null)
   setResolutionNote('')
  } catch (err: unknown) {
   toast.error(err instanceof Error ? err.message : 'Failed to mark ticket as resolved.')
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
       <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Field queue
      </span>
     </div>
     <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Service tickets</h1>
     <p className="text-muted-foreground text-sm max-w-2xl">
      To-Be utility desk handoff: work assigned tickets through inspection, repair, or Path A assessment. Citizen supporting
      documents are listed inside each ticket — use them before site decisions.
     </p>
    </div>
   </header>

   {error && (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
   )}

   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {[
     { label: 'Open', value: summary.open, color: '#fbbf24', icon: Clock },
     { label: 'In Progress', value: summary.in_progress, color: '#fb923c', icon: AlertTriangle },
     { label: 'Assigned', value: summary.assigned, color: '#60a5fa', icon: User },
     { label: 'Resolved', value: summary.resolved, color: '#34d399', icon: CheckCircle },
    ].map(s => {
     const Icon = s.icon
     return (
      <div key={s.label} className="rounded-xl p-5 border border-border shadow-xs bg-card">
       <Icon size={18} style={{ color: s.color }} className="mb-3" />
       <div className="text-2xl font-bold tracking-tighter text-foreground">{s.value}</div>
       <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</div>
      </div>
     )
    })}
   </div>

   <div className="flex flex-col sm:flex-row gap-3">
    <div className="relative flex-1 max-w-md">
     <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
     <Input className="pl-10 h-10 border-border/50" placeholder="Search by requester, ID or location…" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <select
     className="flex h-10 w-full sm:w-48 rounded-xl border border-border/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
     value={statusFilter}
     onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
    >
     <option value="all">All Status</option>
     <option value="open">Open</option>
     <option value="assigned">Assigned</option>
     <option value="in_progress">In Progress</option>
     <option value="resolved">Resolved</option>
     <option value="closed">Closed</option>
    </select>
   </div>

   {loading && tickets.length === 0 ? (
    <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
     <Loader2 size={16} className="mr-2 animate-spin" />
     Loading your tickets…
    </div>
   ) : filtered.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center bg-card/50">
     <p className="text-sm font-semibold text-foreground mb-1">No tickets assigned to you yet</p>
     <p className="text-xs text-muted-foreground">When the helpdesk assigns tickets to you, they will appear here.</p>
    </div>
   ) : (
    <>
     <div className="space-y-3">
      {filtered.map(ticket => (
       <div
        key={ticket.ticket_id}
        onClick={() => setSelected(ticket)}
        className="rounded-xl p-4 cursor-pointer border bg-card hover:bg-bg-hover transition-all card-hover"
        style={{ borderColor: `${PRIORITY_COLOR[ticket.priority]}33` }}
       >
        <div className="flex items-start justify-between gap-4">
         <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-2 h-2 rounded-full mt-2 flex-shrink-0" style={{ background: PRIORITY_COLOR[ticket.priority] }} />
          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
           <span className="text-sm font-mono text-primary">{ticket.ticket_id}</span>
           <span
            className="text-xs px-2 py-0.5 rounded-full border"
            style={{
             background: `${PRIORITY_COLOR[ticket.priority]}22`,
             color: PRIORITY_COLOR[ticket.priority],
             borderColor: `${PRIORITY_COLOR[ticket.priority]}44`,
            }}
           >
            {ticket.priority}
           </span>
           <span className="text-xs text-muted-foreground capitalize">
            {ticket.ticket_type.replace('_', ' ')}
           </span>
          </div>
          <div className="text-sm font-medium text-foreground mt-1 truncate">
           {ticket.description}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>📍 {ticket.location}</span>
            <span>👤 {ticket.requester_name}</span>
           </div>
          </div>
         </div>
         <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[ticket.status]}`}>
           {ticket.status.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-muted-foreground">
           {new Date(ticket.created_at).toLocaleDateString('en-PH')}
          </span>
         </div>
        </div>
       </div>
      ))}
     </div>

     {/* Detail modal */}
     <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
       {selected && (
        <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
         <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
          <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
           {selected.ticket_id}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">
           Ticket Details
          </DialogDescription>
         </DialogHeader>

         <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
          {[
           ['Type', selected.ticket_type.replace('_', ' ')],
           ['Priority', selected.priority],
           ['Status', selected.status.replace('_', ' ')],
           ['Requester', selected.requester_name],
           ['Location', selected.location],
           ['Assigned To', selected.assigned_to ?? 'You'],
           ['Description', selected.description],
           ['Opened', new Date(selected.created_at).toLocaleString('en-PH')],
           ...(selected.image_url ? [['Photo Proof', <a href={selected.image_url} target="_blank" rel="noreferrer" className="text-blue-400 font-semibold underline">View Full Image</a>]] : []),
           ...(selected.resolved_at ? [['Resolved', new Date(selected.resolved_at).toLocaleString('en-PH')]] : []),
          ].map(([label, value]) => (
           <div key={label as string} className="bg-background border border-border/50 p-4 rounded-xl shadow-sm flex flex-col">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label as string}</div>
            <div className="text-sm font-semibold text-foreground">{value}</div>
           </div>
          ))}

          <div className="bg-muted/20 border border-border/50 rounded-xl p-4">
           <UtilityRequirementChecklist
            ticketId={selected.ticket_id}
            ticketTypeKey={selected.ticket_type}
            readOnly
           />
          </div>
         </div>

         {isPathAWater(selected.ticket_type) &&
          (selected.status === 'for_inspection' || selected.status === 'assigned') &&
          wcrId && (
          <div className="mt-4 space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
           <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Path A — site feasibility</p>
           <label className="block text-xs font-medium text-foreground">Findings</label>
           <textarea
            className="input-field w-full min-h-[80px] text-sm"
            value={assessFindings}
            onChange={e => setAssessFindings(e.target.value)}
            placeholder="Inspection notes…"
           />
           <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={assessFeasible} onChange={e => setAssessFeasible(e.target.checked)} />
            Connection feasible
           </label>
           {assessFeasible && (
            <>
             <label className="block text-xs font-medium text-foreground">Quotation (PHP)</label>
             <Input
              type="number"
              min={1}
              step="0.01"
              value={assessQuote}
              onChange={e => setAssessQuote(e.target.value)}
              placeholder="e.g. 10750"
             />
            </>
           )}
           <button
            type="button"
            disabled={loading}
            onClick={() => void submitPathAAssessment()}
            className="h-10 w-full rounded-xl bg-primary text-[11px] font-extrabold uppercase tracking-widest text-primary-foreground"
           >
            Submit assessment
           </button>
          </div>
         )}

         <div className="mt-6 pt-6 border-t border-border/10 flex gap-3 shrink-0">
          <button
           className="h-11 rounded-xl px-8 flex-1 sm:flex-none w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm"
           onClick={() => setSelected(null)}
          >
           Close
          </button>
          {selected.status === 'assigned' && !isPathAWater(selected.ticket_type) && (
           <button
            className="h-11 rounded-xl flex-1 px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg flex items-center justify-center transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50"
            disabled={loading}
            onClick={() => handleStartJob(selected)}
           >
            Start Job
           </button>
          )}
          {selected.status === 'in_progress' && (
           <button
            type="button"
            className="h-11 rounded-xl flex-1 px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg flex items-center justify-center transition-all bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
            disabled={loading}
            onClick={() => openResolveDialog(selected)}
           >
            Mark Resolved
           </button>
          )}
         </div>
        </div>
       )}
      </DialogContent>
     </Dialog>

     <Dialog
      open={resolveDialogOpen}
      onOpenChange={open => {
       if (!open) {
        setResolveDialogOpen(false)
        setTicketForResolve(null)
        setResolutionNote('')
       }
      }}
     >
      <DialogContent className="max-w-md border-border bg-card p-0 gap-0 overflow-hidden shadow-lg sm:max-w-md">
       <div className="bg-muted/30 border-b border-border px-6 py-4">
        <DialogHeader className="space-y-1 text-left">
         <div className="flex items-center gap-2 text-primary">
          <ClipboardCheck className="h-5 w-5 shrink-0" aria-hidden />
          <DialogTitle className="font-display text-lg font-bold tracking-tight text-foreground">
           Resolve ticket
          </DialogTitle>
         </div>
         <DialogDescription className="text-sm text-muted-foreground pt-1">
          Record what was completed on site. This note is stored on the ticket for Helpdesk and audit.
         </DialogDescription>
        </DialogHeader>
       </div>
       <div className="px-6 py-5 space-y-4">
        {ticketForResolve && (
         <p className="text-xs font-mono text-muted-foreground">
          {ticketForResolve.ticket_id}
          <span className="mx-2 text-border">·</span>
          <span className="font-sans text-foreground">{ticketForResolve.requester_name}</span>
         </p>
        )}
        <div className="space-y-2">
         <Label htmlFor="resolution-note" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Resolution summary
         </Label>
         <Textarea
          id="resolution-note"
          value={resolutionNote}
          onChange={e => setResolutionNote(e.target.value)}
          placeholder="Describe work completed, parts replaced, verification done, or reason for closure…"
          className="min-h-[120px] rounded-xl border-border/60 bg-background text-sm resize-y"
          disabled={loading}
         />
         <p className="text-[11px] text-muted-foreground">
          Defaults to the original request description; edit as needed for a clear handoff to Helpdesk.
         </p>
        </div>
       </div>
       <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 gap-2 sm:gap-2 flex-col-reverse sm:flex-row sm:justify-end">
        <Button
         type="button"
         variant="outline"
         className="w-full sm:w-auto"
         disabled={loading}
         onClick={() => {
          setResolveDialogOpen(false)
          setTicketForResolve(null)
          setResolutionNote('')
         }}
        >
         Cancel
        </Button>
        <Button
         type="button"
         className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
         disabled={loading}
         onClick={() => void confirmResolve()}
        >
         {loading ? (
          <>
           <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           Saving…
          </>
         ) : (
          <>
           <CheckCircle className="mr-2 h-4 w-4" />
           Confirm resolution
          </>
         )}
        </Button>
       </DialogFooter>
      </DialogContent>
     </Dialog>
    </>
   )}
  </div>
 )
}
