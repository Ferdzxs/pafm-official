import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectItem } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, Filter, Camera, CheckSquare, UploadCloud, X, Calendar, MapPin, User, FileText, Eye, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

interface InspectionRequest {
  inventory_request_id: string
  requesting_office: string
  inventory_scope: string
  date_requested: string
  status: string
  property?: {
    property_name: string
    location: string
    asset_condition: string
  }[]
  government_office?: {
    office_name: string
  }[]
}

interface InspectionRecord {
  inspection_id: string
  inspection_date: string
  physical_condition_notes: string
  new_condition: string
  usage_verified: boolean
  boundary_verified: boolean
  conducted_by_employee: string
  conducted_by_office: string
  inventory_request?: {
    inventory_request_id: string
    requesting_office: string
    inventory_scope: string
    date_requested: string
    status: string
    government_office?: {
      office_name: string
    }[]
  }[]
  property?: {
    property_name: string
    location: string
    asset_condition: string
  }[]
}

const CONDITION_OPTIONS = [
  { value: 'excellent', label: 'Excellent', color: '#10b981' },
  { value: 'good', label: 'Good', color: '#3b82f6' },
  { value: 'fair', label: 'Fair', color: '#f59e0b' },
  { value: 'poor', label: 'Poor', color: '#ef4444' },
  { value: 'critical', label: 'Critical', color: '#7c2d12' }
]

export default function InspectionsPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [inspections, setInspections] = useState<InspectionRecord[]>([])
  const [pendingRequests, setPendingRequests] = useState<InspectionRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<InspectionRequest | null>(null)
  const [isConductingInspection, setIsConductingInspection] = useState(false)

  // Inspection form state
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0])
  const [physicalConditionNotes, setPhysicalConditionNotes] = useState('')
  const [newCondition, setNewCondition] = useState('good')
  const [usageVerified, setUsageVerified] = useState(false)
  const [boundaryVerified, setBoundaryVerified] = useState(false)
  const [recommendation, setRecommendation] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([fetchPendingRequests(), fetchCompletedInspections()])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load inspection data')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPendingRequests = async () => {
    const { data, error } = await supabase
      .from('inventory_request')
      .select(`
        inventory_request_id,
        requesting_office,
        inventory_scope,
        date_requested,
        status,
        property (
          property_name,
          location,
          asset_condition
        ),
        government_office (
          office_name
        )
      `)
      .in('status', ['pending', 'in_progress'])
      .order('date_requested', { ascending: false })

    if (error) {
      console.error('Error fetching pending requests:', error)
    } else {
      setPendingRequests(data || [])
    }
  }

  const fetchCompletedInspections = async () => {
    const { data, error } = await supabase
      .from('ocular_inspection')
      .select(`
        inspection_id,
        inspection_date,
        physical_condition_notes,
        new_condition,
        usage_verified,
        boundary_verified,
        conducted_by_employee,
        conducted_by_office,
        inventory_request (
          inventory_request_id,
          requesting_office,
          inventory_scope,
          date_requested,
          status,
          government_office (
            office_name
          )
        ),
        property (
          property_name,
          location,
          asset_condition
        )
      `)
      .order('inspection_date', { ascending: false })

    if (error) {
      console.error('Error fetching inspections:', error)
    } else {
      setInspections(data || [])
    }
  }

  const handleStartInspection = (request: InspectionRequest) => {
    setSelectedRequest(request)
    setIsConductingInspection(true)
    // Reset form
    setInspectionDate(new Date().toISOString().split('T')[0])
    setPhysicalConditionNotes('')
    setNewCondition('good')
    setUsageVerified(false)
    setBoundaryVerified(false)
    setRecommendation('')
  }

  const handleSubmitInspection = async () => {
    if (!selectedRequest || !user) return

    try {
      const inspectionData = {
        inspection_id: `INS-${Date.now()}`,
        property_id: selectedRequest.property?.[0]?.property_name ? null : null, // We'll need to get this from the request
        inventory_request_id: selectedRequest.inventory_request_id,
        inspection_date: inspectionDate,
        conducted_by_office: user.office || '',
        physical_condition_notes: physicalConditionNotes,
        new_condition: newCondition,
        usage_verified: usageVerified,
        boundary_verified: boundaryVerified,
        conducted_by_employee: user.employee_id || user.id
      }

      const { error: inspectionError } = await supabase
        .from('ocular_inspection')
        .insert([inspectionData])

      if (inspectionError) throw inspectionError

      // Create inventory report for CGSD approval
      const reportId = `IRP-${Date.now()}`
      const { error: reportError } = await supabase
        .from('inventory_report')
        .insert([{
          inventory_report_id: reportId,
          inventory_request_id: selectedRequest.inventory_request_id,
          preparation_date: inspectionDate,
          prepared_by_office: user.office || '',
          prepared_by_employee: user.employee_id || user.id,
          approval_status: 'pending' // pending CGSD approval
        }])

      if (reportError) throw reportError

      // Update the inventory request status
      const { error: updateError } = await supabase
        .from('inventory_request')
        .update({ status: 'completed' })
        .eq('inventory_request_id', selectedRequest.inventory_request_id)

      if (updateError) throw updateError

      toast.success('Inspection completed successfully!')
      setIsConductingInspection(false)
      setSelectedRequest(null)
      fetchData()
    } catch (error) {
      console.error('Error submitting inspection:', error)
      toast.error('Failed to submit inspection')
    }
  }

  const filteredPendingRequests = pendingRequests.filter(request => {
    const matchesSearch = searchTerm === '' ||
      request.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.property?.[0]?.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.government_office?.[0]?.office_name?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch = searchTerm === '' ||
      inspection.inventory_request?.[0]?.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.property?.[0]?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || inspection.inventory_request?.[0]?.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (isLoading) {
    return (
      <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading inspections...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">Asset Inspections</h1>
        <p className="text-muted-foreground">Schedule and conduct ocular inspections for inventory requests</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9"
            placeholder="Search by property, office, or scope..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="inspected">Inspected</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </Select>
      </div>

      {/* Pending Requests Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock size={20} />
            Pending Inspection Requests
          </CardTitle>
          <CardDescription>
            Inventory requests awaiting ocular inspection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPendingRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No pending inspection requests
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPendingRequests.map((request) => (
                <div key={request.inventory_request_id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{request.inventory_request_id}</Badge>
                        <Badge variant="outline">{request.inventory_scope}</Badge>
                      </div>
                      <h3 className="font-medium text-foreground mb-1">
                        {request.property?.[0]?.property_name || 'Property Inventory Request'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {request.property?.[0]?.location || 'Location not specified'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={14} />
                          {request.government_office?.[0]?.office_name || request.requesting_office}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(request.date_requested).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleStartInspection(request)}
                      className="shrink-0"
                    >
                      <Eye size={14} className="mr-2" />
                      Start Inspection
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Inspections Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare size={20} />
            Completed Inspections
          </CardTitle>
          <CardDescription>
            Historical inspection records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredInspections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No inspection records found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInspections.map((inspection) => (
                <div key={inspection.inspection_id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{inspection.inspection_id}</Badge>
                        <Badge
                          style={{
                            backgroundColor: CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.color + '20',
                            color: CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.color,
                            border: `1px solid ${CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.color}40`
                          }}
                        >
                          {CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.label || inspection.new_condition}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-foreground mb-1">
                        {inspection.property?.[0]?.property_name || 'Property Inspection'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText size={14} />
                          {inspection.inventory_request?.[0]?.inventory_scope}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className={`flex items-center gap-1 ${inspection.usage_verified ? 'text-green-600' : 'text-red-600'}`}>
                          <CheckSquare size={14} />
                          Usage {inspection.usage_verified ? 'Verified' : 'Not Verified'}
                        </span>
                        <span className={`flex items-center gap-1 ${inspection.boundary_verified ? 'text-green-600' : 'text-red-600'}`}>
                          <CheckSquare size={14} />
                          Boundary {inspection.boundary_verified ? 'Verified' : 'Not Verified'}
                        </span>
                      </div>
                      {inspection.physical_condition_notes && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {inspection.physical_condition_notes}
                        </p>
                      )}
                    </div>
                    <Dialog open={selectedInspection?.inspection_id === inspection.inspection_id} onOpenChange={(open) => setSelectedInspection(open ? inspection : null)}>
                      <Button variant="outline" size="sm" onClick={() => setSelectedInspection(inspection)}>
                        <Eye size={14} className="mr-2" />
                        View Details
                      </Button>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Inspection Details - {inspection.inspection_id}</DialogTitle>
                          <DialogDescription>
                            Complete inspection record for {inspection.property?.[0]?.property_name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Inspection Date</label>
                              <p className="text-sm text-muted-foreground">
                                {new Date(inspection.inspection_date).toLocaleDateString()}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Condition Assessment</label>
                              <Badge
                                style={{
                                  backgroundColor: CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.color + '20',
                                  color: CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.color
                                }}
                              >
                                {CONDITION_OPTIONS.find(c => c.value === inspection.new_condition)?.label}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Physical Condition Notes</label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {inspection.physical_condition_notes || 'No notes provided'}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <CheckSquare size={16} className={inspection.usage_verified ? 'text-green-600' : 'text-red-600'} />
                              <span className="text-sm">Usage Verified</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckSquare size={16} className={inspection.boundary_verified ? 'text-green-600' : 'text-red-600'} />
                              <span className="text-sm">Boundary Verified</span>
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inspection Modal */}
      <Dialog open={isConductingInspection} onOpenChange={setIsConductingInspection}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Conduct Ocular Inspection</DialogTitle>
            <DialogDescription>
              {selectedRequest?.property?.[0]?.property_name || 'Property Inspection'} - {selectedRequest?.inventory_request_id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Inspection Date</label>
                <Input
                  type="date"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Condition Assessment</label>
                <Select value={newCondition} onChange={(e) => setNewCondition(e.target.value)}>
                  {CONDITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Physical Condition Notes</label>
              <Textarea
                placeholder="Describe the current physical condition, any damage, maintenance needs, etc."
                value={physicalConditionNotes}
                onChange={(e) => setPhysicalConditionNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="usage-verified"
                  checked={usageVerified}
                  onChange={(e) => setUsageVerified(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="usage-verified" className="text-sm font-medium">
                  Usage Verified - Asset is being used as intended
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="boundary-verified"
                  checked={boundaryVerified}
                  onChange={(e) => setBoundaryVerified(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="boundary-verified" className="text-sm font-medium">
                  Boundary Verified - Property boundaries are intact and clearly marked
                </label>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Recommendation</label>
              <Textarea
                placeholder="Provide recommendations for maintenance, repairs, or other actions..."
                value={recommendation}
                onChange={(e) => setRecommendation(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsConductingInspection(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmitInspection} className="flex-1">
              <CheckSquare size={14} className="mr-2" />
              Complete Inspection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
