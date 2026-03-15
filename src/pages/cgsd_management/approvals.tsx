import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function ApprovalsPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState<any | null>(null)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    
    const [reports, setReports] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchPendingReports()
    }, [])

    const fetchPendingReports = async () => {
        setIsLoading(true)
        // Fetch inventory reports that are pending or have been returned
        const { data, error } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                preparation_date,
                approval_status,
                digital_report_url,
                inventory_request (
                    inventory_scope,
                    requesting_office
                ),
                government_office (
                    office_name
                )
            `)
            .eq('approval_status', 'pending') // Only fetch pending reports
            .order('preparation_date', { ascending: false })

        if (error) {
            console.error('Error fetching reports:', error)
            toast.error('Failed to load pending approvals.')
        } else {
            setReports(data || [])
        }
        setIsLoading(false)
    }

    const filtered = reports.filter(a =>
        a.inventory_report_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.inventory_request?.inventory_scope || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const handleApprove = async () => {
        if (!selectedItem || !user) return
        
        const toastId = toast.loading('Approving submission...')
        
        // 1. Update report status
        const { error: updateError } = await supabase
            .from('inventory_report')
            .update({ approval_status: 'approved' })
            .eq('inventory_report_id', selectedItem.inventory_report_id)

        // 2. Create approval record
        console.log('User ID:', user.id); // Log the user ID for debugging

        if (!user.id) {
            toast.error('User ID is missing or invalid. Cannot proceed with the action.');
            return;
        }

        let employeeId = user.id; // Ensure this matches an existing employee_id in the database

        // Log the employee ID being used for the approval record
        console.log('Employee ID being used for approval:', employeeId);

        const { error: recordError } = await supabase
            .from('approval_record')
            .insert({
                approval_id: `APR-${Date.now()}`,
                inventory_report_id: selectedItem.inventory_report_id,
                approved_by_office: user.role === 'cgsd_management' ? 'OFF-007' : null, // Mapped to CGSD logic
                approved_by_employee: employeeId, // Use the validated employee ID
                approval_date: new Date().toISOString().split('T')[0],
                decision: 'approved',
                remarks: 'Approved electronically.'
            })

        // Refetch the updated reports after approval
        const { data: updatedReports, error: fetchError } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                preparation_date,
                approval_status,
                digital_report_url,
                inventory_request (
                    inventory_scope,
                    requesting_office
                ),
                government_office (
                    office_name
                )
            `)
            .eq('approval_status', 'pending')
            .order('preparation_date', { ascending: false })

        if (fetchError) {
            console.error('Error fetching updated reports:', fetchError)
            toast.error('Failed to refresh reports.')
        } else {
            setReports(updatedReports || [])
        }

        if (updateError || recordError) {
            console.error('Update Error:', updateError);
            console.error('Record Error:', recordError);
            toast.error('Failed to approve submission.', { id: toastId });
            return;
        }

        toast.success(`Approved ${selectedItem.inventory_report_id}!`, { id: toastId })
        setSelectedItem(null)
        fetchPendingReports()
    }

    const handleReturn = () => {
        setIsRejectModalOpen(true)
    }

    const submitReturn = async () => {
        if (!rejectReason.trim() || !selectedItem || !user) return
        
        const toastId = toast.loading('Returning submission...')
        
        // 1. Update report status
        const { error: updateError } = await supabase
            .from('inventory_report')
            .update({ approval_status: 'returned_for_revision' })
            .eq('inventory_report_id', selectedItem.inventory_report_id)

        // 2. Create approval record (acting as a rejection log)
        console.log('User ID:', user.id); // Log the user ID for debugging

        if (!user.id) {
            toast.error('User ID is missing or invalid. Cannot proceed with the action.');
            return;
        }

        let employeeId = user.id; // Ensure this matches an existing employee_id in the database

        // Log the employee ID being used for the approval record
        console.log('Employee ID being used for approval:', employeeId);

        // Validate user ID against the employee table
        const { data: employeeData, error: employeeError } = await supabase
            .from('employee')
            .select('employee_id')
            .eq('employee_id', user.id)
            .single();

        if (employeeError || !employeeData) {
            console.error('Employee validation failed:', employeeError);
            toast.error('Invalid user ID. Please contact the administrator.');
            return;
        }

        employeeId = employeeData.employee_id; // Validated employee ID

        const { error: recordError } = await supabase
            .from('approval_record')
            .insert({
                approval_id: `APR-${Date.now()}`,
                inventory_report_id: selectedItem.inventory_report_id,
                approved_by_office: user.role === 'cgsd_management' ? 'OFF-007' : null, // Mapped to CGSD logic
                approved_by_employee: employeeId, // Use the validated employee ID
                approval_date: new Date().toISOString().split('T')[0],
                decision: 'rejected',
                remarks: rejectReason
            });

        if (recordError) {
            console.error('Error inserting approval record:', recordError);
            toast.error('Failed to return submission. Please check the logs for more details.');
            return;
        }

        toast.success(`Returned ${selectedItem.inventory_report_id} to FAMCD.`, { id: toastId })
        setIsRejectModalOpen(false)
        setRejectReason('')
        setSelectedItem(null)
        fetchPendingReports()
    }

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Approvals</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Review and approve/return inventory submissions and asset requests.
                    </p>
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by ID or Scope..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchPendingReports}>
                        <Filter size={16} />
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report ID</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Scope / Details</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Prepared By</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Status</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                        Loading submissions...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                        No submissions found.
                                    </td>
                                </tr>
                            ) : filtered.map((item) => (
                                <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
                                                <div className="text-xs text-muted-foreground">Report</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-sm text-foreground font-medium truncate max-w-[250px]">{item.inventory_request?.inventory_scope || 'General Asset Inventory'}</div>
                                        <div className="text-xs text-muted-foreground">Submitted: {item.preparation_date || 'N/A'}</div>
                                    </td>
                                    <td className="p-4 text-sm text-muted-foreground">{item.government_office?.office_name || 'System Generated'}</td>
                                    <td className="p-4">
                                        {item.approval_status === 'pending' && <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>}
                                        {item.approval_status === 'approved' && <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>}
                                        {item.approval_status === 'returned_for_revision' && <Badge variant="destructive" className="text-[10px] uppercase">Returned</Badge>}
                                        {item.approval_status === 'draft' && <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => setSelectedItem(item)}>
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

            {/* Action Modal */}
            {selectedItem && !isRejectModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-lg shadow-xl relative z-[101] bg-card">
                        <CardHeader className="border-b border-border pb-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xl">Review Submission</CardTitle>
                                    <p className="text-sm text-muted-foreground mt-1">{selectedItem.inventory_report_id}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                                    <XCircle size={20} />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Scope</div>
                                    <div className="font-medium">{selectedItem.inventory_request?.inventory_scope || 'General Asset Inventory'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-xs mb-1">Prepared By</div>
                                    <div className="font-medium">{selectedItem.government_office?.office_name || 'System'}</div>
                                </div>
                            </div>
                            
                            {selectedItem.approval_status === 'returned_for_revision' && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 flex gap-2">
                                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-semibold mb-1">Status:</div>
                                        This submission was previously returned for revision.
                                    </div>
                                </div>
                            )}

                            <div className="p-4 bg-accent rounded-lg border border-border text-center text-sm text-muted-foreground">
                                <FileText size={24} className="mx-auto mb-2 opacity-50" />
                                <div className="mb-2">Document Details</div>
                                {selectedItem.digital_report_url ? (
                                    <a href={selectedItem.digital_report_url} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs">View Original Report File</a>
                                ) : (
                                    <span className="text-xs">No attached file in DB record.</span>
                                )}
                            </div>

                            {['pending', 'returned_for_revision'].includes(selectedItem.approval_status) && (
                                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                    <Button variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive" onClick={handleReturn}>
                                        <XCircle size={16} className="mr-2" /> Return for Revision
                                    </Button>
                                    <Button onClick={handleApprove} className="bg-success text-white hover:bg-success/90">
                                        <CheckCircle size={16} className="mr-2" /> Approve
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Reject Modal */}
            {isRejectModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-md shadow-xl border-red-500/30 relative z-[111] bg-card">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-destructive flex items-center gap-2">
                                <AlertTriangle size={20} />
                                Return for Revision
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Please provide a reason for returning <span className="font-semibold text-foreground">{selectedItem?.inventory_report_id}</span>. This will be sent back to FAMCD's queue.
                            </p>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Reason for Return (Required)</label>
                                <textarea
                                    className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    placeholder="e.g., Photos are blurry, valuation looks incorrect..."
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button variant="ghost" onClick={() => setIsRejectModalOpen(false)}>Cancel</Button>
                                <Button variant="destructive" disabled={!rejectReason.trim()} onClick={submitReturn}>
                                    Submit Return
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
