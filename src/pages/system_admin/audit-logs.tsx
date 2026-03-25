import React, { useEffect, useState } from 'react'
import { fetchAuditLogs } from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { Search, Info, ShieldCheck, Terminal } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface AuditRow {
 id: string
 action: string
 subject?: string | null
 performed_by?: string | null
 timestamp: string
 status: string
 module: string
 ip_address?: string | null
 details?: string | null
}

export default function SystemAuditLogs() {
 const { user } = useAuth()
 const [rows, setRows] = useState<AuditRow[]>([])
 const [moduleFilter, setModuleFilter] = useState('all')
 const [statusFilter, setStatusFilter] = useState('all')
 const [search, setSearch] = useState('')
 const [selected, setSelected] = useState<AuditRow | null>(null)
 const [isLoading, setIsLoading] = useState(false)

 useEffect(() => {
 const run = async () => {
  setIsLoading(true)
  try {
  const data = await fetchAuditLogs({ limit: 200 })
  setRows(data as any)
  } finally {
  setIsLoading(false)
  }
 }
 void run()
 }, [])

 const filtered = rows.filter(r => {
 if (moduleFilter !== 'all' && r.module !== moduleFilter) return false
 if (statusFilter !== 'all' && r.status !== statusFilter) return false
 const q = search.toLowerCase()
 if (!q) return true
 return (
  r.action.toLowerCase().includes(q) ||
  (r.subject ?? '').toLowerCase().includes(q) ||
  (r.performed_by ?? '').toLowerCase().includes(q)
 )
 })

 const modules = Array.from(new Set(rows.map(r => r.module))).sort()
 const statuses = Array.from(new Set(rows.map(r => r.status))).sort()

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div>
   <h1 className="font-display text-2xl font-bold text-white">System Audit Logs</h1>
   <p className="text-slate-400 text-sm mt-0.5">
   Immutable trail of sensitive actions across the BPM platform for Quezon City.
   </p>
  </div>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {[
   { label: 'Entries Loaded', value: rows.length },
   { label: 'Filtered', value: filtered.length },
  ].map(s => (
   <div
   key={s.label}
   className="glass rounded-xl p-4"
   style={{ border: '1px solid rgba(148,163,184,0.08)' }}
   >
   <div className="text-2xl font-bold text-white">{s.value}</div>
   <div className="text-xs text-slate-400">{s.label}</div>
   </div>
  ))}
  </div>

  <div className="flex flex-col md:flex-row gap-3 mb-4">
  <div className="relative flex-1">
   <Search
   size={14}
   className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
   />
   <input
   className="input-field pl-10"
   placeholder="Search by action, subject, or user…"
   value={search}
   onChange={e => setSearch(e.target.value)}
   />
  </div>
  <select
   className="input-field w-full md:w-52"
   value={moduleFilter}
   onChange={e => setModuleFilter(e.target.value)}
  >
   <option value="all">All modules</option>
   {modules.map(m => (
   <option key={m} value={m}>
    {m}
   </option>
   ))}
  </select>
  <select
   className="input-field w-full md:w-40"
   value={statusFilter}
   onChange={e => setStatusFilter(e.target.value)}
  >
   <option value="all">All statuses</option>
   {statuses.map(s => (
   <option key={s} value={s}>
    {s}
   </option>
   ))}
  </select>
  </div>

  <div
  className="glass rounded-2xl overflow-hidden"
  style={{ border: '1px solid rgba(148,163,184,0.08)' }}
  >
  <div className="overflow-x-auto max-h-[420px]">
   <table className="w-full min-w-[800px] text-xs">
   <thead>
    <tr
    style={{
     borderBottom: '1px solid rgba(148,163,184,0.08)',
     background: 'rgba(255,255,255,0.02)',
    }}
    >
    {[
     'Time',
     'Module',
     'Action',
     'Subject',
     'User',
     'Status',
     'IP',
    ].map(h => (
     <th
     key={h}
     className="px-3 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide"
     >
     {h}
     </th>
    ))}
    </tr>
   </thead>
   <tbody>
    {filtered.map(r => (
    <tr
     key={r.id}
     className="border-b border-white/5 hover:bg-white/5 cursor-pointer"
     onClick={() => setSelected(r)}
    >
     <td className="px-3 py-2 text-slate-300">
     {new Date(r.timestamp).toLocaleString('en-PH')}
     </td>
     <td className="px-3 py-2 text-slate-300">{r.module}</td>
     <td className="px-3 py-2 text-slate-300">{r.action}</td>
     <td className="px-3 py-2 text-slate-300">
     {r.subject ?? '—'}
     </td>
     <td className="px-3 py-2 text-slate-300">
     {r.performed_by ?? '—'}
     </td>
     <td className="px-3 py-2 text-slate-300">
     {r.status}
     </td>
     <td className="px-3 py-2 text-slate-300">
     {r.ip_address ?? '—'}
     </td>
    </tr>
    ))}
    {filtered.length === 0 && (
    <tr>
     <td
     colSpan={7}
     className="px-4 py-6 text-center text-slate-400"
     >
     {isLoading
      ? 'Loading audit logs…'
      : 'No audit entries match your filters.'}
     </td>
    </tr>
    )}
   </tbody>
   </table>
  </div>
  </div>

   {/* Audit Detail Modal */}
   <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
    <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     {selected && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar border border-white/10 shadow-2xl shadow-black/40">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <div className="flex items-center gap-2 mb-2">
         <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background uppercase flex items-center gap-1.5">
          <Terminal className="h-3 w-3" /> AUDIT ID: {selected.id}
         </Badge>
         <Badge variant={selected.status === 'Completed' || selected.status === 'success' || selected.status === 'active' ? 'success' : 'secondary'} className="text-[10px] font-bold tracking-widest uppercase">
          {selected.status}
         </Badge>
        </div>
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
         {selected.action}
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
         {selected.module} · {new Date(selected.timestamp).toLocaleString('en-PH')}
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="grid grid-cols-2 gap-4 text-sm surface-box border border-border/20 p-5 rounded-xl shadow-sm bg-muted/5">
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Subject</label>
          <p className="text-sm font-semibold text-foreground px-1">{selected.subject ?? '—'}</p>
         </div>
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Performed by</label>
          <p className="text-sm font-semibold text-foreground px-1">{selected.performed_by ?? '—'}</p>
         </div>
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">IP Address</label>
          <p className="text-sm font-semibold font-mono text-muted-foreground px-1">{selected.ip_address ?? '—'}</p>
         </div>
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Module Path</label>
          <p className="text-sm font-semibold text-muted-foreground px-1">{selected.module}</p>
         </div>
        </div>

        <div className="space-y-3">
         <div className="flex items-center gap-2 px-1">
          <div className="h-px flex-1 bg-border/20" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Detailed Payload (JSON)</span>
          <div className="h-px flex-1 bg-border/20" />
         </div>
         <div className="relative group">
          <pre className="bg-slate-950/80 rounded-xl p-4 text-[11px] font-mono text-emerald-400/90 overflow-auto max-h-64 sidebar-scrollbar border border-white/5 ring-1 ring-white/5 shadow-inner leading-relaxed">
           {selected.details
            ? (() => {
             try {
              const parsed = JSON.parse(selected.details)
              return JSON.stringify(parsed, null, 2)
             } catch {
              return selected.details
             }
            })()
            : 'No additional details recorded for this entry.'}
          </pre>
         </div>
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button
         className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all flex items-center justify-center gap-2"
         onClick={() => setSelected(null)}
        >
         Close Audit Record
        </button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>
 </div>
 )
}
