import React, { useState } from 'react'
import type { IntegratedPaymentTransaction, DigitalPayment, GatewayProvider } from '@/types'
import { Search, RefreshCw, CheckCircle, AlertTriangle, Download, Filter } from 'lucide-react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'

const GATEWAY_COLOR: Record<GatewayProvider, string> = {
    gcash: '#1db954', maya: '#0b47a1', landbank: '#c8102e', credit_card: '#6366f1',
}

const MOCK_TRANSACTIONS: (IntegratedPaymentTransaction & { module_source: string })[] = [
    { transaction_id: 'TXN-2024-502', bill_reference_no: 'BILL-BA-044', gateway_provider_id: 'gcash', transaction_timestamp: '2024-03-05T08:15:00Z', amount_settled: 2500, digital_hash_verification: 'sha256:abc123', settlement_status: 'settled', reconciled_flag: true, reconciled_by: 'Tres. Lim', reconciled_date: '2024-03-05T09:00:00Z', module_source: 'Burial' },
    { transaction_id: 'TXN-2024-501', bill_reference_no: 'BILL-PR-018', gateway_provider_id: 'maya', transaction_timestamp: '2024-03-05T06:00:00Z', amount_settled: 1800, digital_hash_verification: 'sha256:def456', settlement_status: 'settled', reconciled_flag: true, reconciled_by: 'Tres. Lim', reconciled_date: '2024-03-05T07:30:00Z', module_source: 'Parks' },
    { transaction_id: 'TXN-2024-500', bill_reference_no: 'BILL-BR-012', gateway_provider_id: 'landbank', transaction_timestamp: '2024-03-04T15:00:00Z', amount_settled: 5000, digital_hash_verification: 'sha256:ghi789', settlement_status: 'settled', reconciled_flag: false, module_source: 'Barangay' },
    { transaction_id: 'TXN-2024-499', bill_reference_no: 'BILL-ST-030', gateway_provider_id: 'credit_card', transaction_timestamp: '2024-03-04T12:00:00Z', amount_settled: 3200, digital_hash_verification: 'sha256:jkl012', settlement_status: 'failed', reconciled_flag: false, module_source: 'Utility' },
    { transaction_id: 'TXN-2024-498', bill_reference_no: 'BILL-BA-042', gateway_provider_id: 'gcash', transaction_timestamp: '2024-03-04T10:00:00Z', amount_settled: 2500, digital_hash_verification: 'sha256:mno345', settlement_status: 'settled', reconciled_flag: true, reconciled_by: 'Tres. Lim', reconciled_date: '2024-03-04T11:00:00Z', module_source: 'Burial' },
    { transaction_id: 'TXN-2024-497', bill_reference_no: 'BILL-PR-015', gateway_provider_id: 'maya', transaction_timestamp: '2024-03-03T14:00:00Z', amount_settled: 1200, digital_hash_verification: 'sha256:pqr678', settlement_status: 'pending', reconciled_flag: false, module_source: 'Parks' },
    { transaction_id: 'TXN-2024-496', bill_reference_no: 'BILL-BA-040', gateway_provider_id: 'gcash', transaction_timestamp: '2024-03-03T10:00:00Z', amount_settled: 2500, digital_hash_verification: 'sha256:stu901', settlement_status: 'reversed', reconciled_flag: false, module_source: 'Burial' },
]

const CHART_DATA = [
    { date: 'Feb 27', amount: 89500 }, { date: 'Feb 28', amount: 112000 },
    { date: 'Mar 1', amount: 95000 }, { date: 'Mar 2', amount: 134000 },
    { date: 'Mar 3', amount: 108000 }, { date: 'Mar 4', amount: 124500 },
]

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-pending', settled: 'badge-settled', failed: 'badge-failed',
    reversed: 'badge-rejected',
}

export default function TreasurerTransactionsPage() {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selected, setSelected] = useState<typeof MOCK_TRANSACTIONS[0] | null>(null)
    const [reconciling, setReconciling] = useState(false)

    const filtered = MOCK_TRANSACTIONS.filter(t => {
        const q = search.toLowerCase()
        return (t.transaction_id.toLowerCase().includes(q) || t.bill_reference_no.toLowerCase().includes(q) || t.module_source.toLowerCase().includes(q))
            && (statusFilter === 'all' || t.settlement_status === statusFilter)
    })

    const totalSettled = MOCK_TRANSACTIONS.filter(t => t.settlement_status === 'settled').reduce((s, t) => s + t.amount_settled, 0)
    const pendingRecon = MOCK_TRANSACTIONS.filter(t => t.settlement_status === 'settled' && !t.reconciled_flag).length

    const handleReconcile = () => {
        setReconciling(true)
        setTimeout(() => { setReconciling(false); setSelected(null) }, 1500)
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="font-display text-xl sm:text-2xl font-bold text-white">Payment Transactions</h1>
                    <p className="text-slate-400 text-xs sm:text-sm mt-0.5">QC-PAY 2.0 — Integrated_Payment_Transaction</p>
                </div>
                <button className="btn-secondary self-start sm:self-auto"><Download size={15} /> Export CSV</button>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Total Settled', value: `₱${totalSettled.toLocaleString()}`, color: '#fcd34d' },
                    { label: 'Pending Reconciliation', value: pendingRecon, color: '#fbbf24' },
                    { label: 'Failed Transactions', value: MOCK_TRANSACTIONS.filter(t => t.settlement_status === 'failed').length, color: '#f87171' },
                    { label: 'Reconciled Today', value: MOCK_TRANSACTIONS.filter(t => t.reconciled_flag).length, color: '#34d399' },
                ].map(kpi => (
                    <div key={kpi.label} className="glass rounded-xl p-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <div className="text-2xl font-bold mb-1" style={{ color: kpi.color }}>{kpi.value}</div>
                        <div className="text-xs text-slate-400">{kpi.label}</div>
                    </div>
                ))}
            </div>

            {/* Chart */}
            <div className="glass rounded-2xl p-5 mb-6" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <h2 className="font-semibold text-white mb-4 text-sm">Daily Collections (₱)</h2>
                <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={CHART_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.07)" />
                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₱${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-primary)' }} formatter={(v: any) => [`₱${v.toLocaleString()}`, 'Amount']} />
                        <Area type="monotone" dataKey="amount" stroke="#fcd34d" fill="rgba(252,211,77,0.1)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input className="input-field pl-9" placeholder="Search by transaction ID, bill reference or module…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="input-field w-full sm:w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="settled">Settled</option>
                    <option value="failed">Failed</option>
                    <option value="reversed">Reversed</option>
                </select>
            </div>

            {/* Table */}
            <div className="glass rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                            {['Transaction ID', 'Bill Ref', 'Module', 'Gateway', 'Amount', 'Status', 'Reconciled', 'Action'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(txn => (
                            <tr key={txn.transaction_id} className="border-b border-white/5 hover:bg-white/3 transition-colors cursor-pointer" onClick={() => setSelected(txn)}>
                                <td className="px-4 py-3 text-xs font-mono text-blue-400">{txn.transaction_id}</td>
                                <td className="px-4 py-3 text-xs font-mono text-slate-300">{txn.bill_reference_no}</td>
                                <td className="px-4 py-3 text-sm text-slate-300">{txn.module_source}</td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold uppercase" style={{ background: `${GATEWAY_COLOR[txn.gateway_provider_id]}22`, color: GATEWAY_COLOR[txn.gateway_provider_id] }}>
                                        {txn.gateway_provider_id.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-white">₱{txn.amount_settled.toLocaleString()}</td>
                                <td className="px-4 py-3">
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[txn.settlement_status]}`}>{txn.settlement_status}</span>
                                </td>
                                <td className="px-4 py-3">
                                    {txn.reconciled_flag
                                        ? <CheckCircle size={14} className="text-emerald-400" />
                                        : <span className="text-slate-600 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                                    {txn.settlement_status === 'settled' && !txn.reconciled_flag && (
                                        <button className="btn-primary py-1 px-3 text-xs" onClick={() => setSelected(txn)}>
                                            <RefreshCw size={11} /> Reconcile
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>

            {/* Reconciliation modal */}
            {selected && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in" style={{ border: '1px solid rgba(148,163,184,0.15)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="font-bold text-white text-lg">Reconciliation — {selected.transaction_id}</h2>
                            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
                        </div>

                        {/* Hash verification */}
                        <div className="px-4 py-3 rounded-xl mb-4" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold mb-1">
                                <CheckCircle size={14} /> Hash Verification: VALID
                            </div>
                            <div className="text-xs font-mono text-slate-400 truncate">{selected.digital_hash_verification}</div>
                        </div>

                        <div className="space-y-3">
                            {[
                                ['Bill Reference', selected.bill_reference_no],
                                ['Gateway', selected.gateway_provider_id.toUpperCase()],
                                ['Module', selected.module_source],
                                ['Amount Settled', `₱${selected.amount_settled.toLocaleString()}`],
                                ['Transaction Time', new Date(selected.transaction_timestamp).toLocaleString('en-PH')],
                                ['Settlement Status', selected.settlement_status],
                                ['Reconciled', selected.reconciled_flag ? `Yes — ${selected.reconciled_by}` : 'No'],
                            ].map(([l, v]) => (
                                <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                    <span className="text-xs text-slate-400 uppercase tracking-wide">{l}</span>
                                    <span className="text-sm text-white capitalize">{v}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-2 mt-6">
                            {!selected.reconciled_flag && selected.settlement_status === 'settled' && (
                                <button className="btn-success flex-1 justify-center" onClick={handleReconcile} disabled={reconciling}>
                                    {reconciling ? '…' : <><CheckCircle size={14} /> Confirm Reconciliation</>}
                                </button>
                            )}
                            <button className="btn-danger flex-1 justify-center" onClick={() => setSelected(null)}>
                                <AlertTriangle size={14} /> Flag Discrepancy
                            </button>
                            <button className="btn-secondary flex-1 justify-center" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
