import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckSquare, X, Calendar, ClipboardCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function CgsdOcularInspectionsPage() {
 const { user } = useAuth()
 const [searchTerm, setSearchTerm] = useState('')
 const [selectedItem, setSelectedItem] = useState<any | null>(null)
 const [inspections, setInspections] = useState<any[]>([])
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
  fetchInspections()
 }, [])

 const fetchInspections = async () => {
  setIsLoading(true)
  // Fetch inventory requests that are related to physical inspections (pending or completed)
  const { data, error } = await supabase
   .from('inventory_request')
   .select(`
    inventory_request_id,
    inventory_scope,
    status,
    date_requested,
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
   console.error('Error fetching inspections:', error)
   toast.error('Failed to load inspections queue.')
  } else {
   // we filter only requests that are meant for physical inspection / ocular
   // if we want to show all, we can just set data.
   setInspections(data || [])
  }
  setIsLoading(false)
 }

 const filtered = inspections.filter(a =>
  a.inventory_request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  a.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  a.property?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 if (selectedItem) {
  return (
   <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
     <div className="flex items-center justify-between mb-6">
     <div>
      <div className="flex items-center gap-3">
       <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="h-8 px-2 text-muted-foreground mr-2">
        <X size={16} className="mr-1" /> Back
       </Button>
       <h1 className="font-display text-2xl font-bold text-foreground">Inspection Details</h1>
      </div>
      <p className="text-muted-foreground text-sm mt-1 ml-16">
       {selectedItem.inventory_request_id} — {selectedItem.inventory_scope}
      </p>
     </div>
    </div>

    <div className="grid grid-cols-1 gap-6">
     
     {/* Current Registry Data (Read-only) */}
     <Card className="shadow-sm border-border bg-muted">
      <CardHeader className="pb-4 border-b border-border bg-background">
       <CardTitle className="text-lg flex items-center gap-2">
        <Search className="text-muted-foreground" size={18} />
        Target Property Details
       </CardTitle>
       <CardDescription>Property targeted for ocular inspection.</CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
       <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property / Item Name</label>
        <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm font-medium">
         {selectedItem.property?.property_name || 'N/A: General Assesment'}
        </div>
       </div>
       <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Location</label>
        <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm">
         {selectedItem.property?.location || '-'}
        </div>
       </div>
       <div className="grid grid-cols-2 gap-4">
        <div>
         <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
         <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm capitalize flex space-x-2 items-center">
          <Badge variant={selectedItem.status === 'pending' ? 'warning' : 'success'}>
           {selectedItem.status === 'pending' ? 'Pending FAMCD Inspection' : 'Completed'}
          </Badge>
         </div>
        </div>
        <div>
         <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requested On</label>
         <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm">
          {selectedItem.date_requested || 'Unknown'}
         </div>
        </div>
       </div>
       {selectedItem.status === 'pending' && (
        <div className="mt-4 p-4 border border-dashed border-primary rounded-lg bg-primary/30 text-center">
         <Calendar size={24} className="mx-auto text-primary mb-2 opacity-80" />
         <p className="text-sm font-medium text-primary">Awaiting Physical Inspection by FAMCD</p>
         <p className="text-xs text-muted-foreground mt-1">Once completed, the inspection report will appear here.</p>
        </div>
       )}
      </CardContent>
     </Card>
    </div>
   </div>
  )
 }

 return (
  <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
   <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
    <div>
     <h1 className="font-display text-2xl font-bold text-foreground">Ocular Inspections Tracker</h1>
     <p className="text-muted-foreground text-sm mt-1">
      Monitor schedules and results of ocular inspections conducted by FAMCD.
     </p>
    </div>
   </div>

   <Card className="mb-6 shadow-sm border-border">
    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
     <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
       placeholder="Search by Request ID or Scope..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-10 h-10 w-full bg-background relative z-10"
      />
     </div>
     <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchInspections}>
      <Filter size={16} />
      Refresh
     </Button>
    </CardContent>
   </Card>

   <Card className="shadow-sm border-border overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full text-left border-collapse">
      <thead>
       <tr className="border-b border-border bg-muted">
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Request ID / Scope</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Target Property</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Status</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
       </tr>
      </thead>
       <tbody className="divide-y divide-border">
        {isLoading ? (
         <tr>
          <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
           Loading inspections tracker...
          </td>
         </tr>
        ) : filtered.length === 0 ? (
         <tr>
          <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
           No inspections tracked.
          </td>
         </tr>
        ) : filtered.map((item) => (
         <tr key={item.inventory_request_id} className="hover:bg-muted transition-colors">
         <td className="p-4">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            {item.status === 'completed' ? <ClipboardCheck size={18} /> : <Search size={18} />}
           </div>
           <div>
            <div className="font-semibold text-sm text-foreground">{item.inventory_request_id}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.inventory_scope}>
             {item.inventory_scope}
            </div>
           </div>
          </div>
         </td>
         <td className="p-4">
          <div className="text-sm text-foreground font-medium">{item.property?.property_name || 'N/A'}</div>
          <div className="text-xs text-muted-foreground">{item.property?.location || '-'}</div>
         </td>
         <td className="p-4">
          <Badge variant={item.status === 'completed' ? 'success' : 'warning'} className="text-[10px] uppercase">
           {item.status === 'completed' ? 'Completed' : 'Pending'}
          </Badge>
         </td>
         <td className="p-4 text-right">
          <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
           <Eye size={16} className="mr-2" /> View Details
          </Button>
         </td>
        </tr>
       ))}
      </tbody>
     </table>
    </div>
   </Card>
  </div>
 )
}