import React, { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import { Search, Filter, XCircle, Users, Building2, TreePine, Eye, CheckCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

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
  const [statusFilter, setStatusFilter] = useState<'All' | AssetRequest['status']>('Pending')
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
        status,
        inventory_scope,
        date_requested,
        cycle_type,
        government_office (
          office_name
        ),
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
        approved: 'Approved',
        in_progress: 'In Progress',
        completed: 'Approved',
        rejected: 'Rejected',
      }
      return {
        id: row.inventory_request_id,
        origin,
        item: row.inventory_scope || 'General request',
        status: statusMap[row.status?.toLowerCase()] || 'Pending',
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const toastId = toast.loading(`Updating status...`)
    const { error, data } = await supabase
      .from('inventory_request')
      .update({ status: newStatus })
      .eq('inventory_request_id', id)
      .select()

    if (error || !data || data.length === 0) {
      console.error(error)
      toast.error('Failed to update request status. Check database constraints.', { id: toastId })
    } else {
      toast.success(`Request marked as ${newStatus}`, { id: toastId })
      setSelectedRequest(null)
      loadRequests()
    }
  }

  const filtered = useMemo(() => {
    const base = requests.filter((req) =>
      (originFilter === 'All' ? true : req.origin === originFilter) &&
      (statusFilter === 'All' ? true : req.status?.toLowerCase() === statusFilter.toLowerCase())
    )

    if (!search.trim()) return base

    const query = search.trim().toLowerCase()
    return base.filter((req) =>
      req.id.toLowerCase().includes(query) ||
      req.item.toLowerCase().includes(query) ||
      req.origin.toLowerCase().includes(query)
    )
  }, [search, originFilter, statusFilter, requests])

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
              className="pl-9 h-10 w-full bg-background relative z-10"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending Only</option>
              <option value="Approved">Approved Only</option>
              <option value="Rejected">Rejected Only</option>
              <option value="In Progress">In Progress</option>
            </select>
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => { setSearch(''); setOriginFilter('All'); setStatusFilter('Pending'); }}>
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

      {selectedRequest && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <Card className="w-full max-w-lg shadow-xl relative z-[101] bg-card">
            <CardContent className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Request Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedRequest.id}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedRequest(null)}>
                  <XCircle size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Unit</div>
                  <div className="font-medium">{selectedRequest.origin}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Priority</div>
                  <div className="font-medium">{selectedRequest.priority}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-muted-foreground text-xs mb-1">Item / Service</div>
                  <div className="font-medium">{selectedRequest.item}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Requested On</div>
                  <div className="font-medium">{selectedRequest.date}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs mb-1">Status</div>
                  <Badge
                    variant={selectedRequest.status === 'Pending' ? 'warning' : selectedRequest.status === 'Approved' ? 'success' : selectedRequest.status === 'Rejected' ? 'destructive' : 'secondary'}
                    className="text-[10px] uppercase"
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
              </div>

              {selectedRequest.status === 'Pending' && (
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive" onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')}>
                    <XCircle size={16} className="mr-2" /> Reject
                  </Button>
                  <Button className="bg-success text-white hover:bg-success/90" onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')}>
                    <CheckCircle size={16} className="mr-2" /> Approve
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  )
}
