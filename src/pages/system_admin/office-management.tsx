import React, { useEffect, useState } from 'react'
import { Plus, Building2, Search, Users } from 'lucide-react'
import { fetchGovernmentOffices, upsertGovernmentOffice, fetchEmployees, type GovernmentOfficeRow } from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { logAudit } from '@/lib/admin'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export default function OfficeManagement() {
 const { user } = useAuth()
 const [offices, setOffices] = useState<GovernmentOfficeRow[]>([])
 const [employees, setEmployees] = useState<any[]>([])
 const [search, setSearch] = useState('')
 const [typeFilter, setTypeFilter] = useState<string>('all')
 const [isLoading, setIsLoading] = useState(false)
 const [editing, setEditing] = useState<GovernmentOfficeRow | null>(null)
 const [employeeCounts, setEmployeeCounts] = useState<Record<string, number>>({})
 const [viewing, setViewing] = useState<GovernmentOfficeRow | null>(null)

 useEffect(() => {
 const run = async () => {
  setIsLoading(true)
  try {
  const [officeRows, employees] = await Promise.all([
   fetchGovernmentOffices(),
   fetchEmployees(),
  ])
  setOffices(officeRows)
  setEmployees(employees as any[])
  const counts: Record<string, number> = {}
  for (const e of employees) {
   if (!e.office_id) continue
   counts[e.office_id] = (counts[e.office_id] ?? 0) + 1
  }
  setEmployeeCounts(counts)
  } finally {
  setIsLoading(false)
  }
 }
 void run()
 }, [])

 const startCreate = () => {
 setEditing({
  office_id: '',
  office_name: '',
  office_type: '',
  location: '',
 })
 }

 const handleSave = async () => {
 if (!editing) return
 if (!editing.office_name.trim()) return
 setIsLoading(true)
 try {
  const payload: Partial<GovernmentOfficeRow> = {
  office_id: editing.office_id || undefined,
  office_name: editing.office_name,
  office_type: editing.office_type ?? null,
  location: editing.location ?? null,
  }
  await upsertGovernmentOffice(payload)
  await logAudit({
  action: editing.office_id ? 'office_updated' : 'office_created',
  module: 'admin_offices',
  performed_by: user?.email,
  subject: editing.office_name,
  details: payload,
  })
  const latest = await fetchGovernmentOffices()
  setOffices(latest)
  setEditing(null)
 } finally {
  setIsLoading(false)
 }
 }

 const filtered = offices.filter(o => {
 const q = search.toLowerCase()
 const matchesSearch = (
  o.office_name.toLowerCase().includes(q) ||
  (o.office_type ?? '').toLowerCase().includes(q) ||
  (o.location ?? '').toLowerCase().includes(q)
 )
 const matchesType = typeFilter === 'all' || (o.office_type ?? '') === typeFilter
 return matchesSearch && matchesType
 })

 const uniqueTypes = Array.from(
 new Set(offices.map(o => o.office_type ?? '').filter(Boolean)),
 ).sort()

 const employeesForOffice = (officeId: string) =>
 (employees ?? [])
  .filter((e: any) => e.office_id === officeId)
  .sort((a: any, b: any) => (a.full_name ?? '').localeCompare(b.full_name ?? ''))

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
  <div>
   <h1 className="font-display text-2xl font-bold text-white">Office Management</h1>
   <p className="text-slate-400 text-sm mt-0.5">
   Master registry of Quezon City government offices used across all modules.
   </p>
  </div>
  <button
   className="btn-primary self-start sm:self-auto"
   onClick={startCreate}
  >
   <Plus size={15} /> Add Office
  </button>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
  {[
   { label: 'Total Offices', value: offices.length },
   {
   label: 'With Employees',
   value: Object.keys(employeeCounts).length,
   },
   {
   label: 'Records Matching Search',
   value: filtered.length,
   },
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

  <div className="flex flex-col sm:flex-row gap-3 mb-5">
  <div className="relative flex-1">
   <Search
   size={14}
   className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
   />
   <input
   className="input-field pl-10"
   placeholder="Search by office name, type, or location…"
   value={search}
   onChange={e => setSearch(e.target.value)}
   />
  </div>
  <select
   className="input-field w-full sm:w-60"
   value={typeFilter}
   onChange={e => setTypeFilter(e.target.value)}
  >
   <option value="all">All Types</option>
   {uniqueTypes.map(t => (
   <option key={t} value={t}>{t}</option>
   ))}
  </select>
  </div>

  {editing && (
  <div
   className="glass rounded-2xl p-4 mb-6"
   style={{ border: '1px solid rgba(148,163,184,0.18)' }}
  >
   <div className="flex items-center justify-between mb-3">
   <h2 className="text-sm font-semibold text-white">
    {editing.office_id ? 'Edit Office' : 'Create Office'}
   </h2>
   <button
    className="text-slate-400 text-xs hover:text-white"
    onClick={() => setEditing(null)}
   >
    Close
   </button>
   </div>
   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
   <input
    className="input-field"
    placeholder="Office name"
    value={editing.office_name}
    onChange={e =>
    setEditing(prev =>
     prev
     ? { ...prev, office_name: e.target.value }
     : prev,
    )
    }
   />
   <input
    className="input-field"
    placeholder="Office type (e.g. Division, Department)"
    value={editing.office_type ?? ''}
    onChange={e =>
    setEditing(prev =>
     prev
     ? { ...prev, office_type: e.target.value }
     : prev,
    )
    }
   />
   <input
    className="input-field md:col-span-2"
    placeholder="Location (building, floor, address)"
    value={editing.location ?? ''}
    onChange={e =>
    setEditing(prev =>
     prev
     ? { ...prev, location: e.target.value }
     : prev,
    )
    }
   />
   </div>
   <div className="mt-4 flex justify-end gap-2 text-xs">
   <button
    className="btn-secondary"
    onClick={() => setEditing(null)}
   >
    Cancel
   </button>
   <button
    className="btn-primary"
    onClick={handleSave}
    disabled={isLoading}
   >
    {isLoading ? 'Saving…' : 'Save Office'}
   </button>
   </div>
  </div>
  )}

  <div
  className="glass rounded-2xl overflow-hidden"
  style={{ border: '1px solid rgba(148,163,184,0.08)' }}
  >
  <div className="overflow-x-auto">
   <table className="w-full min-w-[720px]">
   <thead>
    <tr
    style={{
     borderBottom: '1px solid rgba(148,163,184,0.08)',
     background: 'rgba(255,255,255,0.02)',
    }}
    >
    {['Office', 'Type', 'Location', 'Employees', 'Actions'].map(
     h => (
     <th
      key={h}
      className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"
     >
      {h}
     </th>
     ),
    )}
    </tr>
   </thead>
   <tbody>
    {filtered.map(o => (
    <tr
     key={o.office_id}
     className="border-b border-white/5 hover:bg-white/3 transition-colors"
    >
     <td className="px-4 py-3">
     <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold">
      <Building2 size={16} />
      </div>
      <span className="text-sm font-medium text-white">
      {o.office_name}
      </span>
     </div>
     </td>
     <td className="px-4 py-3 text-sm text-slate-400">
     {o.office_type ?? '—'}
     </td>
     <td className="px-4 py-3 text-sm text-slate-400">
     {o.location ?? '—'}
     </td>
     <td className="px-4 py-3 text-sm text-slate-400">
     <span className="inline-flex items-center gap-2">
      <Users size={14} className="text-slate-500" />
      {employeeCounts[o.office_id] ?? 0}
     </span>
     </td>
     <td className="px-4 py-3 text-sm text-slate-400">
     <div className="flex items-center gap-2">
      <button
      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
      onClick={() => setViewing(o)}
      >
      View
      </button>
      <button
      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-xs"
      onClick={() => setEditing(o)}
      >
      Edit
      </button>
     </div>
     </td>
    </tr>
    ))}
    {filtered.length === 0 && (
    <tr>
     <td
     colSpan={5}
     className="px-4 py-6 text-center text-sm text-slate-400"
     >
     {isLoading
      ? 'Loading offices…'
      : 'No offices match your filters.'}
     </td>
    </tr>
    )}
   </tbody>
   </table>
  </div>
  </div>

  {/* Office Details Modal */}
  <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
   <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {viewing && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background uppercase">Office Detail: {viewing.office_id}</Badge>
       </div>
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
        {viewing.office_name}
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        {viewing.office_type || 'General Office'} · {viewing.location || 'No location set'}
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="glass rounded-xl overflow-hidden border border-border/20 shadow-sm">
        <div className="px-4 py-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground bg-muted/30 border-b border-border/20 flex items-center gap-2">
         <Users size={12} /> Assigned Employees ({employeeCounts[viewing.office_id] ?? 0})
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[300px] sidebar-scrollbar">
         <table className="w-full text-sm">
          <thead>
           <tr className="border-b border-border/10 bg-muted/10">
            {['Name', 'Position', 'Department', 'Email', 'Status'].map(h => (
             <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {h}
             </th>
            ))}
           </tr>
          </thead>
          <tbody>
           {employeesForOffice(viewing.office_id).map((e: any) => (
            <tr key={e.employee_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
             <td className="px-4 py-2.5 font-medium text-foreground">{e.full_name}</td>
             <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.position_title ?? '—'}</td>
             <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.department ?? '—'}</td>
             <td className="px-4 py-2.5 text-muted-foreground text-xs">{e.email ?? '—'}</td>
             <td className="px-4 py-2.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight ${e.is_active ? 'badge-active' : 'badge-rejected'}`}>
               {e.is_active ? 'Active' : 'Inactive'}
              </span>
             </td>
            </tr>
           ))}
           {(employeeCounts[viewing.office_id] ?? 0) === 0 && (
            <tr>
             <td colSpan={5} className="px-4 py-8 text-center text-xs text-muted-foreground">
              No employees are assigned to this office yet.
             </td>
            </tr>
           )}
          </tbody>
         </table>
        </div>
       </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
       <button
        className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
        onClick={() => setViewing(null)}
       >
        Close
       </button>
       <button
        className="h-11 rounded-xl px-8 w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 text-[11px] font-extrabold uppercase tracking-widest transition-all"
        onClick={() => { setEditing(viewing); setViewing(null) }}
       >
        Edit Office
       </button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 )
}
