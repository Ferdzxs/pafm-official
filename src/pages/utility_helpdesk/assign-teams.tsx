import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import type { ServiceTicket } from '@/types'
import { Loader2, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const ASSIGNEES = [
  'Engr. Cruz B. Dagatan',
  'Team A',
  'Team B',
  'Team C',
  'Admin Desk',
]

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
        const triaged = data.filter(t => t.status === 'triaged')
        setTickets(triaged)
        const initial: Record<string, string> = {}
        triaged.forEach((t: ServiceTicket) => {
          if (t.assigned_to) initial[t.ticket_id] = t.assigned_to
        })
        setAssignee(initial)
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Failed to load tickets for assignment.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!user) return null

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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign ticket.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-6xl mx-auto">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Assign to teams</h1>
          <p className="text-sm mt-0.5 text-muted-foreground">
            Assign triaged utility tickets to engineering teams or named engineers for execution.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading triaged tickets…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle p-6 text-center bg-card">
          <p className="text-sm text-foreground mb-1">No triaged tickets awaiting assignment.</p>
          <p className="text-xs text-muted-foreground">
            Once tickets are triaged, they will appear here so they can be routed to engineering teams.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div
              key={ticket.ticket_id}
              className="rounded-xl p-4 border border-border-subtle bg-card"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-primary">{ticket.ticket_id}</span>
                    <span className="text-[11px] rounded-full bg-muted px-2 py-0.5 text-muted-foreground capitalize">
                      {ticket.ticket_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Priority:{" "}
                      <span className="font-semibold">{ticket.priority}</span>
                    </span>
                  </div>
                  <div className="text-sm text-foreground mb-1 line-clamp-2">
                    {ticket.description}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                    <span>👤 {ticket.requester_name}</span>
                    <span>📍 {ticket.location}</span>
                  </div>
                </div>
                <div className="w-full sm:w-60 flex flex-col gap-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Assign to
                  </label>
                  <select
                    className="input-field w-full text-xs"
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
                  <button
                    type="button"
                    className="btn-primary w-full justify-center text-xs mt-1"
                    disabled={loading}
                    onClick={() => handleAssign(ticket)}
                  >
                    <UserCheck size={14} className="mr-1" />
                    Assign Ticket
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
