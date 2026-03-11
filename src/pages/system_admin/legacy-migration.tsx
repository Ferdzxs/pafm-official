import React, { useState } from 'react'
import { Upload, AlertTriangle, CheckCircle, Database, FileText, PlayCircle, Download } from 'lucide-react'

type MigrationPhase = 'upload' | 'mapping' | 'preview' | 'execute' | 'done'

const LEGACY_COLUMNS = ['legacy_fullname', 'legacy_address', 'legacy_contact', 'legacy_dob', 'legacy_death_cert_no', 'legacy_date_of_death', 'legacy_burial_date', 'legacy_death_cert_no']
const SYSTEM_COLUMNS = ['Person.full_name', 'Person.address', 'Person.contact_number', 'Person.date_of_birth', 'Deceased.death_certificate_no', 'Deceased.date_of_death', 'Burial_Record.burial_date', '(skip)']

const MOCK_PREVIEW = [
    { legacy_fullname: 'DELA CRUZ, MARIA SOCORRO', legacy_address: 'Blk 4 Lot 2, QC', legacy_contact: '09171234567', legacy_death_cert_no: 'DC-1998-0001', legacy_date_of_death: '1998-03-12', legacy_burial_date: '1998-03-15', _status: 'ok' },
    { legacy_fullname: 'SANTOS, JOSE SR.', legacy_address: 'Brgy. 123, QC', legacy_contact: '', legacy_death_cert_no: 'DC-2001-0042', legacy_date_of_death: '2001-07-28', legacy_burial_date: '2001-08-01', _status: 'ok' },
    { legacy_fullname: 'REYES,  CARMEN', legacy_address: 'QC', legacy_contact: '09281234567', legacy_death_cert_no: '', legacy_date_of_death: '2005-11-15', legacy_burial_date: '2005-11-18', _status: 'warn' },
    { legacy_fullname: 'DELA CRUZ, MARIA SOCORRO', legacy_address: 'Blk 4 Lot 2, QC', legacy_contact: '09171234567', legacy_death_cert_no: 'DC-1998-0001', legacy_date_of_death: '1998-03-12', legacy_burial_date: '1998-03-15', _status: 'dupe' },
]

export default function LegacyMigration() {
    const [phase, setPhase] = useState<MigrationPhase>('upload')
    const [mapping, setMapping] = useState<Record<string, string>>({
        legacy_fullname: 'Person.full_name', legacy_address: 'Person.address',
        legacy_contact: 'Person.contact_number', legacy_dob: 'Person.date_of_birth',
        legacy_death_cert_no: 'Deceased.death_certificate_no', legacy_date_of_death: 'Deceased.date_of_death',
        legacy_burial_date: 'Burial_Record.burial_date',
    })
    const [executing, setExecuting] = useState(false)

    const handleExecute = () => {
        setExecuting(true)
        setTimeout(() => { setExecuting(false); setPhase('done') }, 2000)
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-4xl">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Legacy Registry Migration</h1>
                <p className="text-slate-400 text-sm mt-0.5">Import historical cemetery & burial records into the system</p>
            </div>

            {/* Phase stepper */}
            <div className="flex items-center gap-2 mb-8">
                {(['upload', 'mapping', 'preview', 'execute', 'done'] as MigrationPhase[]).map((p, i) => (
                    <React.Fragment key={p}>
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                            style={{
                                background: phase === p ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
                                color: phase === p ? '#60a5fa' : '#64748b',
                                border: `1px solid ${phase === p ? 'rgba(59,130,246,0.3)' : 'rgba(148,163,184,0.08)'}`,
                            }}
                            onClick={() => setPhase(p)}
                        >
                            <span>{i + 1}.</span>
                            <span className="capitalize">{p}</span>
                        </div>
                        {i < 4 && <div className="h-px flex-1" style={{ background: 'rgba(148,163,184,0.1)' }} />}
                    </React.Fragment>
                ))}
            </div>

            {/* ─── Upload Phase ─── */}
            {phase === 'upload' && (
                <div className="space-y-5 animate-fade-in">
                    <div
                        className="glass rounded-2xl p-10 text-center cursor-pointer hover:bg-white/5 transition-all"
                        style={{ border: '2px dashed rgba(148,163,184,0.2)' }}
                        onClick={() => setPhase('mapping')}
                    >
                        <Upload size={32} className="mx-auto mb-4 text-slate-400" />
                        <h3 className="text-white font-semibold mb-1">Upload CSV or Excel File</h3>
                        <p className="text-slate-400 text-sm mb-4">Drag and drop your legacy registry file or click to browse</p>
                        <span className="btn-primary">Browse Files</span>
                    </div>
                    <div className="glass rounded-xl p-4 text-sm text-slate-400" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <strong className="text-white">Supported formats:</strong> CSV, XLSX, XLS. Max file size: 50MB.
                        Records must include at minimum: full name, date of death, and death certificate number.
                    </div>
                </div>
            )}

            {/* ─── Mapping Phase ─── */}
            {phase === 'mapping' && (
                <div className="animate-fade-in">
                    <div className="glass rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <div className="px-5 py-3 bg-white/3 text-sm font-semibold text-white" style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                            Field Mapping — Legacy Column → System Field
                        </div>
                        <div className="p-5 space-y-3">
                            {LEGACY_COLUMNS.slice(0, 7).map(col => (
                                <div key={col} className="flex items-center gap-4">
                                    <div className="flex-1 px-3 py-2 rounded-lg text-sm font-mono text-blue-300" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                        {col}
                                    </div>
                                    <span className="text-slate-500">→</span>
                                    <select
                                        className="flex-1 input-field text-sm"
                                        value={mapping[col] ?? '(skip)'}
                                        onChange={e => setMapping(prev => ({ ...prev, [col]: e.target.value }))}
                                    >
                                        {SYSTEM_COLUMNS.map(sc => <option key={sc} value={sc}>{sc}</option>)}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="btn-primary" onClick={() => setPhase('preview')}>Continue to Preview →</button>
                </div>
            )}

            {/* ─── Preview Phase ─── */}
            {phase === 'preview' && (
                <div className="animate-fade-in">
                    <div className="flex items-center gap-4 mb-4">
                        {[
                            { icon: CheckCircle, color: '#34d399', label: '2 Clean records' },
                            { icon: AlertTriangle, color: '#fbbf24', label: '1 Warning (missing field)' },
                            { icon: AlertTriangle, color: '#f87171', label: '1 Duplicate detected' },
                        ].map(({ icon: Icon, color, label }) => (
                            <div key={label} className="flex items-center gap-2 text-sm" style={{ color }}>
                                <Icon size={14} /> {label}
                            </div>
                        ))}
                    </div>
                    <div className="glass rounded-2xl overflow-hidden mb-4" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
                        <table className="w-full text-xs">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                                    {['Status', 'Full Name', 'Address', 'Death Cert #', 'Date of Death', 'Burial Date'].map(h => (
                                        <th key={h} className="px-3 py-2 text-left text-slate-400 uppercase tracking-wide font-semibold">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_PREVIEW.map((row, i) => (
                                    <tr key={i} className="border-b border-white/5" style={{ background: row._status === 'dupe' ? 'rgba(239,68,68,0.05)' : row._status === 'warn' ? 'rgba(251,191,36,0.05)' : 'transparent' }}>
                                        <td className="px-3 py-2">
                                            {row._status === 'ok' && <CheckCircle size={12} className="text-emerald-400" />}
                                            {row._status === 'warn' && <AlertTriangle size={12} className="text-yellow-400" />}
                                            {row._status === 'dupe' && <AlertTriangle size={12} className="text-red-400" />}
                                        </td>
                                        <td className="px-3 py-2 text-white">{row.legacy_fullname}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.legacy_address}</td>
                                        <td className="px-3 py-2 text-slate-400 font-mono">{row.legacy_death_cert_no || <span className="text-yellow-500">Missing</span>}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.legacy_date_of_death}</td>
                                        <td className="px-3 py-2 text-slate-400">{row.legacy_burial_date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex gap-3">
                        <button className="btn-primary" onClick={() => setPhase('execute')}><PlayCircle size={14} /> Execute Migration</button>
                        <button className="btn-secondary" onClick={() => setPhase('mapping')}>← Back</button>
                    </div>
                </div>
            )}

            {/* ─── Execute / Done Phase ─── */}
            {(phase === 'execute' || phase === 'done') && (
                <div className="animate-fade-in text-center py-12">
                    {phase === 'execute' && !executing && (
                        <>
                            <Database size={48} className="mx-auto mb-4 text-blue-400" />
                            <h3 className="text-white text-lg font-bold mb-2">Ready to Execute Migration</h3>
                            <p className="text-slate-400 text-sm mb-6">This will import 3 records (1 duplicate skipped) in transaction-safe batches.</p>
                            <button className="btn-primary mx-auto" onClick={handleExecute}><PlayCircle size={15} /> Start Migration</button>
                        </>
                    )}
                    {executing && (
                        <>
                            <div className="w-12 h-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
                            <h3 className="text-white text-lg font-bold mb-2">Migrating Records…</h3>
                            <p className="text-slate-400 text-sm">Processing in transaction-safe batches. Please wait.</p>
                        </>
                    )}
                    {phase === 'done' && (
                        <>
                            <CheckCircle size={48} className="mx-auto mb-4 text-emerald-400" />
                            <h3 className="text-white text-lg font-bold mb-2">Migration Complete!</h3>
                            <div className="glass rounded-xl p-5 max-w-xs mx-auto mb-6" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                                {[['Imported', '3'], ['Duplicates Skipped', '1'], ['Errors', '0'], ['Warnings', '1']].map(([l, v]) => (
                                    <div key={l} className="flex justify-between py-2" style={{ borderBottom: '1px solid rgba(148,163,184,0.07)' }}>
                                        <span className="text-xs text-slate-400">{l}</span>
                                        <span className="text-sm font-bold text-white">{v}</span>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-secondary mx-auto"><Download size={14} /> Download Migration Log</button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
