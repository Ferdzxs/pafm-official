import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Eye, Layers, XCircle, MapPin, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function FamcdInventoryAssets() {
    const [searchTerm, setSearchTerm] = useState('')
    const [properties, setProperties] = useState<any[]>([])
    const [selectedProperty, setSelectedProperty] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchProperties()
    }, [])

    const fetchProperties = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('property')
            .select(`
                property_id,
                property_name,
                property_type,
                location,
                asset_condition,
                acquisition_date,
                area_size,
                government_office!managing_office (
                    office_name
                )
            `)
            .order('property_name', { ascending: true })

        if (error) {
            console.error('Error fetching properties:', error)
            toast.error('Failed to load assets.')
        } else {
            setProperties(data || [])
        }
        setIsLoading(false)
    }

    const filtered = useMemo(() =>
        properties.filter(p =>
            p.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.location?.toLowerCase().includes(searchTerm.toLowerCase())
        ), [properties, searchTerm])

    const getConditionBadge = (condition: string) => {
        switch (condition?.toLowerCase()) {
            case 'excellent': return <Badge variant="success" className="text-[10px] uppercase">Excellent</Badge>
            case 'good': return <Badge variant="success" className="text-[10px] uppercase">Good</Badge>
            case 'fair': return <Badge variant="warning" className="text-[10px] uppercase">Fair</Badge>
            case 'poor': return <Badge variant="destructive" className="text-[10px] uppercase">Poor</Badge>
            default: return <Badge variant="secondary" className="text-[10px] uppercase">{condition || 'Unknown'}</Badge>
        }
    }

    return (
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Inventory & Assets</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Read-only reference of city-owned properties. Condition updates flow through your inspection reports.
                    </p>
                </div>
            </div>

            {/* Search */}
            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by name or location..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchProperties}>
                        <Filter size={16} /> Refresh
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="shadow-sm border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border bg-muted/50">
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/3">Asset</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Type</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/6">Condition</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Managing Office</th>
                                    <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">Loading asset registry...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">No assets found.</td></tr>
                                ) : filtered.map(property => (
                                    <tr key={property.property_id} className="hover:bg-accent/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600 shrink-0">
                                                    <Layers size={18} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm text-foreground">{property.property_name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{property.location || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-foreground capitalize">{property.property_type || '—'}</td>
                                        <td className="p-4">{getConditionBadge(property.asset_condition)}</td>
                                        <td className="p-4 text-sm text-muted-foreground">
                                            {(property as any).government_office?.office_name || 'Unassigned'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedProperty(property)}>
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

            {/* Read-Only Detail Modal */}
            {selectedProperty && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-lg shadow-xl relative z-[101] bg-card">
                        <div className="flex justify-between items-start p-6 border-b border-border">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Asset Details</h2>
                                <p className="text-sm text-muted-foreground mt-1">ID: {selectedProperty.property_id}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
                                <XCircle size={20} />
                            </Button>
                        </div>

                        <CardContent className="p-6 space-y-4">
                            {/* Read-only fields */}
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">Asset Name</div>
                                    <div className="text-sm font-medium text-foreground">{selectedProperty.property_name}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><MapPin size={11} /> Location</div>
                                    <div className="text-sm text-foreground">{selectedProperty.location || '—'}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1">Type</div>
                                        <div className="text-sm capitalize text-foreground">{selectedProperty.property_type || '—'}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1">Condition</div>
                                        <div className="mt-0.5">{getConditionBadge(selectedProperty.asset_condition)}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1">Area (sq.m)</div>
                                        <div className="text-sm text-foreground">{selectedProperty.area_size || '—'}</div>
                                    </div>
                                    <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                        <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1"><Calendar size={11} /> Acquired</div>
                                        <div className="text-sm text-foreground">{selectedProperty.acquisition_date || '—'}</div>
                                    </div>
                                </div>
                                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1">Managing Office</div>
                                    <div className="text-sm text-foreground">{(selectedProperty as any).government_office?.office_name || 'Unassigned'}</div>
                                </div>
                            </div>

                            {/* Info note */}
                            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600">
                                To update the condition of this asset, submit an Ocular Inspection report. Conditions are updated automatically upon CGSD approval.
                            </div>

                            <div className="flex justify-end pt-2 border-t border-border">
                                <Button variant="outline" onClick={() => setSelectedProperty(null)}>Close</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
