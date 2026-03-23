import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Eye, Layers, XCircle, MapPin, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { AdminDeskPageShell } from '@/components/layout/AdminDeskPageShell'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function FamcdInventoryAssets() {
 const { user } = useAuth()
 const [searchTerm, setSearchTerm] = useState('')
 const [properties, setProperties] = useState<any[]>([])
 const [selectedProperty, setSelectedProperty] = useState<any | null>(null)
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
 fetchProperties()
 }, [])

 const fetchProperties = async () => {
 setIsLoading(true)
 const { data, error } = await supabase
  .from('property')
  .select(`
    property_id,
    property_name,
    property_type,
    location,
    asset_condition,
    acquisition_date,
    area_size,
    government_office!managing_office (
     office_name
    )
   `)
  .order('property_name', { ascending: true })

 if (error) {
  console.error('Error fetching properties:', error)
  toast.error('Failed to load assets.')
 } else {
  setProperties(data || [])
 }
 setIsLoading(false)
 }

 const filtered = useMemo(() =>
 properties.filter(p =>
  p.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  p.location?.toLowerCase().includes(searchTerm.toLowerCase())
 ), [properties, searchTerm])

 const getConditionBadge = (condition: string) => {
 switch (condition?.toLowerCase()) {
  case 'excellent': return <Badge variant="success" className="text-[10px] uppercase">Excellent</Badge>
  case 'good': return <Badge variant="success" className="text-[10px] uppercase">Good</Badge>
  case 'fair': return <Badge variant="warning" className="text-[10px] uppercase">Fair</Badge>
  case 'poor': return <Badge variant="destructive" className="text-[10px] uppercase">Poor</Badge>
  default: return <Badge variant="secondary" className="text-[10px] uppercase">{condition || 'Unknown'}</Badge>
 }
 }

 if (!user) return null
 const meta = ROLE_META[user.role]

 return (
 <AdminDeskPageShell
  roleLabel={meta.label}
  roleColor={meta.color}
  roleBgColor={meta.bgColor}
  title="Inventory & assets"
  description="Read-only reference of city-owned properties. Condition updates flow through your inspection reports."
  wide
 >
  <Card className="mb-6 shadow-sm border-border">
  <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
   <div className="relative w-full sm:w-96">
   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
   <Input
    placeholder="Search by name or location..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
    className="pl-10 h-10 w-full bg-background"
   />
   </div>
   <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchProperties}>
   <Filter size={16} /> Refresh
   </Button>
  </CardContent>
  </Card>

  {/* Table */}
  <Card className="shadow-sm border-border overflow-hidden bg-card">
  <div className="overflow-x-auto">
   <div className="max-h-[60vh] overflow-y-auto">
   <table className="w-full text-left border-collapse">
    <thead>
    <tr className="border-b border-border bg-muted/50">
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Asset</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Type</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Condition</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Managing Office</th>
     <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Details</th>
    </tr>
    </thead>
    <tbody className="divide-y divide-border">
    {isLoading ? (
     <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">Loading asset registry...</td></tr>
    ) : filtered.length === 0 ? (
     <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No assets found.</td></tr>
    ) : filtered.map(property => (
     <tr key={property.property_id} className="hover:bg-accent/50 transition-colors">
     <td className="p-4">
      <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600 shrink-0">
       <Layers size={18} />
      </div>
      <div>
       <div className="font-semibold text-sm text-foreground">{property.property_name}</div>
       <div className="text-xs text-muted-foreground truncate max-w-[200px]">{property.location || '—'}</div>
      </div>
      </div>
     </td>
     <td className="p-4 text-sm text-foreground capitalize">{property.property_type || '—'}</td>
     <td className="p-4">{getConditionBadge(property.asset_condition)}</td>
     <td className="p-4 text-sm text-muted-foreground">
      {(property as any).government_office?.office_name || 'Unassigned'}
     </td>
     <td className="p-4 text-right">
      <Button variant="ghost" size="sm" onClick={() => setSelectedProperty(property)}>
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

  {/* Read-Only Detail Modal */}
  <Dialog open={!!selectedProperty} onOpenChange={(open) => !open && setSelectedProperty(null)}>
   <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selectedProperty && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="text-[10px] font-bold tracking-widest border-border bg-background">ID: {selectedProperty.property_id}</Badge>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border bg-slate-100 text-slate-600 border-slate-200">
         {selectedProperty.property_type || 'Asset'}
        </span>
       </div>
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        <Layers className="text-slate-500 h-6 w-6" /> Asset Details
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Read-only information about this property.
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       {/* Read-only fields */}
       <div className="grid grid-cols-1 gap-4">
        <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Asset Name</div>
         <div className="text-sm font-bold text-foreground">{selectedProperty.property_name}</div>
        </div>
        <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5"><MapPin size={12} /> Location</div>
         <div className="text-sm font-semibold text-foreground">{selectedProperty.location || '—'}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
         <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Type</div>
          <div className="text-sm capitalize font-semibold text-foreground">{selectedProperty.property_type || '—'}</div>
         </div>
         <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Condition</div>
          <div className="mt-0.5">{getConditionBadge(selectedProperty.asset_condition)}</div>
         </div>
         <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Area (sq.m)</div>
          <div className="text-sm font-semibold text-foreground">{selectedProperty.area_size || '—'}</div>
         </div>
         <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 flex items-center gap-1.5"><Calendar size={12} /> Acquired</div>
          <div className="text-sm font-semibold text-foreground">{selectedProperty.acquisition_date || '—'}</div>
         </div>
        </div>
        <div className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Managing Office</div>
         <div className="text-sm font-semibold text-foreground">{(selectedProperty as any).government_office?.office_name || 'Unassigned'}</div>
        </div>
       </div>

       {/* Info note */}
       <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 text-[11px] font-medium text-blue-600/90 leading-relaxed shadow-sm">
        To update the condition of this asset, submit an Ocular Inspection report. Conditions are updated automatically upon CGSD approval.
       </div>
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex justify-end shrink-0">
       <button onClick={() => setSelectedProperty(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm">Close</button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </AdminDeskPageShell>
 )
}