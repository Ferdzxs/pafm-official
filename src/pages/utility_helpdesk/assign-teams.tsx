import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import type { ServiceTicket } from '@/types'
import { Loader2, UserCheck, MapPin, User, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const ASSIGNEES = ['Engr. Cruz B. Dagatan', 'Team A', 'Team B', 'Team C', 'Admin Desk']

export default function AssignTeams() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<ServiceTicket[]>([])
  const [assignee, setAssignee] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await listTickets()
        if (cancelled) return
        const triaged = data.filter(t => t.status === 'triaged' || t.status === 'for_inspection')
        setTickets(triaged)
        const initial: Record<string, string> = {}
        triaged.forEach((t: ServiceTicket) => {
          if (t.assigned_to) initial[t.ticket_id] = t.assigned_to
        })
        setAssignee(initial)
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tickets for assignment.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null
  const meta = ROLE_META[user.role]

  const handleAssign = async (ticket: ServiceTicket) => {
    const selected = assignee[ticket.ticket_id]
    if (!selected) {
      toast.error('Please select a team or engineer before assigning.')
      return
    }
    setLoading(true)
    try {
      await updateTicket(ticket.ticket_id, {
        assigned_to: selected,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
      } as any)

      await logTicketEvent({
        ticket_id: ticket.ticket_id,
        event: 'assigned',
        message: `Ticket assigned to ${selected}.`,
      })

      toast.success('Ticket assigned successfully.')
      setTickets(prev => prev.filter(t => t.ticket_id !== ticket.ticket_id))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign ticket.')
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
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Assignment desk
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Assign to teams</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Assign triaged utility tickets to engineering teams or named engineers for field execution.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading triaged tickets…
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-border/50 shadow-sm border-dashed bg-card/50">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No triaged tickets awaiting assignment</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Once tickets are triaged, they will appear here so they can be routed to engineering teams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck size={18} className="text-primary" />
              Queue
              <Badge variant="secondary">{tickets.length}</Badge>
            </CardTitle>
            <CardDescription>Tickets in triaged or for-inspection status ready for assignment.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/40">
            {tickets.map(ticket => (
              <div key={ticket.ticket_id} className="p-5 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-primary">{ticket.ticket_id}</span>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {ticket.ticket_type.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Priority: <span className="font-semibold text-foreground">{ticket.priority}</span>
                      </span>
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
                  </div>
                  <div className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Assign to</label>
                    <select
                      className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={assignee[ticket.ticket_id] ?? ''}
                      onChange={e =>
                        setAssignee(prev => ({
                          ...prev,
                          [ticket.ticket_id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select team or engineer</option>
                      {ASSIGNEES.map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <Button type="button" className="w-full" disabled={loading} onClick={() => void handleAssign(ticket)}>
                      <UserCheck size={14} className="mr-2" />
                      Assign ticket
                    </Button>
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
