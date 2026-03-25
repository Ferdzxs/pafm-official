import React, { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import { ROLE_META } from '@/config/rbac'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, CreditCard, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

type PayRow = {
  payment_id: string
  amount_paid: number | null
  payment_date: string | null
  payment_method: string | null
  payment_status: string | null
  digital_or_no: string | null
  transaction_ref_no: string | null
  document_type: string | null
  reference_no: string | null
}

export default function PaymentHistory() {
  const { user } = useAuth()
  const [rows, setRows] = useState<PayRow[]>([])
  const [loading, setLoading] = useState(true)
  const [personId, setPersonId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.is_citizen) return
    setLoading(true)
    try {
      const resolved = await getCitizenPersonIdForSession(supabase, user)
      setPersonId(resolved)
      if (!resolved) {
        setRows([])
        return
      }

      const { data: docs, error: dErr } = await supabase
        .from('digital_document')
        .select('document_id, document_type, reference_no')
        .eq('person_id', resolved)

      if (dErr) throw new Error(dErr.message)
      const docIds = (docs ?? []).map(d => d.document_id).filter(Boolean) as string[]
      const docMeta = Object.fromEntries((docs ?? []).map(d => [d.document_id, d]))

      if (docIds.length === 0) {
        setRows([])
        return
      }

      const { data: pays, error: pErr } = await supabase
        .from('digital_payment')
        .select(
          'payment_id, amount_paid, payment_date, payment_method, payment_status, digital_or_no, transaction_ref_no, document_id',
        )
        .in('document_id', docIds)
        .order('payment_date', { ascending: false })

      if (pErr) throw new Error(pErr.message)

      const merged: PayRow[] = (pays ?? []).map(p => {
        const doc = p.document_id ? docMeta[p.document_id as string] : null
        return {
          payment_id: p.payment_id,
          amount_paid: p.amount_paid as number | null,
          payment_date: p.payment_date as string | null,
          payment_method: p.payment_method as string | null,
          payment_status: p.payment_status as string | null,
          digital_or_no: p.digital_or_no as string | null,
          transaction_ref_no: p.transaction_ref_no as string | null,
          document_type: doc?.document_type ?? null,
          reference_no: doc?.reference_no ?? null,
        }
      })
      setRows(merged)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Could not load payments.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!user?.is_citizen || !personId) return
    let t: ReturnType<typeof setTimeout>
    const schedule = () => {
      clearTimeout(t)
      t = setTimeout(() => void load(), 350)
    }
    const channel = supabase
      .channel(`citizen-payment-history-${personId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'digital_payment' },
        schedule,
      )
      .subscribe()
    return () => {
      clearTimeout(t)
      supabase.removeChannel(channel)
    }
  }, [user?.is_citizen, personId, load])

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-8 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Badge variant="outline" className="mb-2 text-[10px] font-bold uppercase tracking-widest" style={{ borderColor: meta.color, color: meta.color }}>
            Citizen
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Payment history</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Fees linked to your documents (including park orders of payment). Updates when you pay or when treasury posts a receipt.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} aria-hidden />
          Refresh
        </Button>
      </header>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" aria-hidden />
            Transactions
          </CardTitle>
          <CardDescription>Digital payment records tied to your profile.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">No payments found yet.</p>
          ) : (
            <ul className="divide-y divide-border/50">
              {rows.map(r => {
                const st = (r.payment_status || 'pending').toLowerCase()
                return (
                  <li key={r.payment_id} className="px-6 py-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-semibold text-foreground">{r.payment_id}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {(r.document_type || 'payment').replace(/_/g, ' ')}
                        {r.reference_no ? ` · ${r.reference_no}` : ''}
                      </p>
                      {r.digital_or_no && (
                        <p className="text-xs font-medium text-primary mt-1">OR {r.digital_or_no}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-bold tabular-nums">₱{(r.amount_paid ?? 0).toLocaleString()}</span>
                      <Badge variant={st === 'settled' ? 'success' : st === 'failed' ? 'destructive' : 'secondary'}>
                        {st}
                      </Badge>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
