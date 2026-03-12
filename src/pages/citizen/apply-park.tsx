import React, { useState, useEffect } from 'react'
import { Calendar, Clock, CheckCircle, Loader2, AlertCircle, Trees, Info } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

interface Venue {
    park_venue_id: string
    park_venue_name: string
    location: string
    venue_type: string
}

export default function ApplyPark() {
    const { user } = useAuth()
    const [venues, setVenues] = useState<Venue[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [resId, setResId] = useState('')
    const [personId, setPersonId] = useState<string | null>(null)

    const [form, setForm] = useState({
        venue_id: '',
        date: '',
        time_slot: 'morning',
        purpose: '',
    })

    useEffect(() => {
        fetchVenues()
        if (user && user.is_citizen) fetchPersonId()
    }, [user])

    async function fetchPersonId() {
        const { data } = await supabase
            .from('citizen_account')
            .select('person_id')
            .eq('account_id', user?.id)
            .single()
        if (data) setPersonId(data.person_id)
    }

    async function fetchVenues() {
        try {
            const { data, error } = await supabase
                .from('park_venue')
                .select('*')
                .eq('availability_status', 'available')
            
            if (data) setVenues(data)
            if (error) throw error
        } catch (err) {
            console.error(err)
            toast.error('Failed to load park venues')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!personId) return toast.error('Identity not verified.')
        
        setSubmitting(true)
        try {
            const rid = 'PRR-' + Math.floor(Math.random() * 1000000)
            
            const { error } = await supabase.from('park_reservation_record').insert({
                reservation_id: rid,
                park_venue_id: form.venue_id,
                applicant_person_id: personId,
                reservation_date: form.date,
                time_slot: form.time_slot,
                status: 'pending'
            })

            if (error) throw error

            setResId(rid)
            setSubmitted(true)
            toast.success('Reservation request submitted.')
        } catch (err: any) {
            toast.error('Submission failed: ' + err.message)
        } finally {
            setSubmitting(false)
        }
    }

    if (submitted) return (
        <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[80vh] animate-fade-in">
            <div className="text-center max-w-sm">
                <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle size={28} className="text-emerald-400" />
                </div>
                <h2 className="font-display font-bold text-2xl text-white mb-2">Reservation Submitted!</h2>
                <p className="text-slate-400 mb-2">Your request has been received by the Parks Administration Office.</p>
                <div className="glass rounded-xl p-4 mb-6" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="text-xs text-slate-400 mb-1">Reservation ID</div>
                    <div className="font-mono font-bold text-white text-lg">{resId}</div>
                </div>
                <button className="btn-primary mx-auto" onClick={() => setSubmitted(false)}>Make Another Reservation</button>
            </div>
        </div>
    )

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Park Venue Reservation</h1>
                <p className="text-slate-400 text-sm mt-0.5">Reserve pavilions, fields, or courts in QC public parks</p>
            </div>

            <div className="glass rounded-2xl p-6" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
                        <p className="text-slate-500 text-sm">Loading venues...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Select Venue *</label>
                                <select 
                                    className="input-field" 
                                    value={form.venue_id} 
                                    onChange={e => setForm({ ...form, venue_id: e.target.value })}
                                    required
                                >
                                    <option value="">Select a venue...</option>
                                    {venues.map(v => (
                                        <option key={v.park_venue_id} value={v.park_venue_id}>{v.park_venue_name} ({v.location})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Reservation Date *</label>
                                <input 
                                    type="date" 
                                    className="input-field" 
                                    value={form.date} 
                                    onChange={e => setForm({ ...form, date: e.target.value })}
                                    required 
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Time Slot *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'morning', label: 'Morning', time: '08:00 - 12:00' },
                                    { id: 'afternoon', label: 'Afternoon', time: '13:00 - 17:00' },
                                    { id: 'full', label: 'Full Day', time: '08:00 - 17:00' },
                                ].map(slot => (
                                    <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => setForm({ ...form, time_slot: slot.id })}
                                        className={`p-3 text-left rounded-xl transition-all border ${
                                            form.time_slot === slot.id 
                                                ? 'bg-blue-500/10 border-blue-500 text-blue-400' 
                                                : 'bg-white/5 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        <div className="font-bold text-xs">{slot.label}</div>
                                        <div className="text-[10px] opacity-70">{slot.time}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Purpose of Use *</label>
                            <textarea 
                                className="input-field" 
                                rows={3} 
                                placeholder="E.g., Family reunion, sports event, community meeting..." 
                                value={form.purpose}
                                onChange={e => setForm({ ...form, purpose: e.target.value })}
                                required
                            />
                        </div>

                        <div className="px-4 py-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                            <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] text-slate-400 leading-relaxed">
                                <strong className="text-blue-300">Note:</strong> Reservations are subject to approval. Some venues may require a letter of intent and local barangay coordination.
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary w-full justify-center group"
                            disabled={submitting || !personId}
                        >
                            {submitting ? (
                                <><Loader2 size={16} className="animate-spin mr-2" /> Submitting...</>
                            ) : (
                                <>✓ Confirm Reservation Request</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
