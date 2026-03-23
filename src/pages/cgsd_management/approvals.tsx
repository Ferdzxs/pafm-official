import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { AdminDeskPageShell } from '@/components/layout/AdminDeskPageShell'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function ApprovalsPage() {
 const { user } = useAuth()
 const [searchTerm, setSearchTerm] = useState('')
 const [selectedItem, setSelectedItem] = useState<any | null>(null)
 const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
 const [rejectReason, setRejectReason] = useState('')
 
 const [reports, setReports] = useState<any[]>([])
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
  fetchPendingReports()
 }, [])

 const fetchPendingReports = async () => {
  setIsLoading(true)
  // Fetch inventory reports that are pending or have been returned
  const { data, error } = await supabase
   .from('inventory_report')
   .select(`
    inventory_report_id,
    preparation_date,
    approval_status,
    digital_report_url,
    inventory_request (
     inventory_scope,
     requesting_office
    ),
    government_office (
     office_name
    )
   `)
   .eq('approval_status', 'pending') // Only fetch pending reports
   .order('preparation_date', { ascending: false })

  if (error) {
   console.error('Error fetching reports:', error)
   toast.error('Failed to load pending approvals.')
  } else {
   setReports(data || [])
  }
  setIsLoading(false)
 }

 const filtered = reports.filter(a =>
  a.inventory_report_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (a.inventory_request?.inventory_scope || '').toLowerCase().includes(searchTerm.toLowerCase())
 )

 const handleApprove = async () => {
  if (!selectedItem || !user) return
  
  const toastId = toast.loading('Approving submission...')
  
  // 1. Update report status
  const { error: updateError } = await supabase
   .from('inventory_report')
   .update({ approval_status: 'approved' })
   .eq('inventory_report_id', selectedItem.inventory_report_id)

  const employeeId = user.employee_id || 'EMP-007'; // Fallback to a valid CGSD employee ID if not found

  const { error: recordError } = await supabase
   .from('approval_record')
   .insert({
    approval_id: `APR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    inventory_report_id: selectedItem.inventory_report_id,
    approved_by_office: user.role === 'cgsd_management' ? 'OFF-007' : (user.office || null),
    approved_by_employee: employeeId,
    approval_date: new Date().toISOString().split('T')[0],
    decision: 'approved',
    remarks: 'Approved electronically.'
   })

  // Refetch the updated reports after approval
  const { data: updatedReports, error: fetchError } = await supabase
   .from('inventory_report')
   .select(`
    inventory_report_id,
    preparation_date,
    approval_status,
    digital_report_url,
    inventory_request (
     inventory_scope,
     requesting_office
    ),
    government_office (
     office_name
    )
   `)
   .eq('approval_status', 'pending')
   .order('preparation_date', { ascending: false })

  if (fetchError) {
   console.error('Error fetching updated reports:', fetchError)
   toast.error('Failed to refresh reports.')
  } else {
   setReports(updatedReports || [])
  }

  if (updateError || recordError) {
   console.error('Update Error:', updateError);
   console.error('Record Error:', recordError);
   toast.error('Failed to approve submission.', { id: toastId });
   return;
  }

  toast.success(`Approved ${selectedItem.inventory_report_id}!`, { id: toastId })
  setSelectedItem(null)
  fetchPendingReports()
 }

 const handleReturn = () => {
  setIsRejectModalOpen(true)
 }

 const submitReturn = async () => {
  if (!rejectReason.trim() || !selectedItem || !user) return
  
  const toastId = toast.loading('Returning submission...')
  
  // 1. Update report status
  const { error: updateError } = await supabase
   .from('inventory_report')
   .update({ approval_status: 'returned_for_revision' })
   .eq('inventory_report_id', selectedItem.inventory_report_id)

  const employeeId = user.employee_id || 'EMP-007'; // Validated employee ID or fallback

  const { error: recordError } = await supabase
   .from('approval_record')
   .insert({
    approval_id: `APR-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    inventory_report_id: selectedItem.inventory_report_id,
    approved_by_office: user.role === 'cgsd_management' ? 'OFF-007' : (user.office || null),
    approved_by_employee: employeeId,
    approval_date: new Date().toISOString().split('T')[0],
    decision: 'rejected',
    remarks: rejectReason
   });

  if (recordError) {
   console.error('Error inserting approval record:', recordError);
   toast.error('Failed to return submission. Please check the logs for more details.');
   return;
  }

  toast.success(`Returned ${selectedItem.inventory_report_id} to FAMCD.`, { id: toastId })
  setIsRejectModalOpen(false)
  setRejectReason('')
  setSelectedItem(null)
  fetchPendingReports()
 }

 if (!user) return null
 const meta = ROLE_META[user.role]

 return (
  <AdminDeskPageShell
   roleLabel={meta.label}
   roleColor={meta.color}
   roleBgColor={meta.bgColor}
   title="Approvals queue"
   description="Review and approve or return inventory submissions pending CGSD action."
   wide
  >
   <Card className="mb-6 shadow-sm border-border">
    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
     <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
       placeholder="Search by ID or Scope..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-10 h-10 w-full bg-background"
      />
     </div>
     <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchPendingReports}>
      <Filter size={16} />
      Refresh
     </Button>
    </CardContent>
   </Card>

   <Card className="shadow-sm border-border overflow-hidden">
    <div className="overflow-x-auto">
     <div className="max-h-[60vh] overflow-y-auto">
      <table className="w-full text-left border-collapse">
      <thead>
       <tr className="border-b border-border bg-muted">
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report ID</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Scope / Details</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Prepared By</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Status</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-border">
       {isLoading ? (
        <tr>
         <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
          Loading submissions...
         </td>
        </tr>
       ) : filtered.length === 0 ? (
        <tr>
         <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
          No submissions found.
         </td>
        </tr>
       ) : filtered.map((item) => (
        <tr key={item.inventory_report_id} className="hover:bg-muted transition-colors">
         <td className="p-4">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <FileText size={18} />
           </div>
           <div>
            <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
            <div className="text-xs text-muted-foreground">Report</div>
           </div>
          </div>
         </td>
         <td className="p-4">
          <div className="text-sm text-foreground font-medium truncate max-w-[250px]">{item.inventory_request?.inventory_scope || 'General Asset Inventory'}</div>
          <div className="text-xs text-muted-foreground">Submitted: {item.preparation_date || 'N/A'}</div>
         </td>
         <td className="p-4 text-sm text-muted-foreground">{item.government_office?.office_name || 'System Generated'}</td>
         <td className="p-4">
          {item.approval_status === 'pending' && <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>}
          {item.approval_status === 'approved' && <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>}
          {item.approval_status === 'returned_for_revision' && <Badge variant="destructive" className="text-[10px] uppercase">Returned</Badge>}
          {item.approval_status === 'draft' && <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>}
         </td>
         <td className="p-4 text-right">
          <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
           <Eye size={16} className="mr-2" /> View
          </Button>
         </td>
        </tr>
       ))}
      </tbody>
      </table>
     </div>
    </div>
   </Card>

   {/* Action Modal */}
   <Dialog open={!!selectedItem && !isRejectModalOpen} onOpenChange={(open) => !open && setSelectedItem(null)}>
    <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     {selectedItem && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <div className="flex items-center gap-2 mb-2">
         <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">REF: {selectedItem.inventory_report_id}</Badge>
         {selectedItem.approval_status === 'returned_for_revision' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border bg-red-500/10 text-red-500 border-red-500/20">
           Returned
          </span>
         )}
         {selectedItem.approval_status === 'pending' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border bg-amber-500/10 text-amber-500 border-amber-500/20">
           Reviewing
          </span>
         )}
        </div>
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
         <FileText className="text-blue-500 h-6 w-6" /> Review Submission
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
         Review inventory scope and submission details.
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-sm surface-box border border-border/20 p-5">
         <div className="space-y-1 block">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Scope</p>
          <p className="text-sm font-bold text-foreground">{selectedItem.inventory_request?.inventory_scope || 'General Asset Inventory'}</p>
         </div>
         <div className="space-y-1 block">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Prepared By</p>
          <p className="text-sm font-bold text-foreground">{selectedItem.government_office?.office_name || 'System'}</p>
         </div>
        </div>

        {selectedItem.approval_status === 'returned_for_revision' && (
         <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex gap-3 text-red-500/90 text-sm">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-500" />
          <div>
           <span className="font-bold text-red-500 block mb-1">Status:</span>
           This submission was previously returned for revision.
          </div>
         </div>
        )}

        <div className="p-5 surface-box border border-border/20 rounded-xl text-center flex flex-col justify-center items-center">
         <FileText size={32} className="opacity-40 text-muted-foreground mb-3" />
         <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-2">Document Details</p>
         {selectedItem.digital_report_url ? (
          <a href={selectedItem.digital_report_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:text-blue-600 underline">View Original Report File</a>
         ) : (
          <span className="text-xs text-muted-foreground">No attached file in DB record.</span>
         )}
        </div>
       </div>

       <div className="mt-6 pt-6 border-t border-border/10 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button onClick={() => setSelectedItem(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Close</button>
        {['pending', 'returned_for_revision'].includes(selectedItem.approval_status) && (
         <div className="flex gap-2 w-full sm:w-auto">
          <button
           onClick={handleReturn}
           className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20 gap-2 flex items-center justify-center transition-all bg-transparent border border-red-500/20 text-red-500 hover:bg-red-500/10 shadow-none"
          >
           <XCircle size={14} /> Return for Revision
          </button>
          <button
           onClick={handleApprove}
           className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 gap-2 flex items-center justify-center transition-all bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500"
          >
           <CheckCircle size={14} /> Approve
          </button>
         </div>
        )}
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>

   {/* Reject Modal */}
   <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
    <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-red-500 leading-tight flex items-center gap-2">
        <AlertTriangle className="h-6 w-6" /> Return for Revision
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Please provide a reason for returning <span className="font-semibold text-foreground">{selectedItem?.inventory_report_id}</span>.
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reason for Return (Required)</label>
        <textarea
         className="w-full min-h-[100px] p-4 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
         placeholder="e.g., Photos are blurry, valuation looks incorrect..."
         value={rejectReason}
         onChange={(e) => setRejectReason(e.target.value)}
         autoFocus
        />
       </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button onClick={() => setIsRejectModalOpen(false)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Cancel</button>
       <button
        disabled={!rejectReason.trim()}
        onClick={submitReturn}
        className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 disabled:opacity-50 flex items-center justify-center transition-all bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-red-500/20"
       >
        Submit Return
       </button>
      </div>
     </div>
    </DialogContent>
   </Dialog>
  </AdminDeskPageShell>
 )
}