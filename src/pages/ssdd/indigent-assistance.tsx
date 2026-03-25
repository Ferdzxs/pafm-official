import React, { useState, useEffect } from 'react'
import {
 Search, Loader2, ClipboardCheck, AlertCircle, User, FileText,
 CheckCircle, XCircle, X, HeartHandshake, Shield, ChevronRight,
 CalendarDays, FileBadge
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface IndigentApplication {
 application_id: string
 submission_date: string
 application_status: string
 person: {
 person_id: string
 full_name: string
 address: string | null
 contact_number: string | null
 }
 deceased: {
 full_name: string
 date_of_death: string
 death_certificate_no: string | null
 }
 indigent_assistance_record: {
 assistance_id: string
 status: string
 social_worker_eval_date: string | null
 digital_cert_of_guarantee_url: string | null
 }[]
}

export default function SsddIndigentAssistance() {
 const [apps, setApps] = useState<IndigentApplication[]>([])
 const [loading, setLoading] = useState(true)
 const [searchTerm, setSearchTerm] = useState('')
 const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'ssdd_evaluated' | 'approved'>('all')
 const [selected, setSelected] = useState<IndigentApplication | null>(null)
 const [acting, setActing] = useState<string | null>(null)
 const [currentPage, setCurrentPage] = useState(1)
 const PAGE_SIZE = 10

 useEffect(() => { fetchIndigentApps() }, [])

 async function fetchIndigentApps() {
 setLoading(true)
 try {
  // Query 1: burial applications with person + deceased info
  const { data: appData, error: appErr } = await supabase
  .from('online_burial_application')
  .select(`
   application_id, submission_date, application_status, person_id, deceased_id,
   person:person_id(person_id, full_name, address, contact_number),
   deceased:deceased_id(full_name, date_of_death, death_certificate_no)
  `)
  .order('submission_date', { ascending: false })
  if (appErr) throw appErr

  // Query 2: all indigent assistance records
  const { data: iarData, error: iarErr } = await supabase
  .from('indigent_assistance_record')
  .select('assistance_id, deceased_id, status, social_worker_eval_date, digital_cert_of_guarantee_url')
  if (iarErr) throw iarErr

  // Merge: attach IAR rows to each application by deceased_id
  const merged = (appData || []).map((app: any) => ({
  ...app,
  indigent_assistance_record: (iarData || []).filter(
   (iar: any) => iar.deceased_id === app.deceased_id
  ),
  }))

  // Show rows that already have an IAR, or are still pending/under review (for SSDD to evaluate)
  const filtered = merged.filter((app: any) =>
  app.indigent_assistance_record.length > 0 ||
  ['pending', 'under_review'].includes(app.application_status)
  )

  setApps(filtered as any)
 } catch (err: any) {
  toast.error('Failed to load indigent applications: ' + (err?.message ?? String(err)))
 } finally {
  setLoading(false)
 }
 }

 async function handleDecision(app: IndigentApplication, decision: 'approved' | 'rejected') {
 setActing(app.application_id)
 try {
  const assistanceRecord = app.indigent_assistance_record?.[0]

  if (assistanceRecord) {
  // Update existing IAR
  const { error: iarErr } = await supabase
   .from('indigent_assistance_record')
   .update({
   status: decision,
   social_worker_eval_date: new Date().toISOString().split('T')[0],
   })
   .eq('assistance_id', assistanceRecord.assistance_id)
  if (iarErr) throw iarErr
  } else {
  // Create new IAR record
  const { error: createErr } = await supabase
   .from('indigent_assistance_record')
   .insert([{
   assistance_id: `IAR-${Date.now()}`,
   deceased_id: (app as any).deceased_id,
   issued_by_office: 'OFF-002',
   status: decision,
   social_worker_eval_date: new Date().toISOString().split('T')[0],
   }])
  if (createErr) throw createErr
  }

  // Update application status
  const { error: appErr } = await supabase
  .from('online_burial_application')
  .update({ application_status: decision === 'approved' ? 'ssdd_evaluated' : 'rejected' })
  .eq('application_id', app.application_id)
  if (appErr) throw appErr

  toast.success(decision === 'approved'
  ? '✅ Assistance approved. Case routed to CCRD.'
  : '❌ Application rejected.')
  setSelected(null)
  fetchIndigentApps()
 } catch (err: any) {
  toast.error('Action failed: ' + err.message)
 } finally {
  setActing(null)
 }
 }

 const filtered = apps.filter(a => {
 const matchSearch =
  (a.deceased?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  (a.person?.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
  a.application_id.toLowerCase().includes(searchTerm.toLowerCase())
 const matchStatus = statusFilter === 'all' || a.application_status === statusFilter
 return matchSearch && matchStatus
 })

 const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
 const safePage = Math.min(currentPage, totalPages)
 const paginatedItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

 const stats = {
 total: apps.length,
 pending: apps.filter(a => a.application_status === 'pending').length,
 evaluated: apps.filter(a => a.application_status === 'ssdd_evaluated').length,
 approved: apps.filter(a => a.indigent_assistance_record?.[0]?.status === 'approved').length,
 }

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
  <div>
   <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
   <HeartHandshake size={22} className="text-emerald-400" /> Indigent Assistance Queue
   </h1>
   <p className="text-muted-foreground text-sm mt-0.5">Evaluate burial assistance requests for underprivileged families</p>
  </div>
  <Badge className="self-start bg-emerald-500/10 border-emerald-500/20 text-emerald-400 border font-bold text-xs">
   <Shield size={12} className="mr-1" /> SSDD Social Workers
  </Badge>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {[
   { label: 'Total Cases', value: stats.total, color: 'text-white', filter: 'all' },
   { label: 'Awaiting Eval', value: stats.pending, color: 'text-amber-400', filter: 'pending' },
   { label: 'SSDD Evaluated', value: stats.evaluated, color: 'text-blue-400', filter: 'ssdd_evaluated' },
   { label: 'Assistance Approved', value: stats.approved, color: 'text-emerald-400', filter: 'approved' },
  ].map(({ label, value, color, filter }) => (
   <button
   key={label}
   onClick={() => setStatusFilter(filter as any)}
   className={`glass rounded-xl p-4 border text-left transition-all ${
    statusFilter === filter ? 'border-blue-500 ring-1 ring-blue-500/30' : 'border-white/5 hover:border-white/15'
   }`}
   >
   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
   <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
   </button>
  ))}
  </div>

  {/* Search */}
  <div className="relative mb-6">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
  <input
   type="text"
   placeholder="Search by deceased, applicant name, or application ID…"
   className="input-field pl-10 w-full"
   value={searchTerm}
   onChange={e => setSearchTerm(e.target.value)}
  />
  </div>

  {/* Cases List */}
  {loading ? (
  <div className="flex flex-col items-center justify-center py-20">
   <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
   <p className="text-muted-foreground font-medium font-mono text-xs uppercase tracking-widest">Scanning Social Registry…</p>
  </div>
  ) : filtered.length === 0 ? (
  <div className="text-center py-20 glass rounded-2xl border border-border">
   <ClipboardCheck className="mx-auto mb-4 text-muted-foreground" size={48} />
   <h3 className="text-lg font-semibold text-white">Queue is empty</h3>
   <p className="text-muted-foreground max-w-xs mx-auto mt-2 text-sm">No cases match the current filter.</p>
  </div>
  ) : (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   {paginatedItems.map(app => {
   const iar = app.indigent_assistance_record?.[0]
   const isProcessed = app.application_status === 'ssdd_evaluated' || app.application_status === 'rejected'
   return (
    <Card key={app.application_id} className="card-hover bg-card/40 border-border/50 overflow-hidden">
    <CardContent className="p-0">
     <div className="flex flex-col md:flex-row">
     <div className="flex-1 p-6">
      {/* App ID & Tags */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
      <Badge variant="outline" className="text-[10px] font-mono border-border text-muted-foreground">{app.application_id}</Badge>
      <Badge className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 border text-[10px]">Indigent Flag</Badge>
      {app.application_status === 'ssdd_evaluated' && (
       <Badge className="bg-blue-500/10 border-blue-500/20 text-blue-400 border text-[10px]">SSDD Evaluated</Badge>
      )}
      {app.application_status === 'rejected' && (
       <Badge className="bg-red-500/10 border-red-500/20 text-red-400 border text-[10px]">Rejected</Badge>
      )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      {/* Deceased */}
      <div>
       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Deceased Individual</p>
       <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center text-muted-foreground shrink-0">
        <FileText size={18} />
       </div>
       <div>
        <p className="text-white font-bold text-sm">{app.deceased?.full_name}</p>
        <p className="text-[10px] text-muted-foreground">DOD: {app.deceased?.date_of_death}</p>
        {app.deceased?.death_certificate_no && (
        <p className="text-[10px] font-mono text-blue-400">{app.deceased.death_certificate_no}</p>
        )}
       </div>
       </div>
      </div>

      {/* Applicant */}
      <div>
       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Relative / Applicant</p>
       <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
        <User size={18} />
       </div>
       <div>
        <p className="text-white font-bold text-sm">{app.person?.full_name}</p>
        <p className="text-[10px] text-muted-foreground">{app.person?.contact_number ?? '—'}</p>
        <p className="text-[10px] font-mono text-muted-foreground">{app.person?.person_id}</p>
       </div>
       </div>
      </div>
      </div>

      {/* Guarantee Certificate */}
      {iar?.digital_cert_of_guarantee_url && (
      <div className="mt-4 pt-4 border-t border-border/50">
       <a
       href={iar.digital_cert_of_guarantee_url}
       target="_blank"
       rel="noopener noreferrer"
       className="flex items-center gap-2 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors"
       >
       <FileBadge size={14} /> View Certificate of Guarantee
       </a>
      </div>
      )}
     </div>

     {/* Action Panel */}
     <div className="w-full md:w-64 bg-card/60 border-t md:border-t-0 md:border-l border-border/50 p-6 flex flex-col justify-between gap-4">
      <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Submitted</p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
       <CalendarDays size={13} className="text-muted-foreground" />
       {new Date(app.submission_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}
      </div>
      {iar?.social_worker_eval_date && (
       <div className="mt-2">
       <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Eval Date</p>
       <p className="text-xs text-emerald-400">{new Date(iar.social_worker_eval_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</p>
       </div>
      )}
      </div>

      {isProcessed ? (
      <div className="p-3 rounded-xl bg-white/5 border border-border text-center">
       {app.application_status === 'ssdd_evaluated' ? (
       <><CheckCircle size={16} className="text-emerald-400 mx-auto mb-1" /><p className="text-xs text-emerald-400 font-bold">Approved & Routed</p></>
       ) : (
       <><XCircle size={16} className="text-red-400 mx-auto mb-1" /><p className="text-xs text-red-400 font-bold">Rejected</p></>
       )}
      </div>
      ) : (
      <div className="flex flex-col gap-2">
       <button
       onClick={() => setSelected(app)}
       className="w-full btn-secondary py-2 text-xs font-bold"
       >
       Review Case <ChevronRight size={14} className="ml-auto" />
       </button>
       <button
       disabled={acting === app.application_id}
       onClick={() => handleDecision(app, 'approved')}
       className="w-full py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-xs font-bold uppercase"
       >
       {acting === app.application_id ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Approve Assistance'}
       </button>
       <button
       disabled={acting === app.application_id}
       onClick={() => handleDecision(app, 'rejected')}
       className="w-full py-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold uppercase"
       >
       Reject
       </button>
      </div>
      )}
     </div>
     </div>
    </CardContent>
    </Card>
   )
   })}
  </div>
  )}

  {/* Pagination */}
  {!loading && totalPages > 1 && (
  <div className="flex items-center justify-between mt-6 px-1">
   <p className="text-xs text-muted-foreground">
   Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} cases
   </p>
   <div className="flex items-center gap-1">
   <button
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    disabled={safePage === 1}
    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-muted-foreground hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
   >
    ← Prev
   </button>
   {Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
    .reduce<(number | '...')[]>((acc, p, i, arr) => {
    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...')
    acc.push(p)
    return acc
    }, [])
    .map((p, i) =>
    p === '...' ? (
     <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-xs">…</span>
    ) : (
     <button
     key={p}
     onClick={() => setCurrentPage(p as number)}
     className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
      safePage === p
      ? 'gradient-primary text-white shadow'
      : 'border border-white/10 text-muted-foreground hover:border-white/20 hover:text-white'
     }`}
     >
     {p}
     </button>
    )
    )}
   <button
    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
    disabled={safePage === totalPages}
    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-muted-foreground hover:border-white/20 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
   >
    Next →
   </button>
   </div>
  </div>
  )}

  {/* Detail Modal */}
  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
        Indigent Assistance Review
       </DialogTitle>
       <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">
        {selected.application_id}
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       {[
        ['Deceased', selected.deceased?.full_name ?? '—'],
        ['Date of Death', selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'],
        ['Death Cert #', selected.deceased?.death_certificate_no ?? 'Not provided'],
        ['Applicant', selected.person?.full_name ?? '—'],
        ['Contact', selected.person?.contact_number ?? '—'],
        ['Address', selected.person?.address ?? '—'],
        ['Submission', new Date(selected.submission_date).toLocaleDateString('en-PH', { dateStyle: 'long' })],
       ].map(([label, value]) => (
        <div key={label} className="bg-background border border-border/50 p-4 rounded-xl shadow-sm flex flex-col">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
         <div className="text-sm font-semibold text-foreground">{value}</div>
        </div>
       ))}
      </div>

      <div className="mt-6 pt-6 border-t border-border/10 flex gap-3 shrink-0">
       <button
        disabled={acting === selected.application_id}
        onClick={() => handleDecision(selected, 'rejected')}
        className="h-11 rounded-xl flex-1 border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all text-[11px] font-extrabold uppercase tracking-widest shadow-sm"
       >
        Reject
       </button>
       <button
        disabled={acting === selected.application_id}
        onClick={() => handleDecision(selected, 'approved')}
        className="h-11 rounded-xl flex-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all text-[11px] font-extrabold uppercase tracking-widest shadow-inner shadow-sm"
       >
        {acting === selected.application_id ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Approve & Route to CCRD'}
       </button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 )
}
