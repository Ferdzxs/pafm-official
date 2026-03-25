import React, { useState, useEffect } from 'react'
import {
 HeartHandshake, Eye, Loader2, Plus, X,
 Search, CheckCircle, XCircle, AlertCircle,
 FileText, User, Calendar, Shield, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface AssistanceRecord {
 assistance_id: string
 status: string
 social_worker_eval_date: string | null
 digital_cert_of_guarantee_url: string | null
 deceased: { full_name: string; date_of_death: string } | null
 issued_by_office: { office_name: string } | null
 social_worker: { full_name: string; position_title: string } | null
 burial_record?: { burial_date: string; niche_record: { niche_number: string } | null; cemetery: { cemetery_name: string } | null }[]
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
 pending: { label: 'Pending Eval', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
 approved: { label: 'Approved', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  not_applicable: { label: 'N/A', cls: 'bg-muted/40 text-muted-foreground border-border' },
 rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function IndigentAssistance() {
 const [assistanceList, setAssistanceList] = useState<AssistanceRecord[]>([])
 const [loading, setLoading] = useState(true)
 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState('all')
 const [selected, setSelected] = useState<AssistanceRecord | null>(null)
 const [actionLoading, setActionLoading] = useState<string | null>(null)
 const [currentPage, setCurrentPage] = useState(1)
 const itemsPerPage = 10

 const [showNewModal, setShowNewModal] = useState(false)
 const [deceasedOptions, setDeceasedOptions] = useState<{ deceased_id: string; full_name: string }[]>([])
 const [swOptions, setSWOptions] = useState<{ employee_id: string; full_name: string }[]>([])
 const [formData, setFormData] = useState({
 deceased_id: '',
 social_worker_employee_id: '',
 social_worker_eval_date: new Date().toISOString().split('T')[0],
 })

 useEffect(() => { fetchAssistance() }, [])
 useEffect(() => { setCurrentPage(1) }, [search, statusFilter])

 async function fetchOptions() {
 try {
  const [decRes, swRes] = await Promise.all([
  supabase.from('deceased').select('deceased_id, full_name'),
  supabase.from('employee').select('employee_id, full_name').eq('office_id', 'OFF-002')
  ])
  setDeceasedOptions(decRes.data || [])
  setSWOptions(swRes.data || [])
 } catch (err) {
  console.error('Error fetching options:', err)
 }
 }

 useEffect(() => {
 if (showNewModal) fetchOptions()
 }, [showNewModal])

 async function fetchAssistance() {
 setLoading(true)
 try {
  const { data, error } = await supabase
  .from('indigent_assistance_record')
  .select(`
   *,
   deceased:deceased_id(full_name, date_of_death),
   government_office:issued_by_office(office_name),
   social_worker:social_worker_employee_id(full_name, position_title)
  `)
  .order('social_worker_eval_date', { ascending: false, nullsFirst: true })

  if (error) throw error
  setAssistanceList(data || [])
 } catch (err: any) {
  toast.error('Failed to fetch assistance records: ' + err.message)
 } finally {
  setLoading(false)
 }
 }

 async function updateStatus(id: string, newStatus: 'approved' | 'rejected') {
 setActionLoading(id)
 try {
  const { error } = await supabase
  .from('indigent_assistance_record')
  .update({
   status: newStatus,
   social_worker_eval_date: new Date().toISOString().split('T')[0],
  })
  .eq('assistance_id', id)

  if (error) throw error
  toast.success(`Case ${newStatus} successfully.`)
  setSelected(null)
  fetchAssistance()
 } catch (err: any) {
  toast.error('Action failed: ' + err.message)
 } finally {
  setActionLoading(null)
 }
 }

 async function createCase() {
 if (!formData.deceased_id || !formData.social_worker_employee_id) {
  toast.error('Please fill in all required fields')
  return
 }

 setActionLoading('creating')
 try {
  const newId = `IAR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
  const { error } = await supabase
  .from('indigent_assistance_record')
  .insert({
   assistance_id: newId,
   deceased_id: formData.deceased_id,
   social_worker_employee_id: formData.social_worker_employee_id,
   social_worker_eval_date: formData.social_worker_eval_date,
   issued_by_office: 'OFF-002', // SSDD
   status: 'pending'
  })

  if (error) throw error
  toast.success('Indigent case created successfully')
  setShowNewModal(false)
  fetchAssistance()
 } catch (err: any) {
  toast.error('Failed to create case: ' + err.message)
 } finally {
  setActionLoading(null)
 }
 }

 const filtered = assistanceList.filter(r => {
 const matchSearch =
  (r.deceased?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
  r.assistance_id.toLowerCase().includes(search.toLowerCase())
 const matchStatus = statusFilter === 'all' || r.status === statusFilter
 return matchSearch && matchStatus
 })

 const totalPages = Math.ceil(filtered.length / itemsPerPage)
 const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

 const counts = {
 pending: assistanceList.filter(r => r.status === 'pending').length,
 approved: assistanceList.filter(r => r.status === 'approved').length,
 }

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
  <div>
   <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
   <HeartHandshake size={22} className="text-emerald-400" /> Indigent Assistance
   </h1>
   <p className="text-muted-foreground text-sm mt-0.5">Tracking burial and funeral financial aid cases — coordinated with SSDD</p>
  </div>
  <button 
   onClick={() => setShowNewModal(true)}
   className="btn-primary flex items-center gap-2 self-start sm:self-auto"
  >
   <Plus size={15} /> New Case
  </button>
  </div>

  {/* Summary Cards */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {[
   { label: 'Total Cases', value: assistanceList.length, color: 'text-white' },
   { label: 'Pending Review', value: counts.pending, color: 'text-amber-400' },
   { label: 'Approved', value: counts.approved, color: 'text-emerald-400' },
   {
   label: 'With Guarantee',
   value: assistanceList.filter(r => r.digital_cert_of_guarantee_url).length,
   color: 'text-blue-400'
   },
  ].map(({ label, value, color }) => (
   <div key={label} className="glass rounded-xl p-4 border border-white/5">
   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
   <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
   </div>
  ))}
  </div>

  {/* Filters */}
  <div className="flex flex-col sm:flex-row gap-3 mb-5">
  <div className="relative flex-1">
   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
   <input
   className="input-field pl-10"
   placeholder="Search by case ID or deceased name…"
   value={search}
   onChange={e => setSearch(e.target.value)}
   />
  </div>
  <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
   <option value="all">All Statuses</option>
   <option value="pending">Pending</option>
   <option value="approved">Approved</option>
   <option value="rejected">Rejected</option>
   <option value="not_applicable">Not Applicable</option>
  </select>
  </div>

  {/* Table */}
  <div className="glass rounded-2xl overflow-hidden border border-white/5">
  <div className="overflow-x-auto">
   {loading ? (
   <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
    <Loader2 className="animate-spin" size={28} />
    <p className="text-sm">Loading records…</p>
   </div>
   ) : (
   <table className="w-full min-w-[760px]">
    <thead>
    <tr className="border-b border-white/5 bg-white/3">
     {['Case ID', 'Deceased', 'Date of Death', 'Eval Date', 'Social Worker', 'Guarantee', 'Status', 'Actions'].map(h => (
     <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
     ))}
    </tr>
    </thead>
    <tbody>
    {paginatedItems.map(rec => {
     const cfg = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.pending
     return (
     <tr
      key={rec.assistance_id}
      className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
      onClick={() => setSelected(rec)}
     >
      <td className="px-4 py-3.5 text-xs font-mono text-blue-400">{rec.assistance_id}</td>
      <td className="px-4 py-3.5 text-sm font-semibold text-white">{rec.deceased?.full_name ?? '—'}</td>
      <td className="px-4 py-3.5 text-sm text-muted-foreground">
      {rec.deceased?.date_of_death
       ? new Date(rec.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'medium' })
       : '—'}
      </td>
      <td className="px-4 py-3.5 text-sm text-muted-foreground">
      {rec.social_worker_eval_date
       ? new Date(rec.social_worker_eval_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })
       : <span className="text-muted-foreground italic text-xs">Not yet evaluated</span>}
      </td>
      <td className="px-4 py-3.5 text-sm text-muted-foreground">{rec.social_worker?.full_name ?? '—'}</td>
      <td className="px-4 py-3.5">
      {rec.digital_cert_of_guarantee_url ? (
       <a
       href={rec.digital_cert_of_guarantee_url}
       target="_blank"
       rel="noopener noreferrer"
       className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors inline-flex"
       onClick={e => e.stopPropagation()}
       >
       <Download size={14} />
       </a>
      ) : (
       <span className="text-muted-foreground text-xs">—</span>
      )}
      </td>
      <td className="px-4 py-3.5">
      <Badge className={`${cfg.cls} border text-[10px] font-bold uppercase tracking-tight`}>{cfg.label}</Badge>
      </td>
      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
      <div className="flex gap-1">
       <button
       className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
       onClick={() => setSelected(rec)}
       >
       <Eye size={15} />
       </button>
       {rec.status === 'pending' && (
       <>
        <button
        disabled={actionLoading === rec.assistance_id}
        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50"
        onClick={() => updateStatus(rec.assistance_id, 'approved')}
        title="Approve"
        >
        {actionLoading === rec.assistance_id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
        </button>
        <button
        disabled={actionLoading === rec.assistance_id}
        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50"
        onClick={() => updateStatus(rec.assistance_id, 'rejected')}
        title="Reject"
        >
        <XCircle size={15} />
        </button>
       </>
       )}
      </div>
      </td>
     </tr>
     )
    })}
    </tbody>
   </table>
   )}
  </div>
  {!loading && filtered.length === 0 && (
   <div className="py-16 text-center">
   <AlertCircle className="mx-auto mb-3 text-muted-foreground" size={32} />
   <p className="text-muted-foreground">No matching records.</p>
   </div>
  )}
  </div>

  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

  {/* Detail Modal */}
  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">REF: {selected.assistance_id}</Badge>
        <span className={`${(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending).cls} px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border`}>
         {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.pending).label}
        </span>
       </div>
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        <HeartHandshake className="text-emerald-500 h-6 w-6" /> {selected.deceased?.full_name}
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Indigent Assistance Application
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm surface-box border border-border/20 p-5">
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Date of Death</p>
         <p className="font-bold text-foreground">{selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'}</p>
        </div>
        <div className="space-y-1 text-right">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Eval Date</p>
         <p className="font-bold text-foreground">{selected.social_worker_eval_date ? new Date(selected.social_worker_eval_date).toLocaleDateString('en-PH', { dateStyle: 'long' }) : 'Not evaluated'}</p>
        </div>
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Social Worker</p>
         <p className="font-bold text-foreground">{selected.social_worker?.full_name ?? '—'}</p>
         <p className="text-xs text-muted-foreground mt-0.5">{selected.social_worker?.position_title ?? '—'}</p>
        </div>
        <div className="space-y-1 text-right">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Issuing Office</p>
         <p className="font-bold text-foreground">{selected.issued_by_office?.office_name ?? '—'}</p>
        </div>
       </div>

       {selected.digital_cert_of_guarantee_url && (
        <a
         href={selected.digital_cert_of_guarantee_url}
         target="_blank"
         rel="noopener noreferrer"
         className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-all font-bold border border-blue-500/20 uppercase tracking-tight text-xs"
        >
         <Download size={16} /> Download Certificate of Guarantee
        </a>
       )}
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button onClick={() => setSelected(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Close</button>
       {selected.status === 'pending' && (
        <div className="flex gap-2 w-full sm:w-auto">
         <button
          disabled={!!actionLoading}
          onClick={() => updateStatus(selected.assistance_id, 'approved')}
          className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
         >
          {actionLoading === selected.assistance_id ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />} Approve
         </button>
         <button
          disabled={!!actionLoading}
          onClick={() => updateStatus(selected.assistance_id, 'rejected')}
          className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
         >
          {actionLoading === selected.assistance_id ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <XCircle size={14} className="mr-1.5" />} Reject
         </button>
        </div>
       )}
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>

  {/* New Case Modal */}
  <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
   <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
    <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
     <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
      <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
        <Plus size={20} />
       </div>
       <DialogTitle className="font-display text-xl font-extrabold tracking-tight">New Indigent Case</DialogTitle>
      </div>
      <DialogDescription className="font-medium text-muted-foreground/80 mt-1 pl-13">Create a new assistance record.</DialogDescription>
     </DialogHeader>

     <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
      <div>
       <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Deceased Individual</label>
       <select 
        className="w-full px-3 py-2 rounded-xl text-sm border bg-background border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        value={formData.deceased_id}
        onChange={e => setFormData(prev => ({ ...prev, deceased_id: e.target.value }))}
       >
        <option value="">Select deceased...</option>
        {deceasedOptions.map(d => (
         <option key={d.deceased_id} value={d.deceased_id}>{d.full_name}</option>
        ))}
       </select>
      </div>

      <div>
       <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Assigned Social Worker</label>
       <select 
        className="w-full px-3 py-2 rounded-xl text-sm border bg-background border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        value={formData.social_worker_employee_id}
        onChange={e => setFormData(prev => ({ ...prev, social_worker_employee_id: e.target.value }))}
       >
        <option value="">Select social worker...</option>
        {swOptions.map(sw => (
         <option key={sw.employee_id} value={sw.employee_id}>{sw.full_name}</option>
        ))}
       </select>
      </div>

      <div>
       <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Evaluation Date</label>
       <input 
        type="date"
        className="w-full px-3 py-2 rounded-xl text-sm border bg-background border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
        value={formData.social_worker_eval_date}
        onChange={e => setFormData(prev => ({ ...prev, social_worker_eval_date: e.target.value }))}
       />
      </div>
     </div>

     <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
      <button onClick={() => setShowNewModal(false)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Cancel</button>
      <button
       onClick={createCase}
       disabled={actionLoading === 'creating'}
       className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold shadow-lg shadow-primary/20 uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
      >
       {actionLoading === 'creating' ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} className="mr-1.5" />}
       Create Case
      </button>
     </div>
    </div>
   </DialogContent>
  </Dialog>
 </div>
 )
}
