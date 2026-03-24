import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
    Search, RefreshCw, FileText, UploadCloud, Eye, Send,
    XCircle, Loader2, Calendar, Paperclip, CheckCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

type ReportRow = {
    inventory_report_id: string
    inventory_request_id: string | null
    preparation_date: string | null
    approval_status: string
    digital_report_url: string | null
    prepared_by_office: string | null
    inventory_request?: { inventory_scope?: string; requesting_office?: string }
    government_office?: { office_name?: string }
}

export default function FamcdInventoryReports() {
    const { user } = useAuth()
    const [reports, setReports] = useState<ReportRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // Upload modal state
    const [uploadTarget, setUploadTarget] = useState<ReportRow | null>(null)
    const [uploadFile, setUploadFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)

    // Submit confirm state
    const [submitTarget, setSubmitTarget] = useState<ReportRow | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadReports()
    }, [])

    const loadReports = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                inventory_request_id,
                preparation_date,
                approval_status,
                digital_report_url,
                prepared_by_office,
                inventory_request (
                    inventory_scope,
                    requesting_office
                ),
                government_office!prepared_by_office (
                    office_name
                )
            `)
            .order('preparation_date', { ascending: false })

        if (error) {
            console.error('Error loading inventory reports:', error)
            toast.error('Failed to load inventory reports.')
        } else {
            setReports((data as any[]) || [])
        }
        setIsLoading(false)
    }

    const filtered = useMemo(() => {
        if (!searchTerm.trim()) return reports
        const q = searchTerm.toLowerCase()
        return reports.filter(r =>
            r.inventory_report_id.toLowerCase().includes(q) ||
            (r.inventory_request?.inventory_scope || '').toLowerCase().includes(q)
        )
    }, [reports, searchTerm])

    // ── Upload file to storage and save URL ─────────────────────────────────
    const handleUploadConfirm = async () => {
        if (!uploadFile || !uploadTarget) return
        setIsUploading(true)
        const toastId = toast.loading('Uploading document...')

        const fileExt = uploadFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`
        const filePath = `inventory-reports/${uploadTarget.inventory_report_id}/${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('inspection-evidence')
            .upload(filePath, uploadFile)

        if (uploadError) {
            console.error('Upload error:', uploadError)
            toast.error(`Upload failed: ${uploadError.message}`, { id: toastId })
            setIsUploading(false)
            return
        }

        const { data: urlData } = supabase.storage
            .from('inspection-evidence')
            .getPublicUrl(filePath)

        const publicUrl = urlData?.publicUrl
        if (!publicUrl) {
            toast.error('Could not get public URL for uploaded file.', { id: toastId })
            setIsUploading(false)
            return
        }

        // Save URL to inventory_report
        const { error: updateError } = await supabase
            .from('inventory_report')
            .update({ digital_report_url: publicUrl })
            .eq('inventory_report_id', uploadTarget.inventory_report_id)

        if (updateError) {
            console.error('Update error:', updateError)
            toast.error('File uploaded but failed to save URL.', { id: toastId })
        } else {
            toast.success('Document attached successfully!', { id: toastId })
            setUploadTarget(null)
            setUploadFile(null)
            loadReports()
        }
        setIsUploading(false)
    }

    // ── Submit report to CGSD ─────────────────────────────────────────────
    const handleSubmitToCGSD = async () => {
        if (!submitTarget) return
        setIsSubmitting(true)
        const toastId = toast.loading('Submitting to CGSD...')

        const { error } = await supabase
            .from('inventory_report')
            .update({ approval_status: 'pending' })
            .eq('inventory_report_id', submitTarget.inventory_report_id)

        if (error) {
            console.error('Submit error:', error)
            toast.error('Failed to submit report.', { id: toastId })
        } else {
            toast.success(`Report ${submitTarget.inventory_report_id} submitted to CGSD Approvals!`, { id: toastId })
            setSubmitTarget(null)
            loadReports()
        }
        setIsSubmitting(false)
    }

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return <Badge variant="success" className="text-[10px] uppercase">Approved</Badge>
            case 'pending': return <Badge variant="warning" className="text-[10px] uppercase">Pending CGSD</Badge>
            case 'returned_for_revision': return <Badge variant="destructive" className="text-[10px] uppercase">Returned</Badge>
            case 'draft': return <Badge variant="secondary" className="text-[10px] uppercase">Draft</Badge>
            case 'submitted': return <Badge variant="outline" className="text-[10px] uppercase">Submitted</Badge>
            default: return <Badge variant="secondary" className="text-[10px] uppercase">{status || 'Unknown'}</Badge>
        }
    }

    const canSubmit = (r: ReportRow) =>
        r.digital_report_url &&
        ['draft', 'returned_for_revision'].includes(r.approval_status?.toLowerCase())

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Inventory Reports</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        View and download finalized and pending asset inventory reports.
                    </p>
                </div>
                <Button variant="outline" className="gap-2" onClick={loadReports}>
                    <RefreshCw size={16} /> Refresh
                </Button>
            </div>

            {/* Search */}
            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex gap-4 items-center bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by Report ID or Scope..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Reports Table */}
            <Card className="shadow-sm border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="max-h-[65vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report ID</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Scope</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[12%]">Date</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[14%]">Status</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[15%]">Document</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                                            Loading reports...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-8 text-center text-muted-foreground text-sm">
                                            No inventory reports found.
                                        </td>
                                    </tr>
                                ) : filtered.map(item => (
                                    <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
                                        {/* Report ID */}
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

                                        {/* Scope */}
                                        <td className="p-4">
                                            <div className="text-sm font-medium text-foreground truncate max-w-[200px]">
                                                {item.inventory_request?.inventory_scope || 'General Inventory'}
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <Calendar size={13} />
                                                <span>{item.preparation_date || 'N/A'}</span>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="p-4">{getStatusBadge(item.approval_status)}</td>

                                        {/* Document */}
                                        <td className="p-4">
                                            {item.digital_report_url ? (
                                                <div className="flex items-center gap-2">
                                                    <a
                                                        href={item.digital_report_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-blue-500 underline text-xs font-medium"
                                                    >
                                                        <Eye size={13} /> View
                                                    </a>
                                                    <a
                                                        href={item.digital_report_url}
                                                        download
                                                        className="inline-flex items-center gap-1.5 text-green-600 underline text-xs font-medium"
                                                    >
                                                        <FileText size={13} /> Download
                                                    </a>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">No file attached</span>
                                            )}
                                        </td>

                                        {/* Actions */}
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* Attach / Re-attach file */}
                                                {item.approval_status !== 'approved' && item.approval_status !== 'pending' && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5"
                                                        onClick={() => { setUploadTarget(item); setUploadFile(null) }}
                                                    >
                                                        <Paperclip size={14} />
                                                        {item.digital_report_url ? 'Replace' : 'Attach File'}
                                                    </Button>
                                                )}

                                                {/* Submit to CGSD */}
                                                {canSubmit(item) && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                                        onClick={() => setSubmitTarget(item)}
                                                    >
                                                        <Send size={14} /> Submit to CGSD
                                                    </Button>
                                                )}

                                                {/* Already pending/approved label */}
                                                {item.approval_status === 'pending' && (
                                                    <span className="text-xs text-muted-foreground italic self-center">Awaiting CGSD</span>
                                                )}
                                                {item.approval_status === 'approved' && (
                                                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 self-center">
                                                        <CheckCircle size={13} /> Approved
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            {/* ── Upload Document Modal ────────────────────────────────────── */}
            {uploadTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-md shadow-xl relative z-[101] bg-card">
                        <CardContent className="p-6 space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Attach Document</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{uploadTarget.inventory_report_id}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setUploadTarget(null); setUploadFile(null) }}>
                                    <XCircle size={20} />
                                </Button>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">
                                    Scope
                                </label>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border text-sm font-medium">
                                    {uploadTarget.inventory_request?.inventory_scope || 'General Inventory'}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-foreground mb-2 block">
                                    Report File <span className="text-destructive">*</span>
                                </label>
                                <label className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-6 flex flex-col items-center justify-center text-center bg-accent/30 hover:bg-accent/50 transition-colors cursor-pointer block">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,image/jpeg,image/png"
                                        onChange={e => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                setUploadFile(f)
                                                toast.success(`"${f.name}" selected.`)
                                            }
                                        }}
                                    />
                                    <UploadCloud size={28} className="text-muted-foreground mb-2" />
                                    <div className="text-sm font-medium">Click to select file</div>
                                    <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG accepted</div>
                                </label>
                                {uploadFile && (
                                    <div className="mt-3 flex items-center justify-between bg-muted/30 px-3 py-2.5 rounded-lg border border-border text-sm">
                                        <span className="truncate max-w-[260px] text-xs font-medium">{uploadFile.name}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setUploadFile(null)}
                                        >
                                            <XCircle size={14} />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-2 border-t border-border">
                                <Button variant="outline" onClick={() => { setUploadTarget(null); setUploadFile(null) }} disabled={isUploading}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUploadConfirm}
                                    disabled={!uploadFile || isUploading}
                                    className="gap-2"
                                >
                                    {isUploading ? (
                                        <><Loader2 size={15} className="animate-spin" /> Uploading...</>
                                    ) : (
                                        <><UploadCloud size={15} /> Upload & Attach</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Submit Confirm Modal ─────────────────────────────────────── */}
            {submitTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-md shadow-xl relative z-[101] bg-card">
                        <CardContent className="p-6 space-y-5">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-semibold text-foreground">Submit to CGSD</h2>
                                    <p className="text-sm text-muted-foreground mt-1">{submitTarget.inventory_report_id}</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setSubmitTarget(null)}>
                                    <XCircle size={20} />
                                </Button>
                            </div>

                            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-2 text-sm">
                                <div>
                                    <span className="text-muted-foreground text-xs">Scope</span>
                                    <div className="font-medium mt-0.5">{submitTarget.inventory_request?.inventory_scope || 'General Inventory'}</div>
                                </div>
                                <div>
                                    <span className="text-muted-foreground text-xs">Attached Document</span>
                                    <div className="mt-0.5">
                                        <a href={submitTarget.digital_report_url!} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs">
                                            View attached file
                                        </a>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground">
                                This will send the report to the <strong className="text-foreground">CGSD Approvals</strong> queue. CGSD will be able to approve or return it for revision.
                            </p>

                            <div className="flex justify-end gap-3 pt-2 border-t border-border">
                                <Button variant="outline" onClick={() => setSubmitTarget(null)} disabled={isSubmitting}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSubmitToCGSD}
                                    disabled={isSubmitting}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={15} className="animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Send size={15} /> Confirm Submit</>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
