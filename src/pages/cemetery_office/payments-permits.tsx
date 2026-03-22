import React, { useState, useEffect } from 'react'
import { Search, Eye, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function PaymentsPermits() {
 const [search, setSearch] = useState('')
 const [applications, setApplications] = useState<any[]>([])
 const [loading, setLoading] = useState(true)
 const [selected, setSelected] = useState<any | null>(null)
 const [currentPage, setCurrentPage] = useState(1)
 const itemsPerPage = 10

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
   deceased:deceased_id (full_name),
   payment:payment_id (*)
  `)
  .order('submission_date', { ascending: false })

  if (error) throw error
  setApplications(data || [])
 } catch (error) {
  toast.error('Failed to fetch payment status: ' + (error as any).message)
 } finally {
  setLoading(false)
 }
 }

 const filtered = applications.filter(row => {
 const q = search.toLowerCase()
 return (
  row.application_id.toLowerCase().includes(q) ||
  row.person?.full_name.toLowerCase().includes(q) ||
  row.deceased?.full_name.toLowerCase().includes(q)
 )
 })

 const totalPages = Math.ceil(filtered.length / itemsPerPage)
 const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

 useEffect(() => {
 setCurrentPage(1)
 }, [search])

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
  <div>
   <h1 className="font-display text-2xl font-bold">Payments & Permits Status</h1>
   <p className="text-muted-foreground text-sm mt-0.5"> Monitoring Treasurer and Death Registration updates.</p>
  </div>
  <div className="text-[10px] text-right text-muted-foreground uppercase tracking-widest font-bold">
   Finance & Registration Sync
  </div>
  </div>

  <div className="relative mb-6">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
  <input 
   className="input-field pl-10" 
   placeholder="Search by ID, applicant, or deceased..." 
   value={search}
   onChange={e => setSearch(e.target.value)}
  />
  </div>

  {/* Table */}
  <div className="glass rounded-2xl overflow-hidden border border-white/5">
  <div className="overflow-x-auto">
   {loading ? (
    <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
   ) : (
   <table className="w-full min-w-[880px]">
    <thead>
    <tr className="border-b border-white/5 bg-white/3">
     {[
     'Application ID',
     'Applicant',
     'Deceased',
     'Payment Status',
     'Permit Status',
     'Last Update',
     'Actions',
     ].map(h => (
     <th key={h} className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{h}</th>
     ))}
    </tr>
    </thead>
    <tbody>
    {paginatedItems.map(row => (
     <tr key={row.application_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
     <td className="px-5 py-4 text-sm font-mono text-blue-400">{row.application_id}</td>
     <td className="px-5 py-4 text-sm text-white">{row.person?.full_name}</td>
     <td className="px-5 py-4 text-sm text-muted-foreground">{row.deceased?.full_name}</td>
     <td className="px-5 py-4">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
      row.payment?.payment_status === 'settled' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
      }`}>
      {row.payment?.payment_status ?? 'pending payment'}
      </span>
     </td>
     <td className="px-5 py-4">
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
      row.application_status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'
      }`}>
      {row.application_status === 'completed' ? 'Issued' : 'Pending'}
      </span>
     </td>
     <td className="px-5 py-4 text-sm text-muted-foreground">{new Date(row.submission_date).toLocaleDateString()}</td>
     <td className="px-5 py-4">
      <button className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10" onClick={() => setSelected(row)}>
      <Eye size={16} />
      </button>
     </td>
     </tr>
    ))}
    </tbody>
   </table>
   )}
  </div>
  </div>

  <Pagination 
  currentPage={currentPage} 
  totalPages={totalPages} 
  onPageChange={setCurrentPage} 
  />

  {/* Detail Popup */}
  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">REF: {selected.application_id}</Badge>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border ${selected.application_status === 'completed' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
         {selected.application_status === 'completed' ? 'Issued' : 'Pending'}
        </span>
       </div>
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
        Application Details
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Finance & Registration Sync
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="grid grid-cols-1 gap-y-4 text-sm surface-box border border-border/20 p-5">
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Applicant</p>
         <p className="font-bold text-foreground">{selected.person?.full_name}</p>
        </div>
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Deceased</p>
         <p className="font-bold text-foreground">{selected.deceased?.full_name}</p>
        </div>
       </div>

       <div className="p-5 rounded-xl border border-primary/20 bg-primary/5">
        <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 flex items-center gap-2">Payment Details</p>
        <div className="grid grid-cols-2 gap-4">
         <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Amount</span>
          <p className="text-xl font-black text-foreground">{selected.payment?.amount_paid ? `₱${selected.payment.amount_paid}` : '—'}</p>
         </div>
         <div className="space-y-1 text-right flex flex-col items-end">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Status</span>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-xl border ${selected.payment?.payment_status === 'settled' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
           {selected.payment?.payment_status ?? 'pending'}
          </span>
         </div>
        </div>
       </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button onClick={() => setSelected(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Close</button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 )
}
