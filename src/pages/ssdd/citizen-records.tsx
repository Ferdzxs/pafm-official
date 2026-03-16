import React, { useState, useEffect } from 'react'
import {
  Search, Filter, User, MapPin, Phone, Loader2, ArrowRight,
  ShieldCheck, X, Users, CheckCircle, AlertCircle, Calendar,
  ChevronDown, CreditCard, Download
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { Pagination } from '@/components/ui/pagination'

interface CitizenRecord {
  person_id: string
  full_name: string
  address: string | null
  contact_number: string | null
  valid_id_type: string | null
  valid_id_number: string | null
  citizen_account: {
    account_id: string
    verification_status: string
    registered_date: string | null
    email: string
  }[]
}

export default function CitizenRecords() {
  const [records, setRecords] = useState<CitizenRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'pending' | 'suspended'>('all')
  const [selected, setSelected] = useState<CitizenRecord | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  useEffect(() => { fetchRecords() }, [])
  useEffect(() => { setCurrentPage(1) }, [searchTerm, verificationFilter])

  async function fetchRecords() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('person')
        .select('*, citizen_account(account_id, verification_status, registered_date, email)')
        .order('full_name', { ascending: true })
      if (data) setRecords(data as any)
      if (error) throw error
    } catch (err) {
      toast.error('Failed to load constituent records')
    } finally {
      setLoading(false)
    }
  }

  async function toggleVerification(accountId: string, current: string) {
    const next = current === 'verified' ? 'pending' : 'verified'
    try {
      const { error } = await supabase
        .from('citizen_account')
        .update({ verification_status: next })
        .eq('account_id', accountId)
      if (error) throw error
      toast.success(`Account ${next}.`)
      fetchRecords()
    } catch (err: any) {
      toast.error('Update failed: ' + err.message)
    }
  }

  const filtered = records.filter(r => {
    const matchSearch =
      (r.full_name ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.person_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.citizen_account?.[0]?.email ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchVerify =
      verificationFilter === 'all' || r.citizen_account?.[0]?.verification_status === verificationFilter
    return matchSearch && matchVerify
  })

  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginatedItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const verifiedCount = records.filter(r => r.citizen_account?.[0]?.verification_status === 'verified').length
  const pendingCount = records.filter(r => r.citizen_account?.[0]?.verification_status === 'pending').length
  const unregisteredCount = records.filter(r => !r.citizen_account?.length).length

  function getVerificationBadge(status?: string) {
    switch (status) {
      case 'verified': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'suspended': return 'bg-red-500/10 text-red-400 border-red-500/20'
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20'
    }
  }

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            <Users size={22} className="text-blue-400" /> Constituent Registry
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">SSDD centralized database of Quezon City residents</p>
        </div>
        <button className="btn-secondary flex items-center gap-2 self-start sm:self-auto">
          <Download size={15} /> Export
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Persons', value: records.length, color: 'text-white' },
          { label: 'Verified Accounts', value: verifiedCount, color: 'text-emerald-400' },
          { label: 'Pending Verification', value: pendingCount, color: 'text-amber-400' },
          { label: 'No Account', value: unregisteredCount, color: 'text-slate-500' },
        ].map(({ label, value, color }) => (
          <div key={label} className="glass rounded-xl p-4 border border-white/5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, ID, or email…"
            className="input-field pl-9 w-full"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'verified', 'pending', 'suspended'] as const).map(v => (
            <button
              key={v}
              onClick={() => setVerificationFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all border ${
                verificationFilter === v
                  ? 'bg-blue-500/20 border-blue-500 text-blue-400'
                  : 'border-slate-800 text-slate-500 hover:border-slate-700'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
          <p className="text-slate-500 font-medium">Synchronizing records…</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            {paginatedItems.map(r => {
              const account = r.citizen_account?.[0]
              const verStatus = account?.verification_status ?? 'unregistered'
              return (
                <Card key={r.person_id} className="card-hover bg-slate-900/40 border-slate-800/50 group overflow-hidden cursor-pointer" onClick={() => setSelected(r)}>
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className="w-1.5 shrink-0 bg-gradient-to-b from-blue-600 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-[inherit]" />
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                <User size={20} />
                              </div>
                              {verStatus === 'verified' && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5 border-2 border-slate-900">
                                  <ShieldCheck size={9} className="text-white" />
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="text-white font-bold text-sm leading-tight">{r.full_name}</h3>
                              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{r.person_id}</div>
                            </div>
                          </div>
                          <Badge className={`${getVerificationBadge(verStatus)} border text-[9px] font-bold uppercase shrink-0`}>
                            {verStatus}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 mb-4">
                          {r.address && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <MapPin size={12} className="text-slate-600 shrink-0" />
                              <span className="truncate">{r.address}</span>
                            </div>
                          )}
                          {r.contact_number && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Phone size={12} className="text-slate-600 shrink-0" />
                              <span>{r.contact_number}</span>
                            </div>
                          )}
                          {account?.registered_date && (
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <Calendar size={12} className="text-slate-600 shrink-0" />
                              <span>Registered {new Date(account.registered_date).toLocaleDateString('en-PH', { dateStyle: 'medium' })}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                          {r.valid_id_type ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                              <CreditCard size={11} className="text-slate-600" />
                              {r.valid_id_type}
                            </div>
                          ) : <div />}
                          <button className="flex items-center gap-1 text-xs text-blue-400 font-bold hover:text-blue-300 transition-colors">
                            View <ArrowRight size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {paginatedItems.length === 0 && (
            <div className="py-20 text-center glass rounded-2xl border border-slate-800">
              <AlertCircle className="mx-auto mb-3 text-slate-600" size={32} />
              <p className="text-slate-500">No records match the current filter.</p>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
      )}

      {/* Detail Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="glass rounded-2xl w-full max-w-lg animate-fade-in border border-white/10 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.full_name}</h2>
                  <p className="text-xs font-mono text-slate-500">{selected.person_id}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-3">
              {[
                ['Address', selected.address ?? '—'],
                ['Contact', selected.contact_number ?? '—'],
                ['Valid ID Type', selected.valid_id_type ?? '—'],
                ['Valid ID #', selected.valid_id_number ?? '—'],
                ['Email', selected.citizen_account?.[0]?.email ?? 'No account'],
                ['Account Status', selected.citizen_account?.[0]?.verification_status ?? 'Unregistered'],
                ['Registered', selected.citizen_account?.[0]?.registered_date
                  ? new Date(selected.citizen_account[0].registered_date).toLocaleDateString('en-PH', { dateStyle: 'long' })
                  : 'N/A'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-xs text-slate-500 uppercase font-bold tracking-wide">{label}</span>
                  <span className="text-sm text-white font-medium text-right max-w-[55%]">{value}</span>
                </div>
              ))}

              {selected.citizen_account?.[0] && (
                <button
                  onClick={() => {
                    const acc = selected.citizen_account![0]
                    toggleVerification(acc.account_id, acc.verification_status)
                    setSelected(null)
                  }}
                  className={`w-full mt-4 py-2.5 rounded-xl border text-xs font-bold uppercase transition-all ${
                    selected.citizen_account[0].verification_status === 'verified'
                      ? 'border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                      : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  {selected.citizen_account[0].verification_status === 'verified'
                    ? 'Mark as Pending'
                    : 'Mark as Verified'}
                </button>
              )}
            </div>
            <div className="px-6 pb-6">
              <button onClick={() => setSelected(null)} className="btn-secondary w-full justify-center">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
