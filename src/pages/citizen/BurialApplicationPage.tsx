import React, { useState, useEffect, useCallback } from 'react'
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
    
    const [indigencyCertFile, setIndigencyCertFile] = useState<File | null>(null)
    const [mswdCertFile, setMswdCertFile] = useState<File | null>(null)
    const [indigentRelationshipFile, setIndigentRelationshipFile] = useState<File | null>(null)

    type ReqKey = 'death_cert' | 'transfer_permit' | 'affidavit_undertaking' | 'burial_form' | 'valid_id'
    const REQUIREMENTS: { key: ReqKey; label: string; required: boolean }[] = [
        { key: 'death_cert',           label: 'Certified copy of Certificate of Death',                                                                                   required: true },
        { key: 'transfer_permit',      label: 'Original Copy of Transfer or Entrance Permit (if death occurred in another city/municipality)',                             required: false },
        { key: 'affidavit_undertaking',label: 'Affidavit of Undertaking (if remains will be interred in Bagbag or Novaliches Public Cemetery)',                           required: false },
        { key: 'burial_form',          label: 'Burial Form from Quezon City Health Department',                                                                            required: true },
        { key: 'valid_id',             label: 'Valid Identification Cards (IDs) of the informant/family/relative/authorized person',                                      required: true },
    ]
    const [reqFiles, setReqFiles] = useState<Partial<Record<ReqKey, File>>>({})
    const setReqFile = (key: ReqKey, file: File | undefined) =>
        setReqFiles(prev => ({ ...prev, [key]: file }))

    const BURIAL_FEES: Record<string, number> = { niche: 4000, ground: 8000, wall: 3000 }
    const PERMIT_FEE = 300

    const [form, setForm] = useState({
        // Applicant
        applicant_name: user?.full_name || '', applicant_contact: '', relationship: '',
        // Deceased
        deceased_last_name: '', deceased_first_name: '', deceased_middle_name: '',
        age_at_death: '',
        date_of_death: '', place_of_death: '', cause_of_death: '',
        death_cert_no: '',
        // Burial preference
        burial_type: 'niche', preferred_section: '', special_request: '',
        is_resident: 'resident',
        // Indigent
        is_indigent: false,
        issuing_barangay: '',
        four_ps_beneficiary: '',
        monthly_income: '',
    })

    const fetchPersonId = useCallback(async () => {
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
    }, [user])

    useEffect(() => {
        if (user && user.is_citizen) {
            fetchPersonId()
        }
    }, [user, fetchPersonId])

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
            const fullName = [
                form.deceased_last_name,
                form.deceased_first_name,
                form.deceased_middle_name,
            ].filter(Boolean).join(', ')

            const { error: decError } = await supabase.from('deceased').insert({
                deceased_id: deceasedId,
                full_name: fullName,
                last_name: form.deceased_last_name,
                first_name: form.deceased_first_name,
                middle_name: form.deceased_middle_name || null,
                age_at_death: form.age_at_death ? parseInt(form.age_at_death) : null,
                date_of_death: form.date_of_death,
                place_of_death: form.place_of_death,
                cause_of_death: form.cause_of_death,
                death_certificate_no: form.death_cert_no
            })

            if (decError) throw decError

            // 2. Upload requirement documents and store URLs
            const uploadedDocs: Partial<Record<string, string>> = {}
            for (const req of REQUIREMENTS) {
                const file = reqFiles[req.key]
                if (file) {
                    const ext = file.name.split('.').pop()
                    const path = `burial-req/${applicationId}/${req.key}.${ext}`
                    const { data: up, error: upErr } = await supabase.storage
                        .from('burial-documents')
                        .upload(path, file, { upsert: true })
                    if (upErr) throw upErr
                    if (up) {
                        const { data: pub } = supabase.storage.from('burial-documents').getPublicUrl(path)
                        uploadedDocs[req.key] = pub.publicUrl
                    }
                }
            }

            // 3. Create Online Burial Application with document URLs
            const { error: appError } = await supabase.from('online_burial_application').insert({
                application_id: applicationId,
                person_id: personId,
                deceased_id: deceasedId,
                submission_date: new Date().toISOString().split('T')[0],
                application_status: 'pending',
                is_resident: form.is_resident === 'resident',
                doc_death_cert_url: uploadedDocs['death_cert'] ?? null,
                doc_medical_cert_url: uploadedDocs['transfer_permit'] ?? null,
                doc_embalming_cert_url: uploadedDocs['affidavit_undertaking'] ?? null,
                doc_valid_id_url: uploadedDocs['valid_id'] ?? null,
                doc_proof_relationship_url: uploadedDocs['burial_form'] ?? null,
            })

            if (appError) throw appError

            // 4. Create Indigent Record if applicable
            if (form.is_indigent) {
                const assistanceId = 'IAR-' + Math.floor(Math.random() * 1000000)

                let indigencyCertUrl: string | null = null
                if (indigencyCertFile) {
                    const ext = indigencyCertFile.name.split('.').pop()
                    const filePath = `indigency-certs/${assistanceId}.${ext}`
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('burial-documents')
                        .upload(filePath, indigencyCertFile, { upsert: true })
                    if (!uploadErr && uploadData) {
                        const { data: urlData } = supabase.storage.from('burial-documents').getPublicUrl(filePath)
                        indigencyCertUrl = urlData.publicUrl
                    }
                }

                let mswdCertUrl: string | null = null
                if (mswdCertFile) {
                    const ext = mswdCertFile.name.split('.').pop()
                    const filePath = `indigency-certs/${assistanceId}-mswd.${ext}`
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('burial-documents')
                        .upload(filePath, mswdCertFile, { upsert: true })
                    if (!uploadErr && uploadData) {
                        const { data: urlData } = supabase.storage.from('burial-documents').getPublicUrl(filePath)
                        mswdCertUrl = urlData.publicUrl
                    }
                }

                let indigentRelationshipUrl: string | null = null
                if (indigentRelationshipFile) {
                    const ext = indigentRelationshipFile.name.split('.').pop()
                    const filePath = `indigency-certs/${assistanceId}-relationship.${ext}`
                    const { data: uploadData, error: uploadErr } = await supabase.storage
                        .from('burial-documents')
                        .upload(filePath, indigentRelationshipFile, { upsert: true })
                    if (!uploadErr && uploadData) {
                        const { data: urlData } = supabase.storage.from('burial-documents').getPublicUrl(filePath)
                        indigentRelationshipUrl = urlData.publicUrl
                    }
                }

                const { error: indigentErr } = await supabase.from('indigent_assistance_record').insert({
                    assistance_id: assistanceId,
                    deceased_id: deceasedId,
                    status: 'pending',
                    issuing_barangay: form.issuing_barangay,
                    four_ps_nhts_status: form.four_ps_beneficiary,
                    monthly_income: form.monthly_income ? parseFloat(form.monthly_income) : null,
                    indigency_cert_url: indigencyCertUrl,
                    mswd_cert_url: mswdCertUrl,
                    indigent_relationship_url: indigentRelationshipUrl,
                })

                if (indigentErr) throw indigentErr
            }

            // 6. Log Notification
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
        } catch (error: unknown) {
            toast.error('Submission failed: ' + (error instanceof Error ? error.message : String(error)))
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
        <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in mx-auto">
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
                        {([
                            { key: 'applicant_name' as const, label: 'Full Name', placeholder: 'Juan Dela Cruz', type: 'text' },
                            { key: 'applicant_contact' as const, label: 'Contact Number', placeholder: '09xxxxxxxxx', type: 'tel' },
                        ]).map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label} *</label>
                                <input type={f.type} className="input-field" placeholder={f.placeholder} value={form[f.key]} onChange={e => update(f.key, e.target.value)} required />
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
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(167,139,250,0.15)' }}>
                            <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(167,139,250,0.08)' }}>
                                <input type="checkbox" id="indigent" checked={form.is_indigent} onChange={e => update('is_indigent', e.target.checked)} className="w-4 h-4 accent-violet-500" />
                                <label htmlFor="indigent" className="text-sm text-slate-300 cursor-pointer">Applying for <strong className="text-violet-400">Indigent Burial Assistance</strong> (coordinated via SSDD)</label>
                            </div>

                            {form.is_indigent && (
                                <div className="px-4 pb-4 pt-3 space-y-4" style={{ background: 'rgba(167,139,250,0.04)' }}>
                                    {/* Notice */}
                                    <div className="flex gap-2.5 px-3 py-3 rounded-lg" style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
                                        <AlertCircle size={15} className="text-violet-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-violet-300 leading-relaxed">
                                            Please prepare the required documents for <strong>MSWD verification</strong>. Approval is subject to fund availability and eligibility assessment.
                                        </p>
                                    </div>

                                    {/* Issuing Barangay */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Issuing Barangay *</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Barangay Caaringayan"
                                            value={form.issuing_barangay}
                                            onChange={e => update('issuing_barangay', e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* 4Ps / NHTS */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">4Ps / NHTS Beneficiary? *</label>
                                        <select
                                            className="input-field"
                                            value={form.four_ps_beneficiary}
                                            onChange={e => update('four_ps_beneficiary', e.target.value)}
                                            required
                                        >
                                            <option value="">— Select —</option>
                                            <option value="4ps">Yes — 4Ps Household</option>
                                            <option value="nhts">Yes — NHTS / Listahanan</option>
                                            <option value="barangay_indigent">No — Barangay-certified indigent only</option>
                                        </select>
                                    </div>

                                    {/* Monthly Income */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Household Monthly Income *</label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="e.g. 5000"
                                            min="0"
                                            value={form.monthly_income}
                                            onChange={e => update('monthly_income', e.target.value)}
                                            required
                                        />
                                    </div>

                                    {/* Barangay Indigency Certificate Upload */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Barangay Indigency Certificate *</label>
                                        <label
                                            className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl cursor-pointer transition-all"
                                            style={{
                                                background: indigencyCertFile ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                                                border: `1px dashed ${indigencyCertFile ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.3)'}`,
                                            }}
                                        >
                                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setIndigencyCertFile(e.target.files?.[0] ?? null)} />
                                            <Upload size={18} className={indigencyCertFile ? 'text-emerald-400' : 'text-violet-400'} />
                                            {indigencyCertFile ? (
                                                <span className="text-xs text-emerald-400 font-medium text-center break-all">{indigencyCertFile.name}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 text-center">Click to upload Barangay Indigency Certificate<br /><span className="text-slate-500">PDF or Image (JPG, PNG)</span></span>
                                            )}
                                        </label>
                                    </div>

                                    {/* MSWD Certificate Upload */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Certificate from MSWD confirming eligibility *</label>
                                        <label
                                            className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl cursor-pointer transition-all"
                                            style={{
                                                background: mswdCertFile ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                                                border: `1px dashed ${mswdCertFile ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.3)'}`,
                                            }}
                                        >
                                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setMswdCertFile(e.target.files?.[0] ?? null)} />
                                            <Upload size={18} className={mswdCertFile ? 'text-emerald-400' : 'text-violet-400'} />
                                            {mswdCertFile ? (
                                                <span className="text-xs text-emerald-400 font-medium text-center break-all">{mswdCertFile.name}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 text-center">Click to upload MSWD Certificate<br /><span className="text-slate-500">PDF or Image (JPG, PNG)</span></span>
                                            )}
                                        </label>
                                    </div>

                                    {/* Proof of Relationship (Indigent) */}
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Proof of Relationship to the Deceased *</label>
                                        <label
                                            className="flex flex-col items-center gap-2 px-4 py-4 rounded-xl cursor-pointer transition-all"
                                            style={{
                                                background: indigentRelationshipFile ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.03)',
                                                border: `1px dashed ${indigentRelationshipFile ? 'rgba(52,211,153,0.4)' : 'rgba(167,139,250,0.3)'}`,
                                            }}
                                        >
                                            <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setIndigentRelationshipFile(e.target.files?.[0] ?? null)} />
                                            <Upload size={18} className={indigentRelationshipFile ? 'text-emerald-400' : 'text-violet-400'} />
                                            {indigentRelationshipFile ? (
                                                <span className="text-xs text-emerald-400 font-medium text-center break-all">{indigentRelationshipFile.name}</span>
                                            ) : (
                                                <span className="text-xs text-slate-400 text-center">Click to upload Proof of Relationship<br /><span className="text-slate-500">PDF or Image (JPG, PNG)</span></span>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            className="btn-primary"
                            onClick={() => setStep(2)}
                            disabled={
                                !form.applicant_name || !form.relationship ||
                                (form.is_indigent && (
                                    !form.issuing_barangay || !form.four_ps_beneficiary || !form.monthly_income ||
                                    !indigencyCertFile || !mswdCertFile || !indigentRelationshipFile
                                ))
                            }
                        >
                            Next: Deceased Details →
                        </button>
                    </div>
                )}

                {/* Step 2: Deceased */}
                {step === 2 && (
                    <div className="space-y-4 animate-fade-in">
                        <h2 className="font-semibold text-white mb-4">Deceased Information</h2>

                        {/* Name row */}
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Last Name *</label>
                                <input type="text" className="input-field" placeholder="Dela Cruz" value={form.deceased_last_name} onChange={e => update('deceased_last_name', e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">First Name *</label>
                                <input type="text" className="input-field" placeholder="Maria" value={form.deceased_first_name} onChange={e => update('deceased_first_name', e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Middle Name</label>
                                <input type="text" className="input-field" placeholder="Santos" value={form.deceased_middle_name} onChange={e => update('deceased_middle_name', e.target.value)} />
                            </div>
                        </div>

                        {/* Age at Death */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Age at Death *</label>
                            <input type="number" className="input-field" placeholder="e.g. 75" min="0" max="150" value={form.age_at_death} onChange={e => update('age_at_death', e.target.value)} required />
                        </div>

                        {([
                            { key: 'death_cert_no' as const, label: 'Death Certificate Number', placeholder: 'DC-2024-XXXX', type: 'text' },
                            { key: 'date_of_death' as const, label: 'Date of Death', placeholder: '', type: 'date' },
                            { key: 'place_of_death' as const, label: 'Place of Death', placeholder: 'QC General Hospital', type: 'text' },
                            { key: 'cause_of_death' as const, label: 'Cause of Death', placeholder: 'Natural causes', type: 'text' },
                        ]).map(f => (
                            <div key={f.key}>
                                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">{f.label} *</label>
                                <input type={f.type} className="input-field" placeholder={f.placeholder} value={form[f.key]} onChange={e => update(f.key, e.target.value)} required />
                            </div>
                        ))}

                        <div className="flex gap-3">
                            <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                            <button
                                className="btn-primary"
                                onClick={() => setStep(3)}
                                disabled={!form.deceased_last_name || !form.deceased_first_name || !form.age_at_death || !form.date_of_death}
                            >
                                Next: Burial Preferences →
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Preferences */}
                {step === 3 && (() => {
                    const baseFee = BURIAL_FEES[form.burial_type] ?? 0
                    const residentMultiplier = form.is_resident === 'resident' ? 1 : 1.5
                    const burialFee = Math.round(baseFee * residentMultiplier)
                    const totalEstimate = burialFee + PERMIT_FEE

                    const requiredUploaded = REQUIREMENTS
                        .filter(r => r.required)
                        .every(r => !!reqFiles[r.key])

                    return (
                    <div className="space-y-6 animate-fade-in">
                        <h2 className="font-semibold text-white mb-4">Burial Preferences</h2>

                        {/* Burial Type */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Burial Type *</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { value: 'niche', label: '🪦 Niche',     desc: 'Above-ground columbarium', fee: '₱4,000' },
                                    { value: 'ground', label: '⬜ Ground',   desc: 'In-ground burial plot',    fee: '₱8,000' },
                                    { value: 'wall',   label: '🏛️ Wall Niche', desc: 'Exterior wall niche',    fee: '₱3,000' },
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
                                        <div className="text-xs font-bold mt-1" style={{ color: form.burial_type === opt.value ? '#60a5fa' : '#64748b' }}>{opt.fee}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Residency */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Residency Status *</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'resident',     label: '🏠 Resident',     desc: 'Base price applies' },
                                    { value: 'non_resident', label: '🚗 Non-Resident', desc: '+50% surcharge' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => update('is_resident', opt.value)}
                                        className="px-3 py-3 rounded-xl text-sm text-left transition-all"
                                        style={{
                                            background: form.is_resident === opt.value ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${form.is_resident === opt.value ? 'rgba(59,130,246,0.4)' : 'rgba(148,163,184,0.1)'}`,
                                            color: form.is_resident === opt.value ? '#60a5fa' : '#94a3b8',
                                        }}
                                    >
                                        <div className="font-semibold mb-0.5">{opt.label}</div>
                                        <div className="text-xs opacity-70">{opt.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fee Schedule */}
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                            <div className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.04)' }}>Fee Schedule</div>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                        <td className="px-4 py-2 text-slate-400">Burial Fee ({form.burial_type === 'niche' ? '🪦 Niche' : form.burial_type === 'ground' ? '⬜ Ground' : '🏛️ Wall Niche'})</td>
                                        <td className="px-4 py-2 text-right text-white font-semibold">₱{baseFee.toLocaleString()}</td>
                                    </tr>
                                    {form.is_resident === 'non_resident' && (
                                        <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                            <td className="px-4 py-2 text-slate-400">Non-Resident Surcharge (+50%)</td>
                                            <td className="px-4 py-2 text-right text-amber-400 font-semibold">+₱{(baseFee * 0.5).toLocaleString()}</td>
                                        </tr>
                                    )}
                                    <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                                        <td className="px-4 py-2 text-slate-400">Burial Permit Fee <span className="text-xs text-slate-500">(applied after approval)</span></td>
                                        <td className="px-4 py-2 text-right text-white font-semibold">₱{PERMIT_FEE.toLocaleString()}</td>
                                    </tr>
                                    <tr style={{ background: 'rgba(59,130,246,0.08)' }}>
                                        <td className="px-4 py-2.5 font-bold text-white">Estimated Total</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-blue-400 text-base">₱{totalEstimate.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Preferred Section */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Preferred Section</label>
                            <select className="input-field" value={form.preferred_section} onChange={e => update('preferred_section', e.target.value)}>
                                <option value="">No preference</option>
                                {['A', 'B', 'C', 'D', 'E', 'F'].map(s => <option key={s} value={s}>Section {s}</option>)}
                            </select>
                        </div>

                        {/* Special Requests */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Special Requests</label>
                            <textarea className="input-field" rows={3} placeholder="Any special requests or notes for the cemetery office…" value={form.special_request} onChange={e => update('special_request', e.target.value)} />
                        </div>

                        {/* Requirements Upload */}
                        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
                            <div className="px-4 py-2.5 text-xs font-bold text-slate-400 uppercase tracking-wide" style={{ background: 'rgba(255,255,255,0.04)' }}>Burial Requirements — Upload PDF</div>
                            <div className="divide-y" style={{ borderColor: 'rgba(148,163,184,0.08)' }}>
                                {REQUIREMENTS.map(req => (
                                    <label key={req.key} className="flex items-center justify-between px-4 py-3 cursor-pointer gap-3 transition-colors hover:bg-white/2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {reqFiles[req.key]
                                                ? <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                                                : <Upload size={14} className="text-slate-500 shrink-0" />}
                                            <span className="text-sm text-slate-300 truncate">{req.label}</span>
                                            {req.required && <span className="text-red-400 text-xs shrink-0">*</span>}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            {reqFiles[req.key]
                                                ? <span className="text-xs text-emerald-400 font-medium max-w-[120px] truncate block">{reqFiles[req.key]!.name}</span>
                                                : <span className="text-xs text-slate-500">Click to upload</span>}
                                        </div>
                                        <input type="file" accept=".pdf,image/*" className="hidden" onChange={e => setReqFile(req.key, e.target.files?.[0])} />
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="px-4 py-3 rounded-xl text-sm text-slate-400" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.1)' }}>
                            <AlertCircle size={14} className="inline mr-2 text-yellow-400" />
                            By submitting, you certify that all information provided is accurate. Fees are estimates and subject to change upon office review.
                        </div>

                        <div className="flex gap-3">
                            <button className="btn-secondary" onClick={() => setStep(2)}>← Back</button>
                            <button
                                className="btn-primary flex-1 justify-center"
                                onClick={handleSubmit}
                                disabled={submitting || !personId || !requiredUploaded}
                            >
                                {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting…</> : '✓ Submit Application'}
                            </button>
                        </div>
                    </div>
                    )
                })()}
            </div>
        </div>
    )
}