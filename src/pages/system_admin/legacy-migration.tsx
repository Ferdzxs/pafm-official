import React, { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, Download, RefreshCw, Save, Database, PlayCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { fetchBackups, fetchSystemSettings, logBackupRow, updateSystemSetting } from '@/lib/admin'

type BackupRow = {
  id: string
  filename: string
  date: string
  type: string
  size: string | null
  status: string
}

type BackupSchedule = {
  enabled: boolean
  frequency: 'daily' | 'weekly' | 'monthly'
  timeOfDay: string // HH:mm
  tables: string[]
  nextRunAt: string | null // ISO
}

// Full database backup tables (derived from init_db.sql + admin tables used in app)
const ALL_TABLES = [
  'system_users',
  'burial_applications',
  'service_tickets',
  'constituent_records',
  'barangay_ordinances',
  'barangay_documents',
  'asset_inventory',
  'person',
  'system_users',
  'government_office',
  'employee',
  'citizen_account',
  'digital_document',
  'digital_payment',
  'notification_log',
  'deceased',
  'cemetery',
  'funeral_home',
  'niche_record',
  'indigent_assistance_record',
  'burial_record',
  'online_burial_application',
  'administration_office',
  'park_venue',
  'park_reservation_record',
  'site_usage_log',
  'barangay',
  'barangay_facility',
  'barangay_reservation_record',
  'barangay_reservation_approval',
  'water_connection_request',
  'hcdrd_clearance',
  'technical_assessment',
  'installation_record',
  'leak_report',
  'excavation_clearance',
  'leak_repair_record',
  'drainage_request',
  'drainage_inspection_report',
  'program_of_works',
  'drainage_repair_record',
  'property',
  'inventory_request',
  'ocular_inspection',
  'inventory_report',
  'approval_record',
  'submission_record',

  // Admin/support tables referenced by the app (may exist in your DB even if not created in init_db.sql)
  'audit_logs',
  'system_settings',
  'system_backups',
]

const SETTINGS_KEY = 'backup_schedule'

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return blob.size
}

function toSizeString(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(2)} GB`
}

function computeNextRun(now: Date, frequency: BackupSchedule['frequency'], timeOfDay: string) {
  const [hh, mm] = timeOfDay.split(':').map(v => Number(v))
  const base = new Date(now)
  base.setSeconds(0, 0)
  base.setHours(Number.isFinite(hh) ? hh : 2, Number.isFinite(mm) ? mm : 0, 0, 0)

  const next = new Date(base)
  if (next <= now) {
    if (frequency === 'daily') next.setDate(next.getDate() + 1)
    if (frequency === 'weekly') next.setDate(next.getDate() + 7)
    if (frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  }
  return next
}

async function loadScheduleFromSettings(): Promise<BackupSchedule | null> {
  const rows = await fetchSystemSettings()
  const found = rows.find((r: any) => r.key === SETTINGS_KEY)
  if (!found) return null
  try {
    const v = typeof found.value === 'string' ? JSON.parse(found.value) : found.value
    return v as BackupSchedule
  } catch {
    return null
  }
}

export default function LegacyMigration() {
  const { user } = useAuth()
  const canManage = user?.role === 'system_admin'

  const [isLoading, setIsLoading] = useState(false)
  const [backups, setBackups] = useState<BackupRow[]>([])

  const [schedule, setSchedule] = useState<BackupSchedule>({
    enabled: false,
    frequency: 'daily',
    timeOfDay: '02:00',
    tables: ALL_TABLES,
    nextRunAt: null,
  })

  const runnerBusyRef = useRef(false)

  const scheduleLabel = useMemo(() => {
    const base = `${schedule.frequency} @ ${schedule.timeOfDay}`
    return schedule.enabled ? base : `Disabled (${base})`
  }, [schedule.enabled, schedule.frequency, schedule.timeOfDay])

  const refreshBackups = async () => {
    try {
      const data = (await fetchBackups()) as any[]
      setBackups(data as BackupRow[])
    } catch (err: any) {
      console.error('Failed to load backups', err)
      toast.error('Failed to load backups list.')
    }
  }

  const refreshSchedule = async () => {
    try {
      const s = await loadScheduleFromSettings()
      if (s) {
        setSchedule(prev => ({ ...prev, ...s }))
        return
      }
      // fallback to localStorage if settings table is not available
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (raw) setSchedule(prev => ({ ...prev, ...(JSON.parse(raw) as any) }))
    } catch (err) {
      // ignore
    }
  }

  const persistSchedule = async (next: BackupSchedule) => {
    const normalized: BackupSchedule = {
      ...next,
      // Keep schedule tables pinned to ALL_TABLES for full backups
      tables: ALL_TABLES,
    }
    try {
      await updateSystemSetting(SETTINGS_KEY, normalized, 'Automatic backup schedule (UI-managed)')
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
      setSchedule(normalized)
      toast.success('Backup schedule saved.')
    } catch (err: any) {
      console.error('Failed to save schedule', err)
      // local fallback so schedule UI still works in prototype environments
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
      setSchedule(normalized)
      toast.error('Saved locally, but failed to save to database settings.')
    }
  }

  const fetchAllRows = async (table: string) => {
    const pageSize = 1000
    let from = 0
    const all: any[] = []
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .range(from, from + pageSize - 1)
      if (error) throw new Error(`${table}: ${error.message}`)
      const chunk = (data ?? []) as any[]
      all.push(...chunk)
      if (chunk.length < pageSize) break
      from += pageSize
    }
    return all
  }

  const runBackupNow = async (mode: 'Manual' | 'Scheduled') => {
    if (runnerBusyRef.current) return
    runnerBusyRef.current = true
    setIsLoading(true)
    try {
      const startedAt = new Date()
      const snapshot: Record<string, any> = {
        meta: {
          generated_at: startedAt.toISOString(),
          generated_by: user?.email ?? null,
          mode,
          tables: ALL_TABLES,
        },
        data: {},
      }

      const failures: { table: string; error: string }[] = []

      for (const table of ALL_TABLES) {
        try {
          const rows = await fetchAllRows(table)
          ;(snapshot.data as any)[table] = rows
          ;(snapshot.meta as any)[`${table}__count`] = rows.length
        } catch (err: any) {
          failures.push({ table, error: err?.message ?? String(err) })
          ;(snapshot.data as any)[table] = []
          ;(snapshot.meta as any)[`${table}__count`] = 0
          ;(snapshot.meta as any)[`${table}__error`] = err?.message ?? String(err)
        }
      }

      ;(snapshot.meta as any).failures = failures

      const filename = `bpm_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      const bytes = downloadJson(filename, snapshot)
      const sizeStr = toSizeString(bytes)

      const status = failures.length > 0 ? 'Partial' : 'Completed'
      await logBackupRow({ filename, type: mode, size: sizeStr, status })
      if (failures.length > 0) {
        toast.error(`Backup created with warnings: ${failures.length} table(s) failed.`)
      } else {
        toast.success(`Backup created: ${filename}`)
      }
      await refreshBackups()
    } catch (err: any) {
      console.error('Backup failed', err)
      toast.error(err?.message ?? 'Backup failed.')
      try {
        const filename = `bpm_backup_failed_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
        await logBackupRow({ filename, type: mode, size: null, status: 'Failed' })
        await refreshBackups()
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false)
      runnerBusyRef.current = false
    }
  }

  const handleSaveSchedule = async () => {
    if (!canManage) {
      toast.error('Only system admin can change backup scheduling.')
      return
    }
    const nextRun = schedule.enabled
      ? computeNextRun(new Date(), schedule.frequency, schedule.timeOfDay).toISOString()
      : null
    await persistSchedule({ ...schedule, nextRunAt: nextRun })
  }

  useEffect(() => {
    void refreshBackups()
    void refreshSchedule()
  }, [])

  useEffect(() => {
    // Auto-runner: only triggers while the app is open.
    const timer = window.setInterval(async () => {
      if (!schedule.enabled) return
      if (!schedule.nextRunAt) return
      if (runnerBusyRef.current) return

      const now = new Date()
      const next = new Date(schedule.nextRunAt)
      if (Number.isNaN(next.getTime())) return
      if (now < next) return

      // run scheduled backup
      await runBackupNow('Scheduled')

      // compute and persist next run
      const next2 = computeNextRun(new Date(), schedule.frequency, schedule.timeOfDay).toISOString()
      await persistSchedule({ ...schedule, nextRunAt: next2 })
    }, 30_000)
    return () => window.clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule.enabled, schedule.frequency, schedule.timeOfDay, schedule.nextRunAt, schedule.tables.join('|')])

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Backups</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Manual snapshots + automatic scheduling. Scheduled backups run while the app is open.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button className="btn-secondary" onClick={() => void refreshBackups()} disabled={isLoading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn-primary" onClick={() => void runBackupNow('Manual')} disabled={isLoading}>
            <PlayCircle size={14} /> Run Backup Now
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-2xl p-4 lg:col-span-1" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm font-semibold text-white">Automatic schedule</div>
              <div className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-2">
                <CalendarClock size={14} className="text-slate-500" />
                {scheduleLabel}
              </div>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${schedule.enabled ? 'badge-active' : 'bg-white/10 text-slate-300'}`}>
              {schedule.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={e => setSchedule(prev => ({ ...prev, enabled: e.target.checked }))}
                disabled={!canManage}
              />
              Enable automatic backups
            </label>

            <select
              className="input-field"
              value={schedule.frequency}
              onChange={e => setSchedule(prev => ({ ...prev, frequency: e.target.value as any }))}
              disabled={!canManage}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>

            <input
              className="input-field"
              type="time"
              value={schedule.timeOfDay}
              onChange={e => setSchedule(prev => ({ ...prev, timeOfDay: e.target.value }))}
              disabled={!canManage}
            />

            <div className="text-xs text-slate-400">
              Next run:{' '}
              <span className="text-white font-semibold">
                {schedule.nextRunAt ? new Date(schedule.nextRunAt).toLocaleString() : '—'}
              </span>
            </div>

            <div className="glass rounded-xl p-3" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
              <div className="text-xs font-semibold text-slate-300 mb-2 inline-flex items-center gap-2">
                <Database size={14} className="text-slate-500" />
                Included tables
              </div>
              <div className="text-[11px] text-slate-500 mt-2">
                This backup includes <span className="text-slate-300 font-semibold">{ALL_TABLES.length}</span> tables and downloads all rows using pagination.
              </div>
            </div>

            <button className="btn-primary" onClick={() => void handleSaveSchedule()} disabled={isLoading || !canManage}>
              <Save size={14} /> Save Schedule
            </button>
            {!canManage && (
              <div className="text-[11px] text-slate-500">
                Only <span className="text-slate-300 font-semibold">System Administrator</span> can change schedule settings.
              </div>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl overflow-hidden lg:col-span-2" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
          <div className="px-4 py-3 text-sm font-semibold text-white" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
            Backup history
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                  {['Date', 'Filename', 'Type', 'Size', 'Status'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                      {b.date ? new Date(b.date).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      <span className="inline-flex items-center gap-2">
                        <Download size={14} className="text-slate-500" />
                        {b.filename}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{b.type ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{b.size ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${b.status === 'Completed' ? 'badge-active' : 'badge-rejected'}`}>
                        {b.status ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {backups.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                      {isLoading ? 'Loading backups…' : 'No backups logged yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="glass rounded-xl p-4 text-sm text-slate-400" style={{ border: '1px solid rgba(148,163,184,0.08)' }}>
        <strong className="text-white">Important:</strong> This is an in-app scheduler. For true server-side backups (runs even when nobody is logged in),
        you’ll want a backend scheduled job (e.g., Supabase cron/Edge Function) that generates and stores backups in storage.
      </div>
    </div>
  )
}
