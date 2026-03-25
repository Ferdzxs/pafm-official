/**
 * park-application-form.tsx — Citizen overhauled for UI/UX
 */

import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Info,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ClipboardList,
  MapPin
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import { cn } from '@/lib/utils'
import {
  generateQmcParkApplicationPdfBlob,
  NATURE_OF_EVENT_TYPES,
  ORGANIZATION_TYPES,
  QMC_APPLICATION_FORM_PDF_URL,
  QMC_TERMS_AND_CONDITIONS,
  type NatureOfEventType,
  type OrganizationType,
  type QmcParkApplicationPayload,
} from '@/lib/qmcParkApplicationForm'

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectItem } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

const BUCKET_PARKS_DOCS = 'parks-docs'

// ─── TYPES & HELPERS ───
type PersonRow = {
  account_id?: string | null
  person_id?: string
  full_name?: string | null
  address?: string | null
  contact_number?: string | null
  street_address?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
}

function normalizeParkStatus(s?: string | null) {
  if (!s) return 'pending_loi'
  if (s === 'pending') return 'pending_loi'
  if (s === 'approved') return 'admin_approved'
  if (s === 'rejected') return 'admin_rejected'
  return s
}

function formatAddressLine(p: PersonRow | null): string {
  if (!p) return ''
  const parts = [p.street_address, p.barangay, p.city, p.province].filter(
    x => x != null && String(x).trim() !== ''
  ) as string[]
  if (parts.length) return parts.join(', ')
  return (p.address ?? '').trim()
}

/** Core columns present in standard BPM `person` table. */
const PERSON_SELECT_CORE = 'person_id, account_id, full_name, address, contact_number'

async function fetchPersonByPersonId(personId: string | null): Promise<PersonRow | null> {
  if (!personId?.trim()) return null
  let { data, error } = await supabase.from('person').select(PERSON_SELECT_CORE).eq('person_id', personId).maybeSingle()
  if (error) {
    console.warn('person by id:', error.message)
    return null
  }
  return data ? (data as PersonRow) : null
}

async function fetchPersonByAccountId(accountId: string | null): Promise<PersonRow | null> {
  if (!accountId?.trim()) return null
  let { data, error } = await supabase.from('person').select(PERSON_SELECT_CORE).eq('account_id', accountId).maybeSingle()
  if (error) {
    console.warn('person by account_id:', error.message)
    return null
  }
  return data ? (data as PersonRow) : null
}

function coalescePersonRows(...rows: (PersonRow | null | undefined)[]): PersonRow | null {
  const parts = rows.filter((r): r is PersonRow => r != null)
  if (parts.length === 0) return null
  const keys: (keyof PersonRow)[] = ['full_name','contact_number','street_address','barangay','city','province','address']
  const out: PersonRow = { ...parts[parts.length - 1] }
  for (const key of keys) {
    for (const p of parts) {
      const v = p[key]
      if (v != null && String(v).trim() !== '') { out[key] = v; break }
    }
  }
  return out
}

function eventTitleFromTimeSlot(timeSlot: string | null | undefined): string {
  if (!timeSlot || typeof timeSlot !== 'string') return ''
  const segs = timeSlot.split(' | ').map(s => s.trim()).filter(Boolean)
  if (segs.length >= 2) {
    const candidate = segs[1]
    if (candidate && !/^LOI excerpt:/i.test(candidate)) return candidate
  }
  return ''
}

const emptyForm = () => ({
  application_date: new Date().toISOString().split('T')[0],
  full_name: '',
  address: '',
  contact_no: '',
  organization_type: 'private_institution' as OrganizationType,
  organization_type_other: '',
  organization_name: '',
  requested_venue: '',
  event_title: '',
  nature_of_event: 'assembly_meeting' as NatureOfEventType,
  nature_of_event_other: '',
  number_of_participants: '' as string | number,
  event_date: '',
  time_ingress: '',
  time_egress: '',
  terms_agreed: false,
})

// ─── MAIN COMPONENT ───
export default function CitizenParkApplicationFormPage() {
  const { reservationId } = useParams<{ reservationId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [row, setRow] = useState<any | null>(null)
  const [form, setForm] = useState(emptyForm)

  const status = useMemo(() => normalizeParkStatus(row?.status), [row?.status])
  const canSubmit = status === 'application_form_issued' || status === 'application_incomplete'

  const update = (patch: Partial<ReturnType<typeof emptyForm>>) => setForm(prev => ({ ...prev, ...patch }))

  useEffect(() => {
    if (reservationId && user) load()
  }, [reservationId, user?.id])

  async function load() {
    if (!reservationId || !user) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: e } = await supabase
        .from('park_reservation_record')
        .select('reservation_id, reservation_date, time_slot, status, application_form_doc, applicant_person_id, park_venue(park_venue_name, location)')
        .eq('reservation_id', reservationId)
        .maybeSingle()

      if (e) throw e
      if (!data) throw new Error('Reservation not found.')

      let payload: QmcParkApplicationPayload | null = null
      const { data: payData } = await supabase.from('park_reservation_record').select('application_form_payload').eq('reservation_id', reservationId).maybeSingle()
      if (payData && (payData as any).application_form_payload) {
        payload = (payData as any).application_form_payload
      }

      let person: PersonRow | null = null
      if (!payload?.applicant) {
        let resId: string | null = null
        if (user.is_citizen) {
          resId = await getCitizenPersonIdForSession(supabase, user)
        }
        const [pRes, pBook, pAcc] = await Promise.all([
          fetchPersonByPersonId(resId),
          fetchPersonByPersonId(data.applicant_person_id),
          user.is_citizen ? fetchPersonByAccountId(user.id) : Promise.resolve(null),
        ])
        person = coalescePersonRows(pRes, pBook, pAcc)
      }

      setRow(data)
      applyDefaults(data as any, person, payload)
    } catch (err: any) {
      setError(err.message || 'Failed to initialize application form.')
    } finally {
      setLoading(false)
    }
  }

  function applyDefaults(data: any, person: PersonRow | null, payload: QmcParkApplicationPayload | null) {
    const venueName = data.park_venue?.park_venue_name ?? ''
    const loc = data.park_venue?.location ?? ''
    const requested = [venueName, loc].filter(Boolean).join(' — ') || venueName

    if (payload?.applicant) {
      const p = payload
      setForm({
        application_date: p.application_date,
        full_name: p.applicant.full_name,
        address: p.applicant.address,
        contact_no: p.applicant.contact_no,
        organization_type: p.applicant.organization_type,
        organization_type_other: p.applicant.organization_type_other ?? '',
        organization_name: p.applicant.organization_name,
        requested_venue: p.event.requested_venue,
        event_title: p.event.event_title,
        nature_of_event: p.event.nature_of_event,
        nature_of_event_other: p.event.nature_of_event_other ?? '',
        number_of_participants: p.event.number_of_participants,
        event_date: p.event.event_date,
        time_ingress: p.event.time_ingress,
        time_egress: p.event.time_egress,
        terms_agreed: false,
      })
      return
    }

    const name = (person?.full_name?.trim() || user?.full_name?.trim() || '').trim()
    const addr = formatAddressLine(person)
    const phone = (person?.contact_number?.trim() || '').trim()
    const fromLoi = eventTitleFromTimeSlot(data.time_slot)

    setForm({
      ...emptyForm(),
      full_name: name,
      address: addr,
      contact_no: phone,
      organization_name: 'Individual',
      requested_venue: requested,
      event_date: data.reservation_date?.slice(0, 10) ?? '',
      event_title: fromLoi,
    })
  }

  const validate = () => {
    if (!form.full_name.trim()) return 'Check Applicant Full Name'
    if (!form.address.trim()) return 'Check Applicant Address'
    if (!form.contact_no.trim()) return 'Check Contact Number'
    if (!form.event_title.trim()) return 'Check Event/Activity Title'
    if (!form.event_date) return 'Check Event Date'
    if (!form.terms_agreed) return 'You must agree to the Terms and Conditions'
    return null
  }

  async function submit() {
    if (!reservationId || !row) return
    const v = validate()
    if (v) { toast.error(v); return }

    setSaving(true)
    try {
      const n = Number(form.number_of_participants) || 1
      const payload: QmcParkApplicationPayload = {
        source_form: 'qmc_facilities_2024_09',
        reference_pdf_url: QMC_APPLICATION_FORM_PDF_URL,
        application_date: form.application_date,
        applicant: {
          full_name: form.full_name.trim(),
          address: form.address.trim(),
          contact_no: form.contact_no.trim(),
          organization_type: form.organization_type,
          organization_type_other: form.organization_type === 'others' ? form.organization_type_other.trim() : undefined,
          organization_name: form.organization_name.trim(),
        },
        event: {
          requested_venue: form.requested_venue.trim(),
          event_title: form.event_title.trim(),
          nature_of_event: form.nature_of_event,
          nature_of_event_other: form.nature_of_event === 'others' ? form.nature_of_event_other.trim() : undefined,
          number_of_participants: n,
          event_date: form.event_date,
          time_ingress: form.time_ingress,
          time_egress: form.time_egress,
        },
        terms_agreed: true,
        agreed_at: new Date().toISOString(),
        reservation_id: reservationId,
      }

      const pdfBlob = generateQmcParkApplicationPdfBlob(payload)
      const path = `application_forms/${reservationId}/${Date.now()}-qmc-application.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET_PARKS_DOCS).upload(path, pdfBlob, { contentType: 'application/pdf', upsert: true })
      if (upErr) throw upErr

      const { data: urlData } = supabase.storage.from(BUCKET_PARKS_DOCS).getPublicUrl(path)
      const docId = `DDOC-${Date.now()}`
      await supabase.from('digital_document').insert({
        document_id: docId,
        document_type: 'park_application_form',
        reference_no: `PAF-${reservationId}`,
        date_created: new Date().toISOString().split('T')[0],
        status: 'active',
        person_id: row?.applicant_person_id ?? null,
        file_url: urlData.publicUrl,
      })

      await supabase.from('park_reservation_record').update({
        application_form_doc: docId,
        status: 'application_submitted',
        application_form_payload: payload,
      }).eq('reservation_id', reservationId)

      toast.success('Your application has been filed successfully.')
      navigate('/citizen/applications')
    } catch (err: any) {
      toast.error(err.message || 'Submission failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl animate-fade-in px-4 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col items-center text-center space-y-3">
         <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-primary shadow-xs border border-primary">
            <ClipboardList size={32} />
         </div>
         <div className="space-y-1">
           <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Park Application Form</h1>
           <p className="text-muted-foreground text-sm max-w-md mx-auto">Please provide detailed information regarding your activity request at our municipal park facilities.</p>
         </div>
         {row && (
           <Badge variant="secondary" className="font-mono text-[10px] tracking-widest px-3 py-1 bg-secondary">
              REF: {row.reservation_id}
           </Badge>
         )}
      </header>

      {error && (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 flex gap-3 text-sm text-destructive items-start shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {loading ? (
         <Card className="border-border py-20 flex flex-col items-center justify-center gap-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest">Compiling Reservation Data...</p>
         </Card>
      ) : (
        <>
          {/* LOGISTICS CALLOUT */}
           <div className="rounded-2xl border border-blue-500 bg-blue-50 p-4 md:p-6 flex gap-4 md:items-center shadow-xs">
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
               <Info size={20} />
             </div>
             <div className="space-y-1">
               <p className="text-sm font-bold text-blue-900 dark:text-blue-300">Application Protocol</p>
                <p className="text-xs text-blue-800 leading-relaxed font-medium">
                 Verify all dates and times before submission. Upon filing, a digital version of the official QMC form will be generated and routed for administrative review.
               </p>
             </div>
          </div>

          {!canSubmit ? (
            <Card className="border-border p-12 text-center flex flex-col items-center justify-center gap-4 bg-muted">
               <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                 <ShieldCheck size={24} />
               </div>
               <div className="space-y-1">
                 <p className="font-bold">Awaiting Authorization</p>
                 <p className="text-xs text-muted-foreground mx-auto max-w-sm">This reservation is currently {status.replace(/_/g, ' ')}. The application form becomes accessible once staff issues the digital packet.</p>
               </div>
               <Button variant="outline" size="sm" onClick={() => navigate('/citizen/applications')}>Back to My Applications</Button>
            </Card>
          ) : (
            <div className="space-y-8 pb-20">
               {/* APPLICANT INFO */}
               <Card className="border-border shadow-xs">
                  <CardHeader className="pb-4">
                     <CardTitle className="text-lg flex items-center gap-2 tracking-tight">
                       <User className="h-4 w-4 text-primary" /> Applicant Particulars
                     </CardTitle>
                     <CardDescription>Legal name and contact details of the primary organizer.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="app-date">Application Filing Date</Label>
                         <Input id="app-date" type="date" value={form.application_date} onChange={e => update({ application_date: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="full-name">Full Name (Legal)</Label>
                         <Input id="full-name" placeholder="Juan Dela Cruz" value={form.full_name} onChange={e => update({ full_name: e.target.value })} />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="address">Permanent/Official Address</Label>
                       <Textarea id="address" placeholder="Unit, Street, Barangay, City/Province" value={form.address} onChange={e => update({ address: e.target.value })} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="contact">Contact Number</Label>
                         <Input id="contact" type="tel" value={form.contact_no} onChange={e => update({ contact_no: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="org-type">Organization Type</Label>
                         <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring" value={form.organization_type} onChange={e => update({ organization_type: e.target.value as OrganizationType })}>
                           {ORGANIZATION_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                         </select>
                       </div>
                    </div>

                    {form.organization_type === 'others' && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <Label htmlFor="org-type-other">Specify Organization Type</Label>
                        <Input id="org-type-other" value={form.organization_type_other} onChange={e => update({ organization_type_other: e.target.value })} />
                      </div>
                    )}

                    <div className="space-y-2">
                       <Label htmlFor="org-name">Name of Organization (if applicable)</Label>
                       <Input id="org-name" placeholder="Individual / Foundation Name" value={form.organization_name} onChange={e => update({ organization_name: e.target.value })} />
                    </div>
                  </CardContent>
               </Card>

               {/* EVENT INFO */}
               <Card className="border-border shadow-xs">
                  <CardHeader className="pb-4">
                     <CardTitle className="text-lg flex items-center gap-2 tracking-tight">
                       <Building2 className="h-4 w-4 text-primary" /> Event Specifications
                     </CardTitle>
                     <CardDescription>Nature, scope, and requested logistics of the activity.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2 bg-muted p-4 rounded-xl border border-dashed">
                       <Label htmlFor="venue" className="text-primary font-bold uppercase tracking-widest text-[10px]">Requested Facility (Locked)</Label>
                       <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-primary" />
                          <p className="font-bold text-sm tracking-tight">{form.requested_venue}</p>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label htmlFor="event-title">Official Title of Activity / Occasion</Label>
                       <Input id="event-title" placeholder="Event Branding Title" value={form.event_title} onChange={e => update({ event_title: e.target.value })} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                       <div className="space-y-2">
                         <Label htmlFor="nature">Nature of Engagement</Label>
                         <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus:ring-1 focus:ring-ring" value={form.nature_of_event} onChange={e => update({ nature_of_event: e.target.value as NatureOfEventType })}>
                           {NATURE_OF_EVENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                         </select>
                       </div>
                       <div className="space-y-2">
                         <Label htmlFor="participants">Estimated Total Attendance</Label>
                         <Input id="participants" type="number" min={1} value={form.number_of_participants} onChange={e => update({ number_of_participants: e.target.value })} />
                       </div>
                    </div>

                    {form.nature_of_event === 'others' && (
                      <div className="space-y-2 animate-in fade-in duration-300">
                        <Label htmlFor="nature-other">Specify Nature of Event</Label>
                        <Input id="nature-other" value={form.nature_of_event_other} onChange={e => update({ nature_of_event_other: e.target.value })} />
                      </div>
                    )}

                     <Separator />

                    <div className="grid md:grid-cols-3 gap-4">
                       <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Calendar className="h-3 w-3" /> Event Date</Label>
                         <Input type="date" value={form.event_date} onChange={e => update({ event_date: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Clock className="h-3 w-3" /> Time: Ingress</Label>
                         <Input type="time" value={form.time_ingress} onChange={e => update({ time_ingress: e.target.value })} />
                       </div>
                       <div className="space-y-2">
                         <Label className="flex items-center gap-2"><Clock className="h-3 w-3" /> Time: Egress</Label>
                         <Input type="time" value={form.time_egress} onChange={e => update({ time_egress: e.target.value })} />
                       </div>
                    </div>
                  </CardContent>
               </Card>

               {/* TERMS & CONDITIONS */}
               <Card className="border-border shadow-md">
                  <CardHeader className="bg-muted">
                     <CardTitle className="text-sm font-bold tracking-widest uppercase text-muted-foreground flex items-center justify-between">
                       Terms of Use 
                       <Badge variant="outline" className="border-primary text-primary uppercase text-[9px]">Municipal Code 2024</Badge>
                     </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="max-h-56 overflow-y-auto px-6 py-4 space-y-4">
                        {QMC_TERMS_AND_CONDITIONS.map((term, i) => (
                           <div key={i} className="flex gap-3 items-start">
                              <span className="text-xs font-bold text-primary/70 mt-0.5">{i+1}.</span>
                              <p className="text-xs text-muted-foreground leading-relaxed italic">{term}</p>
                           </div>
                        ))}
                     </div>
                  </CardContent>
                  <CardFooter className="bg-muted border-t p-6">
                    <label className="flex items-start gap-3 cursor-pointer group">
                       <div className="mt-1 h-5 w-5 rounded border border-input shadow-xs flex items-center justify-center bg-background group-hover:border-primary transition-colors overflow-hidden relative">
                         <input type="checkbox" className="absolute opacity-0 w-full h-full cursor-pointer z-10" checked={form.terms_agreed} onChange={e => update({ terms_agreed: e.target.checked })} />
                         {form.terms_agreed && <CheckCircle2 className="h-4 w-4 text-white bg-primary fill-primary" />}
                       </div>
                       <div className="flex-1 space-y-1">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Certificate of Agreement</p>
                          <p className="text-[11px] text-muted-foreground leading-snug">I acknowledge that the information provided is true and I commit to upholding all municipal rules prescribed for park usage.</p>
                       </div>
                    </label>
                  </CardFooter>
               </Card>

               <div className="pt-4 flex flex-col gap-3">
                  <Button size="lg" className="w-full h-14 bg-primary text-primary-foreground font-bold shadow-lg hover:shadow-xl transition-all" onClick={submit} disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Filing Application...</span>
                    ) : (
                      <span className="flex items-center gap-2 uppercase tracking-widest text-sm">Submit Final Application <ArrowRight size={18} /></span>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-muted-foreground">This action will generate an official document for the Reservation Officer to review.</p>
               </div>
            </div>
          )}

          {row?.application_form_doc && (
            <div className="rounded-2xl border border-emerald-500 bg-emerald-50 p-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">✓</div>
                 <div>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Documentation Secured</p>
                    <p className="text-[10px] text-muted-foreground font-mono">Reference: {row.application_form_doc}</p>
                 </div>
              </div>
              <Badge variant="success" className="font-bold uppercase tracking-widest text-[9px] px-2 h-5">Verified</Badge>
            </div>
          )}
        </>
      )}
    </div>
  )
}
