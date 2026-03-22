import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import type { ServiceTicket, TicketStatus } from '@/types'
import { Loader2, MapPin, User, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CitizenUploadsDialogTrigger } from '@/components/utility/CitizenUploadsDialog'

export default function AssignedJobs() {
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
          setTickets(data.filter(t => t.status === 'assigned'))
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load assigned jobs.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user) return null
  const meta = ROLE_META[user.role]

  const handleStartJob = async (ticket: ServiceTicket) => {
    setLoading(true)
    try {
      await updateTicket(ticket.ticket_id, { status: 'in_progress' as TicketStatus } as any)
      await logTicketEvent({
        ticket_id: ticket.ticket_id,
        event: 'in_progress',
        message: 'Job accepted and started by engineering.',
      })
      setTickets(prev => prev.filter((t: ServiceTicket) => t.ticket_id !== ticket.ticket_id))
      toast.success('Job marked as in progress.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start job.')
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
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Acceptance queue
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Assigned jobs</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            Tickets assigned to you that are waiting to be accepted and started on site.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading assigned jobs…
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-border/50 shadow-sm border-dashed bg-card/50">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No jobs awaiting acceptance</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              When the helpdesk assigns tickets to you, they will appear here until you start work.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              Awaiting start
              <Badge variant="secondary">{tickets.length}</Badge>
            </CardTitle>
            <CardDescription>Accept a job to move it to in progress.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/40">
            {tickets.map(ticket => (
              <div key={ticket.ticket_id} className="p-5 hover:bg-muted/40 transition-colors">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                    {ticket.image_url && (
                      <div className="pt-2">
                        <img
                          src={ticket.image_url}
                          alt="Job proof"
                          className="w-24 h-24 rounded-lg object-cover border border-border hover:border-primary transition-colors cursor-pointer"
                          onClick={() => window.open(ticket.image_url, '_blank')}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-start">
                    <CitizenUploadsDialogTrigger ticketId={ticket.ticket_id} ticketTypeKey={ticket.ticket_type} />
                    <Button type="button" disabled={loading} onClick={() => void handleStartJob(ticket)}>
                      Start job
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
