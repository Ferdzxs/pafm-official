/**
 * audit-logs.tsx — Treasurer: Audit Logs
 * Queries audit_logs table for treasury-related actions.
 * Filterable by action, module, status, date.
 */
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ROLE_META } from '@/config/rbac'
import {
  Search, RefreshCw, AlertCircle, X, Eye as EyeIcon, CheckCircle2, XCircle, Clock, Zap,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
type LogRow = {
  id: string
  action: string
  subject: string | null
  performed_by: string | null
  timestamp: string | null
  status: string
  module: string
  ip_address: string | null
  details: string | null
}

const TREASURY_MODULES = ['treasury', 'parks', 'burial', 'barangay', 'utility']

function StatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle2 size={14} className="text-emerald-500" />
  if (status === 'failed') return <XCircle size={14} className="text-destructive" />
  return <Clock size={14} className="text-amber-500" />
}

const STATUS_BADGE: Record<string, 'success' | 'destructive' | 'warning' | 'secondary'> = {
  success: 'success', failed: 'destructive', warning: 'warning',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function TreasurerAuditLogsPage() {
  const { user } = useAuth()
  const [rows, setRows] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [moduleFilter, setModuleFilter] = useState('all')
  const [selected, setSelected] = useState<LogRow | null>(null)

  useEffect(() => { void loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: lErr } = await supabase
        .from('audit_logs')
        .select('id, action, subject, performed_by, timestamp, status, module, ip_address, details')
        .in('module', TREASURY_MODULES)
        .order('timestamp', { ascending: false })
        .limit(300)

      if (lErr) throw new Error(lErr.message)
      setRows((data ?? []) as LogRow[])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  const modules = useMemo(() => {
    const set = new Set(rows.map(r => r.module))
    return ['all', ...Array.from(set)]
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      if (moduleFilter !== 'all' && r.module !== moduleFilter) return false
      if (!q) return true
      return [r.action, r.subject ?? '', r.performed_by ?? '', r.details ?? ''].join(' ').toLowerCase().includes(q)
    })
  }, [rows, search, statusFilter, moduleFilter])

  function fmtTs(ts: string | null) {
    if (!ts) return '—'
    return new Date(ts).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-2 py-0.5 font-bold tracking-tighter" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
              {meta.label.toUpperCase()}
            </Badge>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground items-center gap-1.5 hidden sm:flex">
              <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /> Trace & compliance
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Audit logs</h1>
          <p className="text-muted-foreground text-sm max-w-[600px]">System-recorded treasury actions and cross-module operations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="shadow-xs border-border self-start md:self-center">
          <RefreshCw className={cn('mr-2 h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
        </Button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3 text-sm text-destructive items-center">
          <AlertCircle size={16} className="shrink-0" />
          <p className="font-medium">{error}</p>
          <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto hover:bg-destructive/10 text-destructive" onClick={() => setError(null)}>
            <X size={14} />
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input className="pl-10 h-10 border-border/50" placeholder="Search action, subject, performer…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="flex h-10 rounded-xl border border-border/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={moduleFilter}
          onChange={e => setModuleFilter(e.target.value)}
          className="flex h-10 rounded-xl border border-border/50 bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {modules.map(m => <option key={m} value={m}>{m === 'all' ? 'All Modules' : m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="border-border/50 shadow-sm overflow-hidden bg-card/50">
        <CardHeader className="pb-3 bg-muted/20 border-b">
          <CardTitle className="text-base flex items-center gap-2">
            <EyeIcon size={18} className="text-primary" />
            Log Entries
            <Badge variant="secondary" className="ml-1">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>Click any row for full details.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4">
              <RefreshCw className="h-8 w-8 animate-spin text-primary opacity-40" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Loading audit logs…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center space-y-3">
              <EyeIcon className="h-12 w-12 mx-auto text-muted-foreground opacity-30" />
              <p className="font-bold text-foreground">No log entries</p>
              <p className="text-xs text-muted-foreground">No audit records match your current filters.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map(r => (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 hover:bg-muted/40 transition-colors cursor-pointer gap-2"
                  onClick={() => setSelected(r)}
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 shrink-0"><StatusIcon status={r.status} /></div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-foreground">{r.action}</span>
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase bg-muted text-muted-foreground">{r.module}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {r.subject && <span>{r.subject} · </span>}
                        {r.performed_by && <span>by {r.performed_by}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 pl-7 sm:pl-0">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'secondary'} className="text-[10px]">{r.status}</Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{fmtTs(r.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-[440px] p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
          {selected && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
              <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
                <DialogTitle className="font-display text-xl font-extrabold tracking-tight text-foreground">Log Detail</DialogTitle>
                <DialogDescription className="font-mono text-xs uppercase tracking-widest text-muted-foreground mt-1">{selected.id}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
                {[
                  ['Action', selected.action],
                  ['Subject', selected.subject ?? '—'],
                  ['Performed By', selected.performed_by ?? '—'],
                  ['Timestamp', fmtTs(selected.timestamp)],
                  ['Status', selected.status],
                  ['Module', selected.module],
                  ['IP Address', selected.ip_address ?? '—'],
                  ['Details', selected.details ?? '—'],
                ].map(([l, v]) => (
                  <div key={l} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{l}</div>
                    <div className="text-sm font-semibold text-foreground break-words">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border/10 shrink-0">
                <Button variant="outline" onClick={() => setSelected(null)} className="h-11 rounded-xl w-full font-bold uppercase tracking-widest text-[10px]">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
