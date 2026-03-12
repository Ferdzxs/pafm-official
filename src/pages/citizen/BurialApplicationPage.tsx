import React, { useState, useEffect } from 'react'
import { Upload, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

type Step = 1 | 2 | 3

export default function CitizenBurialApplicationPage() {
    const { user } = useAuth()
    const [step, setStep] = useState<Step>(1)
    const [submitting, setSubmitting] = useState(false)
    const [submitted, setSubmitted] = useState(false)
    const [personId, setPersonId] = useState<string | null>(null)
    const [appId, setAppId] = useState('')
    
    const [form, setForm] = useState({
        // Applicant
        applicant_name: user?.full_name || '', applicant_contact: '', relationship: '',
        // Deceased
        deceased_name: '', date_of_death: '', place_of_death: '', cause_of_death: '',
        death_cert_no: '',
        // Burial preference
        burial_type: 'niche', preferred_section: '', special_request: '',
        // Indigent
        is_indigent: false,
    })

    useEffect(() => {
        if (user && user.is_citizen) {
            fetchPersonId()
        }
    }, [user])

    async function fetchPersonId() {
        try {
            const { data, error } = await supabase
                .from('citizen_account')
                .select('person_id')
                .eq('account_id', user?.id)
                .single()
            
            if (data) setPersonId(data.person_id)
            if (error) console.error('Error fetching person_id:', error)
        } catch (err) {
            console.error(err)
        }
    }

    const update = (k: string, v: string | boolean) => setForm(prev => ({ ...prev, [k]: v }))

    const handleSubmit = async () => {
        if (!personId) {
            toast.error('Identity not verified. Please contact support.')
            return
        }

        setSubmitting(true)
        try {
            const deceasedId = 'DEC-' + Math.floor(Math.random() * 1000000)
            const applicationId = 'OBA-' + Math.floor(Math.random() * 1000000)

            // 1. Create Deceased Record
            const { error: decError } = await supabase.from('deceased').insert({
                deceased_id: deceasedId,
                full_name: form.deceased_name,
                date_of_death: form.date_of_death,
                place_of_death: form.place_of_death,
                death_certificate_no: form.death_cert_no
            })

            if (decError) throw decError

            // 2. Create Online Burial Application
            const { error: appError } = await supabase.from('online_burial_application').insert({
                application_id: applicationId,
                person_id: personId,
                deceased_id: deceasedId,
                submission_date: new Date().toISOString().split('T')[0],
                application_status: 'pending'
            })

            if (appError) throw appError

            // 3. Create Indigent Record if applicable
            if (form.is_indigent) {
                const assistanceId = 'IAR-' + Math.floor(Math.random() * 1000000)
                await supabase.from('indigent_assistance_record').insert({
                    assistance_id: assistanceId,
                    deceased_id: deceasedId,
                    status: 'pending'
                })
            }

            // 4. Log Notification
            await supabase.from('notification_log').insert({
                notif_id: 'NLOG-' + Math.floor(Math.random() * 1000000),
                account_id: user?.id,
                module_reference: 'burial',
                reference_id: applicationId,
                notif_type: 'application_received',
                message: `Your burial application ${applicationId} has been received and is pending review.`
            })

            setAppId(applicationId)
            setSubmitted(true)
            toast.success('Application submitted successfully!')
        } catch (error: any) {
            toast.error('Submission failed: ' + error.message)
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
                <h2 className="font-display font-bold text-2xl text-white mb-2">Application Submitted!</h2>
                <p className="text-slate-400 mb-2">Your burial application has been submitted successfully.</p>
                <div className="glass rounded-xl p-4 mb-6" style={{ border: '1px solid rgba(52,211,153,0.2)' }}>
                    <div className="text-xs text-slate-400 mb-1">Application ID</div>
                    <div className="font-mono font-bold text-white text-lg">{appId}</div>
                </div>
                <p className="text-slate-500 text-sm mb-6">You will receive notifications on your dashboard. The Cemetery Office will review your application within 2-3 business days.</p>
                <button className="btn-primary mx-auto" onClick={() => setSubmitted(false)}>Submit Another</button>
            </div>
        </div>
    )

    return (
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="font-display text-2xl font-bold text-white">Burial Application</h1>
                <p className="text-slate-400 text-sm mt-0.5">Online Burial Application — Follow the BPM Process</p>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-3 mb-8">
                {[1, 2, 3].map(s => (
                    <React.Fragment key={s}>
                        <div
                            className="flex items-center gap-2 flex-1 justify-center py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer"
                            style={{
                                background: step === s ? 'rgba(59,130,246,0.2)' : step > s ? 'rgba(52,211,153,0.1)' : 'rgba(255,255,255,0.04)',
                                color: step === s ? '#60a5fa' : step > s ? '#34d399' : '#64748b',
                                border: `1px solid ${step === s ? 'rgba(59,130,246,0.3)' : step > s ? 'rgba(52,211,153,0.2)' : 'rgba(148,163,184,0.08)'}`,
                            }}
                            onClick={() => step > s && setStep(s as Step)}
                        >
                            {step > s ? <CheckCircle size={14} /> : <span>{s}.</span>}
                            {s === 1 ? 'Applicant Info' : s === 2 ? 'Deceased Details' : 'Burial Preferences'}
                        </div>
                        {s < 3 && <div className="w-4 h-px" style={{ background: 'rgba(148,163,184,0.2)' }} />}
                    </React.Fragment>
                ))}
            </div>

            <div className="glass rounded-2xl p-6" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                {/* Step 1: Applicant */}
                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="font-semibold text-white mb-4">Applicant Information</h2>
                        {[
                            { key: 'applicant_name', label: 'Full Name', placeholder: 'Juan Dela Cruz', type: 'text' },
                            { key: 'applicant_contact', label: 'Contact Number', placeholder: '09xxxxxxxxx', type: 'tel' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label} *</label>
                                <input type={f.type} className="input-field" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} required />
                            </div>
                        ))}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Relationship to Deceased *</label>
                            <select className="input-field" value={form.relationship} onChange={e => update('relationship', e.target.value)} required>
                                <option value="">Select relationship…</option>
                                {['Spouse', 'Child', 'Parent', 'Sibling', 'Other Relative', 'Authorized Representative'].map(r => <option key={r}>{r}</option>)}
                            </select>
                        </div>

                        {/* Indigent flag */}
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)' }}>
                            <input type="checkbox" id="indigent" checked={form.is_indigent} onChange={e => update('is_indigent', e.target.checked)} className="w-4 h-4 accent-violet-500" />
                            <label htmlFor="indigent" className="text-sm text-slate-300 cursor-pointer">Applying for <strong className="text-violet-400">Indigent Burial Assistance</strong> (coordinated via SSDD)</label>
                        </div>

                        <button className="btn-primary" onClick={() => setStep(2)} disabled={!form.applicant_name || !form.relationship}>
                            Next: Deceased Details →
                        </button>
                    </div>
                )}

                {/* Step 2: Deceased */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="font-semibold text-white mb-4">Deceased Information</h2>
                        {[
                            { key: 'deceased_name', label: 'Full Name of Deceased', placeholder: 'Maria Dela Cruz', type: 'text' },
                            { key: 'death_cert_no', label: 'Death Certificate Number', placeholder: 'DC-2024-XXXX', type: 'text' },
                            { key: 'date_of_death', label: 'Date of Death', placeholder: '', type: 'date' },
                            { key: 'place_of_death', label: 'Place of Death', placeholder: 'QC General Hospital', type: 'text' },
                            { key: 'cause_of_death', label: 'Cause of Death', placeholder: 'Natural causes', type: 'text' },
                        ].map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label} *</label>
                                <input type={f.type} className="input-field" placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => update(f.key, e.target.value)} required />
                            </div>
                        ))}

                        <div className="flex gap-3">
                            <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button className="btn-primary" onClick={() => setStep(3)} disabled={!form.deceased_name || !form.date_of_death}>
                                Next: Burial Preferences →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preferences */}
                {step === 3 && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="font-semibold text-white mb-4">Burial Preferences</h2>
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Burial Type *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'niche', label: '🪦 Niche', desc: 'Above-ground columbarium' },
                                    { value: 'ground', label: '⬜ Ground', desc: 'In-ground burial plot' },
                                    { value: 'wall', label: '🏛️ Wall Niche', desc: 'Exterior wall niche' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => update('burial_type', opt.value)}
                                        type="button"
                                        className="px-3 py-3 rounded-xl text-sm text-left transition-all"
                                        style={{
                                            background: form.burial_type === opt.value ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${form.burial_type === opt.value ? 'rgba(59,130,246,0.4)' : 'rgba(148,163,184,0.1)'}`,
                                            color: form.burial_type === opt.value ? '#60a5fa' : '#94a3b8',
                                        }}
                                    >
                                        <div className="font-semibold mb-0.5">{opt.label}</div>
                                        <div className="text-xs opacity-70">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Preferred Section</label>
                            <select className="input-field" value={form.preferred_section} onChange={e => update('preferred_section', e.target.value)}>
                                <option value="">No preference</option>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>Section {s}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Special Requests</label>
                            <textarea className="input-field" rows={3} placeholder="Any special requests or notes for the cemetery office…" value={form.special_request} onChange={e => update('special_request', e.target.value)} />
                        </div>

                        <div className="px-4 py-3 rounded-xl text-sm text-slate-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.1)' }}>
                            <AlertCircle size={14} className="inline mr-2 text-yellow-400" />
                            By submitting, you certify that all information provided is accurate.
                        </div>

                        <div className="flex gap-3">
                            <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                            <button className="btn-primary flex-1 justify-center" onClick={handleSubmit} disabled={submitting || !personId}>
                                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : '✓ Submit Application'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
