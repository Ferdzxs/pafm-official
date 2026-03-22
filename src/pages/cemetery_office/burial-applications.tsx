import React, { useState, useEffect } from 'react'
import { Search, Eye, CheckCircle, XCircle, Plus, Loader2, Shield } from 'lucide-react'
import type { OnlineBurialApplication } from '@/types'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, string> = {
 pending: 'badge-pending', 
 under_review: 'badge-pending', 
 ssdd_evaluated: 'bg-indigo-50 text-indigo-400 border-indigo-500',
 verified: 'bg-blue-50 text-blue-400 border-blue-500',
 signed: 'bg-purple-50 text-purple-400 border-purple-500',
 approved: 'badge-approved',
 rejected: 'badge-rejected', 
 completed: 'badge-completed',
}

export default function BurialApplications() {
 const [search, setSearch] = useState('')
 const [statusFilter, setStatusFilter] = useState('all')
 const [selected, setSelected] = useState<any | null>(null)
 const [applications, setApplications] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [actionLoading, setActionLoading] = useState<string | null>(null)
 const [currentPage, setCurrentPage] = useState(1)
 const itemsPerPage = 10

 const [showNewModal, setShowNewModal] = useState(false)
 const [personOptions, setPersonOptions] = useState<{ person_id: string; full_name: string }[]>([])
 const [deceasedOptions, setDeceasedOptions] = useState<{ deceased_id: string; full_name: string }[]>([])
 const [formData, setFormData] = useState({
  person_id: '',
  deceased_id: '',
  submission_date: new Date().toISOString().split('T')[0],
 })
 const [isSaving, setIsSaving] = useState(false)

 async function fetchOptions() {
  try {
   const [pRes, dRes] = await Promise.all([
    supabase.from('person').select('person_id, full_name'),
    supabase.from('deceased').select('deceased_id, full_name')
   ])
   setPersonOptions(pRes.data || [])
   setDeceasedOptions(dRes.data || [])
  } catch (err) {
   console.error('Error fetching options:', err)
  }
 }

 useEffect(() => {
  if (showNewModal) fetchOptions()
 }, [showNewModal])

 useEffect(() => {
  fetchApplications()
 }, [])

 async function fetchApplications() {
  setLoading(true)
  try {
   const { data, error } = await supabase
    .from('online_burial_application')
    .select(`
     *,
     person:person_id (full_name),
     deceased:deceased_id (full_name, date_of_death, death_certificate_no)
    `)
    .order('submission_date', { ascending: false })

   if (error) throw error
   setApplications(data || [])
  } catch (error) {
   toast.error('Failed to fetch applications: ' + (error as any).message)
  } finally {
   setLoading(false)
  }
 }

 async function updateStatus(id: string, status: string) {
  setActionLoading(id)
  try {
   const { error } = await supabase
    .from('online_burial_application')
    .update({ application_status: status })
    .eq('application_id', id)

   if (error) throw error
   toast.success(`Application ${status} successfully`)
   fetchApplications()
   if (selected?.application_id === id) setSelected(null)
  } catch (error) {
   toast.error('Failed to update status: ' + (error as any).message)
  } finally {
   setActionLoading(null)
  }
 }

 async function handleCreateApplication() {
  if (!formData.person_id || !formData.deceased_id) {
   toast.error('Please select both applicant and deceased')
   return
  }

  setIsSaving(true)
  try {
   const newId = `OBA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
   const { error } = await supabase
    .from('online_burial_application')
    .insert({
     application_id: newId,
     person_id: formData.person_id,
     deceased_id: formData.deceased_id,
     submission_date: formData.submission_date,
     application_status: 'pending',
     document_validation_status: 'pending'
    })

   if (error) throw error
   toast.success('Burial application created successfully')
   setShowNewModal(false)
   fetchApplications()
  } catch (error: any) {
   toast.error('Failed to create application: ' + error.message)
  } finally {
   setIsSaving(false)
  }
 }

 const filtered = applications.filter(a => {
  const applicantName = a.person?.full_name || ''
  const deceasedName = a.deceased?.full_name || ''
  const matchSearch = applicantName.toLowerCase().includes(search.toLowerCase())
   || deceasedName.toLowerCase().includes(search.toLowerCase())
   || a.application_id.toLowerCase().includes(search.toLowerCase())
  const matchStatus = statusFilter === 'all' || a.application_status === statusFilter
  return matchSearch && matchStatus
 })

 const totalPages = Math.ceil(filtered.length / itemsPerPage)
 const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

 // Reset to page 1 when filter/search changes
 useEffect(() => {
  setCurrentPage(1)
 }, [search, statusFilter])

 return (
  <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
   <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
     <h1 className="font-display text-2xl font-bold text-foreground">Burial Applications</h1>
     <p className="text-muted-foreground text-sm mt-0.5">Online_Burial_Application — Incoming requests</p>
    </div>
    <button 
     onClick={() => setShowNewModal(true)}
     className="btn-primary self-start sm:self-auto"
    >
     <Plus size={15} /> New Application
    </button>
   </div>

   {/* Filters */}
   <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
    <div className="relative flex-1 min-w-[200px]">
     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
     <input className="input-field pl-10" placeholder="Search by applicant, deceased, or ID…" value={search} onChange={e => setSearch(e.target.value)} />
    </div>
    <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
     <option value="all">All Status</option>
     <option value="pending">Pending</option>
     <option value="under_review">Under Review</option>
     <option value="approved">Approved</option>
     <option value="rejected">Rejected</option>
     <option value="completed">Completed</option>
    </select>
   </div>

   {/* Table */}
   <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
    <div className="overflow-x-auto">
     {loading ? (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
       <Loader2 className="animate-spin" size={24} />
       <p className="text-sm">Loading applications...</p>
      </div>
     ) : (
      <table className="w-full min-w-[720px]">
      <thead>
       <tr className="border-b border-border bg-muted">
        {['Application ID', 'Applicant', 'Deceased', 'Date of Death', 'Death Cert. No.', 'Status', 'Actions'].map(h => (
         <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
        ))}
       </tr>
      </thead>
      <tbody>
       {paginatedItems.map(app => (
        <tr key={app.application_id} className="border-b border-border hover:bg-muted transition-colors cursor-pointer" onClick={() => setSelected(app)}>
         <td className="px-4 py-3 text-sm font-mono text-blue-400">{app.application_id}</td>
         <td className="px-4 py-3 text-sm text-foreground">{app.person?.full_name}</td>
         <td className="px-4 py-3 text-sm text-muted-foreground">{app.deceased?.full_name}</td>
         <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(app.deceased?.date_of_death).toLocaleDateString('en-PH')}</td>
         <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{app.deceased?.death_certificate_no ?? '—'}</td>
         <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
           <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border w-fit', STATUS_BADGE[app.application_status])}>
            {app.application_status.replace('_', ' ')}
           </span>
           {app.is_indigent && (
            <span className="text-[9px] text-emerald-500 font-bold uppercase">Indigent</span>
           )}
          </div>
         </td>
         <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
           <button className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="View" onClick={() => setSelected(app)}><Eye size={14} /></button>
           {(app.application_status === 'pending' || app.application_status === 'under_review') && (
            <>
             <button 
              disabled={!!actionLoading}
              onClick={() => updateStatus(app.application_id, 'approved')}
              className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/20 transition-colors disabled:opacity-50" 
              title="Approve"
             >
              {actionLoading === app.application_id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
             </button>
             <button 
              disabled={!!actionLoading}
              onClick={() => updateStatus(app.application_id, 'rejected')}
              className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/20 transition-colors disabled:opacity-50" 
              title="Reject"
             >
              {actionLoading === app.application_id ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
             </button>
            </>
           )}
          </div>
         </td>
        </tr>
       ))}
      </tbody>
      </table>
     )}
    </div>
    {!loading && filtered.length === 0 && (
     <div className="py-16 text-center text-muted-foreground">No records match your search.</div>
    )}
   </div>

   <Pagination 
    currentPage={currentPage} 
    totalPages={totalPages} 
    onPageChange={setCurrentPage} 
   />

   {/* DETAIL MODAL */}
   <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
    <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
     {selected && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <div className="flex items-center gap-2 mb-2">
         <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">REF: {selected.application_id}</Badge>
         <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border', STATUS_BADGE[selected.application_status])}>
          {selected.application_status.replace('_', ' ')}
         </span>
         {selected.is_indigent && (
          <span className="text-[9px] text-emerald-500 font-bold uppercase">Indigent</span>
         )}
        </div>
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
         {selected.deceased?.full_name}
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
         Burial Application Record
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm surface-box border border-border/20 p-5">
         <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Applicant</p>
          <p className="font-bold text-foreground">{selected.person?.full_name}</p>
         </div>
         <div className="space-y-1 text-right">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Date of Death</p>
          <p className="font-bold text-foreground">{selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH') : 'N/A'}</p>
         </div>
         <div className="space-y-1 block">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Death Cert #</p>
          <p className="font-mono text-xs font-bold text-foreground opacity-80">{selected.deceased?.death_certificate_no || 'N/A'}</p>
         </div>
         <div className="space-y-1 text-right">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Submission Date</p>
          <p className="font-bold text-foreground">{new Date(selected.submission_date).toLocaleDateString()}</p>
         </div>
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button onClick={() => setSelected(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Close</button>
        {(selected.application_status === 'pending' || selected.application_status === 'under_review') && (
         <div className="flex gap-2 w-full sm:w-auto">
          <button 
           disabled={!!actionLoading}
           onClick={() => updateStatus(selected.application_id, 'approved')}
           className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
          >
           {actionLoading === selected.application_id ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <CheckCircle size={14} className="mr-1.5" />} Approve
          </button>
          <button 
           disabled={!!actionLoading}
           onClick={() => updateStatus(selected.application_id, 'rejected')}
           className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
          >
           {actionLoading === selected.application_id ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <XCircle size={14} className="mr-1.5" />} Reject
          </button>
         </div>
        )}
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>

   {/* NEW APPLICATION MODAL */}
   <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
    <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <div className="flex items-center justify-between mb-6 shrink-0">
       <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-500 dark:text-blue-400">
         <Plus size={20} />
        </div>
        <h2 className="font-display text-xl font-extrabold tracking-tight">New Application</h2>
       </div>
      </div>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div>
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Applicant (Person)</label>
        <select 
         className="w-full px-3 py-2 rounded-xl text-sm border bg-background border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
         value={formData.person_id}
         onChange={e => setFormData(prev => ({ ...prev, person_id: e.target.value }))}
        >
         <option value="">Select applicant...</option>
         {personOptions.map(p => (
          <option key={p.person_id} value={p.person_id}>{p.full_name}</option>
         ))}
        </select>
       </div>

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
        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 ml-1">Submission Date</label>
        <input 
         type="date"
         className="w-full px-3 py-2 rounded-xl text-sm border bg-background border-border outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
         value={formData.submission_date}
         onChange={e => setFormData(prev => ({ ...prev, submission_date: e.target.value }))}
        />
       </div>
      </div>

      <div className="pt-8 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button onClick={() => setShowNewModal(false)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Cancel</button>
       <button 
        onClick={handleCreateApplication}
        disabled={isSaving}
        className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold shadow-lg shadow-primary/20 uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground gap-2 disabled:opacity-50 flex items-center justify-center transition-all"
       >
        {isSaving ? <Loader2 size={16} className="animate-spin mr-1.5" /> : <Shield size={16} className="mr-1.5" />}
        Create
       </button>
      </div>
     </div>
    </DialogContent>
   </Dialog>
  </div>
 )
}
