import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listTickets, updateTicket, logTicketEvent } from '@/lib/serviceTickets'
import type { ServiceTicket, TicketStatus } from '@/types'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
          setTickets(data.filter(t => t.ticket_type === 'leak_report'))
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

  const handleAdvanceStatus = async (ticket: ServiceTicket) => {
    const next: TicketStatus =
      ticket.status === 'assigned' ? 'in_progress' : ticket.status === 'in_progress' ? 'resolved' : ticket.status

    if (next === ticket.status) return

    setLoading(true)
    try {
      const patch: any = { status: next }
      if (next === 'resolved' && !ticket.resolved_at) {
        patch.resolved_at = new Date().toISOString()
      }
      await updateTicket(ticket.ticket_id, patch)
      if (next === 'resolved') {
        await logTicketEvent({
          ticket_id: ticket.ticket_id,
          event: 'resolved',
          message: 'Leak report resolved.',
        })
      }
      setTickets(prev =>
        prev.map(t =>
          t.ticket_id === ticket.ticket_id
            ? { ...t, status: next, resolved_at: patch.resolved_at ?? t.resolved_at }
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
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Leak & drainage reports</h1>
        <p className="text-sm mt-0.5 text-muted-foreground">
          Inspect and update the status of leak reports and related drainage issues assigned to you.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading leak reports…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle p-6 text-center bg-card">
          <p className="text-sm text-foreground mb-1">No leak reports assigned to you.</p>
          <p className="text-xs text-muted-foreground">
            Leak and drainage-related tickets assigned to you will appear here for monitoring and update.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div
              key={ticket.ticket_id}
              className="rounded-xl p-4 border bg-card"
              style={{ borderColor: 'rgba(248,113,113,0.3)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-primary">{ticket.ticket_id}</span>
                    <span className="text-[11px] rounded-full bg-rose-500/10 border border-rose-500/40 px-2 py-0.5 text-rose-500">
                      {ticket.priority.toUpperCase()}
                    </span>
                    <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-foreground mb-1 line-clamp-2">{ticket.description}</div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>👤 {ticket.requester_name}</span>
                    <span>📍 {ticket.location}</span>
                  </div>
                  {ticket.image_url && (
                    <div className="mt-3">
                      <img
                        src={ticket.image_url}
                        alt="Leak Proof"
                        className="w-24 h-24 rounded-lg object-cover border border-border-subtle hover:border-primary transition-colors cursor-pointer"
                        onClick={() => window.open(ticket.image_url, '_blank')}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-36">
                  {(ticket.status === 'assigned' || ticket.status === 'in_progress') && (
                    <button
                      type="button"
                      className="btn-primary w-full justify-center text-xs"
                      disabled={loading}
                      onClick={() => handleAdvanceStatus(ticket)}
                    >
                      {ticket.status === 'assigned' ? 'Start Leak Repair' : 'Mark Resolved'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
