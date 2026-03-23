import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, FileCheck, PackageCheck, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function RmcdReleasesPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [reports, setReports] = useState<any[]>([])
    const [releasedIds, setReleasedIds] = useState<Set<string>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [releasing, setReleasing] = useState<string | null>(null)

    useEffect(() => {
        fetchApprovedReports()
    }, [])

    const fetchApprovedReports = async () => {
        setIsLoading(true)

        // Fetch approved inventory reports
        const { data: reportData, error: reportError } = await supabase
            .from('inventory_report')
            .select(`
                inventory_report_id,
                inventory_request_id,
                preparation_date,
                approval_status,
                inventory_request (
                    inventory_scope,
                    requesting_office
                ),
                government_office (
                    office_name
                )
            `)
            .eq('approval_status', 'approved')
            .order('preparation_date', { ascending: false })

        if (reportError) {
            console.error('Error fetching approved reports:', reportError)
            toast.error('Failed to load approved reports.')
            setIsLoading(false)
            return
        }

        setReports(reportData || [])

        // Separately check which ones have already been marked as released
        if (reportData && reportData.length > 0) {
            const reportIds = reportData.map(r => r.inventory_report_id)
            const { data: releaseRecords } = await supabase
                .from('approval_record')
                .select('inventory_report_id')
                .in('inventory_report_id', reportIds)
                .eq('decision', 'released')

            if (releaseRecords) {
                setReleasedIds(new Set(releaseRecords.map(r => r.inventory_report_id)))
            }
        }

        setIsLoading(false)
    }

    const handleRelease = async (item: any) => {
        if (!user) return
        setReleasing(item.inventory_report_id)
        const toastId = toast.loading('Marking document as released...')

        const employeeId = user.id?.startsWith('EMP-') ? user.id : 'EMP-013'

        const { error } = await supabase
            .from('approval_record')
            .insert({
                approval_id: `REL-${Date.now()}`,
                inventory_report_id: item.inventory_report_id,
                approved_by_office: 'OFF-011',
                approved_by_employee: 'EMP-013',
                approval_date: new Date().toISOString().split('T')[0],
                decision: 'released',
                remarks: `Document officially released to requesting office on ${new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}.`
            })

        if (error) {
            console.error('Error marking as released:', error)
            toast.error('Failed to mark as released.', { id: toastId })
        } else {
            toast.success(`Report ${item.inventory_report_id} marked as released!`, { id: toastId })
            setReleasedIds(prev => new Set(prev).add(item.inventory_report_id))
        }
        setReleasing(null)
    }

    const filtered = reports.filter(r =>
        r.inventory_report_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.inventory_request?.inventory_scope || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.government_office?.office_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const pendingReleaseCount = reports.filter(r => !releasedIds.has(r.inventory_report_id)).length
    const releasedCount = releasedIds.size

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Document Releases</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Release CGSD-approved inventory reports to the requesting office and log the transaction.
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                        <Clock size={14} className="text-amber-500" />
                        <span className="text-amber-600 font-semibold">{pendingReleaseCount}</span>
                        <span className="text-muted-foreground">For Release</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                        <PackageCheck size={14} className="text-emerald-500" />
                        <span className="text-emerald-600 font-semibold">{releasedCount}</span>
                        <span className="text-muted-foreground">Released</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by Report ID or Scope..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchApprovedReports}>
                        <Filter size={16} />
                        Refresh
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="shadow-sm border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="max-h-[65vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Report ID</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Scope / Details</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Prepared By</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[12%]">Release Status</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                            Loading approved reports...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                            No approved reports available for release.
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => {
                                    const isReleased = releasedIds.has(item.inventory_report_id)
                                    return (
                                        <tr key={item.inventory_report_id} className="hover:bg-accent/50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 shrink-0">
                                                        <FileCheck size={18} />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-sm text-foreground">{item.inventory_report_id}</div>
                                                        <div className="text-xs text-muted-foreground">Approved Report</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="text-sm text-foreground font-medium truncate max-w-[250px]">
                                                    {item.inventory_request?.inventory_scope || 'General Asset Inventory'}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Date: {item.preparation_date || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-sm text-muted-foreground">
                                                {item.government_office?.office_name || 'System Generated'}
                                            </td>
                                            <td className="p-4">
                                                {isReleased ? (
                                                    <Badge variant="success" className="text-[10px] uppercase">Released ✓</Badge>
                                                ) : (
                                                    <Badge variant="warning" className="text-[10px] uppercase">For Release</Badge>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {!isReleased ? (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleRelease(item)}
                                                        disabled={releasing === item.inventory_report_id}
                                                        className="bg-teal-600 hover:bg-teal-700 text-white"
                                                    >
                                                        <PackageCheck size={14} className="mr-1.5" />
                                                        {releasing === item.inventory_report_id ? 'Releasing...' : 'Mark as Released'}
                                                    </Button>
                                                ) : (
                                                    <span className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                                                        <PackageCheck size={13} /> Released
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    )
}
