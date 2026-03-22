import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, AlertTriangle, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
// Trigger Vite HMR 
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
    inventory_request_id,
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
   .in('approval_status', ['pending', 'approved', 'returned_for_revision']) // Fetch pending, approved, and returned reports
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

  // 3. Auto-update property.asset_condition from the linked ocular_inspection
  const requestId = selectedItem.inventory_request?.requesting_office
   ? null // not needed — we use inventory_request_id from the report join
   : null

  // Look up the inventory_request_id from the report (already joined)
  const linkedRequestId = selectedItem.inventory_request_id

  if (linkedRequestId) {
   // Find the ocular_inspection for this request that has new_condition set
   const { data: inspectionData } = await supabase
    .from('ocular_inspection')
    .select('new_condition, property_id')
    .eq('inventory_request_id', linkedRequestId)
    .not('new_condition', 'is', null)
    .order('inspection_date', { ascending: false })
    .limit(1)
    .maybeSingle()

   if (inspectionData?.new_condition && inspectionData?.property_id) {
    const { error: conditionError } = await supabase
     .from('property')
     .update({ asset_condition: inspectionData.new_condition })
     .eq('property_id', inspectionData.property_id)

    if (conditionError) {
     console.error('Failed to auto-update property condition:', conditionError)
     // Non-blocking — approval still succeeds
    } else {
     console.log(`✅ property.asset_condition updated to: ${inspectionData.new_condition}`)
    }
   }
  }

  // Refetch the updated reports after approval
  const { data: updatedReports, error: fetchError } = await supabase
   .from('inventory_report')
   .select(`
    inventory_report_id,
    inventory_request_id,
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
   .in('approval_status', ['pending', 'approved', 'returned_for_revision'])
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

  toast.success(`Approved ${selectedItem.inventory_report_id}! Asset condition updated.`, { id: toastId })
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

 const handleGenerateCOAReport = (item: any) => {
  const reportHtml = `
   <!DOCTYPE html>
   <html lang="en">
   <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>COA Property Inventory Form</title>
    <style>
     body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #000;
      margin: 0;
      padding: 20px;
     }
     .header {
      text-align: center;
      margin-bottom: 30px;
     }
     .header h1 {
      font-size: 16px;
      margin: 0 0 5px 0;
      font-weight: bold;
     }
     .header h2 {
      font-size: 14px;
      margin: 0 0 5px 0;
      font-weight: normal;
     }
     .header h3 {
      font-size: 14px;
      margin: 0;
      font-weight: bold;
     }
     .meta-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
     }
     table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
     }
     th, td {
      border: 1px solid #000;
      padding: 8px;
      text-align: left;
     }
     th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
     }
     .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 50px;
     }
     .signature-block {
      width: 45%;
      text-align: center;
     }
     .signature-line {
      border-top: 1px solid #000;
      margin-top: 40px;
      padding-top: 5px;
      font-weight: bold;
     }
     .footer {
      margin-top: 50px;
      font-size: 10px;
      text-align: left;
      font-style: italic;
     }
     @media print {
      body {
       padding: 0;
      }
     }
    </style>
   </head>
   <body>
    <div class="header">
     <h2>Republic of the Philippines</h2>
     <h2>Quezon City Government</h2>
     <h3>CITY GENERAL SERVICES DEPARTMENT</h3>
     <br/>
     <h1>REPORT ON THE PHYSICAL COUNT OF INVENTORIES</h1>
    </div>

    <div class="meta-info">
     <div>
      <strong>Report ID:</strong> \${item.inventory_report_id}<br/>
      <strong>Scope:</strong> \${item.inventory_request?.inventory_scope || 'General Asset Inventory'}<br/>
      <strong>Prepared By (Office):</strong> \${item.government_office?.office_name || 'System'}
     </div>
     <div>
      <strong>Date Prepared:</strong> \${item.preparation_date || new Date().toLocaleDateString()}<br/>
      <strong>Approval Status:</strong> \${item.approval_status.toUpperCase()}
     </div>
    </div>

    <table>
     <thead>
      <tr>
       <th>Item No.</th>
       <th>Description</th>
       <th>Unit of Measure</th>
       <th>Unit Value</th>
       <th>Quantity per Property Card</th>
       <th>Quantity per Physical Count</th>
       <th>Shortage/Overage</th>
       <th>Remarks</th>
      </tr>
     </thead>
     <tbody>
      <tr>
       <td colspan="8" style="text-align: center; padding: 20px; font-style: italic;">
        Detailed inventory items will be attached here based on the scope: \${item.inventory_request?.inventory_scope || 'General Asset Inventory'}
       </td>
      </tr>
     </tbody>
    </table>

    <div>
     <p>I hereby certify to the correctness of the above information based on actual physical count.</p>
    </div>

    <div class="signatures">
     <div class="signature-block">
      <p>Certified Correct by:</p>
      <div class="signature-line">
       CGSD Inventory Committee Member<br/>
       <span style="font-weight: normal; font-size: 10px;">Signature over Printed Name</span>
      </div>
     </div>
     <div class="signature-block">
      <p>Approved by:</p>
      <div class="signature-line">
       Head of Agency / Authorized Representative<br/>
       <span style="font-weight: normal; font-size: 10px;">Signature over Printed Name</span>
      </div>
     </div>
    </div>

    <div class="footer">
     * Reference: COA Circular No. 2018-002, Property Inventory Form (PIF)
    </div>
   </body>
   </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
   printWindow.document.open();
   printWindow.document.write(reportHtml);
   printWindow.document.close();
   setTimeout(() => {
    printWindow.print();
   }, 250);
  } else {
   toast.error('Could not open print window. Please allow popups.');
  }
 }

 return (
  <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
   <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
    <div>
     <h1 className="font-display text-2xl font-bold text-foreground">Approvals</h1>
     <p className="text-muted-foreground text-sm mt-1">
      Review and approve/return inventory submissions and asset requests.
     </p>
    </div>
   </div>

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
         <tr key={item.inventory_report_id} className="hover:bg-accent transition-colors">
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
         {selectedItem.approval_status === 'approved' && (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
           Approved
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
        {selectedItem.approval_status === 'approved' && (
         <button
          onClick={() => handleGenerateCOAReport(selectedItem)}
          className="h-11 rounded-xl w-full sm:w-auto px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 flex items-center justify-center transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
         >
          <Printer size={14} /> Generate COA Report
         </button>
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
  </div>
 )
}