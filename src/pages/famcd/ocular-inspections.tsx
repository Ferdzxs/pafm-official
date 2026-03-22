import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Camera, CheckSquare, UploadCloud, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function OcularInspectionsPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState<any | null>(null)
    const [inspections, setInspections] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    
    // Form State for the Inspector
    const [newCondition, setNewCondition] = useState('Excellent')
    const [findings, setFindings] = useState('')
    const [recommendation, setRecommendation] = useState('Approve Request')

    async function fetchPendingInspections() {
        setIsLoading(true)
        // Fetch inventory requests that are pending
        const { data, error } = await supabase
            .from('inventory_request')
            .select(`
                inventory_request_id,
                property_id,
                inventory_scope,
                property (
                    property_name,
                    location,
                    asset_condition,
                    acquisition_date
                )
            `)
            .eq('status', 'pending')
            .order('date_requested', { ascending: false })

        if (error) {
            console.error('Error fetching inspections:', error)
            toast.error('Failed to load pending inspections queue.')
        } else {
            // Ensure we normalize inventory_request_id to request_id so UI code remains consistent
            const normalized = (data || []).map((item: any) => ({
                ...item,
                request_id: item.inventory_request_id || item.request_id,
            }))
            setInspections(normalized)
        }

        setIsLoading(false)
    }

    useEffect(() => {
        fetchPendingInspections()
    }, [])

    const filtered = inspections.filter(a =>
        a.request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.property?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleSubmitReport = async () => {
        if (!selectedItem || !user) return
        
        if (!findings.trim()) {
            toast.error('Please enter inspection notes before submitting.')
            return
        }

        const toastId = toast.loading('Submitting inspection report to CGSD...')
        
        // 1. Create an ocular_inspection record
        const inspectionId = `INSP-${Date.now()}`
        const { error: inspError } = await supabase
            .from('ocular_inspection')
            .insert({
                inspection_id: inspectionId,
                property_id: selectedItem.property_id,
                inventory_request_id: selectedItem.request_id,
                inspection_date: new Date().toISOString().split('T')[0],
                conducted_by_office: user.role === 'famcd' ? 'OFF-004' : null,
                conducted_by_employee: user.id || 'EMP-004',
                asset_condition_notes: `Condition: ${newCondition} | Recs: ${recommendation} | Notes: ${findings}`
            })

        // 2. Generate the draft inventory report for CGSD
        const reportId = `IRP-${Date.now()}`
        const { error: repError } = await supabase
            .from('inventory_report')
            .insert({
                inventory_report_id: reportId,
                inventory_request_id: selectedItem.request_id,
                preparation_date: new Date().toISOString().split('T')[0],
                prepared_by_office: user.role === 'famcd' ? 'OFF-004' : null,
                prepared_by_employee: user.id || 'EMP-004',
                approval_status: 'pending' // pending CGSD
            })

        // 3. Mark the inventory request as completed/forwarded
        const { error: reqError } = await supabase
            .from('inventory_request')
            .update({ status: 'completed' }) // or 'in-review'
            .eq('inventory_request_id', selectedItem.request_id)

        if (inspError || repError || reqError) {
            console.error(inspError, repError, reqError)
            toast.error('Failed to submit inspection report.', { id: toastId })
            return
        }

        toast.success(`Inspection Report for ${selectedItem.request_id} submitted to CGSD Approvals queue!`, { id: toastId })
        setSelectedItem(null)
        setFindings('')
        fetchPendingInspections()
    }

    if (selectedItem) {
        return (
            <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
                 <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="h-8 px-2 text-muted-foreground mr-2">
                                <X size={16} className="mr-1" /> Back
                            </Button>
                            <h1 className="font-display text-2xl font-bold text-foreground">Conduct Inspection</h1>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1 ml-16">
                            {selectedItem.request_id} — {selectedItem.inventory_scope}
                        </p>
                    </div>
                </div>

                {/* Split View for Validation */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* LEFT COLUMN: Current Registry Data (Read-only) */}
                    <Card className="shadow-sm border-border bg-muted/20">
                        <CardHeader className="pb-4 border-b border-border bg-background/50">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Search className="text-muted-foreground" size={18} />
                                Current Registry Data
                            </CardTitle>
                            <CardDescription>Existing data on file for validation.</CardDescription>
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
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Condition</label>
                                    <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm capitalize">
                                        <Badge variant="secondary">{selectedItem.property?.asset_condition || 'Unknown'}</Badge>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acquired On</label>
                                    <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm">
                                        {selectedItem.property?.acquisition_date || 'Unknown'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered Area</label>
                                <div className="p-3 bg-background border border-border rounded-lg mt-1 text-sm">
                                    {selectedItem.property?.area_sqm || 0} sq.m
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                        {/* RIGHT COLUMN: New Findings Entry */}
                        <Card className="shadow-lg border-primary/20 bg-card">
                            <CardHeader className="pb-4 border-b border-border bg-primary/5">
                                <CardTitle className="text-lg flex items-center gap-2 text-primary">
                                    <CheckSquare size={18} />
                                    New Inspection Findings
                                </CardTitle>
                                <CardDescription>Enter your ocular findings to submit for CGSD Approval.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-5">
                                <div>
                                    <label className="text-xs font-semibold text-foreground mb-1.5 block">Observed Condition <span className="text-destructive">*</span></label>
                                    <select 
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm"
                                        value={newCondition}
                                        onChange={e => setNewCondition(e.target.value)}
                                    >
                                        <option>Excellent</option>
                                        <option>Good</option>
                                        <option>Fair</option>
                                        <option>Poor</option>
                                        <option>Condemned / Beyond Repair</option>
                                    </select>
                                </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground mb-1.5 block">Inspection Notes / Variations <span className="text-destructive">*</span></label>
                                <textarea 
                                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background/50 text-sm resize-y"
                                    placeholder="Note any discrepancies from the registry data, specific damages observed, etc."
                                    value={findings}
                                    onChange={e => setFindings(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground mb-1.5 block">Photographic Evidence</label>
                                <div className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer">
                                    <Camera size={28} className="text-muted-foreground mb-2" />
                                    <div className="text-sm font-medium">Click to upload photos</div>
                                    <div className="text-xs text-muted-foreground mt-1">Supports JPG, PNG (Max 5MB)</div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground mb-1.5 block">Inspector Recommendation</label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm"
                                    value={recommendation}
                                    onChange={e => setRecommendation(e.target.value)}
                                >
                                    <option>Approve Request</option>
                                    <option>Deny Request</option>
                                    <option>Schedule Repairs</option>
                                    <option>Decommission Asset</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-border mt-6">
                                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" onClick={handleSubmitReport}>
                                    <UploadCloud size={18} className="mr-2" /> Submit Report to CGSD
                                </Button>
                            </div>
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
                    <h1 className="font-display text-2xl font-bold text-foreground">Ocular Inspections Queue</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Pending asset requests routed from departments requiring physical validation by FAMCD.
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
                            className="pl-9 h-10 w-full bg-background relative z-10"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchPendingInspections}>
                        <Filter size={16} />
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
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
                                        Loading inspections queue...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-muted-foreground text-sm">
                                        No pending inspections targeting physical assets in your queue.
                                    </td>
                                </tr>
                            ) : filtered.map((item) => (
                                <tr key={item.request_id} className="hover:bg-accent/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                                                <Search size={18} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground">{item.request_id}</div>
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
                                        <Badge variant="warning" className="text-[10px] uppercase">Needs Inspection</Badge>
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button size="sm" onClick={() => setSelectedItem(item)}>
                                            <Camera size={16} className="mr-2" /> Start Inspection
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
