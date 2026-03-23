import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckCircle, X, Calendar, ClipboardCheck, AlertTriangle, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { AdminDeskPageShell } from '@/components/layout/AdminDeskPageShell'
import { toast } from 'react-hot-toast'

export default function CgsdOcularInspectionsPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [inspections, setInspections] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Modal state
    const [selectedReport, setSelectedReport] = useState<any | null>(null)
    const [photoEvidence, setPhotoEvidence] = useState<any[]>([])
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [returnReason, setReturnReason] = useState('')
    const [isActing, setIsActing] = useState(false)

    useEffect(() => {
        fetchInspections()
    }, [])

    const fetchInspections = async () => {
        setIsLoading(true)

        // Fetch inventory_requests that went through ocular inspections
        const { data: ocularData, error: ocularError } = await supabase
            .from('ocular_inspection')
            .select(`
                inspection_id,
                inventory_request_id,
                inspection_date,
                new_condition,
                physical_condition_notes,
                property_id,
                property (
                    property_name,
                    location,
                    asset_condition
                ),
                inventory_request (
                    inventory_scope,
                    status,
                    requesting_office
                )
            `)
            .order('inspection_date', { ascending: false })

        if (ocularError) {
            console.error('Error fetching ocular inspections:', ocularError)
            toast.error('Failed to load inspection submissions.')
            setIsLoading(false)
            return
        }

        // For each unique inventory_request_id, find the linked inventory_report (pending/returned)
        const requestIds = [...new Set((ocularData || []).map((o: any) => o.inventory_request_id))]

        let reportMap: Record<string, any> = {}
        if (requestIds.length > 0) {
            const { data: reportData } = await supabase
                .from('inventory_report')
                .select('inventory_report_id, inventory_request_id, approval_status, preparation_date, digital_report_url')
                .in('inventory_request_id', requestIds)
                .order('preparation_date', { ascending: false })

            for (const rpt of (reportData || [])) {
                // Keep latest report per request
                if (!reportMap[rpt.inventory_request_id]) {
                    reportMap[rpt.inventory_request_id] = rpt
                }
            }
        }

        // Merge: one row per unique request (latest inspection)
        const seen = new Set<string>()
        const merged = (ocularData || []).filter((o: any) => {
            if (seen.has(o.inventory_request_id)) return false
            seen.add(o.inventory_request_id)
            return true
        }).map((o: any) => ({
            ...o,
            linkedReport: reportMap[o.inventory_request_id] || null
        }))

        setInspections(merged)
        setIsLoading(false)
    }

    const filtered = inspections.filter(a =>
        a.inventory_request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.inventory_request?.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.property?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Fetch photo evidence and open review modal
    const openReview = async (item: any) => {
        setPhotoEvidence([])
        setSelectedReport(item)
        const { data: photos } = await supabase
            .from('inspection_photo_evidence')
            .select('evidence_id, photo_url, description')
            .eq('inspection_id', item.inspection_id)
        setPhotoEvidence(photos || [])
    }

    // ── Approve ──────────────────────────────────────────────────────────────
    const handleApprove = async () => {
        if (!selectedReport || !user) return
        setIsActing(true)
        const toastId = toast.loading('Approving inspection report...')

        const report = selectedReport.linkedReport
        if (!report) {
            toast.error('No linked inventory report found.', { id: toastId })
            setIsActing(false)
            return
        }

        // 1. Update inventory_report status
        const { error: updateError } = await supabase
            .from('inventory_report')
            .update({ approval_status: 'approved' })
            .eq('inventory_report_id', report.inventory_report_id)

        // 2. Insert approval record
        const employeeId = user.id?.startsWith('EMP-') ? user.id : 'EMP-007'
        const { error: recordError } = await supabase
            .from('approval_record')
            .insert({
                approval_id: `APR-${Date.now()}`,
                inventory_report_id: report.inventory_report_id,
                approved_by_office: 'OFF-007',
                approved_by_employee: employeeId,
                approval_date: new Date().toISOString().split('T')[0],
                decision: 'approved',
                remarks: 'Inspection report approved by CGSD.'
            })

        // 3. Auto-update property.asset_condition
        if (selectedReport.new_condition && selectedReport.property_id) {
            await supabase
                .from('property')
                .update({ asset_condition: selectedReport.new_condition })
                .eq('property_id', selectedReport.property_id)
        }

        if (updateError || recordError) {
            toast.error('Failed to approve inspection report.', { id: toastId })
        } else {
            toast.success(`Inspection report approved! Asset condition updated to ${selectedReport.new_condition}.`, { id: toastId })
            setSelectedReport(null)
            fetchInspections()
        }
        setIsActing(false)
    }

    // ── Return for Revision ───────────────────────────────────────────────────
    const handleReturn = async () => {
        if (!returnReason.trim() || !selectedReport || !user) return
        setIsActing(true)
        const toastId = toast.loading('Returning for revision...')

        const report = selectedReport.linkedReport
        if (!report) {
            toast.error('No linked inventory report found.', { id: toastId })
            setIsActing(false)
            return
        }

        const employeeId = user.id?.startsWith('EMP-') ? user.id : 'EMP-007'

        const { error: updateError } = await supabase
            .from('inventory_report')
            .update({ approval_status: 'returned_for_revision' })
            .eq('inventory_report_id', report.inventory_report_id)

        const { error: recordError } = await supabase
            .from('approval_record')
            .insert({
                approval_id: `APR-${Date.now()}`,
                inventory_report_id: report.inventory_report_id,
                approved_by_office: 'OFF-007',
                approved_by_employee: employeeId,
                approval_date: new Date().toISOString().split('T')[0],
                decision: 'rejected',
                remarks: returnReason
            })

        if (updateError || recordError) {
            toast.error('Failed to return inspection report.', { id: toastId })
        } else {
            toast.success(`Returned to FAMCD for revision.`, { id: toastId })
            setIsReturnModalOpen(false)
            setReturnReason('')
            setSelectedReport(null)
            fetchInspections()
        }
        setIsActing(false)
    }

    const getReportStatusBadge = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return <Badge variant="success" className="text-[10px] uppercase">Approved ✓</Badge>
            case 'pending': return <Badge variant="warning" className="text-[10px] uppercase">Pending Review</Badge>
            case 'returned_for_revision': return <Badge variant="destructive" className="text-[10px] uppercase">Returned</Badge>
            default: return <Badge variant="secondary" className="text-[10px] uppercase">No Report</Badge>
        }
    }

    // ── Review Modal ──────────────────────────────────────────────────────────
    if (selectedReport) {
        const report = selectedReport.linkedReport
        const notes: string = selectedReport.physical_condition_notes || ''
        // Parse notes: "Condition: X | Recs: Y | Notes: Z"
        const notesMatch = notes.match(/Notes: (.+)$/)
        const recsMatch = notes.match(/Recs: ([^|]+)/)
        const parsedNotes = notesMatch ? notesMatch[1].trim() : notes
        const parsedRecs = recsMatch ? recsMatch[1].trim() : '—'

        return (
            <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)} className="h-8 px-2 text-muted-foreground">
                        <X size={16} className="mr-1" /> Back
                    </Button>
                    <div>
                        <h1 className="font-display text-2xl font-bold text-foreground">Review Inspection</h1>
                        <p className="text-muted-foreground text-sm mt-1">
                            {selectedReport.inventory_request_id} — {selectedReport.inventory_request?.inventory_scope}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Property + Inspection Details */}
                    <Card className="shadow-sm border-border">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Search size={16} className="text-muted-foreground" /> Property Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            {[
                                { label: 'Property / Item', value: selectedReport.property?.property_name || 'N/A: General Assessment' },
                                { label: 'Location', value: selectedReport.property?.location || '—' },
                                { label: 'Previous Condition', value: selectedReport.property?.asset_condition || '—' },
                                { label: 'Inspection Date', value: selectedReport.inspection_date || '—' },
                            ].map(f => (
                                <div key={f.label} className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">{f.label}</div>
                                    <div className="text-sm font-medium text-foreground">{f.value}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Right: FAMCD Findings */}
                    <Card className="shadow-sm border-border">
                        <CardHeader className="pb-4 border-b border-border">
                            <CardTitle className="text-base flex items-center gap-2">
                                <ClipboardCheck size={16} className="text-muted-foreground" /> Inspector's Findings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-3">
                            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Observed Condition</div>
                                <div className="text-sm font-bold text-foreground">{selectedReport.new_condition || '—'}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Inspection Notes</div>
                                <div className="text-sm text-foreground">{parsedNotes || '—'}</div>
                            </div>
                            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-1">Inspector Recommendation</div>
                                <div className="text-sm font-medium text-foreground">{parsedRecs}</div>
                            </div>
                            {report && (
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">Report Status</div>
                                    <div className="mt-0.5">{getReportStatusBadge(report.approval_status)}</div>
                                </div>
                            )}
                            {/* Photo Evidence */}
                            <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Photographic Evidence</div>
                                {photoEvidence.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic">No photos uploaded.</p>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        {photoEvidence.map((photo: any) => (
                                            <a key={photo.evidence_id} href={photo.photo_url} target="_blank" rel="noopener noreferrer"
                                                className="block rounded-lg overflow-hidden border border-border hover:opacity-90 transition-opacity">
                                                <img
                                                    src={photo.photo_url}
                                                    alt={photo.description || 'Evidence photo'}
                                                    className="w-full h-28 object-cover"
                                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                />
                                                {photo.description && (
                                                    <div className="px-2 py-1 text-[10px] text-muted-foreground truncate">
                                                        {photo.description}
                                                    </div>
                                                )}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Action Buttons */}
                {report && report.approval_status === 'pending' && (
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => { setIsReturnModalOpen(true) }} className="gap-2 border-destructive text-destructive hover:bg-destructive/10">
                            <AlertTriangle size={15} /> Return for Revision
                        </Button>
                        <Button onClick={handleApprove} disabled={isActing} className="gap-2">
                            <CheckCircle size={15} /> Approve Report
                        </Button>
                    </div>
                )}
                {report && report.approval_status === 'approved' && (
                    <div className="flex justify-end mt-6">
                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-2">
                            <CheckCircle size={15} /> This inspection report has been approved.
                        </span>
                    </div>
                )}
                {report && report.approval_status === 'returned_for_revision' && (
                    <div className="flex justify-end mt-6">
                        <span className="text-sm text-destructive font-medium flex items-center gap-2">
                            <AlertTriangle size={15} /> Returned to FAMCD for revision.
                        </span>
                    </div>
                )}

                {/* Return Modal */}
                {isReturnModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <Card className="w-full max-w-md shadow-xl bg-card">
                            <CardContent className="p-6 space-y-4">
                                <h2 className="text-lg font-semibold text-foreground">Return for Revision</h2>
                                <p className="text-sm text-muted-foreground">Provide a reason so FAMCD knows what to correct.</p>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-lg border border-input bg-background/50 text-sm resize-y"
                                    placeholder="Describe what needs to be corrected..."
                                    value={returnReason}
                                    onChange={e => setReturnReason(e.target.value)}
                                />
                                <div className="flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => { setIsReturnModalOpen(false); setReturnReason('') }} disabled={isActing}>Cancel</Button>
                                    <Button variant="destructive" onClick={handleReturn} disabled={!returnReason.trim() || isActing}>
                                        {isActing ? 'Returning...' : 'Confirm Return'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        )
    }

    // ── Main List ─────────────────────────────────────────────────────────────
    if (!user) return null
    const meta = ROLE_META[user.role]

    return (
        <AdminDeskPageShell
            roleLabel={meta.label}
            roleColor={meta.color}
            roleBgColor={meta.bgColor}
            title="Ocular inspection findings"
            description="Review and approve ocular inspection reports submitted by FAMCD."
            wide
            actions={
                <Button variant="outline" size="sm" className="gap-2" type="button" onClick={fetchInspections}>
                    <Filter size={16} /> Refresh
                </Button>
            }
        >
            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by Request ID or Scope..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="max-h-[65vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Request ID / Scope</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Target Property</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[14%]">Observed Condition</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[14%]">Inspection Date</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Report Status</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                                            Loading inspection submissions...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                                            No inspection reports submitted yet.
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => (
                                    <tr key={item.inspection_id} className="hover:bg-accent/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                                                    <ClipboardCheck size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">{item.inventory_request_id}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[180px]" title={item.inventory_request?.inventory_scope}>
                                                        {item.inventory_request?.inventory_scope || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-foreground">{item.property?.property_name || 'N/A'}</div>
                                            <div className="text-xs text-muted-foreground">{item.property?.location || '—'}</div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-foreground">{item.new_condition || '—'}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Calendar size={13} />
                                                <span>{item.inspection_date || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">{getReportStatusBadge(item.linkedReport?.approval_status)}</td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedReport(item)}>
                                                <Eye size={16} className="mr-2" /> Review
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </AdminDeskPageShell>
    )
}