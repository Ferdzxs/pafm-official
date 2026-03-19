import React, { useEffect, useState, useCallback } from 'react'
import { Search, Plus, FileText, Download, Upload, Eye, User, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

interface BrgyDocument {
    id: string
    doc_no: string
    title: string
    type: 'resolution' | 'certificate' | 'permit' | 'clearance' | 'memo' | 'letter'
    for_name?: string
    filed_date: string
    filed_by: string
    status: 'draft' | 'filed' | 'released'
}

const DOC_TYPES = ['All', 'resolution', 'certificate', 'permit', 'clearance', 'memo', 'letter']
const DOC_COLOR: Record<string, string> = {
    resolution: '#a78bfa', certificate: '#34d399', permit: '#60a5fa',
    clearance: '#fbbf24', memo: '#fb923c', letter: '#e879f9',
}

interface RawDocumentData {
    document_id: string
    document_no: string | null
    title: string
    document_type: string
    issued_to: string | null
    purpose: string | null
    created_at: string
    status: string
    issued_by: string | null
    document_date: string | null
}

const STATUS_BADGE: Record<string, string> = {
    draft: 'badge-pending', filed: 'badge-completed', released: 'badge-approved',
}

export default function DocumentsFiling() {
    const { user } = useAuth()
    const [documents, setDocuments] = useState<BrgyDocument[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('All')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<BrgyDocument | null>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState({
        doc_no: '',
        title: '',
        type: 'certificate' as BrgyDocument['type'],
        for_name: '',
        status: 'draft' as BrgyDocument['status']
    })
    const [saving, setSaving] = useState(false)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('barangay_documents')
                .select(`
                    document_id,
                    document_no,
                    title,
                    document_type,
                    issued_to,
                    purpose,
                    created_at,
                    status,
                    issued_by,
                    document_date
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            const formatted: BrgyDocument[] = (data as unknown as RawDocumentData[] || []).map(d => {
                return {
                    id: d.document_id,
                    doc_no: d.document_no || d.document_id,
                    title: d.title,
                    type: d.document_type as BrgyDocument['type'],
                    for_name: d.issued_to || undefined,
                    filed_date: d.created_at,
                    filed_by: d.issued_by || 'Secretary Office',
                    status: d.status as BrgyDocument['status']
                }
            })

            setDocuments(formatted)
        } catch (error: unknown) {
            console.error('Error fetching documents:', error)
            const message = error instanceof Error ? error.message : 'Failed to load documents'
            toast.error(message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreateDocument = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.doc_no || !formData.type) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setSaving(true)
            const { error } = await supabase
                .from('barangay_documents')
                .insert({
                    document_no: formData.doc_no,
                    title: formData.title,
                    document_type: formData.type,
                    issued_to: formData.for_name || null,
                    purpose: null,
                    status: formData.status,
                    issued_by: user?.full_name ?? null,
                    document_date: new Date().toISOString().split('T')[0],
                })

            if (error) throw error

            toast.success("Document recorded successfully")
            setShowAddModal(false)
            setFormData({
                doc_no: '',
                title: '',
                type: 'certificate',
                for_name: '',
                status: 'draft'
            })
            fetchData()
        } catch (error: unknown) {
            console.error('Error creating document:', error)
            const message = error instanceof Error ? error.message : 'Failed to record document'
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const filtered = documents.filter(d => {
        const q = search.toLowerCase()
        return (d.title.toLowerCase().includes(q) || d.doc_no.toLowerCase().includes(q) || (d.for_name ?? '').toLowerCase().includes(q))
            && (typeFilter === 'All' || d.type === typeFilter)
            && (statusFilter === 'all' || d.status === statusFilter)
    })

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Barangay Documents</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>Official records, certificates, permits & resolutions</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary" onClick={() => toast.error("Upload feature coming soon")}><Upload size={15} /> Upload</button>
                    <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus size={15} /> New Document</button>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                {[
                    { label: 'Draft', count: documents.filter(d => d.status === 'draft').length, color: '#fbbf24' },
                    { label: 'Filed', count: documents.filter(d => d.status === 'filed').length, color: '#93c5fd' },
                    { label: 'Released', count: documents.filter(d => d.status === 'released').length, color: '#34d399' },
                ].map(s => (
                    <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-row items-center gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
                    <input className="input-field pl-9" placeholder="Search by title, doc no., or recipient…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field flex-1" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
                <select className="input-field flex-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="filed">Filed</option>
                    <option value="released">Released</option>
                </select>
            </div>

            {/* List */}
            <div className="space-y-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '1rem' }}>
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>Fetching official documents archive...</p>
                    </div>
                ) : filtered.length > 0 ? (
                    filtered.map(doc => (
                        <div
                            key={doc.id}
                            onClick={() => setSelected(doc)}
                            className="rounded-xl p-4 cursor-pointer transition-all card-hover flex items-center gap-4"
                            style={{ background: 'var(--color-card)', border: `1px solid ${DOC_COLOR[doc.type] || 'var(--color-border)'}22` }}
                        >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${DOC_COLOR[doc.type] || 'var(--color-border)'}15` }}>
                                <FileText size={18} style={{ color: DOC_COLOR[doc.type] || 'var(--color-text-muted)' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-text-muted)' }}>{doc.doc_no}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full capitalize" style={{ background: `${DOC_COLOR[doc.type] || 'var(--color-border)'}18`, color: DOC_COLOR[doc.type] || 'var(--color-text-muted)' }}>{doc.type}</span>
                                </div>
                                <div className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{doc.title}</div>
                                {doc.for_name && (
                                    <div className="flex items-center gap-1 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                        <User size={10} /> For: {doc.for_name}
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[doc.status] || 'badge-pending'}`}>{doc.status}</span>
                                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(doc.filed_date).toLocaleDateString('en-PH')}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} onClick={() => setSelected(doc)} title="View"><Eye size={14} /></button>
                                <button className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--color-text-muted)' }} title="Download" onClick={() => toast.error("Download feature coming soon")}><Download size={14} /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="py-24 text-center" style={{ color: 'var(--color-text-muted)' }}>
                        <FileText size={40} className="mx-auto mb-4 opacity-10" />
                        <p>No documents found matching your filters.</p>
                        <button className="text-xs text-blue-400 underline mt-2" onClick={() => { setSearch(''); setTypeFilter('All'); setStatusFilter('all'); }}>Clear all filters</button>
                    </div>
                )}
            </div>

            {/* Detail modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>{selected.doc_no}</h2>
                            <button onClick={() => setSelected(null)} style={{ color: 'var(--color-text-muted)' }} className="text-xl">✕</button>
                        </div>
                        <div className="space-y-3">
                            {[
                                ['Title', selected.title],
                                ['Type', selected.type],
                                ['Status', selected.status],
                                ...(selected.for_name ? [['For', selected.for_name]] : []),
                                ['Filed By', selected.filed_by],
                                ['Filed Date', new Date(selected.filed_date).toLocaleDateString('en-PH')],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{l}</span>
                                    <span className="text-sm capitalize" style={{ color: 'var(--color-text-primary)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button className="btn-primary flex-1 justify-center" onClick={() => toast.error("Download feature coming soon")}><Download size={14} /> Download</button>
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Document Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-lg" style={{ color: 'var(--color-text-primary)' }}>New Document Record</h2>
                            <button onClick={() => setShowAddModal(false)} style={{ color: 'var(--color-text-muted)' }} className="text-xl">✕</button>
                        </div>
                        <form onSubmit={handleCreateDocument} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Document No. *</label>
                                    <input 
                                        className="input-field" 
                                        placeholder="e.g. DOC-2024-001" 
                                        value={formData.doc_no} 
                                        onChange={e => setFormData({...formData, doc_no: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Type *</label>
                                    <select 
                                        className="input-field" 
                                        value={formData.type} 
                                        onChange={e => setFormData({...formData, type: e.target.value as BrgyDocument['type']})}
                                    >
                                        {DOC_TYPES.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Title / Subject *</label>
                                <input 
                                    className="input-field" 
                                    placeholder="Title or subject of the document" 
                                    value={formData.title} 
                                    onChange={e => setFormData({...formData, title: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Recipient / For (Optional)</label>
                                <input 
                                    className="input-field" 
                                    placeholder="Name of constituent or entity" 
                                    value={formData.for_name} 
                                    onChange={e => setFormData({...formData, for_name: e.target.value})}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Initial Status</label>
                                <select 
                                    className="input-field" 
                                    value={formData.status} 
                                    onChange={e => setFormData({...formData, status: e.target.value as BrgyDocument['status']})}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="filed">Filed</option>
                                    <option value="released">Released</option>
                                </select>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <button type="submit" className="btn-primary flex-1 justify-center py-2.5" disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={16} />}
                                    Record Document
                                </button>
                                <button type="button" className="btn-secondary flex-1 justify-center py-2.5" onClick={() => setShowAddModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
