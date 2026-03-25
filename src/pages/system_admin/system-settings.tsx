import React, { useEffect, useState } from 'react'
import { fetchSystemSettings, updateSystemSetting, fetchBackups, logBackupRow } from '@/lib/admin'
import { useAuth } from '@/contexts/AuthContext'
import { logAudit } from '@/lib/admin'
import { Database, Clock, RefreshCw } from 'lucide-react'

interface SettingRow {
 key: string
 value: any
 description?: string | null
}

export default function SystemSettings() {
 const { user } = useAuth()
 const [settings, setSettings] = useState<SettingRow[]>([])
 const [isLoading, setIsLoading] = useState(false)
 const [backups, setBackups] = useState<any[]>([])
 const [schedule, setSchedule] = useState('')

 useEffect(() => {
 const run = async () => {
  setIsLoading(true)
  try {
  const [s, b] = await Promise.all([
   fetchSystemSettings(),
   fetchBackups(),
  ])
  setSettings(s as any)
  setBackups(b)
  const sched = (s as any).find((x: any) => x.key === 'backups.schedule')
  if (sched) setSchedule(JSON.stringify(sched.value))
  } finally {
  setIsLoading(false)
  }
 }
 void run()
 }, [])

 const handleSettingChange = (key: string, raw: string) => {
 setSettings(prev =>
  prev.map(s =>
  s.key === key ? { ...s, value: raw } : s,
  ),
 )
 }

 const handleSettingSave = async (row: SettingRow) => {
 let parsed: any = row.value
 try {
  parsed = JSON.parse(String(row.value))
 } catch {
  // keep as string
 }
 await updateSystemSetting(row.key, parsed, row.description ?? undefined)
 await logAudit({
  action: 'setting_updated',
  module: 'admin_settings',
  performed_by: user?.email,
  subject: row.key,
  details: parsed,
 })
 }

 const handleRunBackup = async () => {
 const filename = `bpm-backup-${new Date().toISOString()}.sql`
 await logBackupRow({ filename, type: 'Manual', status: 'Completed' })
 await logAudit({
  action: 'backup_triggered',
  module: 'admin_backups',
  performed_by: user?.email,
  subject: filename,
 })
 const latest = await fetchBackups()
 setBackups(latest)
 }

 const handleScheduleSave = async () => {
 let parsed: any = schedule
 try {
  parsed = JSON.parse(schedule)
 } catch {
  parsed = { cron: schedule }
 }
 await updateSystemSetting('backups.schedule', parsed, 'Automatic backup schedule')
 await logAudit({
  action: 'backup_schedule_updated',
  module: 'admin_backups',
  performed_by: user?.email,
  subject: 'backups.schedule',
  details: parsed,
 })
 }

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 space-y-8">
  <section className="max-w-5xl mx-auto">
  <h1 className="font-display text-2xl font-bold text-white mb-2">
   System Settings
  </h1>
  <p className="text-slate-400 text-sm">
   Manage platform configuration and backup behavior.
  </p>
  </section>

  <section className="max-w-5xl mx-auto">
  <h2 className="font-display text-xl font-bold text-white mb-2">
   System Settings (Admin only)
  </h2>
  <p className="text-slate-400 text-sm mb-4">
   Central configuration flags stored in the database. Values are JSON — keep them small and documented.
  </p>

  <div
   className="glass rounded-2xl overflow-hidden mb-6"
   style={{ border: '1px solid rgba(148,163,184,0.08)' }}
  >
   <table className="w-full text-sm">
   <thead>
    <tr
    style={{
     borderBottom: '1px solid rgba(148,163,184,0.08)',
     background: 'rgba(255,255,255,0.02)',
    }}
    >
    {['Key', 'Value (JSON)', 'Description', ''].map(h => (
     <th
     key={h}
     className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide"
     >
     {h}
     </th>
    ))}
    </tr>
   </thead>
   <tbody>
    {settings.map(s => (
    <tr key={s.key} className="border-b border-white/5">
     <td className="px-4 py-3 text-xs text-slate-300 font-mono">
     {s.key}
     </td>
     <td className="px-4 py-3 align-top">
     <textarea
      className="input-field font-mono text-xs min-h-[60px]"
      value={
      typeof s.value === 'string'
       ? s.value
       : JSON.stringify(s.value, null, 2)
      }
      onChange={e =>
      handleSettingChange(s.key, e.target.value)
      }
     />
     </td>
     <td className="px-4 py-3 text-xs text-slate-400 align-top">
     {s.description ?? '—'}
     </td>
     <td className="px-4 py-3 text-right align-top">
     <button
      className="btn-secondary text-xs"
      onClick={() => handleSettingSave(s)}
     >
      Save
     </button>
     </td>
    </tr>
    ))}
    {settings.length === 0 && (
    <tr>
     <td
     colSpan={4}
     className="px-4 py-6 text-center text-sm text-slate-400"
     >
     {isLoading
      ? 'Loading system settings…'
      : 'No system settings defined yet.'}
     </td>
    </tr>
    )}
   </tbody>
   </table>
  </div>

  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
   <div
   className="glass rounded-2xl p-5"
   style={{ border: '1px solid rgba(148,163,184,0.08)' }}
   >
   <div className="flex items-center gap-3 mb-3">
    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
    <Database size={18} className="text-blue-400" />
    </div>
    <div>
    <h3 className="text-sm font-semibold text-white">
     Run backup now
    </h3>
    <p className="text-xs text-slate-400">
     Triggers a catalog entry in <code>system_backups</code>. Infra should attach a real DB backup job to this.
    </p>
    </div>
   </div>
   <button
    className="btn-primary text-xs"
    onClick={handleRunBackup}
    disabled={isLoading}
   >
    <RefreshCw size={14} /> Run backup
   </button>
   </div>

   <div
   className="glass rounded-2xl p-5 lg:col-span-2"
   style={{ border: '1px solid rgba(148,163,184,0.08)' }}
   >
   <div className="flex items-center gap-3 mb-3">
    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
    <Clock size={18} className="text-emerald-400" />
    </div>
    <div>
    <h3 className="text-sm font-semibold text-white">
     Automatic backup schedule
    </h3>
    <p className="text-xs text-slate-400">
     Stored in <code>backups.schedule</code>. Use either a JSON object (e.g. {"{\"cron\":\"0 2 * * *\"}"}) or a raw cron string.
    </p>
    </div>
   </div>
   <textarea
    className="input-field font-mono text-xs min-h-[72px]"
    value={schedule}
    onChange={e => setSchedule(e.target.value)}
   />
   <div className="mt-3 flex justify-end">
    <button
    className="btn-primary text-xs"
    onClick={handleScheduleSave}
    disabled={isLoading}
    >
    Save schedule
    </button>
   </div>
   </div>
  </div>

  <div
   className="glass rounded-2xl mt-6 overflow-hidden"
   style={{ border: '1px solid rgba(148,163,184,0.08)' }}
  >
   <div className="px-4 py-3 flex items-center justify-between border-b border-white/5">
   <h3 className="text-sm font-semibold text-white">Recent backups</h3>
   </div>
   <table className="w-full text-xs">
   <thead>
    <tr
    style={{
     borderBottom: '1px solid rgba(148,163,184,0.08)',
     background: 'rgba(255,255,255,0.02)',
    }}
    >
    {['Date', 'Filename', 'Type', 'Size', 'Status'].map(h => (
     <th
     key={h}
     className="px-4 py-2 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wide"
     >
     {h}
     </th>
    ))}
    </tr>
   </thead>
   <tbody>
    {backups.map(b => (
    <tr key={b.id} className="border-b border-white/5">
     <td className="px-4 py-2 text-slate-300">
     {b.date
      ? new Date(b.date).toLocaleString('en-PH')
      : '—'}
     </td>
     <td className="px-4 py-2 text-slate-300 font-mono">
     {b.filename}
     </td>
     <td className="px-4 py-2 text-slate-300">
     {b.type}
     </td>
     <td className="px-4 py-2 text-slate-300">
     {b.size ?? '—'}
     </td>
     <td className="px-4 py-2 text-slate-300">
     {b.status}
     </td>
    </tr>
    ))}
    {backups.length === 0 && (
    <tr>
     <td
     colSpan={5}
     className="px-4 py-4 text-center text-slate-400"
     >
     No backup records yet.
     </td>
    </tr>
    )}
   </tbody>
   </table>
  </div>
  </section>
 </div>
 )
}
