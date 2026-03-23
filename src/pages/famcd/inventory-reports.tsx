import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
 Search, RefreshCw, FileText, UploadCloud, Eye, Send,
 XCircle, Loader2, Calendar, Paperclip, CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { AdminDeskPageShell } from '@/components/layout/AdminDeskPageShell'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type ReportRow = {
 inventory_report_id: string
 inventory_request_id: string | null
 preparation_date: string | null
 approval_status: string
 digital_report_url: string | null
 prepared_by_office: string | null
 inventory_request?: { inventory_scope?: string; requesting_office?: string }
 government_office?: { office_name?: string }
}

export default function FamcdInventoryReports() {
 const { user } = useAuth()
 const [reports, setReports] = useState<ReportRow[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState('')

 // Upload modal state
 const [uploadTarget, setUploadTarget] = useState<ReportRow | null>(null)
 const [uploadFile, setUploadFile] = useState<File | null>(null)
 const [isUploading, setIsUploading] = useState(false)

 // Submit confirm state
 const [submitTarget, setSubmitTarget] = useState<ReportRow | null>(null)
 const [isSubmitting, setIsSubmitting] = useState(false)

 useEffect(() => {
  loadReports()
 }, [])

 const loadReports = async () => {
  setIsLoading(true)
  const { data, error } = await supabase
   .from('inventory_report')
   .select(`
    inventory_report_id,
    inventory_request_id,
    preparation_date,
    approval_status,
    digital_report_url,
    prepared_by_office,
    inventory_request (
     inventory_scope,
     requesting_office
    ),
    government_office!prepared_by_office (
     office_name
    )
   `)
   .order('preparation_date', { ascending: false })

  if (error) {
   console.error('Error loading inventory reports:', error)
   toast.error('Failed to load inventory reports.')
  } else {
   setReports((data as any[]) || [])
  }
  setIsLoading(false)
 }

 const filtered = useMemo(() => {
  if (!searchTerm.trim()) return reports
  const q = searchTerm.toLowerCase()
  return reports.filter(r =>
   r.inventory_report_id.toLowerCase().includes(q) ||
   (r.inventory_request?.inventory_scope || '').toLowerCase().includes(q)
  )
 }, [reports, searchTerm])

 // ── Upload file to storage and save URL ─────────────────────────────────
 const handleUploadConfirm = async () => {
  if (!uploadFile || !uploadTarget) return
  setIsUploading(true)
  const toastId = toast.loading('Uploading document...')

  const fileExt = uploadFile.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`
  const filePath = `inventory-reports/${uploadTarget.inventory_report_id}/${fileName}`

  const { error: uploadError } = await supabase.storage
   .from('inspection-evidence')
   .upload(filePath, uploadFile)

  if (uploadError) {
   console.error('Upload error:', uploadError)
   toast.error(`Upload failed: ${uploadError.message}`, { id: toastId })
   setIsUploading(false)
   return
  }

  const { data: urlData } = supabase.storage
   .from('inspection-evidence')
   .getPublicUrl(filePath)

  const publicUrl = urlData?.publicUrl
  if (!publicUrl) {
   toast.error('Could not get public URL for uploaded file.', { id: toastId })
   setIsUploading(false)
   return
  }

  // Save URL to inventory_report
  const { error: updateError } = await supabase
   .from('inventory_report')
   .update({ digital_report_url: publicUrl })
   .eq('inventory_report_id', uploadTarget.inventory_report_id)

  if (updateError) {
   console.error('Update error:', updateError)
   toast.error('File uploaded but failed to save URL.', { id: toastId })
  } else {
   toast.success('Document attached successfully!', { id: toastId })
   setUploadTarget(null)
   setUploadFile(null)
   loadReports()
  }
  setIsUploading(false)
 }

 // ── Submit report to CGSD ─────────────────────────────────────────────
 const handleSubmitToCGSD = async () => {
  if (!submitTarget) return
  setIsSubmitting(true)
  const toastId = toast.loading('Submitting to CGSD...')

  const { error } = await supabase
   .from('inventory_report')
   .update({ approval_status: 'pending' })
   .eq('inventory_report_id', submitTarget.inventory_report_id)

  if (error) {
   console.error('Submit error:', error)
   toast.error('Failed to submit report.', { id: toastId })
  } else {
   toast.success(`Report ${submitTarget.inventory_report_id} submitted to CGSD Approvals!`, { id: toastId })
   setSubmitTarget(null)
   loadReports()
  }
  setIsSubmitting(false)
 }

 const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
   case 'approved': return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
   case 'pending': return <Badge variant="warning" className="text-[10px] uppercase">Pending CGSD</Badge>
   case 'returned_for_revision': return <Badge variant="destructive" className="text-[10px] uppercase">Returned</Badge>
   case 'draft': return <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>
   case 'submitted': return <Badge variant="outline" className="text-[10px] uppercase">Submitted</Badge>
   default: return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
  }
 }

 const canSubmit = (r: ReportRow) =>
  r.digital_report_url &&
  ['draft', 'returned_for_revision'].includes(r.approval_status?.toLowerCase())

 if (!user) return null
 const meta = ROLE_META[user.role]

 return (
  <AdminDeskPageShell
   roleLabel={meta.label}
   roleColor={meta.color}
   roleBgColor={meta.bgColor}
   title="Inventory reports"
   description="Attach documents to inventory reports and submit them to CGSD for approval."
   wide
   actions={
    <Button variant="outline" size="sm" className="gap-2" type="button" onClick={loadReports}>
     <RefreshCw size={16} /> Refresh
    </Button>
   }
  >
   <Card className="mb-6 shadow-sm border-border">
    <CardContent className="p-4 flex gap-4 items-center bg-card">
     <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
       placeholder="Search by Report ID or Scope..."
       value={searchTerm}
       onChange={e => setSearchTerm(e.target.value)}
       className="pl-10 h-10 w-full bg-background"
      />
     </div>
    </CardContent>
   </Card>

   {/* Reports Table */}
   <Card className="shadow-sm border-border overflow-hidden">
    <div className="overflow-x-auto">
     <div className="max-h-[65vh] overflow-y-auto">
      <table className="w-full text-left border-collapse">
       <thead>
        <tr className="border-b border-border bg-muted/50">
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report ID</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Scope</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-[12%]">Date</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-[14%]">Status</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Document</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {isLoading ? (
         <tr>
          <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
           Loading reports...
          </td>
         </tr>
        ) : filtered.length === 0 ? (
         <tr>
          <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
           No inventory reports found.
          </td>
         </tr>
        ) : filtered.map(item => (
         <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
          {/* Report ID */}
          <td className="p-4">
           <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
             <FileText size={18} />
            </div>
            <div>
             <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
             <div className="text-xs text-muted-foreground">Report</div>
            </div>
           </div>
          </td>

          {/* Scope */}
          <td className="p-4">
           <div className="text-sm font-medium text-foreground truncate max-w-[200px]">
            {item.inventory_request?.inventory_scope || 'General Inventory'}
           </div>
          </td>

          {/* Date */}
          <td className="p-4">
           <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar size={13} />
            <span>{item.preparation_date || 'N/A'}</span>
           </div>
          </td>

          {/* Status */}
          <td className="p-4">{getStatusBadge(item.approval_status)}</td>

          {/* Document */}
          <td className="p-4">
           {item.digital_report_url ? (
            <a
             href={item.digital_report_url}
             target="_blank"
             rel="noreferrer"
             className="inline-flex items-center gap-1.5 text-blue-500 underline text-xs font-medium"
            >
             <Eye size={13} /> View File
            </a>
           ) : (
            <span className="text-xs text-muted-foreground italic">No file attached</span>
           )}
          </td>

          {/* Actions */}
          <td className="p-4 text-right">
           <div className="flex justify-end gap-2">
            {/* Attach / Re-attach file */}
            {item.approval_status !== 'approved' && item.approval_status !== 'pending' && (
             <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { setUploadTarget(item); setUploadFile(null) }}
             >
              <Paperclip size={14} />
              {item.digital_report_url ? 'Replace' : 'Attach File'}
             </Button>
            )}

            {/* Submit to CGSD */}
            {canSubmit(item) && (
             <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              onClick={() => setSubmitTarget(item)}
             >
              <Send size={14} /> Submit to CGSD
             </Button>
            )}

            {/* Already pending/approved label */}
            {item.approval_status === 'pending' && (
             <span className="text-xs text-muted-foreground italic self-center">Awaiting CGSD</span>
            )}
            {item.approval_status === 'approved' && (
             <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 self-center">
              <CheckCircle size={13} /> Approved
             </span>
            )}
           </div>
          </td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </div>
   </Card>

   {/* ── Upload Document Modal ────────────────────────────────────── */}
   <Dialog open={!!uploadTarget} onOpenChange={(open) => { if (!open) { setUploadTarget(null); setUploadFile(null); } }}>
    <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     {uploadTarget && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
         <Paperclip className="h-6 w-6 text-blue-500" /> Attach Document
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
         Upload the finalized report file for <span className="font-semibold text-foreground">{uploadTarget.inventory_report_id}</span>.
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-5 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div>
         <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
          Scope
         </label>
         <div className="p-4 rounded-xl border border-border/50 bg-background shadow-sm text-sm font-bold text-foreground">
          {uploadTarget.inventory_request?.inventory_scope || 'General Inventory'}
         </div>
        </div>

        <div>
         <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
          Report File <span className="text-red-500">*</span>
         </label>
         <label className="border-2 border-dashed border-border/60 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer block group">
          <input
           type="file"
           className="hidden"
           accept=".pdf,image/jpeg,image/png"
           onChange={e => {
            const f = e.target.files?.[0]
            if (f) {
             setUploadFile(f)
             toast.success(`"${f.name}" selected.`)
            }
           }}
          />
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
           <UploadCloud size={24} className="text-blue-600" />
          </div>
          <div className="text-sm font-bold text-foreground">Click or drag file to select</div>
          <div className="text-[11px] font-medium text-muted-foreground mt-2">PDF, JPG, PNG accepted • Max 10MB</div>
         </label>
         
         {uploadFile && (
          <div className="mt-4 flex items-center justify-between bg-blue-500/5 px-4 py-3 rounded-xl border border-blue-500/20 text-sm animate-fade-in shadow-sm">
           <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
             <FileText size={16} />
            </div>
            <span className="truncate max-w-[200px] text-xs font-bold text-blue-900 dark:text-blue-100">{uploadFile.name}</span>
           </div>
           <button
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
            onClick={(e) => {
             e.preventDefault()
             setUploadFile(null)
            }}
            title="Remove file"
           >
            <XCircle size={16} />
           </button>
          </div>
         )}
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button 
         onClick={() => { setUploadTarget(null); setUploadFile(null) }} 
         disabled={isUploading}
         className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
        >
         Cancel
        </button>
        <button
         onClick={handleUploadConfirm}
         disabled={!uploadFile || isUploading}
         className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 disabled:opacity-50 flex items-center justify-center transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/20"
        >
         {isUploading ? (
          <><Loader2 size={14} className="animate-spin mr-1" /> Uploading...</>
         ) : (
          <><UploadCloud size={14} className="mr-1" /> Upload & Attach</>
         )}
        </button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>

   {/* ── Submit Confirm Modal ─────────────────────────────────────── */}
   <Dialog open={!!submitTarget} onOpenChange={(open) => !open && setSubmitTarget(null)}>
    <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     {submitTarget && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
         <Send className="h-6 w-6 text-primary" /> Submit to CGSD
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
         Confirm submission of <span className="font-semibold text-foreground">{submitTarget.inventory_report_id}</span> for CGSD review.
        </DialogDescription>
       </DialogHeader>

       <div className="overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="p-5 rounded-xl border border-border/50 bg-background shadow-sm space-y-4 text-sm mt-2">
         <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Scope</span>
          <div className="font-bold text-foreground">{submitTarget.inventory_request?.inventory_scope || 'General Inventory'}</div>
         </div>
         <div className="pt-3 border-t border-border/30">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Attached Document</span>
          <a href={submitTarget.digital_report_url!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-600 font-semibold text-xs transition-colors hover:bg-blue-500/20 w-fit">
           <FileText size={14} /> View Document
          </a>
         </div>
        </div>

        <div className="mt-6 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex gap-3 text-amber-600 dark:text-amber-500 text-xs text-left">
         <CheckCircle size={18} className="shrink-0 mt-0.5" />
         <div className="font-medium leading-relaxed">
          This will route the report to the <strong className="font-bold">CGSD Approvals</strong> queue. They will review the findings and attached document.
         </div>
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button 
         onClick={() => setSubmitTarget(null)} 
         disabled={isSubmitting}
         className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
        >
         Cancel
        </button>
        <button
         onClick={handleSubmitToCGSD}
         disabled={isSubmitting}
         className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 disabled:opacity-50 flex items-center justify-center transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
        >
         {isSubmitting ? (
          <><Loader2 size={14} className="animate-spin mr-1" /> Submitting...</>
         ) : (
          <><Send size={14} className="mr-1" /> Confirm Submit</>
         )}
        </button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>
  </AdminDeskPageShell>
 )
}