import React, { useEffect, useState, useMemo } from 'react'
import { Package, Plus, Search, Filter, Clock, CheckCircle, XCircle, Send, RefreshCw, Paperclip } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import { AdminDeskPageShell } from '@/components/layout/AdminDeskPageShell'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog'

type RequestRow = {
    id: string
    item: string
    status: string
    date: string
    priority: string
    notes: string
}

const OFFICE_NAME = 'Cemetery Office'

const priorityColors: Record<string, string> = {
    High: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
    Medium: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    Low: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
}

const statusColors: Record<string, string> = {
    Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    Approved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    Rejected: 'bg-red-500/10 text-red-600 dark:text-red-400',
    'In Progress': 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
}

export default function CemeteryAssetRequestsPage() {
    const { user } = useAuth()
    const [requests, setRequests] = useState<RequestRow[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // New request form state
    const [formItem, setFormItem] = useState('')
    const [formPriority, setFormPriority] = useState('Medium')
    const [formNotes, setFormNotes] = useState('')
    const [formFiles, setFormFiles] = useState<Record<string, File | null>>({ letter: null, ra16: null, nr15: null })

    const load = async () => {
        setIsLoading(true)
        const { data, error } = await supabase
            .from('inventory_request')
            .select(`
                inventory_request_id,
                inventory_scope,
                status,
                date_requested,
                cycle_type,
                government_office!requesting_office ( office_name )
            `)
            .order('date_requested', { ascending: false })

        if (error) {
            console.error(error)
            toast.error('Failed to load requests.')
            setIsLoading(false)
            return
        }

        const mapped: RequestRow[] = (data || [])
            .filter((r: any) => r.government_office?.office_name === OFFICE_NAME)
            .map((r: any) => ({
                id: r.inventory_request_id,
                item: r.inventory_scope || 'General request',
                status: (() => {
                    const s = r.status?.toLowerCase()
                    if (s === 'approved' || s === 'completed') return 'Approved'
                    if (s === 'rejected') return 'Rejected'
                    if (s === 'in_progress') return 'In Progress'
                    return 'Pending'
                })(),
                date: r.date_requested || '',
                priority: ['Low', 'Medium', 'High'].includes(r.cycle_type) ? r.cycle_type : 'Medium',
                notes: '',
            }))

        setRequests(mapped)
        setIsLoading(false)
    }

    useEffect(() => { load() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return requests
        const q = search.toLowerCase()
        return requests.filter(r => r.id.toLowerCase().includes(q) || r.item.toLowerCase().includes(q))
    }, [requests, search])

    const stats = useMemo(() => ({
        Pending: requests.filter(r => r.status === 'Pending').length,
        Approved: requests.filter(r => r.status === 'Approved').length,
        Rejected: requests.filter(r => r.status === 'Rejected').length,
    }), [requests])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formItem.trim()) { toast.error('Please enter an item or service.'); return }
        setSubmitting(true)

        // Get office ID
        const { data: officeData, error: officeErr } = await supabase
            .from('government_office')
            .select('office_id')
            .eq('office_name', OFFICE_NAME)
            .maybeSingle()

        if (officeErr || !officeData) {
            toast.error('Could not find office record.')
            setSubmitting(false)
            return
        }

        const today = new Date().toISOString().split('T')[0]
        const reqId = `REQ-CO-${Date.now()}`

        const attachedDocs = Object.entries(formFiles).filter(([, f]) => f !== null)
        const docLabel = attachedDocs.map(([k]) => k === 'letter' ? 'Request Letter' : k === 'ra16' ? 'RA-16' : 'NR-15').join(', ')
        const scopeWithDocs = formItem.trim() + (docLabel ? ` [Docs: ${docLabel}]` : '')

        const { error } = await supabase.from('inventory_request').insert({
            inventory_request_id: reqId,
            requesting_office: officeData.office_id,
            inventory_scope: scopeWithDocs,
            status: 'pending',
            date_requested: today,
            cycle_type: formPriority,
        })

        if (error) {
            console.error(error)
            toast.error('Failed to submit request: ' + error.message)
        } else {
            // Convert files to base64 and save directly to digital_document
            const toBase64 = (file: File): Promise<string> =>
                new Promise((res, rej) => {
                    const r = new FileReader()
                    r.onload = () => res(r.result as string)
                    r.onerror = rej
                    r.readAsDataURL(file)
                })

            await Promise.all(
                attachedDocs.map(async ([key, file]) => {
                    try {
                        const dataUrl = await toBase64(file!)
                        await supabase.from('digital_document').insert({
                            document_id: `DOC-${reqId}-${key}`,
                            document_type: `asset_request_${key}`,
                            reference_no: reqId,
                            date_created: today,
                            status: 'attached',
                            created_by_office: officeData.office_id,
                            received_by_employee: null,
                            person_id: null,
                            file_url: dataUrl,
                        })
                    } catch (err) {
                        console.error('Failed to save doc:', err)
                    }
                })
            )
            toast.success('Request submitted to FAMCD!')
            setShowModal(false)
            setFormItem('')
            setFormPriority('Medium')
            setFormNotes('')
            setFormFiles({ letter: null, ra16: null, nr15: null })
            load()
        }
        setSubmitting(false)
    }

    if (!user) return null
    const meta = ROLE_META[user.role]

    return (
        <>
        <AdminDeskPageShell
            roleLabel={meta.label}
            roleColor={meta.color}
            roleBgColor={meta.bgColor}
            title="Asset & resource requests"
            description="Submit and track maintenance or resource requests sent to FAMCD (Cemetery Office)."
            wide
            actions={
                <>
                    <button
                        type="button"
                        onClick={load}
                        className="px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all border border-border bg-card text-foreground hover:bg-muted"
                    >
                        <RefreshCw size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowModal(true)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus size={16} /> New Request
                    </button>
                </>
            }
        >
        <div className="space-y-6">
            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Pending', value: stats.Pending, icon: Clock, color: '#f59e0b' },
                    { label: 'Approved', value: stats.Approved, icon: CheckCircle, color: '#10b981' },
                    { label: 'Rejected', value: stats.Rejected, icon: XCircle, color: '#ef4444' },
                ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}>
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
                                <p className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* SEARCH */}
            <div className="flex flex-col sm:flex-row items-center gap-3 p-2 rounded-2xl bg-card border border-border">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search requests..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-transparent outline-none text-foreground"
                    />
                </div>
                <div className="w-px h-6 hidden sm:block bg-border" />
                <button onClick={() => setSearch('')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl text-foreground hover:bg-muted transition-colors">
                    <Filter size={16} /> Clear
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-card rounded-2xl overflow-hidden border border-border">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-border bg-muted/40">
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Request ID</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Item / Service</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Date Requested</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground">Priority</th>
                                <th className="px-6 py-4 font-semibold text-muted-foreground text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading requests...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>No requests found. Click "New Request" to submit one.</td></tr>
                            ) : filtered.map((req) => (
                                <tr key={req.id} className="hover:bg-muted/40 transition-colors">
                                    <td className="px-6 py-4 font-medium text-primary">{req.id}</td>
                                    <td className="px-6 py-4 font-medium text-foreground">{req.item}</td>
                                    <td className="px-6 py-4 text-muted-foreground">{req.date}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${priorityColors[req.priority] || priorityColors.Medium}`}>
                                            {req.priority}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusColors[req.status] || 'bg-muted text-muted-foreground'}`}>
                                            {req.status}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
        </AdminDeskPageShell>

        {/* NEW REQUEST MODAL */}
        <Dialog open={showModal} onOpenChange={(open) => !open && setShowModal(false)}>
            <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none max-h-[92vh]">
                <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border border-border bg-muted/40 text-muted-foreground">Asset Request</span>
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">Cemetery Office</span>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" type="button">
                                <XCircle size={18} className="text-muted-foreground" />
                            </button>
                        </div>
                        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                            New Asset Request
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                            Submitting to FAMCD - Cemetery office workflow.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Item / Service Requested *</label>
                                <input
                                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    placeholder="e.g. Lawnmower Parts, Grave Digging Equipment Maintenance"
                                    value={formItem}
                                    onChange={e => setFormItem(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Priority</label>
                                <select
                                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50"
                                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    value={formPriority}
                                    onChange={e => setFormPriority(e.target.value)}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-1.5">Notes (optional)</label>
                                <textarea
                                    className="w-full px-3 py-2.5 rounded-xl text-sm border border-border bg-background text-foreground outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                                    placeholder="Additional context for FAMCD..."
                                    rows={3}
                                    value={formNotes}
                                    onChange={e => setFormNotes(e.target.value)}
                                />
                            </div>
                            {/* DOCUMENT ATTACHMENTS */}
                            <div className="admin-box">
                                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">Supporting Documents <span className="font-normal normal-case tracking-normal">(optional)</span></label>
                                <div className="space-y-2">
                                    {[
                                        { key: 'letter', label: 'Request Letter', hint: 'QCG-GSD-FAIS-IRL' },
                                        { key: 'ra16',   label: 'Land Assessment Form', hint: 'RA-16' },
                                        { key: 'nr15',   label: 'Building / Structure Form', hint: 'NR-15' },
                                    ].map(doc => (
                                        <div key={doc.key} className="flex items-center gap-3 p-2.5 rounded-xl border border-dashed border-border bg-background">
                                            <Paperclip size={14} style={{ color: 'var(--color-text-muted)' }} className="flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>{doc.label} <span style={{ color: 'var(--color-text-muted)' }}>({doc.hint})</span></p>
                                                {formFiles[doc.key] ? (
                                                    <p className="text-xs truncate text-emerald-600 dark:text-emerald-400">✓ {formFiles[doc.key]!.name}</p>
                                                ) : (
                                                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>No file selected</p>
                                                )}
                                            </div>
                                            <label className="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 bg-primary/10 text-primary">
                                                Browse
                                                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" className="hidden"
                                                    onChange={e => setFormFiles(prev => ({ ...prev, [doc.key]: e.target.files?.[0] ?? null }))}
                                                />
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>Accepted: PDF, Word, JPG, PNG</p>
                            </div>
                            <DialogFooter className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setShowModal(false)}
                                    className="h-11 rounded-xl px-6 text-[11px] font-extrabold uppercase tracking-widest border border-border bg-background text-foreground hover:bg-muted transition-all"
                                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={submitting}
                                    className="h-11 rounded-xl px-6 text-[11px] font-extrabold uppercase tracking-widest text-white flex items-center gap-2 disabled:opacity-60 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all"
                                    style={{ background: '#2563eb', color: '#fff' }}>
                                    <Send size={15} /> {submitting ? 'Submitting...' : 'Submit to FAMCD'}
                                </button>
                            </DialogFooter>
                        </form>
                </div>
            </DialogContent>
        </Dialog>
        </>
    )
}