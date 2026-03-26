import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

type RequestLogRow = {
  inventory_request_id: string
  inventory_scope: string
  status: string
  date_requested: string | null
  cycle_type: string | null
  requesting_office?: {
    office_name?: string
  }
}

const DESTINATIONS = [
  { label: 'Commission on Audit (COA)', value: 'coa' },
  { label: 'City Accounting Office', value: 'city_accounting' },
  { label: 'Office of the City Mayor', value: 'city_mayor' },
]

export default function Submissions() {
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [requestLogs, setRequestLogs] = useState<RequestLogRow[]>([])

  useEffect(() => {
    reload()
  }, [])

  const reload = async () => {
    setIsLoading(true)

    // Get only asset requests from these source offices
    const sourceOfficeNames = ['Cemetery Office', 'Barangay Secretariat', 'Parks & Recreation Administration']

    const { data: officeData, error: officeError } = await supabase
      .from('government_office')
      .select('office_id')
      .in('office_name', sourceOfficeNames)

    if (officeError) {
      console.error('Error fetching source office ids:', officeError)
      toast.error('Failed to load request logs.')
      setIsLoading(false)
      return
    }

    const officeIds = (officeData || []).map((o: any) => o.office_id)

    const { data: requestData, error } = await supabase
      .from('inventory_request')
      .select(`
        inventory_request_id,
        inventory_scope,
        status,
        date_requested,
        cycle_type,
        requesting_office ( office_name )
      `)
      .in('requesting_office', officeIds)
      .order('date_requested', { ascending: false })

    if (error) {
      console.error('Error fetching request logs:', error)
      toast.error('Failed to load request logs.')
      setIsLoading(false)
      return
    }

    const mappedLogs: RequestLogRow[] = (requestData || []).map((r: any) => ({
      inventory_request_id: r.inventory_request_id,
      inventory_scope: r.inventory_scope || 'General Request',
      status: r.status || 'pending',
      date_requested: r.date_requested,
      cycle_type: r.cycle_type,
      requesting_office: r.requesting_office,
    }))

    setRequestLogs(mappedLogs)
    setIsLoading(false)
  }

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return requestLogs

    const q = searchTerm.trim().toLowerCase()
    return requestLogs.filter((r) =>
      r.inventory_request_id?.toLowerCase().includes(q) ||
      r.inventory_scope?.toLowerCase().includes(q) ||
      r.requesting_office?.office_name?.toLowerCase().includes(q)
    )
  }, [requestLogs, searchTerm])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
      case 'in_progress':
      case 'pending':
        return <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
      case 'completed':
        return <Badge variant="success" className="text-[10px] uppercase">Completed</Badge>
      case 'rejected':
        return <Badge variant="destructive" className="text-[10px] uppercase">Rejected</Badge>
      default:
        return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
    }
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Asset Request Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Showing asset requests submitted by Punong Barangay, Cemetery Office, and Parks Administration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2" onClick={reload}>
            <Filter size={16} /> Refresh
          </Button>
        </div>
      </div>

      <Card className="mb-6 shadow-sm border-border">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Search by report ID or scope..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 w-full bg-background relative z-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border-border overflow-hidden">
        <div className="overflow-x-auto">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Request ID</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Requesting Office</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Scope / Item</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Date Requested</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                      Loading request logs...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                      No request logs found.
                    </td>
                  </tr>
                ) : filtered.map((item) => (
                  <tr key={item.inventory_request_id} className="hover:bg-accent/50 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-sm text-foreground">{item.inventory_request_id}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground font-medium">{item.requesting_office?.office_name || 'Unknown'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-foreground">{item.inventory_scope}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-muted-foreground">{item.date_requested || 'N/A'}</div>
                    </td>
                    <td className="p-4">{getStatusBadge(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  )
}