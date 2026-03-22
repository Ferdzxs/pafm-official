import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectItem } from '@/components/ui/select'
import {
 Search, Filter, Upload, FileText, Calendar, CheckCircle, Eye, XCircle,
 Package, Users, TreePine, Building2, RefreshCw
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

// ─── Types for inventory reports (existing COA section) ────────────────────
type ReportRow = {
 inventory_report_id: string
 approval_status: string
 preparation_date: string | null
 digital_report_url: string | null
 inventory_request?: { inventory_scope?: string }
 government_office?: { office_name?: string }
}

type SubmissionRecord = {
 document_id: string
 document_type: string
 reference_no: string
 status: string
 date_created: string
 file_url: string | null
}

// ─── Types for incoming asset requests ─────────────────────────────────────
type IncomingRequest = {
 id: string
 office: string
 item: string
 status: string
 date: string
 priority: string
 notes: string
}

const REQUESTOR_OFFICES = ['Cemetery Office', 'Parks & Recreation Administration', 'Barangay Secretariat']

const officeIcon = (name: string) => {
 if (name === 'Cemetery Office') return <Users size={15} />
 if (name === 'Parks & Recreation Administration') return <TreePine size={15} />
 return <Building2 size={15} />
}

const priorityColors: Record<string, string> = {
 High: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
 Medium: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
 Low: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
}

const DESTINATIONS = [
 { label: 'Commission on Audit (COA)', value: 'coa' },
 { label: 'City Accounting Office', value: 'city_accounting' },
 { label: 'Office of the City Mayor', value: 'city_mayor' },
]

export default function Submissions() {
 const { user } = useAuth()

 // ── Incoming requests state ──
 const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([])
 const [incomingLoading, setIncomingLoading] = useState(true)
 const [incomingSearch, setIncomingSearch] = useState('')
 const [actionLoading, setActionLoading] = useState<string | null>(null)

 // ── Existing report submissions state ──
 const [isLoading, setIsLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState('')
 const [reports, setReports] = useState<ReportRow[]>([])
 const [submissions, setSubmissions] = useState<Record<string, SubmissionRecord>>({})
 const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)
 const [destination, setDestination] = useState(DESTINATIONS[0].value)
 const [comment, setComment] = useState('')

 useEffect(() => {
 loadIncoming()
 loadReports()
 }, [])

 // ─── Load incoming asset requests ─────────────────────────────────────
 const loadIncoming = async () => {
 setIncomingLoading(true)
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
  console.error('Error loading incoming requests:', error)
  toast.error('Failed to load incoming requests.')
  setIncomingLoading(false)
  return
 }

 const mapped: IncomingRequest[] = (data || [])
  .filter((r: any) => REQUESTOR_OFFICES.includes(r.government_office?.office_name))
  .map((r: any) => ({
  id: r.inventory_request_id,
  office: r.government_office?.office_name ?? 'Unknown',
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

 setIncomingRequests(mapped)
 setIncomingLoading(false)
 }

 const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
 setActionLoading(id)
 const { error } = await supabase
  .from('inventory_request')
  .update({ status: newStatus })
  .eq('inventory_request_id', id)

 if (error) {
  toast.error('Failed to update request status.')
  console.error(error)
 } else {
  toast.success(`Request ${newStatus}.`)
  loadIncoming()
 }
 setActionLoading(null)
 }

 const filteredIncoming = useMemo(() => {
 if (!incomingSearch.trim()) return incomingRequests
 const q = incomingSearch.toLowerCase()
 return incomingRequests.filter(r =>
  r.id.toLowerCase().includes(q) ||
  r.item.toLowerCase().includes(q) ||
  r.office.toLowerCase().includes(q)
 )
 }, [incomingRequests, incomingSearch])

 const incomingStats = useMemo(() => ({
 Pending: incomingRequests.filter(r => r.status === 'Pending').length,
 Approved: incomingRequests.filter(r => r.status === 'Approved').length,
 Rejected: incomingRequests.filter(r => r.status === 'Rejected').length,
 }), [incomingRequests])

 // ─── Load inventory reports (existing COA section) ─────────────────────
 const loadReports = async () => {
 setIsLoading(true)
 const [reportRes, docRes] = await Promise.all([
  supabase
  .from('inventory_report')
  .select(`*, government_office ( office_name ), inventory_request ( inventory_scope )`)
  .order('preparation_date', { ascending: false }),
  supabase
  .from('digital_document')
  .select('*')
  .like('document_type', 'inventory_report_submission%')
 ])

 if (reportRes.error) { toast.error('Failed to load submissions list.'); setIsLoading(false); return }

 const submissionMap: Record<string, SubmissionRecord> = {}
  ; (docRes.data || []).forEach((doc: any) => {
  submissionMap[doc.reference_no] = {
   document_id: doc.document_id,
   document_type: doc.document_type,
   reference_no: doc.reference_no,
   status: doc.status,
   date_created: doc.date_created,
   file_url: doc.file_url,
  }
  })

 setReports(reportRes.data || [])
 setSubmissions(submissionMap)
 setIsLoading(false)
 }

 const reload = () => { loadIncoming(); loadReports() }

 const filteredReports = useMemo(() => {
 if (!searchTerm.trim()) return reports
 const q = searchTerm.trim().toLowerCase()
 return reports.filter(r =>
  r.inventory_report_id?.toLowerCase().includes(q) ||
  r.inventory_request?.inventory_scope?.toLowerCase().includes(q)
 )
 }, [reports, searchTerm])

 const getStatusBadge = (status: string) => {
 switch (status?.toLowerCase()) {
  case 'approved': return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
  case 'pending': return <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
  case 'draft': return <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>
  case 'submitted': return <Badge variant="outline" className="text-[10px] uppercase">Submitted</Badge>
  default: return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
 }
 }

 const getSubmissionDestination = (doc?: SubmissionRecord) => {
 if (!doc) return null
 if (doc.document_type?.includes('coa')) return 'COA'
 if (doc.document_type?.includes('city_accounting')) return 'City Accounting'
 if (doc.document_type?.includes('city_mayor')) return 'City Mayor'
 return doc.document_type
 }

 const handleSubmitReport = async () => {
 if (!selectedReport) return
 const reportId = selectedReport.inventory_report_id
 const existing = submissions[reportId]
 if (existing) { toast.error('This report has already been submitted.'); return }

 const toastId = toast.loading('Submitting report...')
 const documentId = `DDOC-${Date.now()}`
 const documentType = `inventory_report_submission_${destination}`
 const today = new Date().toISOString().split('T')[0]

 const { error: docError } = await supabase.from('digital_document').insert({
  document_id: documentId, document_type: documentType, reference_no: reportId,
  date_created: today, status: 'submitted', created_by_office: null,
  received_by_employee: null, person_id: null,
  file_url: selectedReport.digital_report_url || null
 })
 const { error: reportError } = await supabase.from('inventory_report')
  .update({ approval_status: 'submitted' }).eq('inventory_report_id', reportId)

 const error = docError || reportError
 if (error) {
  const detail = (error as any)?.details ? ` (${(error as any).details})` : ''
  toast.error(`Failed to submit report: ${error.message ?? 'Unknown error'}${detail}`, { id: toastId })
  return
 }
 toast.success('Report submitted successfully.', { id: toastId })
 setSelectedReport(null); setComment(''); setDestination(DESTINATIONS[0].value)
 loadReports()
 }

 return (
 <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in space-y-10">

  {/* ══════════════════════════════════════════════════════════════
    SECTION 1 — INCOMING ASSET REQUESTS
   ══════════════════════════════════════════════════════════════ */}
  <div>
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
   <div>
   <h1 className="font-display text-2xl font-bold text-foreground">Incoming Asset Requests</h1>
   <p className="text-muted-foreground text-sm mt-1">
    Review and action asset requests submitted by Cemetery Office, Parks Admin, and Punong Barangay.
   </p>
   </div>
   <Button variant="outline" className="gap-2" onClick={reload}>
   <RefreshCw size={16} /> Refresh
   </Button>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
   {[
   { label: 'Pending', value: incomingStats.Pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
   { label: 'Approved', value: incomingStats.Approved, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
   { label: 'Rejected', value: incomingStats.Rejected, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
   ].map((s, i) => (
   <div key={i} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: s.bg, color: s.color }}>
    {s.value}
    </div>
    <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
   </div>
   ))}
  </div>

  <Card className="mb-4 shadow-sm border-border">
   <CardContent className="p-4 flex gap-4 items-center bg-card">
   <div className="relative w-full sm:w-96">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
    <Input
    placeholder="Search by request, item, or office..."
    value={incomingSearch}
    onChange={e => setIncomingSearch(e.target.value)}
    className="pl-10 h-10 w-full bg-background"
    />
   </div>
   </CardContent>
  </Card>

  <Card className="shadow-sm border-border overflow-hidden">
   <div className="overflow-x-auto">
   <table className="w-full text-left border-collapse">
    <thead>
    <tr className="border-b border-border bg-muted/50">
     <th className="p-4 text-xs font-semibold text-muted-foreground">Request ID</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground">Office</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground">Item / Service</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground">Date</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground">Priority</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground">Status</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-border">
    {incomingLoading ? (
     <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">Loading requests...</td></tr>
    ) : filteredIncoming.length === 0 ? (
     <tr><td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">No incoming requests found.</td></tr>
    ) : filteredIncoming.map(req => (
     <tr key={req.id} className="hover:bg-accent/50 transition-colors">
     <td className="p-4 font-semibold text-sm text-foreground">{req.id}</td>
     <td className="p-4 text-sm text-muted-foreground">
      <div className="flex items-center gap-1.5">
      {officeIcon(req.office)}
      {req.office}
      </div>
     </td>
     <td className="p-4 text-sm font-medium text-foreground">{req.item}</td>
     <td className="p-4 text-sm text-muted-foreground">{req.date}</td>
     <td className="p-4">
      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColors[req.priority] || priorityColors.Medium}`}>
      {req.priority}
      </span>
     </td>
     <td className="p-4">
      {req.status === 'Approved' ? (
      <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
      ) : req.status === 'Rejected' ? (
      <Badge variant="destructive" className="text-[10px] uppercase">Rejected</Badge>
      ) : req.status === 'In Progress' ? (
      <Badge variant="secondary" className="text-[10px] uppercase">In Progress</Badge>
      ) : (
      <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
      )}
     </td>
     <td className="p-4 text-right">
      {req.status === 'Pending' ? (
      <div className="flex justify-end gap-2">
       <Button
       variant="outline"
       size="sm"
       className="text-destructive hover:bg-destructive/10 border-destructive"
       disabled={actionLoading === req.id}
       onClick={() => handleUpdateStatus(req.id, 'rejected')}
       >
       <XCircle size={14} className="mr-1" /> Reject
       </Button>
       <Button
       size="sm"
       className="bg-emerald-600 hover:bg-emerald-700 text-white"
       disabled={actionLoading === req.id}
       onClick={() => handleUpdateStatus(req.id, 'approved')}
       >
       <CheckCircle size={14} className="mr-1" /> Approve
       </Button>
      </div>
      ) : (
      <span className="text-xs text-muted-foreground italic">No action needed</span>
      )}
     </td>
     </tr>
    ))}
    </tbody>
   </table>
   </div>
  </Card>
  </div>

  {/* ══════════════════════════════════════════════════════════════
    SECTION 2 — INVENTORY REPORT SUBMISSIONS (existing)
   ══════════════════════════════════════════════════════════════ */}
  <div>
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
   <div>
   <h2 className="font-display text-xl font-bold text-foreground">Inventory Report Submissions</h2>
   <p className="text-muted-foreground text-sm mt-1">
    Track submission of finalized inventory reports to COA, City Accounting, and the Office of the City Mayor.
   </p>
   </div>
  </div>

  <Card className="mb-4 shadow-sm border-border">
   <CardContent className="p-4 flex gap-4 items-center bg-card">
   <div className="relative w-full sm:w-96">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
    <Input
    placeholder="Search by report ID or scope..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="pl-10 h-10 w-full bg-background"
    />
   </div>
   </CardContent>
  </Card>

  <Card className="shadow-sm border-border overflow-hidden">
   <div className="overflow-x-auto">
   <div className="max-h-[60vh] overflow-y-auto">
    <table className="w-full text-left border-collapse">
    <thead>
     <tr className="border-b border-border bg-muted/50">
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Prepared By</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Date</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Status</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Submitted To</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
     </tr>
    </thead>
    <tbody className="divide-y divide-border">
     {isLoading ? (
     <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">Loading submissions...</td></tr>
     ) : filteredReports.length === 0 ? (
     <tr><td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">No reports found.</td></tr>
     ) : filteredReports.map(item => {
     const submission = submissions[item.inventory_report_id]
     const destinationLabel = getSubmissionDestination(submission)
     return (
      <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
      <td className="p-4">
       <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
        <FileText size={18} />
       </div>
       <div>
        <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
        {item.inventory_request?.inventory_scope || 'General Inventory Report'}
        </div>
       </div>
       </div>
      </td>
      <td className="p-4 text-sm text-foreground font-medium">{item.government_office?.office_name || 'System'}</td>
      <td className="p-4">
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
       <Calendar size={14} />
       <span>{item.preparation_date || 'N/A'}</span>
       </div>
      </td>
      <td className="p-4">{getStatusBadge(item.approval_status)}</td>
      <td className="p-4 text-sm text-muted-foreground">{destinationLabel || '-'}</td>
      <td className="p-4 text-right">
       {submission ? (
       <Button variant="ghost" size="sm" onClick={() => { if (submission.file_url) window.open(submission.file_url, '_blank'); else toast.error('No attached file.') }}>
        <Eye size={16} className="mr-2" /> View
       </Button>
       ) : (
       <Button variant="ghost" size="sm" onClick={() => { setSelectedReport(item); setDestination(DESTINATIONS[0].value); setComment('') }}>
        <Upload size={16} className="mr-2" /> Submit
       </Button>
       )}
      </td>
      </tr>
     )
     })}
    </tbody>
    </table>
   </div>
   </div>
  </Card>
  </div>

  {/* ── Submit Report Modal ─────────────────────────────────── */}
  <Dialog open={!!selectedReport} onOpenChange={(open) => !open && setSelectedReport(null)}>
   <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selectedReport && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        <Upload className="h-6 w-6 text-primary" /> Submit Inventory Report
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Send <span className="font-semibold text-foreground">{selectedReport.inventory_report_id}</span> to external departments.
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-5 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Send to</label>
        <Select value={destination} onChange={(e) => setDestination(e.target.value)}>
         {DESTINATIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
        </Select>
       </div>
       
       <div>
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 block">Notes (optional)</label>
        <textarea
         className="w-full min-h-[100px] p-4 rounded-xl border border-input bg-background/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring transition-all"
         placeholder="Add context for the recipient."
         value={comment}
         onChange={e => setComment(e.target.value)}
        />
       </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button onClick={() => setSelectedReport(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Cancel</button>
       <button
        onClick={handleSubmitReport}
        className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 flex items-center justify-center transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
       >
        <CheckCircle size={14} /> Submit
       </button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 )
}