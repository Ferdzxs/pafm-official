import React, { useState, useEffect } from 'react'
import {
 Search, User, Eye, Loader2, Download, BookOpen,
 Calendar, FileText, MapPin, X, ChevronsUpDown, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

interface Deceased {
 deceased_id: string
 full_name: string
 date_of_death: string
 place_of_death: string | null
 death_certificate_no: string | null
 burial_record?: {
 burial_id: string
 burial_date: string
 niche_record: { niche_number: string } | null
 funeral_home: { name: string } | null
 cemetery: { cemetery_name: string } | null
 }[]
}

export default function DeceasedRegistry() {
 const [search, setSearch] = useState('')
 const [deceasedList, setDeceasedList] = useState<Deceased[]>([])
 const [loading, setLoading] = useState(true)
 const [selected, setSelected] = useState<Deceased | null>(null)
 const [currentPage, setCurrentPage] = useState(1)
 const [sortField, setSortField] = useState<'full_name' | 'date_of_death'>('date_of_death')
 const [sortAsc, setSortAsc] = useState(false)
 const itemsPerPage = 10

 useEffect(() => { fetchDeceased() }, [])
 useEffect(() => { setCurrentPage(1) }, [search])

 async function fetchDeceased() {
 setLoading(true)
 try {
  const { data, error } = await supabase
  .from('deceased')
  .select(`
   *,
   burial_record(
   burial_id, burial_date,
   niche_record:niche_id(niche_number),
   funeral_home:funeral_home_id(name),
   cemetery:cemetery_id(cemetery_name)
   )
  `)
  .order('date_of_death', { ascending: false })
  if (error) throw error
  setDeceasedList(data || [])
 } catch (err: any) {
  toast.error('Failed to load registry: ' + err.message)
 } finally {
  setLoading(false)
 }
 }

 const filtered = deceasedList
 .filter(d =>
  d.full_name.toLowerCase().includes(search.toLowerCase()) ||
  (d.death_certificate_no ?? '').toLowerCase().includes(search.toLowerCase()) ||
  (d.place_of_death ?? '').toLowerCase().includes(search.toLowerCase())
 )
 .sort((a, b) => {
  const va = a[sortField] ?? ''
  const vb = b[sortField] ?? ''
  return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
 })

 const totalPages = Math.ceil(filtered.length / itemsPerPage)
 const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

 const thisYear = new Date().getFullYear()
 const thisMonth = new Date().getMonth() + 1

 const totalThisYear = deceasedList.filter(d =>
 new Date(d.date_of_death).getFullYear() === thisYear
 ).length

 const totalThisMonth = deceasedList.filter(d => {
 const dt = new Date(d.date_of_death)
 return dt.getFullYear() === thisYear && dt.getMonth() + 1 === thisMonth
 }).length

 const withBurialRecord = deceasedList.filter(d => d.burial_record && d.burial_record.length > 0).length

 function toggleSort(field: typeof sortField) {
 if (sortField === field) setSortAsc(!sortAsc)
 else { setSortField(field); setSortAsc(true) }
 }

 function exportToCSV() {
 if (deceasedList.length === 0) {
  toast.error('No data to export')
  return
 }

 const headers = ['Deceased ID', 'Full Name', 'Date of Death', 'Place of Death', 'Death Certificate No', 'Burial Date', 'Cemetery', 'Niche Number']
 const csvRows = deceasedList.map(d => {
  const burial = d.burial_record?.[0]
  return [
  d.deceased_id,
  `"${d.full_name}"`,
  d.date_of_death,
  `"${d.place_of_death ?? ''}"`,
  `"${d.death_certificate_no ?? ''}"`,
  burial?.burial_date ?? '',
  `"${burial?.cemetery?.cemetery_name ?? ''}"`,
  `"${burial?.niche_record?.niche_number ?? ''}"`
  ].join(',')
 })

 const csvContent = [headers.join(','), ...csvRows].join('\n')
 const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
 const url = URL.createObjectURL(blob)
 const link = document.createElement('a')
 link.setAttribute('href', url)
 link.setAttribute('download', `deceased_registry_${new Date().toISOString().split('T')[0]}.csv`)
 link.style.visibility = 'hidden'
 document.body.appendChild(link)
 link.click()
 document.body.removeChild(link)
 toast.success('Registry exported to CSV')
 }

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
  <div>
   <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
   <BookOpen size={22} className="text-blue-400" /> Deceased Registry
   </h1>
   <p className="text-muted-foreground text-sm mt-0.5">Official record of interred individuals — Quezon City Cemetery Division</p>
  </div>
  <button 
   onClick={exportToCSV}
   className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
  >
   <Download size={15} /> Export CSV
  </button>
  </div>

  {/* Stats */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
  {[
   { label: 'Total Records', value: deceasedList.length, color: 'from-blue-600/20 to-blue-500/5', icon: User },
   { label: 'This Year', value: totalThisYear, color: 'from-indigo-600/20 to-indigo-500/5', icon: Calendar },
   { label: 'This Month', value: totalThisMonth, color: 'from-violet-600/20 to-violet-500/5', icon: Calendar },
   { label: 'Burial Records', value: withBurialRecord, color: 'from-emerald-600/20 to-emerald-500/5', icon: FileText },
  ].map(({ label, value, color, icon: Icon }) => (
   <div key={label} className={`glass rounded-xl p-4 bg-gradient-to-br ${color} border border-white/5`}>
   <div className="flex items-center gap-2 mb-1">
    <Icon size={14} className="text-muted-foreground" />
    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</span>
   </div>
   <div className="text-2xl font-bold">{loading ? '—' : value}</div>
   </div>
  ))}
  </div>

  {/* Search */}
  <div className="relative mb-5">
  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
  <input
   className="input-field pl-10"
   placeholder="Search by name, certificate number, or place of death…"
   value={search}
   onChange={e => setSearch(e.target.value)}
  />
  </div>

  {/* Table */}
  <div className="glass rounded-2xl overflow-hidden border border-white/5">
  <div className="overflow-x-auto">
   {loading ? (
   <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
    <Loader2 className="animate-spin" size={28} />
    <p className="text-sm font-medium">Loading database records…</p>
   </div>
   ) : (
   <table className="w-full min-w-[760px]">
    <thead>
    <tr className="border-b border-white/5 bg-white/3">
     <th
     className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
     onClick={() => toggleSort('full_name')}
     >
     <span className="flex items-center gap-1">Full Name <ChevronsUpDown size={12} /></span>
     </th>
     <th
     className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest cursor-pointer select-none hover:text-white transition-colors"
     onClick={() => toggleSort('date_of_death')}
     >
     <span className="flex items-center gap-1">Date of Death <ChevronsUpDown size={12} /></span>
     </th>
     <th className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Death Cert #</th>
     <th className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Place of Death</th>
     <th className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Burial</th>
     <th className="px-5 py-4 text-left text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Actions</th>
    </tr>
    </thead>
    <tbody>
    {paginatedItems.map(person => {
     const burial = person.burial_record?.[0]
     return (
     <tr
      key={person.deceased_id}
      className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
      onClick={() => setSelected(person)}
     >
      <td className="px-5 py-3.5">
      <div className="flex items-center gap-3">
       <div className="w-8 h-8 rounded-full bg-muted/40 border border-border flex items-center justify-center text-muted-foreground shrink-0">
       <User size={14} />
       </div>
       <span className="text-sm font-semibold text-white">{person.full_name}</span>
      </div>
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground">
      {new Date(person.date_of_death).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
      </td>
      <td className="px-5 py-3.5">
      <span className="text-xs font-mono text-blue-400">{person.death_certificate_no ?? <span className="text-muted-foreground">N/A</span>}</span>
      </td>
      <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[180px] truncate">
      <span className="flex items-center gap-1">
       <MapPin size={12} className="text-muted-foreground shrink-0" />
       {person.place_of_death ?? '—'}
      </span>
      </td>
      <td className="px-5 py-3.5">
      {burial ? (
       <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
       {burial.niche_record?.niche_number ?? 'Recorded'}
       </Badge>
      ) : (
       <Badge variant="secondary" className="text-[10px] text-muted-foreground">No Record</Badge>
      )}
      </td>
      <td className="px-5 py-3.5">
      <button
       className="p-2 rounded-lg text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
       onClick={e => { e.stopPropagation(); setSelected(person) }}
      >
       <Eye size={16} />
      </button>
      </td>
     </tr>
     )
    })}
    </tbody>
   </table>
   )}
  </div>
  {!loading && filtered.length === 0 && (
   <div className="py-20 text-center">
   <AlertCircle className="mx-auto mb-3 text-muted-foreground" size={32} />
   <p className="text-muted-foreground font-medium">No records matching your search.</p>
   </div>
  )}
  </div>

  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

  {/* Detail Modal */}
  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">ID: {selected.deceased_id}</Badge>
       </div>
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        <User className="text-muted-foreground h-6 w-6" /> {selected.full_name}
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Registry Details
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       <div className="grid grid-cols-1 gap-y-4 text-sm surface-box border border-border/20 p-5">
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Date of Death</p>
         <p className="font-bold text-foreground">{new Date(selected.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' })}</p>
        </div>
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Place of Death</p>
         <p className="font-bold text-foreground">{selected.place_of_death ?? '—'}</p>
        </div>
        <div className="space-y-1">
         <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">Death Certificate #</p>
         <p className="font-mono text-xs font-bold text-foreground opacity-80">{selected.death_certificate_no ?? 'Not on file'}</p>
        </div>
       </div>

       {selected.burial_record && selected.burial_record.length > 0 ? (
        <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
         <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-3 flex items-center gap-2">Burial Record</p>
         <div className="space-y-3">
          <div className="flex justify-between items-center">
           <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Burial Date</span>
           <span className="text-xs font-bold text-foreground">{new Date(selected.burial_record[0].burial_date).toLocaleDateString('en-PH', { dateStyle: 'long' })}</span>
          </div>
          <div className="flex justify-between items-center">
           <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Cemetery</span>
           <span className="text-xs font-bold text-foreground">{selected.burial_record[0].cemetery?.cemetery_name ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
           <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Niche #</span>
           <span className="text-xs font-bold text-foreground">{selected.burial_record[0].niche_record?.niche_number ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
           <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Funeral Home</span>
           <span className="text-xs font-bold text-foreground">{selected.burial_record[0].funeral_home?.name ?? '—'}</span>
          </div>
         </div>
        </div>
       ) : (
        <div className="p-5 rounded-xl border border-border/50 bg-muted/30 text-center">
         <p className="text-xs font-medium text-muted-foreground">No burial record linked to this entry.</p>
        </div>
       )}
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
