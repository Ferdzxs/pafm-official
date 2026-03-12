import React, { useState, useEffect } from 'react'
import { CreditCard, Download, Search, Loader2, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

interface PaymentRecord {
    payment_id: string
    amount_paid: number
    payment_date: string
    payment_method: string
    transaction_ref_no: string
    digital_or_no: string
    payment_status: string
    document: {
        document_type: string
        reference_no: string
    } | null
}

export default function PaymentHistoryPage() {
    const { user } = useAuth()
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchPayments()
    }, [user])

    async function fetchPayments() {
        try {
            // Get person_id
            const { data: citData } = await supabase
                .from('citizen_account')
                .select('person_id')
                .eq('account_id', user?.id)
                .single()
            
            if (!citData) return

            // Note: digital_payment table joins to digital_document which joins to person
            const { data, error } = await supabase
                .from('digital_payment')
                .select('*, document:digital_document(document_type, reference_no, person_id)')
                .order('payment_date', { ascending: false })
            
            // Filter by the person_id in the nested document
            const myPayments = (data as any[] || []).filter(p => 
                p.document?.person_id === citData.person_id
            )
            
            setPayments(myPayments)
            if (error) throw error
        } catch (err) {
            console.error(err)
            toast.error('Failed to load payment history')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-2xl font-bold text-white">Payment History</h1>
                    <p className="text-slate-400 text-sm mt-1">View your transaction ledger and official digital receipts</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn-secondary py-2 text-xs">
                        <Download size={14} className="mr-2" /> Export PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="animate-spin text-emerald-500 mb-4" size={32} />
                    <p className="text-slate-500">Tracing transactions...</p>
                </div>
            ) : payments.length === 0 ? (
                <div className="text-center py-20 glass rounded-2xl border border-slate-800">
                    <CreditCard className="mx-auto mb-4 text-slate-700" size={48} />
                    <h3 className="text-lg font-semibold text-white">No payments found</h3>
                    <p className="text-slate-500 max-w-xs mx-auto mt-2">Your payment history for permits and services will appear here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {payments.map(pay => (
                        <Card key={pay.payment_id} className="card-hover bg-slate-900/40 border-slate-800/50">
                            <CardContent className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                            pay.payment_status === 'settled' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {pay.payment_status === 'settled' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                                                {pay.document?.document_type.replace('_', ' ') || 'Government Service'}
                                            </div>
                                            <h3 className="text-white font-bold text-base">₱ {pay.amount_paid.toLocaleString()}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-slate-500">{pay.payment_date}</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-700" />
                                                <span className="text-xs text-slate-500 uppercase tracking-tight">{pay.payment_method}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                                        <Badge 
                                            variant={pay.payment_status === 'settled' ? 'success' : 'destructive'}
                                            className="text-[10px] px-2"
                                        >
                                            {pay.payment_status}
                                        </Badge>
                                        <div className="text-[10px] font-mono text-slate-500">
                                            OR: {pay.digital_or_no || 'N/A'}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
