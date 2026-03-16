/**
 * ApplyParkReservationPage.tsx — Citizen Module
 * BPMN Step 1: Citizen submits Digital Letter of Intent
 * BPMN Step 2: System logs and pre-checks request (INSERT to DB)
 * BPMN Step 3: Venue availability check (only 'available' venues shown)
 *
 * STORAGE FORMAT in time_slot column:
 *   "HH:MM-HH:MM | Event Name | Purpose: event purpose text"
 *   e.g. "09:00-17:00 | Birthday ni Mama | Purpose: Family celebration"
 */

import React, { useState, useEffect } from 'react'
import { CheckCircle, Loader2, AlertCircle, CalendarDays, Clock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Venue {
  park_venue_id:       string
  park_venue_name:     string
  location:            string
  availability_status: string
}

function genReservationId() {
  return `PRR-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`
}
function genPersonId()  { return `PER-${Math.floor(Math.random() * 90000 + 10000)}` }
function genAccountId() { return `ACC-${Math.floor(Math.random() * 90000 + 10000)}` }

export default function ApplyParkReservationPage() {
  const { user } = useAuth()

  const [submitting, setSubmitting]       = useState(false)
  const [submitted, setSubmitted]         = useState(false)
  const [submittedId, setSubmittedId]     = useState<string | null>(null)
  const [venues, setVenues]               = useState<Venue[]>([])
  const [loadingVenues, setLoadingVenues] = useState(true)

  const [form, setForm] = useState({
    event_name:     '',
    venue_id:       '',
    event_date:     '',
    time_slot:      '',
    contact_number: '',
    email:          '',
    purpose:        '',
  })

  const update = (k: string, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // Pre-fill email from logged-in user
  useEffect(() => {
    if (user?.email) update('email', user.email)
  }, [user])

  // BPMN Step 3: Load only AVAILABLE venues
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)

    try {
      // Step A: Resolve person_id
      let personId: string | null = null

      const { data: accountData, error: accountFetchErr } = await supabase
        .from('citizen_account')
        .select('person_id, account_id')
        .eq('email', user.email)
        .maybeSingle()

      if (accountFetchErr) throw new Error(`Account lookup failed: ${accountFetchErr.message}`)

      if (accountData?.person_id) {
        personId = accountData.person_id
        if (form.contact_number) {
          await supabase
            .from('person')
            .update({ contact_number: form.contact_number })
            .eq('person_id', personId)
        }
      } else {
        const newPersonId  = genPersonId()
        const newAccountId = genAccountId()

        const { error: personErr } = await supabase
          .from('person')
          .insert([{
            person_id:      newPersonId,
            full_name:      user.full_name ?? user.email,
            contact_number: form.contact_number || null,
            address:        null,
            account_id:     newAccountId,
          }])
        if (personErr) throw new Error(`Person record failed: ${personErr.message}`)

        const { error: acctErr } = await supabase
          .from('citizen_account')
          .insert([{
            account_id:          newAccountId,
            person_id:           newPersonId,
            email:               user.email,
            verification_status: 'pending',
            registered_date:     new Date().toISOString().split('T')[0],
          }])
        if (acctErr) throw new Error(`Account record failed: ${acctErr.message}`)

        personId = newPersonId
      }

      // Step B: Build time_slot string that includes event name AND purpose
      // Format: "09:00-17:00 | Event Name | Purpose: description"
      // This is how purpose/description gets stored since DB has no dedicated column
      let timeSlotValue = form.time_slot
      if (form.event_name) timeSlotValue += ` | ${form.event_name}`
      if (form.purpose)    timeSlotValue += ` | Purpose: ${form.purpose}`

      const reservationId = genReservationId()

      const { error: insertErr } = await supabase
        .from('park_reservation_record')
        .insert([{
          reservation_id:        reservationId,
          applicant_person_id:   personId,
          park_venue_id:         form.venue_id,
          reservation_date:      form.event_date,
          time_slot:             timeSlotValue,
          status:                'pending',
          letter_of_intent_doc:  null,
          application_form_doc:  null,
          processed_by_admin:    null,
          received_by_employee:  null,
          approved_by_employee:  null,
          payment_id:            null,
          digital_permit_url:    null,
        }])

      if (insertErr) throw new Error(`Reservation insert failed: ${insertErr.message}`)

      toast.success('Park reservation submitted successfully!')
      setSubmittedId(reservationId)
      setSubmitted(true)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit reservation.'
      console.error(err)
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[80vh]">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-emerald-400" />
        </div>
        <h2 className="font-display font-bold text-2xl text-white mb-2">Reservation Submitted!</h2>
        <p className="text-slate-400 mb-2">
          Your park reservation request has been sent to the Parks Reservation Desk for review.
        </p>
        {submittedId && (
          <p className="text-xs text-slate-500 mb-4 font-mono bg-slate-800 px-3 py-2 rounded-lg">
            Reservation ID: <span className="text-slate-300 font-semibold">{submittedId}</span>
          </p>
        )}
        <p className="text-xs text-slate-500 mb-6">
          You will be notified once the Parks Administrator reviews your request (BPMN Step 5).
        </p>
        <button
          className="btn-primary mx-auto"
          onClick={() => {
            setSubmitted(false)
            setSubmittedId(null)
            setForm({ event_name: '', venue_id: '', event_date: '', time_slot: '', contact_number: '', email: user?.email ?? '', purpose: '' })
          }}
        >
          Submit Another Reservation
        </button>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Park Reservation Application</h1>
        <p className="text-slate-400 text-sm mt-0.5">Reserve a public park or recreation venue</p>
      </div>

      <div className="glass rounded-2xl p-6" style={{ border: '1px solid rgba(148,163,184,0.1)' }}>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Event Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Event Name *
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Birthday Celebration, Community Meeting"
              value={form.event_name}
              onChange={e => update('event_name', e.target.value)}
              required
            />
          </div>

          {/* Venue */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Select Park Venue *
            </label>
            {loadingVenues ? (
              <div className="input-field text-slate-400 text-sm flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Loading venues…
              </div>
            ) : venues.length === 0 ? (
              <div className="input-field text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={14} /> No available venues at the moment.
              </div>
            ) : (
              <select
                className="input-field"
                value={form.venue_id}
                onChange={e => update('venue_id', e.target.value)}
                required
              >
                <option value="">Select venue…</option>
                {venues.map(v => (
                  <option key={v.park_venue_id} value={v.park_venue_id}>
                    {v.park_venue_name} — {v.location}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              <CalendarDays size={12} className="inline mr-1" />
              Event Date *
            </label>
            <input
              type="date"
              className="input-field"
              value={form.event_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => update('event_date', e.target.value)}
              required
            />
          </div>

          {/* Time Slot */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              <Clock size={12} className="inline mr-1" />
              Time Slot *
            </label>
            <select
              className="input-field"
              value={form.time_slot}
              onChange={e => update('time_slot', e.target.value)}
              required
            >
              <option value="">Select time slot…</option>
              <option value="05:00-09:00">05:00 – 09:00 (Early Morning)</option>
              <option value="08:00-12:00">08:00 – 12:00 (Morning)</option>
              <option value="09:00-17:00">09:00 – 17:00 (Business Hours)</option>
              <option value="12:00-16:00">12:00 – 16:00 (Afternoon)</option>
              <option value="15:00-22:00">15:00 – 22:00 (Evening)</option>
              <option value="16:00-20:00">16:00 – 20:00 (Late Afternoon)</option>
              <option value="06:00-20:00">06:00 – 20:00 (Full Day)</option>
            </select>
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Contact Number *
            </label>
            <input
              type="tel"
              className="input-field"
              placeholder="09xxxxxxxxx"
              value={form.contact_number}
              onChange={e => update('contact_number', e.target.value)}
              required
            />
          </div>

          {/* Email — NEW FIELD */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              <Mail size={12} className="inline mr-1" />
              Email Address *
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="your@email.com"
              value={form.email}
              onChange={e => update('email', e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-600 mt-1">
              Approval notifications will be sent to this email.
            </p>
          </div>

          {/* Event Purpose — NEW: now properly saved */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Event Purpose / Description *
            </label>
            <textarea
              rows={3}
              className="input-field"
              placeholder="Describe your event, expected number of attendees, and any special requirements…"
              value={form.purpose}
              onChange={e => update('purpose', e.target.value)}
              required
            />
            <p className="text-[11px] text-slate-600 mt-1">
              This will be visible to the Parks Administrator when reviewing your request.
            </p>
          </div>

          {/* Supporting Letter */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
              Supporting Letter / Letter of Intent
              <span className="ml-2 text-slate-600 normal-case font-normal">(Coming soon)</span>
            </label>
            <div className="input-field text-slate-500 text-sm bg-slate-800/50 cursor-not-allowed">
              File upload will be available soon. (BPMN Step 1 — Letter of Intent)
            </div>
          </div>

          {/* Info note */}
          <div
            className="px-4 py-3 rounded-xl text-xs text-slate-400 flex items-start gap-2"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.1)' }}
          >
            <AlertCircle size={14} className="text-blue-400 shrink-0 mt-0.5" />
            <span>
              Your request will be reviewed by the <strong className="text-slate-300">Parks Reservation Desk</strong> (BPMN Step 2),
              then endorsed to the <strong className="text-slate-300">Parks Administrator</strong> for final approval (BPMN Steps 4–5).
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary w-full justify-center mt-2"
            disabled={submitting || loadingVenues || venues.length === 0}
          >
            {submitting
              ? <><Loader2 size={16} className="animate-spin mr-2" />Submitting…</>
              : 'Submit Reservation Request'
            }
          </button>

        </form>
      </div>
    </div>
  )
}