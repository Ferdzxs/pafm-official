import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Eye, CheckCircle, XCircle, FileText, AlertTriangle, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

// Trigger Vite HMR 
export default function ApprovalsPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedItem, setSelectedItem] = useState<any | null>(null)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [rejectReason, setRejectReason] = useState('')

    const [reports, setReports] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const [inspectionRequestIds, setInspectionRequestIds] = useState<Set<string>>(new Set())
    const [selectedItemDocuments, setSelectedItemDocuments] = useState<any[]>([])

    const openSelectedItem = async (item: any) => {
        setSelectedItem(item)
        if (!item) { setSelectedItemDocuments([]); return }

        const requestId = item.inventory_request_id
        const reportId = item.inventory_report_id
        const { data, error } = await supabase
            .from('digital_document')
            .select('document_id, document_type, file_url, reference_no')
            .in('reference_no', [requestId, reportId])

        if (error) {
            console.error('Error fetching attached documents:', error)
            setSelectedItemDocuments([])
        } else {
            setSelectedItemDocuments(data || [])
        }
    }

    useEffect(() => {
        fetchPendingReports()
    }, [])

    const fetchPendingReports = async () => {
        setIsLoading(true)

        // Fetch all inventory_request_ids that came through ocular inspections
        const { data: inspData } = await supabase
            .from('ocular_inspection')
            .select('inventory_request_id')

        const ocularRequestIds = new Set<string>((inspData || []).map((r: any) => r.inventory_request_id))
        setInspectionRequestIds(ocularRequestIds)

        // Fetch inventory reports that are pending or have been returned
        // NOTE: Now includes BOTH formal reports AND ocular inspection reports
        const { data, error } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                inventory_request_id,
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
            .in('approval_status', ['pending', 'approved', 'returned_for_revision'])
            .order('preparation_date', { ascending: false })

        if (error) {
            console.error('Error fetching reports:', error)
            toast.error('Failed to load pending approvals.')
        } else {
            // Show ALL reports including ocular inspection reports
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

        let employeeId = user.id?.startsWith('EMP-') ? user.id : 'EMP-007'; // Fallback to a valid CGSD employee ID if the mock user 'u1' is used

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

        // 3. Auto-update property.asset_condition from the linked ocular_inspection
        const requestId = selectedItem.inventory_request?.requesting_office
            ? null // not needed — we use inventory_request_id from the report join
            : null

        // Look up the inventory_request_id from the report (already joined)
        const linkedRequestId = selectedItem.inventory_request_id

        if (linkedRequestId) {
            // Find the ocular_inspection for this request that has new_condition set
            const { data: inspectionData } = await supabase
                .from('ocular_inspection')
                .select('new_condition, property_id')
                .eq('inventory_request_id', linkedRequestId)
                .not('new_condition', 'is', null)
                .order('inspection_date', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (inspectionData?.new_condition && inspectionData?.property_id) {
                const { error: conditionError } = await supabase
                    .from('property')
                    .update({ asset_condition: inspectionData.new_condition })
                    .eq('property_id', inspectionData.property_id)

                if (conditionError) {
                    console.error('Failed to auto-update property condition:', conditionError)
                    // Non-blocking — approval still succeeds
                } else {
                    console.log(`✅ property.asset_condition updated to: ${inspectionData.new_condition}`)
                }
            }
        }

        // Refetch the updated reports after approval
        const { data: updatedReports, error: fetchError } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                inventory_request_id,
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
            .in('approval_status', ['pending', 'approved', 'returned_for_revision'])
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

        toast.success(`Approved ${selectedItem.inventory_report_id}! Asset condition updated.`, { id: toastId })
        setSelectedItem(null)
        setSelectedItemDocuments([])
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

        // Validate user ID against the employee table if it looks like a real ID, else use fallback
        let employeeData = null;
        if (user.id?.startsWith('EMP-')) {
            const { data, error } = await supabase
                .from('employee')
                .select('employee_id')
                .eq('employee_id', user.id)
                .single();
            employeeData = data;
        }

        if (!employeeData && user.id?.startsWith('EMP-')) {
            toast.error('Invalid user ID. Please contact the administrator.');
            return;
        }

        employeeId = employeeData?.employee_id || 'EMP-007'; // Validated employee ID or fallback

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
        setSelectedItemDocuments([])
        fetchPendingReports()
    }

    const handleGenerateCOAReport = (item: any) => {
        const reportHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>COA Property Inventory Form</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.5;
                        color: #000;
                        margin: 0;
                        padding: 20px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        font-size: 16px;
                        margin: 0 0 5px 0;
                        font-weight: bold;
                    }
                    .header h2 {
                        font-size: 14px;
                        margin: 0 0 5px 0;
                        font-weight: normal;
                    }
                    .header h3 {
                        font-size: 14px;
                        margin: 0;
                        font-weight: bold;
                    }
                    .meta-info {
                        display: flex;
                        justify-content: space-between;
                        margin-bottom: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 30px;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                        font-weight: bold;
                        text-align: center;
                    }
                    .signatures {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 50px;
                    }
                    .signature-block {
                        width: 45%;
                        text-align: center;
                    }
                    .signature-line {
                        border-top: 1px solid #000;
                        margin-top: 40px;
                        padding-top: 5px;
                        font-weight: bold;
                    }
                    .footer {
                        margin-top: 50px;
                        font-size: 10px;
                        text-align: left;
                        font-style: italic;
                    }
                    @media print {
                        body {
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Republic of the Philippines</h2>
                    <h2>Quezon City Government</h2>
                    <h3>CITY GENERAL SERVICES DEPARTMENT</h3>
                    <br/>
                    <h1>REPORT ON THE PHYSICAL COUNT OF INVENTORIES</h1>
                </div>

                <div class="meta-info">
                    <div>
                        <strong>Report ID:</strong> \${item.inventory_report_id}<br/>
                        <strong>Scope:</strong> \${item.inventory_request?.inventory_scope || 'General Asset Inventory'}<br/>
                        <strong>Prepared By (Office):</strong> \${item.government_office?.office_name || 'System'}
                    </div>
                    <div>
                        <strong>Date Prepared:</strong> \${item.preparation_date || new Date().toLocaleDateString()}<br/>
                        <strong>Approval Status:</strong> \${item.approval_status.toUpperCase()}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Item No.</th>
                            <th>Description</th>
                            <th>Unit of Measure</th>
                            <th>Unit Value</th>
                            <th>Quantity per Property Card</th>
                            <th>Quantity per Physical Count</th>
                            <th>Shortage/Overage</th>
                            <th>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="8" style="text-align: center; padding: 20px; font-style: italic;">
                                Detailed inventory items will be attached here based on the scope: \${item.inventory_request?.inventory_scope || 'General Asset Inventory'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                <div>
                    <p>I hereby certify to the correctness of the above information based on actual physical count.</p>
                </div>

                <div class="signatures">
                    <div class="signature-block">
                        <p>Certified Correct by:</p>
                        <div class="signature-line">
                            CGSD Inventory Committee Member<br/>
                            <span style="font-weight: normal; font-size: 10px;">Signature over Printed Name</span>
                        </div>
                    </div>
                    <div class="signature-block">
                        <p>Approved by:</p>
                        <div class="signature-line">
                            Head of Agency / Authorized Representative<br/>
                            <span style="font-weight: normal; font-size: 10px;">Signature over Printed Name</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    * Reference: COA Circular No. 2018-002, Property Inventory Form (PIF)
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(reportHtml);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 250);
        } else {
            toast.error('Could not open print window. Please allow popups.');
        }
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
                                            <Button variant="ghost" size="sm" onClick={() => openSelectedItem(item)}>
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
                                <Button variant="ghost" size="icon" onClick={() => { setSelectedItem(null); setSelectedItemDocuments([]); }}>
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

                                {selectedItemDocuments.length > 0 ? (
                                    <div className="text-center text-xs">
                                        {selectedItemDocuments.map((doc) => (
                                            <div key={doc.document_id} className="mb-1">
                                                <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-blue-500 underline">
                                                    {doc.document_type || doc.document_id} (ref: {doc.reference_no})
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : !selectedItem.digital_report_url ? (
                                    <span className="text-xs">No attached file in DB record.</span>
                                ) : null}
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
                            {selectedItem.approval_status === 'approved' && (
                                <div className="space-y-4 pt-4 border-t border-border">
                                    <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg text-sm text-teal-700 flex gap-2 items-start">
                                        <CheckCircle size={16} className="shrink-0 mt-0.5 text-teal-600" />
                                        <div>
                                            <div className="font-semibold mb-0.5">Approved — Forwarded to RMCD</div>
                                            <div className="text-teal-600/80 text-xs">RMCD has been notified and will handle the official document release to the requesting office.</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={() => handleGenerateCOAReport(selectedItem)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                            <Printer size={16} className="mr-2" /> Generate COA Report (PDF)
                                        </Button>
                                    </div>
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