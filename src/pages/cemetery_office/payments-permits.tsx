import React, { useState, useEffect } from 'react'
import { Search, Eye, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'

export default function PaymentsPermits() {
  const [search, setSearch] = useState('')
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

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
          deceased:deceased_id (full_name),
          payment:payment_id (*)
        `)
        .order('submission_date', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      toast.error('Failed to fetch payment status: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = applications.filter(row => {
    const q = search.toLowerCase()
    return (
      row.application_id.toLowerCase().includes(q) ||
      row.person?.full_name.toLowerCase().includes(q) ||
      row.deceased?.full_name.toLowerCase().includes(q)
    )
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold">Payments & Permits Status</h1>
          <p className="text-slate-400 text-sm mt-0.5"> Monitoring Treasurer and Death Registration updates.</p>
        </div>
        <div className="text-[10px] text-right text-slate-500 uppercase tracking-widest font-bold">
           Finance & Registration Sync
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input 
            className="input-field pl-9" 
            placeholder="Search by ID, applicant, or deceased..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          {loading ? (
             <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-slate-500" /></div>
          ) : (
            <table className="w-full min-w-[880px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {[
                    'Application ID',
                    'Applicant',
                    'Deceased',
                    'Payment Status',
                    'Permit Status',
                    'Last Update',
                    'Actions',
                  ].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map(row => (
                  <tr key={row.application_id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-sm font-mono text-blue-400">{row.application_id}</td>
                    <td className="px-5 py-4 text-sm text-white">{row.person?.full_name}</td>
                    <td className="px-5 py-4 text-sm text-slate-300">{row.deceased?.full_name}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.payment?.payment_status === 'settled' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                        {row.payment?.payment_status ?? 'pending payment'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.application_status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {row.application_status === 'completed' ? 'Issued' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400">{new Date(row.submission_date).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <button className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10" onClick={() => setSelected(row)}>
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />

      {/* Detail Popup */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="glass rounded-2xl p-6 w-full max-w-sm animate-fade-in" style={{ border: '1px solid rgba(148,163,184,0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-white">Application {selected.application_id}</h2>
                    <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="space-y-3">
                    {[
                        ['Applicant', selected.person?.full_name],
                        ['Deceased', selected.deceased?.full_name],
                        ['Payment Status', selected.payment?.payment_status ?? 'pending'],
                        ['Amount', selected.payment?.amount_paid ? `₱${selected.payment.amount_paid}` : '—'],
                        ['Permit Status', selected.application_status === 'completed' ? 'Issued' : 'Pending'],
                    ].map(([l, v]) => (
                        <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                            <span className="text-xs text-slate-400 uppercase tracking-wide">{l}</span>
                            <span className="text-sm text-white capitalize">{v}</span>
                        </div>
                    ))}
                </div>
                <button className="btn-secondary w-full mt-5 justify-center" onClick={() => setSelected(null)}>Close</button>
            </div>
        </div>
      )}
    </div>
  )
}
