import React, { useState, useEffect } from 'react'
import { Search, Eye, CheckCircle, XCircle, Plus, Loader2, Shield } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Pagination } from '@/components/ui/pagination'

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-pending', 
    under_review: 'badge-pending', 
    ssdd_evaluated: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    verified: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    signed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    approved: 'badge-approved',
    rejected: 'badge-rejected', 
    completed: 'badge-completed',
}
type ApplicationWithRelations = {
    application_id: string
    application_status: string
    is_indigent?: boolean
    person_id?: string
    deceased_id?: string
    submission_date?: string
    person?: { full_name: string }
    deceased?: { full_name: string; date_of_death: string; death_certificate_no: string }
}

export default function BurialApplications() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<ApplicationWithRelations | null>(null)
    const [applications, setApplications] = useState<ApplicationWithRelations[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const [showNewModal, setShowNewModal] = useState(false)
    const [personOptions, setPersonOptions] = useState<{ person_id: string; full_name: string }[]>([])
    const [deceasedOptions, setDeceasedOptions] = useState<{ deceased_id: string; full_name: string }[]>([])
    const [formData, setFormData] = useState({
        person_id: '',
        deceased_id: '',
        submission_date: new Date().toISOString().split('T')[0],
    })
    const [isSaving, setIsSaving] = useState(false)

    async function fetchOptions() {
        try {
            const [pRes, dRes] = await Promise.all([
                supabase.from('person').select('person_id, full_name'),
                supabase.from('deceased').select('deceased_id, full_name')
            ])
            setPersonOptions(pRes.data || [])
            setDeceasedOptions(dRes.data || [])
        } catch (err) {
            console.error('Error fetching options:', err)
        }
    }

    useEffect(() => {
        if (showNewModal) fetchOptions()
    }, [showNewModal])

    useEffect(() => {
        fetchApplications()
    }, [])

    async function fetchApplications() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('online_burial_application')
                .select(`
                    *,
                    person:person_id (full_name),
                    deceased:deceased_id (full_name, date_of_death, death_certificate_no)
                `)
                .order('submission_date', { ascending: false })

            if (error) throw error
            setApplications(data || [])
        } catch (error) {
            toast.error('Failed to fetch applications: ' + (error as Error).message)
        } finally {
            setLoading(false)
        }
    }

    async function updateStatus(id: string, status: string) {
        setActionLoading(id)
        try {
            const { error } = await supabase
                .from('online_burial_application')
                .update({ application_status: status })
                .eq('application_id', id)

            if (error) throw error
            toast.success(`Application ${status} successfully`)
            fetchApplications()
            if (selected?.application_id === id) setSelected(null)
        } catch (error) {
            toast.error('Failed to update status: ' + (error as Error).message)
        } finally {
            setActionLoading(null)
        }
    }

    async function handleCreateApplication() {
        if (!formData.person_id || !formData.deceased_id) {
            toast.error('Please select both applicant and deceased')
            return
        }

        setIsSaving(true)
        try {
            const newId = `OBA-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            const { error } = await supabase
                .from('online_burial_application')
                .insert({
                    application_id: newId,
                    person_id: formData.person_id,
                    deceased_id: formData.deceased_id,
                    submission_date: formData.submission_date,
                    application_status: 'pending',
                    document_validation_status: 'pending'
                })

            if (error) throw error
            toast.success('Burial application created successfully')
            setShowNewModal(false)
            fetchApplications()
        } catch (error) {
            toast.error('Failed to create application: ' + (error as Error).message)
        } finally {
            setIsSaving(false)
        }
    }

    const filtered = applications.filter(a => {
        const applicantName = a.person?.full_name || ''
        const deceasedName = a.deceased?.full_name || ''
        const matchSearch = applicantName.toLowerCase().includes(search.toLowerCase())
            || deceasedName.toLowerCase().includes(search.toLowerCase())
            || a.application_id.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || a.application_status === statusFilter
        return matchSearch && matchStatus
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Reset to page 1 when filter/search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter])

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Burial Applications</h1>
                    <p className="text-slate-400 text-sm mt-0.5">Online_Burial_Application — Incoming requests</p>
                </div>
                <button 
                    onClick={() => setShowNewModal(true)}
                    className="btn-primary self-start sm:self-auto"
                >
                    <Plus size={15} /> New Application
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by applicant, deceased, or ID…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                            <Loader2 className="animate-spin" size={24} />
                            <p className="text-sm">Loading applications...</p>
                        </div>
                    ) : (
                        <table className="w-full min-w-[720px]">
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                {['Application ID', 'Applicant', 'Deceased', 'Date of Death', 'Death Cert. No.', 'Status', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.map(app => (
                                <tr key={app.application_id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelected(app)}>
                                    <td className="px-4 py-3 text-sm font-mono text-blue-400">{app.application_id}</td>
                                    <td className="px-4 py-3 text-sm text-white">{app.person?.full_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-300">{app.deceased?.full_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-400">{app.deceased?.date_of_death ? new Date(app.deceased.date_of_death).toLocaleDateString('en-PH') : '—'}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-400">{app.deceased?.death_certificate_no ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={clsx('px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight border w-fit', STATUS_BADGE[app.application_status])}>
                                                {app.application_status.replace('_', ' ')}
                                            </span>
                                            {app.is_indigent && (
                                                <span className="text-[9px] text-emerald-500 font-bold uppercase">Indigent</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="View" onClick={() => setSelected(app)}><Eye size={14} /></button>
                                            {(app.application_status === 'pending' || app.application_status === 'under_review') && (
                                                <>
                                                    <button 
                                                        disabled={!!actionLoading}
                                                        onClick={() => updateStatus(app.application_id, 'approved')}
                                                        className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors disabled:opacity-50" 
                                                        title="Approve"
                                                    >
                                                        {actionLoading === app.application_id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                                                    </button>
                                                    <button 
                                                        disabled={!!actionLoading}
                                                        onClick={() => updateStatus(app.application_id, 'rejected')}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50" 
                                                        title="Reject"
                                                    >
                                                        {actionLoading === app.application_id ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    )}
                </div>
                {!loading && filtered.length === 0 && (
                    <div className="py-16 text-center text-slate-500">No records match your search.</div>
                )}
            </div>

            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
            />

            {/* NEW APPLICATION MODAL */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowNewModal(false)}>
                    <div className="glass rounded-2xl w-full max-w-md border border-white/10 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Plus size={20} />
                                </div>
                                <h2 className="text-lg font-bold tracking-tight">New Burial Application</h2>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Applicant (Person)</label>
                                <select 
                                    className="input-field w-full"
                                    value={formData.person_id}
                                    onChange={e => setFormData(prev => ({ ...prev, person_id: e.target.value }))}
                                >
                                    <option value="">Select applicant...</option>
                                    {personOptions.map(p => (
                                        <option key={p.person_id} value={p.person_id}>{p.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Deceased Individual</label>
                                <select 
                                    className="input-field w-full"
                                    value={formData.deceased_id}
                                    onChange={e => setFormData(prev => ({ ...prev, deceased_id: e.target.value }))}
                                >
                                    <option value="">Select deceased...</option>
                                    {deceasedOptions.map(d => (
                                        <option key={d.deceased_id} value={d.deceased_id}>{d.full_name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Submission Date</label>
                                <input 
                                    type="date"
                                    className="input-field w-full"
                                    value={formData.submission_date}
                                    onChange={e => setFormData(prev => ({ ...prev, submission_date: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleCreateApplication}
                                disabled={isSaving}
                                className="w-full gradient-primary py-3 rounded-xl font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                Create Application
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}