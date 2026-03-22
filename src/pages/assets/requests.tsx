import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Search, Filter, XCircle, Users, Building2, TreePine, Eye, Info, Clock, AlertCircle } from 'lucide-react'

type AssetRequest = {
 id: string
 origin: 'Cemetery Office' | 'Parks Admin' | 'Punong Barangay'
 item: string
 status: 'Pending' | 'Approved' | 'Rejected' | 'In Progress'
 date: string
 priority: 'Low' | 'Medium' | 'High'
}

const MOCK_REQUESTS: AssetRequest[] = [
 { id: 'REQ-CO-001', origin: 'Cemetery Office', item: 'Lawnmower Parts', status: 'Pending', date: '2024-02-18', priority: 'Medium' },
 { id: 'REQ-CO-002', origin: 'Cemetery Office', item: 'Grave Digging Equipment Maintenance', status: 'In Progress', date: '2024-02-12', priority: 'High' },
 { id: 'REQ-PA-001', origin: 'Parks Admin', item: 'Park Benches (x6)', status: 'Approved', date: '2024-02-10', priority: 'Low' },
 { id: 'REQ-PB-001', origin: 'Punong Barangay', item: 'Community Hall Tables', status: 'Pending', date: '2024-02-15', priority: 'Medium' },
 { id: 'REQ-PB-002', origin: 'Punong Barangay', item: 'Floodlight Repairs', status: 'Rejected', date: '2024-02-08', priority: 'High' },
]

export default function AssetsRequestsPage() {
 const [search, setSearch] = useState('')
 const [originFilter, setOriginFilter] = useState<'All' | AssetRequest['origin']>('All')
 const [requests, setRequests] = useState<AssetRequest[]>([])
 const [isLoading, setIsLoading] = useState(true)
 const [selectedRequest, setSelectedRequest] = useState<AssetRequest | null>(null)


 const loadRequests = async () => {
 setIsLoading(true)
 const { data, error } = await supabase
  .from('inventory_request')
  .select(`
  inventory_request_id,
  property_id,
  property (
   property_name,
   location,
   asset_condition,
   acquisition_date
  )
  `)
  .order('date_requested', { ascending: false })

 if (error) {
  console.error('Error loading asset requests:', error)
  setIsLoading(false)
  return
 }

 const mapped: AssetRequest[] = (data || []).map((row: any) => {
  const origin = (row.government_office?.office_name as AssetRequest['origin']) || 'Cemetery Office'
  const statusMap: Record<string, AssetRequest['status']> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Approved',
  rejected: 'Rejected',
  }
  return {
  id: row.inventory_request_id,
  origin,
  item: row.inventory_scope || 'General request',
  status: statusMap[row.status] || 'Pending',
  date: row.date_requested || '',
  priority: (['Low', 'Medium', 'High'] as const).includes(row.cycle_type) ? row.cycle_type : 'Medium',
  }
 })

 setRequests(mapped)
 setIsLoading(false)
 }


 React.useEffect(() => {
 loadRequests()
 }, [])

 const filtered = useMemo(() => {
 const base = requests.filter((req) =>
  originFilter === 'All' ? true : req.origin === originFilter
 )

 if (!search.trim()) return base

 const query = search.trim().toLowerCase()
 return base.filter((req) =>
  req.id.toLowerCase().includes(query) ||
  req.item.toLowerCase().includes(query) ||
  req.origin.toLowerCase().includes(query)
 )
 }, [search, originFilter, requests])

 const stats = useMemo(() => {
 const counts = {
  Pending: 0,
  Approved: 0,
  Rejected: 0,
  'In Progress': 0,
 } as Record<AssetRequest['status'], number>
 filtered.forEach((req) => {
  counts[req.status] += 1
 })
 return counts
 }, [filtered])

 return (
 <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
  <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
  <div>
   <h1 className="font-display text-2xl font-bold text-foreground">Asset Requests</h1>
   <p className="text-muted-foreground text-sm mt-1">
   Review and manage asset & maintenance requests submitted by operational units.
   </p>
  </div>
  </div>

  <Card className="mb-6 shadow-sm border-border">
  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
   <div className="relative w-full sm:w-96">
   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
   <Input
    placeholder="Search by request, item, or unit..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="pl-10 h-10 w-full bg-background relative z-10"
   />
   </div>

   <div className="flex items-center gap-2 w-full sm:w-auto">
   <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setSearch('')}>
    <Filter size={16} /> Reset
   </Button>
   </div>
  </CardContent>
  </Card>

  <Card className="shadow-sm border-border overflow-hidden">
  <div className="overflow-x-auto">
   <table className="w-full text-left border-collapse">
   <thead>
    <tr className="border-b border-border bg-muted/50">
    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Request ID</th>
    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Unit</th>
    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Item / Service</th>
    <th className="p-4 text-xs font-semibold text-muted-foreground">Date</th>
    <th className="p-4 text-xs font-semibold text-muted-foreground">Status</th>
    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
    </tr>
   </thead>
   <tbody className="divide-y divide-border">
    {isLoading ? (
    <tr>
     <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
     Loading requests...
     </td>
    </tr>
    ) : filtered.length === 0 ? (
    <tr>
     <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
     No requests found.
     </td>
    </tr>
    ) : (
    filtered.map((req) => (
     <tr key={req.id} className="hover:bg-accent/50 transition-colors">
     <td className="p-4 font-semibold text-foreground">{req.id}</td>
     <td className="p-4 text-sm text-muted-foreground flex items-center gap-2">
      {req.origin === 'Cemetery Office' ? <Users size={16} /> : req.origin === 'Parks Admin' ? <TreePine size={16} /> : <Building2 size={16} />}
      {req.origin}
     </td>
     <td className="p-4 text-sm font-medium text-foreground">{req.item}</td>
     <td className="p-4 text-sm text-muted-foreground">{req.date}</td>
     <td className="p-4">
      <Badge
      variant={req.status === 'Pending' ? 'warning' : req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'destructive' : 'secondary'}
      className="text-[10px] uppercase"
      >
      {req.status}
      </Badge>
     </td>
     <td className="p-4 text-right">
      <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>
      <Eye size={16} className="mr-2" /> View
      </Button>
     </td>
     </tr>
    ))
    )}
   </tbody>
   </table>
  </div>
  </Card>

   {/* Asset Request Detail Modal */}
   <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
    <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
     {selectedRequest && (
      <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar border border-white/10 shadow-2xl">
       <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
        <div className="flex items-center gap-2 mb-2">
         <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background uppercase">REQ ID: {selectedRequest.id}</Badge>
         <Badge 
          variant={selectedRequest.status === 'Approved' ? 'success' : selectedRequest.status === 'Pending' ? 'warning' : selectedRequest.status === 'Rejected' ? 'destructive' : 'secondary'} 
          className="text-[10px] font-bold tracking-widest uppercase"
         >
          {selectedRequest.status}
         </Badge>
        </div>
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
         Asset Request Details
        </DialogTitle>
        <DialogDescription className="font-medium text-muted-foreground/80 mt-1 italic">
         Submitted on {selectedRequest.date}
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="grid grid-cols-2 gap-4 text-sm surface-box border border-border/20 p-5 rounded-xl shadow-sm bg-muted/5">
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Originating Unit</label>
          <div className="flex items-center gap-2 px-1">
           {selectedRequest.origin === 'Cemetery Office' ? <Users size={14} className="text-primary" /> : selectedRequest.origin === 'Parks Admin' ? <TreePine size={14} className="text-primary" /> : <Building2 size={14} className="text-primary" />}
           <p className="text-sm font-semibold text-foreground uppercase tracking-tight">{selectedRequest.origin}</p>
          </div>
         </div>
         <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Priority Level</label>
          <div className="flex items-center gap-2 px-1">
           <AlertCircle size={14} className={selectedRequest.priority === 'High' ? 'text-red-500' : selectedRequest.priority === 'Medium' ? 'text-amber-500' : 'text-slate-400'} />
           <p className="text-sm font-semibold text-foreground">{selectedRequest.priority}</p>
          </div>
         </div>
        </div>

        <div className="space-y-3 px-1">
         <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1 flex items-center gap-1.5">
           <Info size={12} /> Item / Service Description
          </label>
          <div className="bg-background border border-border/40 rounded-xl p-4 shadow-inner ring-1 ring-black/5">
           <p className="text-sm text-foreground leading-relaxed font-medium">
            {selectedRequest.item}
           </p>
          </div>
         </div>

         <div className="flex items-center gap-4 pt-2">
          <div className="flex-1 space-y-1">
           <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Requested Date</label>
           <div className="flex items-center gap-2 text-muted-foreground px-1">
            <Clock size={12} />
            <span className="text-xs font-medium uppercase tracking-tighter">{selectedRequest.date}</span>
           </div>
          </div>
         </div>
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button
         className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
         onClick={() => setSelectedRequest(null)}
        >
         Close Details
        </button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>

 </div>
 )
}
