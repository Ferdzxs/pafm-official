import React, { useEffect, useState, useMemo } from 'react'
import { Package, Plus, Search, Filter, Clock, CheckCircle, XCircle, Send, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type RequestRow = {
 id: string
 item: string
 status: string
 date: string
 priority: string
 notes: string
}

const OFFICE_NAME = 'Barangay Secretariat'

const priorityColors: Record<string, string> = {
 High: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
 Medium: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
 Low: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
}

const statusColors: Record<string, { bg: string; color: string }> = {
 Pending: { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
 Approved: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
 Rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
 'In Progress': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
}

export default function PunongBarangayAssetRequestsPage() {
 const [requests, setRequests] = useState<RequestRow[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [showModal, setShowModal] = useState(false)
 const [submitting, setSubmitting] = useState(false)

 const [formItem, setFormItem] = useState('')
 const [formPriority, setFormPriority] = useState('Medium')
 const [formNotes, setFormNotes] = useState('')

 const load = async () => {
  setIsLoading(true)
  const { data, error } = await supabase
   .from('inventory_request')
   .select(`
    inventory_request_id,
    inventory_scope,
    status,
    date_requested,
    cycle_type,
    government_office!requesting_office ( office_name )
   `)
   .order('date_requested', { ascending: false })

  if (error) {
   console.error(error)
   toast.error('Failed to load requests.')
   setIsLoading(false)
   return
  }

  const mapped: RequestRow[] = (data || [])
   .filter((r: any) => r.government_office?.office_name === OFFICE_NAME)
   .map((r: any) => ({
    id: r.inventory_request_id,
    item: r.inventory_scope || 'General request',
    status: (() => {
     const s = r.status?.toLowerCase()
     if (s === 'approved' || s === 'completed') return 'Approved'
     if (s === 'rejected') return 'Rejected'
     if (s === 'in_progress') return 'In Progress'
     return 'Pending'
    })(),
    date: r.date_requested || '',
    priority: ['Low', 'Medium', 'High'].includes(r.cycle_type) ? r.cycle_type : 'Medium',
    notes: '',
   }))

  setRequests(mapped)
  setIsLoading(false)
 }

 useEffect(() => { load() }, [])

 const filtered = useMemo(() => {
  if (!search.trim()) return requests
  const q = search.toLowerCase()
  return requests.filter(r => r.id.toLowerCase().includes(q) || r.item.toLowerCase().includes(q))
 }, [requests, search])

 const stats = useMemo(() => ({
  Pending: requests.filter(r => r.status === 'Pending').length,
  Approved: requests.filter(r => r.status === 'Approved').length,
  Rejected: requests.filter(r => r.status === 'Rejected').length,
 }), [requests])

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!formItem.trim()) { toast.error('Please enter an item or service.'); return }
  setSubmitting(true)

  const { data: officeData, error: officeErr } = await supabase
   .from('government_office')
   .select('office_id')
   .eq('office_name', OFFICE_NAME)
   .maybeSingle()

  if (officeErr || !officeData) {
   toast.error('Could not find office record.')
   setSubmitting(false)
   return
  }

  const today = new Date().toISOString().split('T')[0]
  const reqId = `REQ-BR-${Date.now()}`

  const { error } = await supabase.from('inventory_request').insert({
   inventory_request_id: reqId,
   requesting_office: officeData.office_id,
   inventory_scope: formItem.trim(),
   status: 'pending',
   date_requested: today,
   cycle_type: formPriority,
  })

  if (error) {
   console.error(error)
   toast.error('Failed to submit request: ' + error.message)
  } else {
   toast.success('Request submitted to FAMCD!')
   setShowModal(false)
   setFormItem('')
   setFormPriority('Medium')
   setFormNotes('')
   load()
  }
  setSubmitting(false)
 }

 return (
  <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in">
   {/* HEADER */}
   <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
    <div>
     <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
      Asset &amp; Resource Requests
     </h1>
     <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
      Submit and track maintenance or resource requests sent to FAMCD.
     </p>
    </div>
    <div className="flex gap-2">
     <button
      onClick={load}
      className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"
      style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
     >
      <RefreshCw size={15} />
     </button>
     <button
      onClick={() => setShowModal(true)}
      className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
      style={{ background: '#2563eb', color: '#fff' }}
     >
      <Plus size={16} /> New Request
     </button>
    </div>
   </div>

   {/* STATS */}
   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
    {[
     { label: 'Pending', value: stats.Pending, icon: Clock, color: '#f59e0b' },
     { label: 'Approved', value: stats.Approved, icon: CheckCircle, color: '#10b981' },
     { label: 'Rejected', value: stats.Rejected, icon: XCircle, color: '#ef4444' },
    ].map((stat, i) => {
     const Icon = stat.icon
     return (
      <div key={i} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
       <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
        <Icon size={20} />
       </div>
       <div>
        <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
        <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
       </div>
      </div>
     )
    })}
   </div>

   {/* SEARCH */}
   <div className="flex flex-col sm:flex-row items-center gap-3 p-2 rounded-2xl" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <div className="relative flex-1">
     <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
     <input
      type="text"
      placeholder="Search requests..."
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-transparent outline-none"
      style={{ color: 'var(--color-text-primary)' }}
     />
    </div>
    <div className="w-px h-6 hidden sm:block" style={{ background: 'var(--color-border)' }} />
    <button onClick={() => setSearch('')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
     <Filter size={16} /> Clear
    </button>
   </div>

   {/* TABLE */}
   <div className="bg-white dark:bg-[#1a1c23] rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
    <div className="overflow-x-auto">
     <table className="w-full text-left text-sm whitespace-nowrap">
      <thead>
       <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
        <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Request ID</th>
        <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Item / Service</th>
        <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Date Requested</th>
        <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400">Priority</th>
        <th className="px-6 py-4 font-semibold text-gray-500 dark:text-gray-400 text-right">Status</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
       {isLoading ? (
        <tr><td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading requests...</td></tr>
       ) : filtered.length === 0 ? (
        <tr><td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No requests found. Click "New Request" to submit one.</td></tr>
       ) : filtered.map((req) => (
        <tr key={req.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
         <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">{req.id}</td>
         <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{req.item}</td>
         <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{req.date}</td>
         <td className="px-6 py-4">
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColors[req.priority] || priorityColors.Medium}`}>
           {req.priority}
          </span>
         </td>
         <td className="px-6 py-4 text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium" style={{
           background: statusColors[req.status]?.bg ?? 'rgba(100,100,100,0.1)',
           color: statusColors[req.status]?.color ?? '#888',
          }}>
           {req.status}
          </div>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   </div>

   {/* NEW REQUEST MODAL */}
   <Dialog open={showModal} onOpenChange={setShowModal}>
    <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        New Asset Request
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Submitting to FAMCD — Punong Barangay
       </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col overflow-hidden">
       <div className="overflow-y-auto sidebar-scrollbar space-y-5 flex-1 pr-2 pb-2">
        <div>
         <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Item / Service Requested <span className="text-red-500">*</span></label>
         <input
          className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
          placeholder="e.g. Community Hall Tables, Floodlight Repairs"
          value={formItem}
          onChange={e => setFormItem(e.target.value)}
          required
         />
        </div>
        <div>
         <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Priority</label>
         <select
          className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          value={formPriority}
          onChange={e => setFormPriority(e.target.value)}
         >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
         </select>
        </div>
        <div>
         <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Notes (optional)</label>
         <textarea
          className="w-full rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none p-4 placeholder:text-muted-foreground/50"
          placeholder="Additional context for FAMCD..."
          rows={3}
          value={formNotes}
          onChange={e => setFormNotes(e.target.value)}
         />
        </div>
       </div>

       <div className="mt-4 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button type="button" onClick={() => setShowModal(false)}
         className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm">
         Cancel
        </button>
        <button type="submit" disabled={submitting}
         className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg flex items-center justify-center transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50">
         <Send size={14} className="mr-2" /> {submitting ? 'Submitting...' : 'Submit to FAMCD'}
        </button>
       </div>
      </form>
     </div>
    </DialogContent>
   </Dialog>
  </div>
 )
}