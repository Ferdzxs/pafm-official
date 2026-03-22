import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { supabase } from '@/lib/supabase'
import { updateTicket, logTicketEvent } from '@/lib/serviceTickets'
import type { ServiceTicket } from '@/types'
import { Loader2, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CitizenUploadsDialogTrigger } from '@/components/utility/CitizenUploadsDialog'

const PATH_A = ['water_connection:new', 'water_connection:additional_meter', 'water_connection'] as const

export default function Installations() {
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
        const { data, error: qErr } = await supabase
          .from('service_tickets')
          .select(
            'ticket_id, ticket_type, requester_name, description, location, priority, status, assigned_to, created_at, resolved_at, image_url',
          )
          .in('ticket_type', [...PATH_A])
          .in('status', ['for_installation', 'in_progress'])
          .eq('assigned_to', user.full_name)
          .order('created_at', { ascending: false })
        if (qErr) throw qErr
        if (!cancelled) setTickets((data ?? []) as unknown as ServiceTicket[])
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load installation jobs.')
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

  const handleMarkCompleted = async (ticket: ServiceTicket) => {
    const note = window.prompt('Enter installation completion note:', '')
    if (note === null) return
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const { data: wcr } = await supabase
        .from('water_connection_request')
        .select('water_request_id')
        .eq('ticket_id', ticket.ticket_id)
        .maybeSingle()
      if (wcr?.water_request_id) {
        await supabase
          .from('installation_record')
          .update({
            installation_date: today,
            activation_confirmed: false,
          })
          .eq('water_request_id', wcr.water_request_id)
      }
      await updateTicket(ticket.ticket_id, {
        status: 'pending_activation',
        resolution_note: note || ticket.description,
      } as any)
      await logTicketEvent({
        ticket_id: ticket.ticket_id,
        event: 'installation_done',
        message: 'Water meter / service pipe installation completed; pending helpdesk activation.',
      })
      setTickets(prev => prev.filter(t => t.ticket_id !== ticket.ticket_id))
      toast.success('Installation recorded. Helpdesk will confirm activation.')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete installation.')
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
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Path A — install
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Installations</h1>
          <p className="text-muted-foreground text-sm max-w-2xl">
            New water connections after payment is settled. Complete installation, then Helpdesk confirms service activation.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading…
        </div>
      ) : tickets.length === 0 ? (
        <Card className="border-border/50 shadow-sm border-dashed bg-card/50">
          <CardContent className="py-16 text-center">
            <p className="text-sm font-semibold text-foreground mb-1">No paid installation jobs assigned to you</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Appears here after Treasury settles the connection fee and the ticket is ready for installation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
          <CardHeader className="pb-3 bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2">
              Installation queue
              <Badge variant="secondary">{tickets.length}</Badge>
            </CardTitle>
            <CardDescription>Mark done when meter or service line work is complete.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/40">
            {tickets.map(t => (
              <div key={t.ticket_id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-muted/40 transition-colors">
                <div className="min-w-0 space-y-1">
                  <p className="font-mono text-xs font-bold text-primary">{t.ticket_id}</p>
                  <p className="font-semibold text-foreground">{t.requester_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{t.location}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">{t.status.replace(/_/g, ' ')}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <CitizenUploadsDialogTrigger ticketId={t.ticket_id} ticketTypeKey={t.ticket_type} />
                  {t.status === 'for_installation' && (
                    <Button type="button" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleMarkCompleted(t)}>
                      Mark installation done
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
