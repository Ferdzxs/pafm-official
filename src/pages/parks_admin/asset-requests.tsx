/**
 * asset-requests.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState, useMemo } from 'react'
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Send, 
  RefreshCw,
  AlertCircle,
  MoreVertical,
  ChevronDown,
  X,
  FileText,
  Boxes,
  Info
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// ─── TYPES ───
type RequestRow = {
  id: string
  item: string
  status: string
  date: string
  priority: string
  notes: string
}

const OFFICE_NAME = 'Parks & Recreation Administration'

// ─── HELPERS ───
function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'High':
      return <Badge variant="destructive" className="font-bold">High</Badge>
    case 'Medium':
      return <Badge variant="warning">Medium</Badge>
    case 'Low':
      return <Badge variant="success">Low</Badge>
    default:
      return <Badge variant="secondary">{priority}</Badge>
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'Pending':
      return <Badge variant="warning" className="rounded-full px-3">{status}</Badge>
    case 'Approved':
      return <Badge variant="success" className="rounded-full px-3">{status}</Badge>
    case 'Rejected':
      return <Badge variant="destructive" className="rounded-full px-3">{status}</Badge>
    case 'In Progress':
      return <Badge variant="info" className="rounded-full px-3">{status}</Badge>
    default:
      return <Badge variant="secondary" className="rounded-full px-3">{status}</Badge>
  }
}

// ─── MAIN COMPONENT ───
export default function ParksAssetRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // New request form state
  const [formData, setFormData] = useState({
    item: '',
    priority: 'Medium',
    notes: ''
  })

  const load = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory_request')
        .select(`
          inventory_request_id,
          inventory_scope,
          status,
          date_requested,
          cycle_type,
          government_office!requesting_office ( office_name )
        `)
        .order('date_requested', { ascending: false })

      if (error) throw error

      const mapped: RequestRow[] = (data || [])
        .filter((r: any) => r.government_office?.office_name === OFFICE_NAME)
        .map((r: any) => ({
          id: r.inventory_request_id,
          item: r.inventory_scope || 'General request',
          status: (() => {
            const s = r.status?.toLowerCase()
            if (s === 'approved' || s === 'completed') return 'Approved'
            if (s === 'rejected') return 'Rejected'
            if (s === 'in_progress') return 'In Progress'
            return 'Pending'
          })(),
          date: r.date_requested || '',
          priority: ['Low', 'Medium', 'High'].includes(r.cycle_type) ? r.cycle_type : 'Medium',
          notes: '',
        }))

      setRequests(mapped)
    } catch (err: any) {
      toast.error('Failed to load asset requests.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return requests
    return requests.filter(r => r.id.toLowerCase().includes(q) || r.item.toLowerCase().includes(q))
  }, [requests, search])

  const stats = useMemo(() => ({
    Total: requests.length,
    Pending: requests.filter(r => r.status === 'Pending').length,
    Approved: requests.filter(r => r.status === 'Approved').length,
    Other: requests.filter(r => !['Pending', 'Approved'].includes(r.status)).length,
  }), [requests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.item.trim()) { toast.error('Please enter an item or service.'); return }
    setSubmitting(true)

    try {
      const { data: officeData, error: officeErr } = await supabase
        .from('government_office')
        .select('office_id')
        .eq('office_name', OFFICE_NAME)
        .maybeSingle()

      if (officeErr || !officeData) throw new Error('Could not find office record.')

      const today = new Date().toISOString().split('T')[0]
      const reqId = `REQ-PK-${Date.now()}`

      const { error } = await supabase.from('inventory_request').insert({
        inventory_request_id: reqId,
        requesting_office: officeData.office_id,
        inventory_scope: formData.item.trim(),
        status: 'pending',
        date_requested: today,
        cycle_type: formData.priority,
      })

      if (error) throw error
      
      toast.success('Resource request dispatched to FAMCD.')
      setShowModal(false)
      setFormData({ item: '', priority: 'Medium', notes: '' })
      await load()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="px-2 py-0.5" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
            {meta.label}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Asset Requests</h1>
          <p className="text-muted-foreground text-sm">Submit and track resource orders or maintenance requests with FAMCD.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Sync
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Request Asset
          </Button>
        </div>
      </header>

      {/* KPI STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Requests", value: stats.Total, icon: Boxes, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Awaiting Action", value: stats.Pending, icon: Clock, color: "text-amber-600", bg: "bg-amber-100" },
          { label: "Closed/Fulfilled", value: stats.Approved, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-100" },
          { label: "Non-Compliant", value: stats.Other, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
        ].map((stat, i) => (
          <Card key={i} className="border-border shadow-xs p-4 flex items-center gap-4">
             <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", stat.bg)}>
               <stat.icon className={cn("h-5 w-5", stat.color)} />
             </div>
             <div className="space-y-0.5">
               <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
               <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
             </div>
          </Card>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search request ID or item..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {(search) && (
          <Button variant="ghost" size="sm" onClick={() => setSearch('')}>
            <X className="mr-2 h-4 w-4" /> Clear
          </Button>
        )}
        <div className="md:ml-auto text-xs text-muted-foreground italic">
          Synchronized with General Services & Assets (FAMCD)
        </div>
      </div>

      {/* REQUESTS TABLE */}
      <Card className="border-border shadow-xs overflow-hidden">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[140px]">Request Ref</TableHead>
              <th className="px-4 py-3 text-left font-semibold text-xs text-muted-foreground">Asset / Service Scope</th>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead className="w-[120px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center animate-pulse text-muted-foreground">
                  Accessing municipal asset registry...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                    <p>No asset requests currently on file.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => (
                <TableRow key={req.id} className="group hover:bg-muted transition-colors cursor-default">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse hidden md:block" />
                      <span className="font-mono text-[10px] text-muted-foreground font-bold">#{req.id.slice(-8)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-semibold text-sm text-foreground truncate max-w-[300px]">{req.item}</p>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{req.date}</span>
                  </TableCell>
                  <TableCell>
                    {getPriorityBadge(req.priority)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(req.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* NEW REQUEST DIALOG */}
      <Dialog open={showModal} onOpenChange={(open) => !open && setShowModal(false)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
            <DialogHeader className="mb-6 space-y-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="uppercase font-bold tracking-widest px-3 border-border">
                  NEW REQUEST
                </Badge>
              </div>
              <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                Disbursement Request
              </DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                Submit maintenance or equipment needs to FAMCD.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="surface-box border border-border/20 p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="req-item" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Requested Item or Service *</Label>
                  <Input 
                    id="req-item" 
                    className="h-11 bg-background text-sm"
                    placeholder="e.g., Replacement LED bulbs for Hall A, 10 Benches" 
                    value={formData.item}
                    onChange={(e) => setFormData(p => ({ ...p, item: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="req-priority" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Urgency Level</Label>
                  <select
                    id="req-priority"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.priority}
                    onChange={(e) => setFormData(p => ({ ...p, priority: e.target.value }))}
                  >
                    <option value="Low">Low — non-urgent maintenance</option>
                    <option value="Medium">Medium — general requirement</option>
                    <option value="High">High — safety or operational risk</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="req-notes" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Justification / Remarks (FAMCD Review)</Label>
                  <Textarea 
                    id="req-notes" 
                    className="bg-background resize-none min-h-[100px] text-sm"
                    placeholder="Please describe why this asset is required..." 
                    value={formData.notes}
                    onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <Button type="button" variant="outline" className="h-11 rounded-xl px-8 w-full sm:w-auto border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="h-11 rounded-xl bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none text-[11px] font-extrabold shadow-lg shadow-blue-500/20 uppercase tracking-widest" disabled={submitting}>
                  {submitting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Dispatch Request
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* FOOTER CALLOUT */}
      <footer className="rounded-xl border border-blue-500 bg-blue-50 p-4 flex gap-4 items-center">
        <Info className="h-5 w-5 text-blue-500 shrink-0" />
        <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
          These requests are routed to the <strong className="text-blue-900 dark:text-blue-300">Financial, Assets, and Maintenance Control Department (FAMCD)</strong>. Approval depends on budget availability and regional asset allocation.
        </p>
      </footer>
    </div>
  )
}