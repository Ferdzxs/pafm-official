import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Download, Plus, Eye, MapPin, Building2, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

export default function InventoryAssetsPage() {
 const [searchTerm, setSearchTerm] = useState('')
 const [properties, setProperties] = useState<any[]>([])
 const [selectedProperty, setSelectedProperty] = useState<any | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [isSaving, setIsSaving] = useState(false)

 const [editValues, setEditValues] = useState({
  property_name: '',
  location: '',
  asset_condition: '',
  area_size: '',
 })

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

 const openPropertyModal = (property: any) => {
  setSelectedProperty(property)
  setEditValues({
   property_name: property.property_name || '',
   location: property.location || '',
   asset_condition: property.asset_condition || '',
   area_size: property.area_size || '',
  })
 }

 const saveProperty = async () => {
  if (!selectedProperty) return

  setIsSaving(true)
  const { error } = await supabase
   .from('property')
   .update({
    property_name: editValues.property_name,
    location: editValues.location,
    asset_condition: editValues.asset_condition,
    area_size: editValues.area_size,
   })
   .eq('property_id', selectedProperty.property_id)

  setIsSaving(false)

  if (error) {
   console.error('Error saving property:', error)
   toast.error(`Failed to save asset changes: ${error.message ?? error}`)
   return
  }

  toast.success('Asset details updated.')
  setSelectedProperty(null)
  fetchProperties()
 }

 const filtered = properties.filter(p =>
  p.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  p.location?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 const getTypeColor = (type: string) => {
  switch (type?.toLowerCase()) {
   case 'land': return 'bg-emerald-50 text-emerald-600'
   case 'building': return 'bg-blue-50 text-blue-600'
   case 'facility': return 'bg-purple-50 text-purple-600'
   default: return 'bg-gray-50 text-gray-600'
  }
 }

 const getConditionBadge = (condition: string) => {
  switch (condition?.toLowerCase()) {
   case 'excellent': return <Badge variant="success" className="text-[10px] uppercase">Excellent</Badge>
   case 'good': return <Badge variant="success" className="text-[10px] uppercase">Good</Badge>
   case 'fair': return <Badge variant="warning" className="text-[10px] uppercase">Fair</Badge>
   case 'poor': return <Badge variant="destructive" className="text-[10px] uppercase">Poor</Badge>
   default: return <Badge variant="secondary" className="text-[10px] uppercase">{condition || 'Unknown'}</Badge>
  }
 }

 return (
  <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
   <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
    <div>
     <h1 className="font-display text-2xl font-bold text-foreground">Inventory & Assets</h1>
     <p className="text-muted-foreground text-sm mt-1">
      Master registry of all city-owned land, buildings, and facilities.
     </p>
    </div>
   </div>

   <Card className="mb-6 shadow-sm border-border">
    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
     <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
       placeholder="Search by name or location..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-10 h-10 w-full bg-background"
      />
     </div>
     <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchProperties}>
      <Filter size={16} /> Refresh
     </Button>
    </CardContent>
   </Card>

   <Card className="shadow-sm border-border overflow-hidden bg-card">
    <div className="overflow-x-auto">
     <div className="max-h-[60vh] overflow-y-auto">
      <table className="w-full text-left border-collapse bg-card">
       <thead>
        <tr className="border-b border-border bg-muted">
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Asset</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Type</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Condition</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Office</th>
         <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-border">
        {isLoading ? (
         <tr>
          <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
           Loading asset registry...
          </td>
         </tr>
        ) : filtered.length === 0 ? (
         <tr>
          <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
           No assets found matching your search.
          </td>
         </tr>
        ) : filtered.map((property) => (
         <tr key={property.property_id} className="hover:bg-accent transition-colors">
          <td className="p-4">
           <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 shrink-0">
             <Layers size={18} />
            </div>
            <div>
             <div className="font-semibold text-sm text-foreground" title={property.property_name}>{property.property_name}</div>
             <div className="text-xs text-muted-foreground truncate max-w-[220px]" title={property.location}>{property.location}</div>
            </div>
           </div>
          </td>
          <td className="p-4 text-sm text-foreground capitalize">{property.property_type}</td>
          <td className="p-4">{getConditionBadge(property.asset_condition)}</td>
          <td className="p-4 text-sm text-muted-foreground" title={property.government_office?.office_name}>{property.government_office?.office_name || 'Unassigned'}</td>
          <td className="p-4 text-right">
           <Button variant="ghost" size="sm" onClick={() => openPropertyModal(property)}>
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
         Update asset registry information.
        </DialogDescription>
       </DialogHeader>

       <div className="space-y-6 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
        <div className="grid grid-cols-1 gap-5">
         <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Asset Name</label>
          <Input
           value={editValues.property_name}
           onChange={(e) => setEditValues({ ...editValues, property_name: e.target.value })}
           className="h-11 rounded-xl bg-background border-border"
          />
         </div>
         <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Location</label>
          <div className="relative">
           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
           <Input
            value={editValues.location}
            onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
            className="h-11 rounded-xl bg-background border-border pl-10"
           />
          </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Condition</label>
           <select
            value={editValues.asset_condition}
            onChange={(e) => setEditValues({ ...editValues, asset_condition: e.target.value })}
            className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-ring focus:outline-none transition-all"
           >
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Poor">Poor</option>
            <option value="Condemned / Beyond Repair">Condemned / Beyond Repair</option>
           </select>
          </div>
          <div className="space-y-2">
           <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Area (sq.m)</label>
           <Input
            value={editValues.area_size}
            onChange={(e) => setEditValues({ ...editValues, area_size: e.target.value })}
            className="h-11 rounded-xl bg-background border-border"
           />
          </div>
         </div>
        </div>
       </div>

       <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
        <button onClick={() => setSelectedProperty(null)} className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all">Close</button>
        <button
         onClick={saveProperty}
         disabled={isSaving}
         className="h-11 rounded-xl w-full sm:w-auto px-8 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg gap-2 disabled:opacity-50 flex items-center justify-center transition-all bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-primary/20"
        >
         {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
       </div>
      </div>
     )}
    </DialogContent>
   </Dialog>
  </div>
 )
}