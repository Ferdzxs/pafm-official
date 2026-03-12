import React, { useState, useEffect } from 'react'
import { Package, Plus, Search, Filter, Clock, CheckCircle, XCircle, Loader2, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'

export default function CemeteryAssetRequestsPage() {
    const [requests, setRequests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    const [showNewModal, setShowNewModal] = useState(false)
    const [formData, setFormData] = useState({
        scope: '',
        justification: '',
        priority: 'medium',
        cycle_type: 'one-time'
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        fetchRequests()
    }, [])

    async function fetchRequests() {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('inventory_request')
                .select('*')
                .eq('requesting_office', 'OFF-001') // Cemetery Office ID
                .order('date_requested', { ascending: false })

            if (error) throw error
            setRequests(data || [])
        } catch (error) {
            toast.error('Failed to fetch asset requests: ' + (error as any).message)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreateRequest() {
        if (!formData.scope || !formData.justification) {
            toast.error('Please provide scope and justification')
            return
        }

        setIsSaving(true)
        try {
            const newId = `REQ-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
            const { error } = await supabase
                .from('inventory_request')
                .insert({
                    inventory_request_id: newId,
                    inventory_scope: formData.scope,
                    justification: formData.justification,
                    priority: formData.priority,
                    cycle_type: formData.cycle_type,
                    status: 'pending',
                    requesting_office: 'OFF-001',
                    date_requested: new Date().toISOString()
                })

            if (error) throw error
            toast.success('Inventory request submitted successfully')
            setShowNewModal(false)
            setFormData({ scope: '', justification: '', priority: 'medium', cycle_type: 'one-time' })
            fetchRequests()
        } catch (error: any) {
            toast.error('Submission failed: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    const filtered = requests.filter(r => {
        const matchSearch = 
            r.inventory_scope?.toLowerCase().includes(search.toLowerCase()) ||
            r.inventory_request_id.toLowerCase().includes(search.toLowerCase())
        const matchStatus = statusFilter === 'all' || r.status === statusFilter
        return matchSearch && matchStatus
    })

    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    useEffect(() => {
        setCurrentPage(1)
    }, [search, statusFilter])

    const stats = {
        pending: requests.filter(r => r.status === 'pending').length,
        inProgress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto animate-fade-in text-white">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Asset & Resource Requests</h1>
                    <p className="text-sm text-slate-400 mt-1">Submit and track maintenance or resource requests to FAMCD.</p>
                </div>
                <button 
                    onClick={() => setShowNewModal(true)}
                    className="gradient-primary px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:scale-[1.02] transition-all"
                >
                    <Plus size={16} /> New Request
                </button>
            </div>

            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Pending Requests', value: stats.pending, icon: Clock, color: '#f59e0b' },
                    { label: 'In Progress', value: stats.inProgress, icon: Package, color: '#3b82f6' },
                    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: '#10b981' },
                ].map((stat, i) => {
                    const Icon = stat.icon
                    return (
                        <div key={i} className="glass p-4 rounded-2xl flex items-center gap-4 border border-white/5">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}15`, color: stat.color }}>
                                <Icon size={20} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{loading ? '...' : stat.value}</p>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* FILTERS & SEARCH */}
            <div className="glass flex flex-col sm:flex-row items-center gap-3 p-3 rounded-2xl border border-white/5">
                <div className="relative flex-1 w-full">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search requests by ID or scope..."
                        className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white/5 border border-white/5 focus:border-blue-500/50 outline-none transition-all"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select 
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-white/5 rounded-xl hover:bg-white/10 transition-colors border border-white/5 outline-none"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {/* LIST */}
            <div className="glass rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
                    ) : (
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/3">
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Request ID</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Scope / Items</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cycle Type</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Date Requested</th>
                                    <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {paginatedItems.map((req) => (
                                    <tr key={req.inventory_request_id} className="hover:bg-white/3 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-400">{req.inventory_request_id}</td>
                                        <td className="px-6 py-4 font-medium text-white max-w-[300px] truncate">{req.inventory_scope}</td>
                                        <td className="px-6 py-4 font-medium text-slate-300 capitalize">{req.cycle_type}</td>
                                        <td className="px-6 py-4 text-slate-400">{new Date(req.date_requested).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                req.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 
                                                req.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && filtered.length === 0 && (
                    <div className="py-20 text-center text-slate-500">No requests found.</div>
                )}
            </div>

            <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
            />

            {/* NEW REQUEST MODAL */}
            {showNewModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowNewModal(false)}>
                    <div className="glass rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Plus size={20} />
                                </div>
                                <h2 className="text-lg font-bold">New Inventory Request</h2>
                            </div>
                            <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-white"><Plus size={20} className="rotate-45" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Scope / Required Items</label>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all min-h-[100px]"
                                    placeholder="Describe items or materials needed (e.g., 50 bags of cement, new lighting fixtures...)"
                                    value={formData.scope}
                                    onChange={e => setFormData(prev => ({ ...prev, scope: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Justification</label>
                                <textarea 
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-all "
                                    placeholder="Why is this request needed?"
                                    value={formData.justification}
                                    onChange={e => setFormData(prev => ({ ...prev, justification: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Priority</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none transition-all"
                                        value={formData.priority}
                                        onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cycle Type</label>
                                    <select 
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-blue-500/50 outline-none transition-all"
                                        value={formData.cycle_type}
                                        onChange={e => setFormData(prev => ({ ...prev, cycle_type: e.target.value }))}
                                    >
                                        <option value="one-time">One-time</option>
                                        <option value="recurring">Recurring</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={handleCreateRequest}
                                disabled={isSaving}
                                className="w-full gradient-primary py-3 rounded-xl font-bold text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                                Submit Request to FAMCD
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
