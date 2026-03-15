import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, Download, Plus, Eye, MapPin, Building2, Layers } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

export default function InventoryAssetsPage() {
    const [searchTerm, setSearchTerm] = useState('')
    const [properties, setProperties] = useState<any[]>([])
    const [selectedProperty, setSelectedProperty] = useState<any | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    const [editValues, setEditValues] = useState({
        property_name: '',
        location: '',
        asset_condition: '',
        area_size: '',
    })

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
                location,
                asset_condition,
                acquisition_date
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

    const openPropertyModal = (property: any) => {
        setSelectedProperty(property)
        setEditValues({
            property_name: property.property_name || '',
            location: property.location || '',
            asset_condition: property.asset_condition || '',
            area_size: property.area_size || '',
        })
    }

    const saveProperty = async () => {
        if (!selectedProperty) return

        setIsSaving(true)
        const { error } = await supabase
            .from('property')
            .update({
                property_name: editValues.property_name,
                location: editValues.location,
                asset_condition: editValues.asset_condition,
                area_size: editValues.area_size,
            })
            .eq('property_id', selectedProperty.property_id)

        setIsSaving(false)

        if (error) {
            console.error('Error saving property:', error)
            toast.error(`Failed to save asset changes: ${error.message ?? error}`)
            return
        }

        toast.success('Asset details updated.')
        setSelectedProperty(null)
        fetchProperties()
    }

    const filtered = properties.filter(p =>
        p.property_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.location?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getTypeColor = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'land': return 'bg-emerald-500/10 text-emerald-600'
            case 'building': return 'bg-blue-500/10 text-blue-600'
            case 'facility': return 'bg-purple-500/10 text-purple-600'
            default: return 'bg-gray-500/10 text-gray-600'
        }
    }

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
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-display text-2xl font-bold text-foreground">Inventory & Assets</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Master registry of all city-owned land, buildings, and facilities.
                    </p>
                </div>
            </div>

            <Card className="mb-6 shadow-sm border-border">
                <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between bg-card">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                        <Input
                            placeholder="Search by name or location..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-10 w-full bg-background"
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto gap-2" onClick={fetchProperties}>
                        <Filter size={16} /> Refresh
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-sm border-border overflow-hidden bg-card">
                <div className="overflow-x-auto">
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-left border-collapse bg-card">
                        <thead>
                            <tr className="border-b border-border bg-muted/50">
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/4">Asset</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Type</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Condition</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground w-1/5">Office</th>
                                <th className="p-4 text-xs font-semibold text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                        Loading asset registry...
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground text-sm">
                                        No assets found matching your search.
                                    </td>
                                </tr>
                            ) : filtered.map((property) => (
                                <tr key={property.property_id} className="hover:bg-accent/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600 shrink-0">
                                                <Layers size={18} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm text-foreground" title={property.property_name}>{property.property_name}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[220px]" title={property.location}>{property.location}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-foreground capitalize">{property.property_type}</td>
                                    <td className="p-4">{getConditionBadge(property.asset_condition)}</td>
                                    <td className="p-4 text-sm text-muted-foreground" title={property.government_office?.office_name}>{property.government_office?.office_name || 'Unassigned'}</td>
                                    <td className="p-4 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => openPropertyModal(property)}>
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

            {selectedProperty && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <Card className="w-full max-w-lg shadow-xl relative z-[101] bg-card">
                        <div className="flex justify-between items-start p-6 border-b border-border">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Asset Details</h2>
                                <p className="text-sm text-muted-foreground mt-1">ID: {selectedProperty.property_id}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedProperty(null)}>
                                <Eye size={20} />
                            </Button>
                        </div>

                        <CardContent className="p-6 space-y-6">
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Asset Name</label>
                                    <Input
                                        value={editValues.property_name}
                                        onChange={(e) => setEditValues({ ...editValues, property_name: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-muted-foreground">Location</label>
                                    <Input
                                        value={editValues.location}
                                        onChange={(e) => setEditValues({ ...editValues, location: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground">Condition</label>
                                        <select
                                            value={editValues.asset_condition}
                                            onChange={(e) => setEditValues({ ...editValues, asset_condition: e.target.value })}
                                            className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-sm"
                                        >
                                            <option value="Excellent">Excellent</option>
                                            <option value="Good">Good</option>
                                            <option value="Fair">Fair</option>
                                            <option value="Poor">Poor</option>
                                            <option value="Condemned / Beyond Repair">Condemned / Beyond Repair</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-muted-foreground">Area (sq.m)</label>
                                        <Input
                                            value={editValues.area_size}
                                            onChange={(e) => setEditValues({ ...editValues, area_size: e.target.value })}
                                            className="mt-1"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                    <Button variant="outline" onClick={() => setSelectedProperty(null)}>
                                        Close
                                    </Button>
                                    <Button onClick={saveProperty} disabled={isSaving}>
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
