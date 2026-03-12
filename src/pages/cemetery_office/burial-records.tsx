import React, { useState, useEffect } from 'react'
import {
  Search, Eye, Loader2, Download, ScrollText,
  MapPin, Calendar, Building2, X, CheckCircle, AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'
import { Badge } from '@/components/ui/badge'

interface BurialRecord {
  burial_id: string
  burial_date: string
  deceased: { full_name: string; date_of_death: string; death_certificate_no: string | null } | null
  niche_record: { niche_number: string; niche_id: string } | null
  cemetery: { cemetery_name: string; location: string } | null
  funeral_home: { name: string; accreditation_status: string } | null
  indigent_assistance_record: { assistance_id: string; status: string } | null
  digital_payment: { amount_paid: number; payment_status: string; digital_or_no: string | null } | null
}

export default function BurialRecords() {
  const [search, setSearch] = useState('')
  const [cemeteryFilter, setCemeteryFilter] = useState('all')
  const [records, setRecords] = useState<BurialRecord[]>([])
  const [cemeteries, setCemeteries] = useState<{ cemetery_id: string; cemetery_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<BurialRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => { fetchRecords() }, [])
  useEffect(() => { setCurrentPage(1) }, [search, cemeteryFilter])

  async function fetchRecords() {
    setLoading(true)
    try {
      const [{ data: recs, error: recErr }, { data: cems }] = await Promise.all([
        supabase
          .from('burial_record')
          .select(`
            burial_id, burial_date,
            deceased:deceased_id(full_name, date_of_death, death_certificate_no),
            niche_record:niche_id(niche_number, niche_id),
            cemetery:cemetery_id(cemetery_name, location),
            funeral_home:funeral_home_id(name, accreditation_status),
            indigent_assistance_record:indigent_assistance_id(assistance_id, status),
            digital_payment:payment_id(amount_paid, payment_status, digital_or_no)
          `)
          .order('burial_date', { ascending: false }),
        supabase.from('cemetery').select('cemetery_id, cemetery_name'),
      ])
      if (recErr) throw recErr
      setRecords((recs as any) || [])
      setCemeteries(cems || [])
    } catch (err: any) {
      toast.error('Failed to load burial records: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const filtered = records.filter(r => {
    const matchSearch =
      (r.deceased?.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (r.niche_record?.niche_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
      r.burial_id.toLowerCase().includes(search.toLowerCase())
    const matchCemetery = cemeteryFilter === 'all' || (r.cemetery?.cemetery_name ?? '') === cemeteryFilter
    return matchSearch && matchCemetery
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  function exportToCSV() {
    if (records.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = ['Burial ID', 'Deceased Name', 'Burial Date', 'Cemetery', 'Niche Number', 'Funeral Home', 'Indigent Assistance', 'Payment Amount', 'Payment Status']
    const csvRows = records.map(r => {
      return [
        r.burial_id,
        `"${r.deceased?.full_name ?? ''}"`,
        r.burial_date,
        `"${r.cemetery?.cemetery_name ?? ''}"`,
        `"${r.niche_record?.niche_number ?? ''}"`,
        `"${r.funeral_home?.name ?? ''}"`,
        r.indigent_assistance_record?.status === 'approved' ? 'YES' : 'NO',
        r.digital_payment?.amount_paid ?? 0,
        r.digital_payment?.payment_status ?? 'pending'
      ].join(',')
    })

    const csvContent = [headers.join(','), ...csvRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `burial_records_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Records exported to CSV')
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <ScrollText size={22} className="text-emerald-400" /> Burial Records
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Official interment logs — Quezon City Public Cemeteries</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="btn-secondary flex items-center gap-2 self-start sm:self-auto"
        >
          <Download size={15} /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Interments', value: records.length, color: 'text-blue-400' },
          {
            label: 'This Year',
            value: records.filter(r => r.burial_date && new Date(r.burial_date).getFullYear() === new Date().getFullYear()).length,
            color: 'text-indigo-400'
          },
          {
            label: 'With Indigent Aid',
            value: records.filter(r => r.indigent_assistance_record?.status === 'approved').length,
            color: 'text-emerald-400'
          },
          {
            label: 'Settled Payments',
            value: records.filter(r => r.digital_payment?.payment_status === 'settled').length,
            color: 'text-amber-400'
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search deceased name, burial ID, or niche…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field w-full sm:w-auto"
          value={cemeteryFilter}
          onChange={e => setCemeteryFilter(e.target.value)}
        >
          <option value="all">All Cemeteries</option>
          {cemeteries.map(c => (
            <option key={c.cemetery_id} value={c.cemetery_name}>{c.cemetery_name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">Loading records…</p>
            </div>
          ) : (
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/3">
                  {['Burial ID', 'Deceased', 'Burial Date', 'Cemetery', 'Niche #', 'Indigent', 'Payment', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedItems.map(rec => (
                  <tr
                    key={rec.burial_id}
                    className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => setSelected(rec)}
                  >
                    <td className="px-4 py-3.5 text-xs font-mono text-blue-400">{rec.burial_id}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{rec.deceased?.full_name}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-400">
                      {rec.burial_date ? new Date(rec.burial_date).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-400 max-w-[160px] truncate">
                      <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-600 shrink-0" />{rec.cemetery?.cemetery_name ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono text-emerald-400">{rec.niche_record?.niche_number ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {rec.indigent_assistance_record?.status === 'approved' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Approved</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">N/A</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {rec.digital_payment ? (
                        <span className={`text-xs font-bold ${rec.digital_payment.payment_status === 'settled' ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ₱{(rec.digital_payment.amount_paid ?? 0).toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <button
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        onClick={() => setSelected(rec)}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {!loading && filtered.length === 0 && (
          <div className="py-16 text-center">
            <AlertCircle className="mx-auto mb-3 text-slate-600" size={32} />
            <p className="text-slate-500 font-medium">No records found.</p>
          </div>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl w-full max-w-lg animate-fade-in border border-white/10 shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3">
              <div>
                <h2 className="text-lg font-bold text-white">{selected.deceased?.full_name}</h2>
                <p className="text-xs font-mono text-slate-500">{selected.burial_id}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {[
                ['Date of Death', selected.deceased?.date_of_death ? new Date(selected.deceased.date_of_death).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'],
                ['Death Certificate #', selected.deceased?.death_certificate_no ?? 'Not on file'],
                ['Burial Date', selected.burial_date ? new Date(selected.burial_date).toLocaleDateString('en-PH', { dateStyle: 'long' }) : '—'],
                ['Cemetery', selected.cemetery?.cemetery_name ?? '—'],
                ['Location', selected.cemetery?.location ?? '—'],
                ['Niche Number', selected.niche_record?.niche_number ?? '—'],
                ['Funeral Home', selected.funeral_home?.name ?? '—'],
                ['Accreditation', selected.funeral_home?.accreditation_status ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">{label}</span>
                  <span className="text-sm text-white font-medium text-right max-w-[55%]">{value}</span>
                </div>
              ))}

              {/* Indigent */}
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">Indigent Assistance</span>
                {selected.indigent_assistance_record?.status === 'approved' ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                    <CheckCircle size={10} className="mr-1" /> Approved · {selected.indigent_assistance_record.assistance_id}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">N/A</Badge>
                )}
              </div>

              {/* Payment */}
              {selected.digital_payment && (
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mt-2">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Payment</p>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Amount</span>
                    <span className="text-sm font-bold text-white">₱{(selected.digital_payment.amount_paid ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-400">Status</span>
                    <span className={`text-xs font-bold ${selected.digital_payment.payment_status === 'settled' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {selected.digital_payment.payment_status.toUpperCase()}
                    </span>
                  </div>
                  {selected.digital_payment.digital_or_no && (
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-400">OR #</span>
                      <span className="text-xs font-mono text-blue-400">{selected.digital_payment.digital_or_no}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <button onClick={() => setSelected(null)} className="btn-secondary w-full justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
