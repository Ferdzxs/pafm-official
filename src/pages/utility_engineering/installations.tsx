import React, { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { listTickets, updateTicket, logTicketEvent } from '@/lib/serviceTickets'
import type { ServiceTicket } from '@/types'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

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
        const data = await listTickets({ assigned_to: user.full_name })
        if (!cancelled) {
          setTickets(data.filter(t => t.ticket_type === 'water_connection'))
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load installation jobs.')
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

  const handleMarkCompleted = async (ticket: ServiceTicket) => {
    const note = window.prompt('Enter installation completion note:', '')
    if (note === null) return
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
        message: 'Water connection / installation marked as completed.',
      })
      setTickets(prev =>
        prev.map(t =>
          t.ticket_id === ticket.ticket_id ? { ...t, status: 'resolved', resolved_at } : t,
        ),
      )
      toast.success('Installation marked as completed.')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to complete installation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Installations & Major Fixes</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Track new water supply connections and major pipeline works assigned to you and record completion.
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
          Loading installation jobs…
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700/70 p-6 text-center">
          <p className="text-sm text-slate-300 mb-1">No water connection or installation jobs assigned.</p>
          <p className="text-xs text-slate-500">
            Water connection tickets assigned to you will appear here for installation and completion logging.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div
              key={ticket.ticket_id}
              className="glass rounded-xl p-4"
              style={{ border: '1px solid rgba(56,189,248,0.4)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-blue-400">{ticket.ticket_id}</span>
                    <span className="text-[11px] rounded-full bg-sky-500/10 border border-sky-500/40 px-2 py-0.5 text-sky-300">
                      {ticket.priority.toUpperCase()}
                    </span>
                    <span className="text-[11px] rounded-full bg-slate-800/80 px-2 py-0.5 text-slate-300 capitalize">
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-slate-200 mb-1 line-clamp-2">{ticket.description}</div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-3">
                    <span>👤 {ticket.requester_name}</span>
                    <span>📍 {ticket.location}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-40">
                  {ticket.status !== 'resolved' && (
                    <button
                      type="button"
                      className="btn-success w-full justify-center text-xs"
                      disabled={loading}
                      onClick={() => handleMarkCompleted(ticket)}
                    >
                      Mark Installation Completed
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
