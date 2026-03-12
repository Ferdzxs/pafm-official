import React, { useState, useEffect } from 'react'
import { FileText, Download, Search, Loader2, Eye, ShieldCheck, Clock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface DigitalDocument {
    document_id: string
    document_type: string
    reference_no: string
    date_created: string
    status: string
    file_url: string
    office: { office_name: string } | null
}

const TYPE_LABELS: Record<string, string> = {
    burial_permit: '⚰️ Burial Permit',
    park_permit: '🌳 Park Permit',
    facility_permit: '🏛️ Facility Permit',
    water_connection_doc: '💧 Water Utility Doc',
    barangay_clearance: '📋 Barangay Clearance',
    certificate_of_indigency: '🤝 Cert. of Indigency',
    death_certificate: '📄 Death Certificate',
}

export default function MyDocumentsPage() {
    const { user } = useAuth()
    const [docs, setDocs] = useState<DigitalDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        if (user) fetchDocuments()
    }, [user])

    async function fetchDocuments() {
        try {
            // Get person_id
            const { data: citData } = await supabase
                .from('citizen_account')
                .select('person_id')
                .eq('account_id', user?.id)
                .single()
            
            if (!citData) return

            const { data, error } = await supabase
                .from('digital_document')
                .select('*, office:government_office(office_name)')
                .eq('person_id', citData.person_id)
                .order('date_created', { ascending: false })
            
            if (data) setDocs(data as any)
            if (error) throw error
        } catch (err) {
            console.error(err)
            toast.error('Failed to load documents')
        } finally {
            setLoading(false)
        }
    }

    const filteredDocs = docs.filter(d => 
        d.reference_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.document_type.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">My Documents</h1>
                    <p className="text-slate-400 text-sm mt-1">Access your verified digital certificates and permits</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                        type="text" 
                        placeholder="Search reference #..." 
                        className="input-field pl-9 py-2 text-sm w-full sm:w-64" 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                    <p className="text-slate-500">Retrieving your digital vault...</p>
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="text-center py-20 glass rounded-2xl border border-slate-800">
                    <ShieldCheck className="mx-auto mb-4 text-slate-700" size={48} />
                    <h3 className="text-lg font-semibold text-white">No documents found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Any permits or certificates issued to you will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDocs.map(doc => (
                        <Card key={doc.document_id} className="card-hover bg-slate-900/40 border-slate-800/50 group">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <FileText size={20} />
                                    </div>
                                    <Badge variant="success" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
                                        Verified
                                    </Badge>
                                </div>
                                <div className="mb-4">
                                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                                        {TYPE_LABELS[doc.document_type] || doc.document_type.replace('_', ' ')}
                                    </div>
                                    <h3 className="text-white font-bold text-sm mb-1">{doc.reference_no}</h3>
                                    <p className="text-xs text-slate-500 truncate">{doc.office?.office_name || 'Government Office'}</p>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                        <Clock size={12} />
                                        <span className="text-[10px]">{doc.date_created}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => window.open(doc.file_url, '_blank')}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all shadow-inner"
                                            title="View"
                                        >
                                            <Eye size={14} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                toast.success('Starting download: ' + doc.reference_no)
                                                window.open(doc.file_url, '_blank')
                                            }}
                                            className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
