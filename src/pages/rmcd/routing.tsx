import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Filter, Send, CheckCircle, Clock, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'react-hot-toast'

export default function RmcdRoutingPage() {
    const { user } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [requests, setRequests] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [endorsing, setEndorsing] = useState<string | null>(null)

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('inventory_request')
            .select(`
                inventory_request_id,
                inventory_scope,
                date_requested,
                status,
                requesting_office,
                property_id,
                property!left (
                    property_name,
                    location,
                    asset_condition
                ),
                government_office!requesting_office (
                    office_name
                )
            `)
            .in('status', ['pending', 'in_progress'])
            .order('date_requested', { ascending: false })

        if (error) {
            console.error('Error fetching requests:', error)
            toast.error('Failed to load inventory requests.')
        } else {
            setRequests(data || [])
        }
        setIsLoading(false)
    }

    const handleEndorse = async (item: any) => {
        if (!user) return
        setEndorsing(item.inventory_request_id)
        const toastId = toast.loading('Endorsing request to FAMCD...')

        const { error } = await supabase
            .from('inventory_request')
            .update({ status: 'in_progress' })
            .eq('inventory_request_id', item.inventory_request_id)

        if (error) {
            console.error('Error endorsing request:', error)
            toast.error('Failed to endorse request.', { id: toastId })
        } else {
            toast.success(`Request ${item.inventory_request_id} endorsed to FAMCD!`, { id: toastId })
            fetchRequests()
        }
        setEndorsing(null)
    }

    const filtered = requests.filter(r =>
        r.inventory_request_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.inventory_scope?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.requesting_office?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.property?.property_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const pendingCount = requests.filter(r => r.status === 'pending').length
    const endorsedCount = requests.filter(r => r.status === 'in_progress').length

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Request Routing</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Receive incoming inventory requests and endorse them to FAMCD for physical inspection.
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
                        <Clock size={14} className="text-amber-500" />
                        <span className="text-amber-600 font-semibold">{pendingCount}</span>
                        <span className="text-muted-foreground">Pending</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                        <CheckCircle size={14} className="text-emerald-500" />
                        <span className="text-emerald-600 font-semibold">{endorsedCount}</span>
                        <span className="text-muted-foreground">Endorsed</span>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by ID, scope, or office..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchRequests}>
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
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Request ID / Scope</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Target Property</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Requesting Office</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[12%]">Date Filed</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-[13%]">Status</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Action</th>
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
                                            No inventory requests found.
                                        </td>
                                    </tr>
                                ) : filtered.map((item) => (
                                    <tr key={item.inventory_request_id} className="hover:bg-accent/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-600 shrink-0">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">{item.inventory_request_id}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[180px]" title={item.inventory_scope}>
                                                        {item.inventory_scope || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm text-foreground font-medium">{item.property?.property_name || 'General Assessment'}</div>
                                            <div className="text-xs text-muted-foreground">{item.property?.location || '—'}</div>
                                            <div className="text-xs text-muted-foreground mt-1">Previous: <span className="font-medium">{item.property?.asset_condition || 'Unknown'}</span></div>
                                        </td>
                                        <td className="p-4 text-sm text-muted-foreground">{(item as any).government_office?.office_name || item.requesting_office || '—'}</td>
                                        <td className="p-4 text-sm text-muted-foreground">{item.date_requested || '—'}</td>
                                        <td className="p-4">
                                            {item.status === 'pending' && (
                                                <Badge variant="warning" className="text-[10px] uppercase">Pending</Badge>
                                            )}
                                            {item.status === 'in_progress' && (
                                                <Badge variant="success" className="text-[10px] uppercase">Endorsed ✓</Badge>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {item.status === 'pending' ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleEndorse(item)}
                                                    disabled={endorsing === item.inventory_request_id}
                                                    className="bg-teal-600 hover:bg-teal-700 text-white"
                                                >
                                                    <Send size={14} className="mr-1.5" />
                                                    {endorsing === item.inventory_request_id ? 'Endorsing...' : 'Endorse to FAMCD'}
                                                </Button>
                                            ) : (
                                                <span className="text-xs text-emerald-600 font-medium flex items-center justify-end gap-1">
                                                    <CheckCircle size={13} /> Forwarded
                                                </span>
                                            )}
                                        </td>
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