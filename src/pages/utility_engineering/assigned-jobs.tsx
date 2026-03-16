import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listTickets, updateTicket, logTicketEvent } from '../../lib/serviceTickets'
import type { ServiceTicket, TicketStatus } from '@/types'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load assigned jobs.')
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to start job.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Assigned Jobs</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          View tickets assigned to you that are waiting to be accepted and started on site.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-100">
          {error}
        </div>
      )}

      {loading && tickets.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
          <Loader2 size={16} className="mr-2 animate-spin" />
          Loading assigned jobs…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700/70 p-6 text-center">
          <p className="text-sm text-slate-300 mb-1">No jobs awaiting acceptance.</p>
          <p className="text-xs text-slate-500">
            When the helpdesk assigns tickets to you, they will appear here until you start work.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div
              key={ticket.ticket_id}
              className="glass rounded-xl p-4"
              style={{ border: '1px solid rgba(148,163,184,0.18)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-blue-400">{ticket.ticket_id}</span>
                    <span className="text-[11px] rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-300 capitalize">
                      {ticket.ticket_type.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Priority: <span className="font-semibold">{ticket.priority}</span>
                    </span>
                  </div>
                  <div className="text-sm text-slate-200 mb-1 line-clamp-2">{ticket.description}</div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                    <span>👤 {ticket.requester_name}</span>
                    <span>📍 {ticket.location}</span>
                  </div>
                  {ticket.image_url && (
                    <div className="mt-3">
                      <img
                        src={ticket.image_url}
                        alt="Job Proof"
                        className="w-24 h-24 rounded-lg object-cover border border-slate-700 hover:border-blue-500 transition-colors cursor-pointer"
                        onClick={() => window.open(ticket.image_url, '_blank')}
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 w-32">
                  <button
                    type="button"
                    className="btn-primary w-full justify-center text-xs"
                    disabled={loading}
                    onClick={() => handleStartJob(ticket)}
                  >
                    Start Job
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
