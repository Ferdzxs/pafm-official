import { jsPDF } from 'jspdf'
import type { QmcParkApplicationPayload } from './qmcParkApplicationForm'
import { NATURE_OF_EVENT_TYPES, ORGANIZATION_TYPES } from './qmcParkApplicationForm'

export type ParkPermitInput = {
  reservationId: string
  permitRefNo: string
  orNo: string | null
  issuanceDate: string
  venueName: string
  venueLocation: string | null
  eventDate: string
  eventTitle: string
  timeIngress: string
  timeEgress: string
  natureOfEvent: string
  numberOfParticipants: number
  applicantName: string
  applicantAddress: string
  applicantContact: string
  organizationName: string
  organizationType: string
}

const MM = 4.8

function ensureSpace(doc: jsPDF, y: number, margin: number, need: number): number {
  const h = doc.internal.pageSize.getHeight()
  if (y + need > h - margin) {
    doc.addPage()
    return margin
  }
  return y
}

function labelValue(doc: jsPDF, margin: number, maxW: number, y: number, label: string, value: string): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(label, margin, y)
  y += MM * 0.8
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(value || '—', maxW)
  for (const line of lines) {
    y = ensureSpace(doc, y, margin, MM)
    doc.text(line, margin, y)
    y += MM * 0.85
  }
  return y + MM * 0.3
}

/** Build permit input from QMC application payload. */
export function buildPermitInputFromPayload(
  payload: QmcParkApplicationPayload,
  reservationId: string,
  permitRefNo: string,
  orNo: string | null,
  venueName: string,
  venueLocation: string | null
): ParkPermitInput {
  const orgLabel = ORGANIZATION_TYPES.find(o => o.value === payload.applicant.organization_type)?.label ?? payload.applicant.organization_type
  const orgType = payload.applicant.organization_type === 'others' && payload.applicant.organization_type_other
    ? `${orgLabel}: ${payload.applicant.organization_type_other}`
    : orgLabel
  const natureLabel = NATURE_OF_EVENT_TYPES.find(n => n.value === payload.event.nature_of_event)?.label ?? payload.event.nature_of_event
  const nature = payload.event.nature_of_event === 'others' && payload.event.nature_of_event_other
    ? `${natureLabel}: ${payload.event.nature_of_event_other}`
    : natureLabel

  return {
    reservationId,
    permitRefNo,
    orNo,
    issuanceDate: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    venueName,
    venueLocation,
    eventDate: payload.event.event_date,
    eventTitle: payload.event.event_title,
    timeIngress: payload.event.time_ingress,
    timeEgress: payload.event.time_egress,
    natureOfEvent: nature,
    numberOfParticipants: payload.event.number_of_participants,
    applicantName: payload.applicant.full_name,
    applicantAddress: payload.applicant.address,
    applicantContact: payload.applicant.contact_no,
    organizationName: payload.applicant.organization_name,
    organizationType: orgType,
  }
}

/** Build permit input from fallback data (LOI-only or minimal records). */
export function buildPermitInputFallback(params: {
  reservationId: string
  permitRefNo: string
  orNo: string | null
  venueName: string
  venueLocation: string | null
  reservationDate: string
  timeSlot: string
  eventName: string
  applicantName: string
  applicantAddress?: string
  applicantContact?: string
}): ParkPermitInput {
  const timeParts = (params.timeSlot || '').split('|').map(p => p.trim())
  const timeStr = timeParts[0] || 'TBD'
  return {
    reservationId: params.reservationId,
    permitRefNo: params.permitRefNo,
    orNo: params.orNo,
    issuanceDate: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
    venueName: params.venueName,
    venueLocation: params.venueLocation,
    eventDate: params.reservationDate,
    eventTitle: params.eventName || 'Event',
    timeIngress: timeStr,
    timeEgress: timeStr,
    natureOfEvent: '—',
    numberOfParticipants: 0,
    applicantName: params.applicantName,
    applicantAddress: params.applicantAddress ?? '—',
    applicantContact: params.applicantContact ?? '—',
    organizationName: '—',
    organizationType: '—',
  }
}

const PERMIT_TERMS = [
  'This permit authorizes the holder to use the designated park venue for the specified event. Present this permit at the venue on the event date.',
  'Cleanliness and orderliness shall be strictly observed. The site shall be cleaned and cleared of debris and equipment right after the affair.',
  'Gambling, smoking, drinking alcoholic beverages, videoke or loud music, single-use plastics, and adhesive materials on walls/ceilings are prohibited.',
  'The applicant shall be held responsible for any damage incurred during the activity. No existing rules, ordinances, or laws shall be violated.',
  'This permit is non-transferable. Only the named applicant and their registered event may use the venue.',
]

/** Generates the official park event permit PDF. */
export function generateParkPermitPdfBlob(input: ParkPermitInput): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text('OFFICIAL PARK EVENT PERMIT', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 70, 70)
  doc.text('Venue Clearance for Park Facility Use', margin, y)
  y += 8
  doc.setTextColor(0, 0, 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(`Permit No: ${input.permitRefNo}`, margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Reservation: ${input.reservationId}`, margin, y)
  y += 4
  if (input.orNo) {
    doc.text(`Official Receipt: ${input.orNo}`, margin, y)
    y += 4
  }
  doc.text(`Issued: ${input.issuanceDate}`, margin, y)
  y += 10

  y = ensureSpace(doc, y, margin, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Applicant information', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  y = labelValue(doc, margin, maxW, y, 'Name', input.applicantName)
  y = labelValue(doc, margin, maxW, y, 'Address', input.applicantAddress)
  y = labelValue(doc, margin, maxW, y, 'Contact', input.applicantContact)
  y = labelValue(doc, margin, maxW, y, 'Organization', input.organizationName)
  y = labelValue(doc, margin, maxW, y, 'Organization type', input.organizationType)

  y += 4
  y = ensureSpace(doc, y, margin, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Event and venue details', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  const venueLine = input.venueLocation ? `${input.venueName} — ${input.venueLocation}` : input.venueName
  y = labelValue(doc, margin, maxW, y, 'Venue', venueLine)
  y = labelValue(doc, margin, maxW, y, "Event title", input.eventTitle)
  y = labelValue(doc, margin, maxW, y, 'Event date', input.eventDate)
  y = labelValue(doc, margin, maxW, y, 'Time (ingress)', input.timeIngress)
  y = labelValue(doc, margin, maxW, y, 'Time (egress)', input.timeEgress)
  y = labelValue(doc, margin, maxW, y, 'Nature of event', input.natureOfEvent)
  y = labelValue(doc, margin, maxW, y, 'Number of participants', String(input.numberOfParticipants))

  y += 6
  y = ensureSpace(doc, y, margin, 24)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Permit terms and usage instructions', margin, y)
  y += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  PERMIT_TERMS.forEach((t, i) => {
    const block = `${i + 1}. ${t}`
    const wrapped = doc.splitTextToSize(block, maxW)
    for (const w of wrapped) {
      y = ensureSpace(doc, y, margin, MM * 0.7)
      doc.text(w, margin, y)
      y += MM * 0.75
    }
  })

  y += 8
  y = ensureSpace(doc, y, margin, 14)
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(
    'This document was system-generated by the Barangay Portal Management (BPM) upon verified payment and approval.',
    margin,
    y
  )
  y += 4
  doc.text(
    'Present this permit at the venue on your scheduled date. The Parks Administrator or Reservation Officer may verify this permit.',
    margin,
    y
  )

  return doc.output('blob')
}
