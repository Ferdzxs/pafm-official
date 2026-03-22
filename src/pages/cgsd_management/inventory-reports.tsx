import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Download, FileText, Calendar, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function InventoryReportsPage() {
 const [searchTerm, setSearchTerm] = useState('')
 const [reports, setReports] = useState<any[]>([])
 const [isLoading, setIsLoading] = useState(true)

 useEffect(() => {
  fetchReports()
 }, [])

 const fetchReports = async () => {
  setIsLoading(true)
  const { data, error } = await supabase
   .from('inventory_report')
   .select(`
    *,
    government_office ( office_name ),
    inventory_request ( inventory_scope )
   `)
   .order('preparation_date', { ascending: false })

  if (error) {
   console.error('Error fetching reports:', error)
   toast.error('Failed to load inventory reports.')
  } else {
   setReports(data || [])
  }
  setIsLoading(false)
 }

 const filtered = reports.filter(r =>
  r.inventory_report_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
  r.inventory_request?.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase())
 )

 const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
   case 'approved': return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
   case 'pending': return <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
   case 'returned_for_revision': return <Badge variant="destructive" className="text-[10px] uppercase">Revision Needed</Badge>
   case 'draft': return <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>
   default: return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
  }
 }

 return (
  <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
   <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
    <div>
     <h1 className="font-display text-2xl font-bold text-foreground">Inventory Reports</h1>
     <p className="text-muted-foreground text-sm mt-1">
      View and download finalized and pending asset inventory reports.
     </p>
    </div>
    <div className="flex items-center gap-3">
     <Button variant="outline" className="gap-2">
      <Download size={16} /> Export All
     </Button>
    </div>
   </div>

   <Card className="mb-6 shadow-sm border-border">
    <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
     <div className="relative w-full sm:w-96">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
      <Input
       placeholder="Search by ID or details..."
       value={searchTerm}
       onChange={(e) => setSearchTerm(e.target.value)}
       className="pl-10 h-10 w-full bg-background relative z-10"
      />
     </div>
     <div className="flex gap-2 w-full sm:w-auto">
      <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
       <Filter size={16} /> Filter
      </Button>
     </div>
    </CardContent>
   </Card>

   <Card className="shadow-sm border-border overflow-hidden">
    <div className="overflow-x-auto">
     <div className="max-h-[60vh] overflow-y-auto">
      <table className="w-full text-left border-collapse">
      <thead>
       <tr className="border-b border-border bg-muted">
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report Details</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Prepared By</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Date</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Status</th>
        <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
       </tr>
      </thead>
      <tbody className="divide-y divide-border">
       {isLoading ? (
        <tr>
         <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
          Loading inventory reports...
         </td>
        </tr>
       ) : filtered.length === 0 ? (
        <tr>
         <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
          No reports found.
         </td>
        </tr>
       ) : filtered.map((item) => (
        <tr key={item.inventory_report_id} className="hover:bg-accent transition-colors">
         <td className="p-4">
          <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <FileText size={18} />
           </div>
           <div>
            <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.inventory_request?.inventory_scope || 'General Asset Inventory'}>
             {item.inventory_request?.inventory_scope || 'General Asset Inventory'}
            </div>
           </div>
          </div>
         </td>
         <td className="p-4">
          <div className="text-sm text-foreground font-medium">{item.government_office?.office_name || 'System Generated'}</div>
         </td>
         <td className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
           <Calendar size={14} className="shrink-0" />
           <span>{item.preparation_date || 'N/A'}</span>
          </div>
         </td>
         <td className="p-4">
          {getStatusBadge(item.approval_status)}
         </td>
         <td className="p-4 text-right">
          <Button variant="ghost" size="sm" onClick={() => {
           if (item.digital_report_url) {
            window.open(item.digital_report_url, '_blank')
           } else {
            toast.error('No digital report file attached.')
           }
          }}>
           <Eye size={16} className="mr-2" /> View File
          </Button>
         </td>
        </tr>
       ))}
      </tbody>
      </table>
     </div>
    </div>
   </Card>
  </div>
 )}
