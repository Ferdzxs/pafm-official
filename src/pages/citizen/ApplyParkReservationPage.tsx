/**
 * ApplyParkReservationPage — Citizen Module (Letter of Intent only)
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  CalendarDays,
  Mail,
  FileText,
  MapPin,
  User,
  Trees,
  Clock,
  Info,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { getCitizenPersonIdForSession } from '@/lib/citizenBpmIdentity'
import { generateParkLoiPdfBlob } from '@/lib/parkLoiPdf'
import { cn } from '@/lib/utils'

interface Venue {
  park_venue_id: string
  park_venue_name: string
  location: string
  availability_status: string
}

type PersonRow = {
  person_id?: string
  full_name?: string | null
  contact_number?: string | null
  address?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  street_address?: string | null
}

/** Base BPM `person` table columns only — extended columns (barangay, etc.) are not in all DBs and break the query. */
const PERSON_SELECT = 'person_id, full_name, address, contact_number, account_id'

const ACTIVITY_QUICK_PICKS: { value: string; label: string }[] = [
  { value: 'Community sports day', label: 'Community sports' },
  { value: 'Barangay assembly / meeting', label: 'Barangay meeting' },
  { value: 'Cultural / festival event', label: 'Cultural / festival' },
  { value: 'Youth / school program', label: 'Youth / school' },
  { value: 'Private celebration (family)', label: 'Private celebration' },
  { value: 'Government / NGO activity', label: 'Gov / NGO' },
  { value: 'Fitness / wellness activity', label: 'Fitness' },
]

const DATE_QUICK_OPTIONS: { value: string; label: string; days?: number }[] = [
  { value: '+7', label: 'In 1 week', days: 7 },
  { value: '+14', label: 'In 2 weeks', days: 14 },
  { value: '+30', label: 'In 1 month', days: 30 },
]

const TIME_QUICK_OPTIONS: { value: string; label: string; note: string }[] = [
  { value: '', label: 'Choose a typical period…', note: '' },
  { value: 'tbd', label: 'Flexible / to be discussed', note: 'TBD' },
  { value: 'morning', label: 'Morning (6 AM – 12 PM)', note: 'Morning hours (approx. 6:00 AM – 12:00 PM)' },
  { value: 'afternoon', label: 'Afternoon (12 PM – 5 PM)', note: 'Afternoon (approx. 12:00 PM – 5:00 PM)' },
  { value: 'evening', label: 'Evening (5 PM – 10 PM)', note: 'Evening (approx. 5:00 PM – 10:00 PM)' },
  { value: 'fullday', label: 'Full day', note: 'Full day (daylight hours)' },
  { value: 'custom', label: 'Custom (type below)', note: '__custom__' },
]

const LETTER_TEMPLATES: { value: string; label: string }[] = [
  { value: '', label: 'Choose a starting draft…' },
  { value: 'standard', label: 'Standard (name & address)' },
  { value: 'short', label: 'Short intent only' },
]

function addDaysFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function genReservationId() {
  return `PRR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
}
function genPersonId() {
  return `PER-${Math.floor(Math.random() * 90000 + 10000)}`
}
function genAccountId() {
  return `ACC-${Math.floor(Math.random() * 90000 + 10000)}`
}

function formatAddressLine(p: PersonRow): string {
  const parts = [p.street_address, p.barangay, p.city, p.province].filter(
    x => x != null && String(x).trim() !== ''
  ) as string[]
  if (parts.length) return parts.join(', ')
  return (p.address ?? '').trim()
}

function buildStandardLetter(p: PersonRow | null, userName: string): string {
  const name = p?.full_name?.trim() || userName
  const addr = p ? formatAddressLine(p) : ''
  const lines = [
    `I, ${name}${addr ? `, residing at ${addr}` : ''}, hereby submit this Letter of Intent to request the use of a public park venue for an organized activity.`,
    '',
    'Nature of activity: (please describe briefly below, including expected number of participants and any equipment or setup needs.)',
    '',
    'I understand that this LOI does not constitute a confirmed reservation and that further coordination and approval may be required by the Parks Office.',
    '',
    'Respectfully yours,',
    name,
  ]
  return lines.join('\n')
}

function buildShortLetter(userName: string): string {
  return `I intend to request a park venue reservation for a community activity. Contact person: ${userName}. Further details will follow upon instruction from the Parks Office.`
}

const BUCKET_PARKS_DOCS = 'parks-docs'

function FormSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 text-foreground">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={20} strokeWidth={2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground tracking-tight">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="pt-4 space-y-4 border-t border-border">{children}</div>
    </section>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-foreground leading-snug">
      {children}
      {required && (
        <span className="text-destructive ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

export default function ApplyParkReservationPage() {
  const { user } = useAuth()

  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [loadingVenues, setLoadingVenues] = useState(true)

  const [loadingProfile, setLoadingProfile] = useState(true)
  const [personRow, setPersonRow] = useState<PersonRow | null>(null)

  const [activityQuick, setActivityQuick] = useState('')
  const [dateQuick, setDateQuick] = useState('')
  const [timeQuick, setTimeQuick] = useState('')
  const [letterTemplateChoice, setLetterTemplateChoice] = useState('')

  const [form, setForm] = useState({
    event_title: '',
    venue_id: '',
    preferred_date: '',
    preferred_time_note: '',
    contact_number: '',
    email: '',
    letter_body: '',
  })

  const update = useCallback((k: string, v: string) => setForm(prev => ({ ...prev, [k]: v })), [])

  const applyPersonToForm = useCallback((p: PersonRow | null, u: NonNullable<typeof user>) => {
    setForm(prev => ({
      ...prev,
      contact_number: prev.contact_number.trim()
        ? prev.contact_number
        : (p?.contact_number ?? '').trim() || prev.contact_number,
      email: u.email ?? prev.email,
      letter_body: prev.letter_body.trim()
        ? prev.letter_body
        : buildStandardLetter(p, u.full_name ?? u.email),
    }))
  }, [])

  useEffect(() => {
    if (!user) return
    const u = user
    let cancelled = false

    async function loadPerson() {
      setLoadingProfile(true)
      try {
        const personId = await getCitizenPersonIdForSession(supabase, u)
        if (cancelled) return

        update('email', u.email ?? '')

        if (personId) {
          const { data: p, error: personErr } = await supabase
            .from('person')
            .select(PERSON_SELECT)
            .eq('person_id', personId)
            .maybeSingle()
          if (personErr) console.warn('Person profile load:', personErr.message)
          if (!cancelled && p) {
            setPersonRow(p as PersonRow)
            applyPersonToForm(p as PersonRow, u)
          } else if (!cancelled) {
            setPersonRow(null)
            setForm(prev => ({
              ...prev,
              email: u.email ?? '',
              letter_body: prev.letter_body.trim()
                ? prev.letter_body
                : buildStandardLetter(null, u.full_name ?? u.email),
            }))
          }
        } else if (!cancelled) {
          setPersonRow(null)
          setForm(prev => ({
            ...prev,
            email: u.email ?? '',
            letter_body: prev.letter_body.trim()
              ? prev.letter_body
              : buildStandardLetter(null, u.full_name ?? u.email),
          }))
        }
      } catch (e) {
        console.error('Profile prefetch:', e)
        if (!cancelled) {
          update('email', u.email ?? '')
        }
      } finally {
        if (!cancelled) setLoadingProfile(false)
      }
    }

    void loadPerson()
    return () => {
      cancelled = true
    }
  }, [user, applyPersonToForm, update])

  useEffect(() => {
    async function fetchVenues() {
      const { data, error } = await supabase
        .from('park_venue')
        .select('park_venue_id, park_venue_name, location, availability_status')
        .eq('availability_status', 'available')
        .order('park_venue_name')
      if (error) console.error('Venues fetch error:', error)
      setVenues(data ?? [])
      setLoadingVenues(false)
    }
    fetchVenues()
  }, [])

  const onActivityChip = (value: string) => {
    setActivityQuick(value)
    update('event_title', value)
  }

  const onDateQuickChange = (value: string) => {
    setDateQuick(value)
    const opt = DATE_QUICK_OPTIONS.find(o => o.value === value)
    if (opt?.days != null) update('preferred_date', addDaysFromToday(opt.days))
  }

  const onTimeQuickChange = (value: string) => {
    setTimeQuick(value)
    if (value === '' || value === 'custom') {
      if (value === '') update('preferred_time_note', '')
      return
    }
    const opt = TIME_QUICK_OPTIONS.find(o => o.value === value)
    if (opt && opt.note && opt.note !== '__custom__') update('preferred_time_note', opt.note)
  }

  const onLetterTemplateChange = (value: string) => {
    setLetterTemplateChoice(value)
    if (!user) return
    if (value === 'standard') {
      update('letter_body', buildStandardLetter(personRow, user.full_name ?? user.email))
    } else if (value === 'short') {
      update('letter_body', buildShortLetter(user.full_name ?? user.email))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (form.letter_body.trim().length < 40) {
      toast.error('Your letter of intent must be at least 40 characters.')
      return
    }
    setSubmitting(true)

    try {
      let personId = await getCitizenPersonIdForSession(supabase, user)

      if (personId) {
        if (form.contact_number) {
          await supabase.from('person').update({ contact_number: form.contact_number }).eq('person_id', personId)
        }
      } else {
        if (user.id.startsWith('EXT-')) {
          throw new Error(
            'Could not resolve your linked citizen profile (person_id). Sign out and sign in again, or contact support.',
          )
        }
        const newPersonId = genPersonId()
        const newAccountId = genAccountId()

        const { error: personErr } = await supabase.from('person').insert([
          {
            person_id: newPersonId,
            full_name: user.full_name ?? user.email,
            contact_number: form.contact_number || null,
            address: null,
            account_id: newAccountId,
          },
        ])
        if (personErr) throw new Error(`Person record failed: ${personErr.message}`)

        const { error: acctErr } = await supabase.from('citizen_account').insert([
          {
            account_id: newAccountId,
            person_id: newPersonId,
            email: user.email,
            verification_status: 'pending',
            registered_date: new Date().toISOString().split('T')[0],
          },
        ])
        if (acctErr) throw new Error(`Account record failed: ${acctErr.message}`)

        personId = newPersonId
      }

      const timeParts = [
        form.preferred_time_note.trim() || 'TBD',
        form.event_title.trim(),
        `LOI excerpt: ${form.letter_body.trim().slice(0, 500)}${form.letter_body.length > 500 ? '…' : ''}`,
      ]
      const timeSlotValue = timeParts.join(' | ')

      const reservationId = genReservationId()

      const venue = venues.find(v => v.park_venue_id === form.venue_id)
      const applicantName =
        personRow?.full_name?.trim() || user.full_name?.trim() || user.email || 'Applicant'

      const pdfBlob = generateParkLoiPdfBlob({
        reservationId,
        applicantName,
        contactNumber: form.contact_number.trim(),
        email: form.email.trim(),
        eventTitle: form.event_title.trim(),
        venueName: venue?.park_venue_name ?? '—',
        venueLocation: venue?.location ?? '—',
        preferredDate: form.preferred_date,
        preferredTimeNote: form.preferred_time_note,
        letterBody: form.letter_body.trim(),
      })

      const path = `loi/${reservationId}/${Date.now()}-letter-of-intent.pdf`
      const { error: upErr } = await supabase.storage.from(BUCKET_PARKS_DOCS).upload(path, pdfBlob, {
        contentType: 'application/pdf',
        upsert: true,
      })

      let fileUrl = ''
      if (!upErr) {
        const { data: urlData } = supabase.storage.from(BUCKET_PARKS_DOCS).getPublicUrl(path)
        fileUrl = urlData.publicUrl
      } else {
        const bucketHint = /bucket not found/i.test(upErr.message)
          ? ' Create the `parks-docs` bucket in your Supabase project: Dashboard → SQL → paste and run `sql/supabase_storage_parks_docs.sql`.'
          : ''
        const rlsHint =
          /row-level security|violates row-level security/i.test(upErr.message)
            ? ' Re-run the latest `sql/supabase_storage_parks_docs.sql` (policies must allow `anon` uploads — this app uses custom login, not Supabase Auth JWT).'
            : ''
        throw new Error(`Could not upload Letter of Intent: ${upErr.message}.${bucketHint}${rlsHint}`)
      }

      const letterDocId = `DDOC-${Date.now()}`
      const { error: docErr } = await supabase.from('digital_document').insert({
        document_id: letterDocId,
        document_type: 'park_letter_of_intent',
        reference_no: `LOI-${reservationId}`,
        date_created: new Date().toISOString().split('T')[0],
        status: 'active',
        created_by_office: null,
        received_by_employee: null,
        person_id: personId,
        file_url: fileUrl,
      })
      if (docErr) throw new Error(`Document record failed: ${docErr.message}`)

      const { error: insertErr } = await supabase.from('park_reservation_record').insert([
        {
          reservation_id: reservationId,
          applicant_person_id: personId,
          park_venue_id: form.venue_id,
          reservation_date: form.preferred_date,
          time_slot: timeSlotValue,
          status: 'pending_loi',
          letter_of_intent_doc: letterDocId,
          application_form_doc: null,
          processed_by_admin: null,
          received_by_employee: null,
          approved_by_employee: null,
          payment_id: null,
          digital_permit_url: null,
        },
      ])

      if (insertErr) throw new Error(`Reservation insert failed: ${insertErr.message}`)

      toast.success('Letter of Intent submitted successfully.')
      setSubmittedId(reservationId)
      setSubmitted(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit Letter of Intent.'
      console.error(err)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const resetAfterSuccess = () => {
    setSubmitted(false)
    setSubmittedId(null)
    setActivityQuick('')
    setDateQuick('')
    setTimeQuick('')
    setLetterTemplateChoice('')
    setForm({
      event_title: '',
      venue_id: '',
      preferred_date: '',
      preferred_time_note: '',
      contact_number: '',
      email: user?.email ?? '',
      letter_body: '',
    })
    if (personRow && user) {
      applyPersonToForm(personRow, user)
    } else if (user) {
      setForm(prev => ({
        ...prev,
        email: user.email ?? '',
        letter_body: buildStandardLetter(null, user.full_name ?? user.email),
      }))
    }
  }

  const letterLen = form.letter_body.trim().length
  const letterOk = letterLen >= 40

  if (!user) return null

  if (submitted)
    return (
      <div className="mx-auto max-w-(--breakpoint-2xl) px-6 py-8 animate-fade-in flex items-center justify-center min-h-[75vh] text-foreground">
        <div className="w-full max-w-md text-center rounded-2xl border border-border bg-card p-8 shadow-md">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--state-success-soft)] border border-[color:var(--state-success)]/35">
            <CheckCircle size={32} className="text-[color:var(--state-success)]" aria-hidden />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">Letter of Intent received</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-balance">
            Your LOI was sent to the Parks Reservation Desk. You may be asked for a full application after review.
          </p>
          {submittedId && (
            <div className="mt-5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-left">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Reference no.</p>
              <p className="font-mono text-sm font-semibold text-foreground mt-0.5 break-all">{submittedId}</p>
            </div>
          )}
          <p className="mt-4 text-sm text-muted-foreground">Check your email for updates.</p>
          <button
            type="button"
            className="btn-primary w-full justify-center mt-8"
            onClick={resetAfterSuccess}
          >
            Submit another LOI
          </button>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) px-6 py-8 animate-fade-in pb-14 text-foreground space-y-8">
      <header className="bg-card p-6 rounded-2xl border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Trees size={12} className="text-primary shrink-0" aria-hidden />
            Parks &amp; recreation
          </span>
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
          Letter of intent
        </h1>
        <p className="text-sm sm:text-base mt-2 text-muted-foreground max-w-2xl leading-relaxed text-balance">
          Tell us what you need in writing. Your text is turned into an official PDF automatically. This is not a confirmed
          booking—staff will review and contact you.
        </p>
      </header>

      <nav
        className="mb-8 flex rounded-xl border border-border bg-muted/40 p-1 gap-1"
        aria-label="Process overview"
      >
        {[
          { n: 1, t: 'Submit LOI', active: true },
          { n: 2, t: 'Desk review', active: false },
          { n: 3, t: 'Next steps', active: false },
        ].map(s => (
          <div
            key={s.n}
            className={cn(
              'flex flex-1 flex-col sm:flex-row items-center justify-center gap-1.5 rounded-lg py-2.5 px-2 text-center transition-colors',
              s.active ? 'bg-card text-foreground shadow-sm border border-border' : 'text-muted-foreground'
            )}
          >
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold',
                s.active ? 'bg-primary text-primary-foreground' : 'bg-card border border-border text-muted-foreground'
              )}
            >
              {s.n}
            </span>
            <span
              className={cn(
                'text-[11px] sm:text-xs font-medium leading-tight',
                s.active ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {s.t}
            </span>
          </div>
        ))}
      </nav>

      {loadingProfile && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 size={16} className="animate-spin shrink-0 text-primary" aria-hidden />
          <span>Loading your profile…</span>
        </div>
      )}

      {!loadingProfile && personRow && (
        <div className="mb-6 flex gap-3 rounded-xl border border-[color:var(--state-success)]/25 bg-[color:var(--state-success-soft)] px-4 py-3 text-sm">
          <User size={18} className="text-[color:var(--state-success)] shrink-0 mt-0.5" aria-hidden />
          <p className="leading-relaxed text-foreground">
            <span className="font-semibold text-foreground">Profile applied.</span>{' '}
            <span className="text-muted-foreground">
              Contact and letter draft came from your saved record—edit anything before sending.
            </span>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormSection
          icon={FileText}
          title="Activity"
          description="Name your activity or tap a preset, then refine the title if needed."
        >
          <div className="space-y-2">
            <FieldLabel required>Activity title</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_QUICK_PICKS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onActivityChip(o.value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-secondary)]',
                    activityQuick === o.value && form.event_title === o.value
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/25'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              className="input-field"
              placeholder="Custom title (e.g. Barangay clean-up drive)"
              value={form.event_title}
              onChange={e => {
                update('event_title', e.target.value)
                setActivityQuick('')
              }}
              required
            />
          </div>
        </FormSection>

        <FormSection
          icon={MapPin}
          title="Venue & schedule"
          description="Choose an available venue and when you hope to use it."
        >
          <div className="space-y-2">
            <FieldLabel required>Preferred venue</FieldLabel>
            {loadingVenues ? (
              <div className="input-field flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 size={14} className="animate-spin" /> Loading venues…
              </div>
            ) : venues.length === 0 ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center gap-2">
                <AlertCircle size={16} /> No venues available right now.
              </div>
            ) : (
              <select
                className="input-field"
                value={form.venue_id}
                onChange={e => update('venue_id', e.target.value)}
                required
              >
                <option value="">Select a venue…</option>
                {venues.map(v => (
                  <option key={v.park_venue_id} value={v.park_venue_id}>
                    {v.park_venue_name} — {v.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <FieldLabel required>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} className="text-muted-foreground" />
                Preferred date
              </span>
            </FieldLabel>
            <p className="text-sm text-muted-foreground leading-relaxed">Tentative only—not a confirmed schedule.</p>
            <div className="flex flex-wrap gap-2">
              {DATE_QUICK_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => onDateQuickChange(o.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-secondary)]',
                    dateQuick === o.value
                      ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/25'
                      : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              className="input-field max-w-[200px]"
              value={form.preferred_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => {
                update('preferred_date', e.target.value)
                setDateQuick('')
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <FieldLabel>
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} className="text-muted-foreground" />
                Preferred time
              </span>
            </FieldLabel>
            <p className="text-sm text-muted-foreground leading-relaxed">Optional. Pick a typical period or describe your own.</p>
            <select className="input-field" value={timeQuick} onChange={e => onTimeQuickChange(e.target.value)}>
              {TIME_QUICK_OPTIONS.map(o => (
                <option key={o.value || 'none'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="input-field"
              placeholder={
                timeQuick === 'custom' ? 'Describe your preferred time…' : 'Add detail (optional)'
              }
              value={form.preferred_time_note}
              onChange={e => {
                update('preferred_time_note', e.target.value)
                if (e.target.value && timeQuick && timeQuick !== 'custom') setTimeQuick('custom')
              }}
            />
          </div>
        </FormSection>

        <FormSection
          icon={FileText}
          title="Letter of intent"
          description="Start from a draft or write your own. Minimum 40 characters."
        >
          <div className="space-y-2">
            <FieldLabel>Starting draft</FieldLabel>
            <select
              className="input-field"
              value={letterTemplateChoice}
              onChange={e => onLetterTemplateChange(e.target.value)}
            >
              {LETTER_TEMPLATES.map(o => (
                <option key={o.value || 'blank'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <FieldLabel required>Write your Letter of Intent</FieldLabel>
            <p className="text-sm text-muted-foreground leading-relaxed -mt-1">
              This will be converted into an official document automatically.
            </p>
            <textarea
              rows={8}
              className="input-field resize-y min-h-[160px] text-sm leading-relaxed"
              placeholder="Your statement of intent…"
              value={form.letter_body}
              onChange={e => {
                update('letter_body', e.target.value)
                setLetterTemplateChoice('')
              }}
              required
              minLength={40}
            />
            <div className="flex flex-wrap justify-between gap-2 text-xs sm:text-sm">
              <span className={letterOk ? 'text-[color:var(--state-success)] font-medium' : 'text-muted-foreground'}>
                {letterOk ? 'Minimum length met' : `${Math.max(0, 40 - letterLen)} more characters needed`}
              </span>
              <span className="text-muted-foreground tabular-nums">{letterLen} / 40+</span>
            </div>
          </div>
        </FormSection>

        <FormSection
          icon={Mail}
          title="Contact"
          description="We will use this to reach you about your request."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-1">
              <FieldLabel required>Mobile number</FieldLabel>
              <input
                type="tel"
                className="input-field"
                placeholder="09xxxxxxxxx"
                value={form.contact_number}
                onChange={e => update('contact_number', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-1">
              <FieldLabel required>Email</FieldLabel>
              <input
                type="email"
                className="input-field"
                placeholder="you@email.com"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </div>
          </div>
        </FormSection>

        <div className="flex gap-3 rounded-xl border border-border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
          <Info size={18} className="shrink-0 text-primary mt-0.5" aria-hidden="true" />
          <p className="leading-relaxed">
            This step only records your <strong className="text-foreground font-semibold">letter of intent</strong>.
            Fees, final approval, and exact time slots are handled after the desk reviews your submission.
          </p>
        </div>

        <button
          type="submit"
          className="btn-primary w-full justify-center py-3 text-base shadow-sm"
          disabled={submitting || loadingVenues || venues.length === 0 || loadingProfile}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              Submitting…
            </>
          ) : (
            'Submit letter of intent'
          )}
        </button>
      </form>
    </div>
  )
}
