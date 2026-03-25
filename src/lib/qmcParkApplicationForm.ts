import { jsPDF } from 'jspdf'

/** Official reference (Quezon City — QMC facilities). */
export const QMC_APPLICATION_FORM_PDF_URL =
  'https://quezoncity.gov.ph/wp-content/uploads/2024/09/Application-Form-Use-of-QMC-facilities.pdf'

export const ORGANIZATION_TYPES = [
  { value: 'local_government', label: 'Local government' },
  { value: 'civil_society', label: 'Civil society organization' },
  { value: 'national_government', label: 'National government' },
  { value: 'private_institution', label: 'Private institution' },
  { value: 'others', label: 'Others (specify)' },
] as const

export const NATURE_OF_EVENT_TYPES = [
  { value: 'birthday', label: 'Birthday' },
  { value: 'assembly_meeting', label: 'Assembly / meeting' },
  { value: 'baptismal', label: 'Baptismal' },
  { value: 'seminar_training', label: 'Seminar / training' },
  { value: 'others', label: 'Others (specify)' },
] as const

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number]['value']
export type NatureOfEventType = (typeof NATURE_OF_EVENT_TYPES)[number]['value']

/** Structured data captured from the QMC-style form (BPM digital process). */
export type QmcParkApplicationPayload = {
  source_form: 'qmc_facilities_2024_09'
  reference_pdf_url: typeof QMC_APPLICATION_FORM_PDF_URL
  application_date: string
  applicant: {
    full_name: string
    address: string
    contact_no: string
    organization_type: OrganizationType
    organization_type_other?: string
    organization_name: string
  }
  event: {
    requested_venue: string
    event_title: string
    nature_of_event: NatureOfEventType
    nature_of_event_other?: string
    number_of_participants: number
    event_date: string
    time_ingress: string
    time_egress: string
  }
  terms_agreed: true
  agreed_at: string
  reservation_id: string
}

/** Terms from the official QMC PDF (for display & PDF reproduction). */
export const QMC_TERMS_AND_CONDITIONS: string[] = [
  'Cleanliness and orderliness shall be strictly observed.',
  'The consent of the Quezon Memorial Circle (QMC) management shall be obtained for any equipment to be brought in by the applicant.',
  'The management strictly prohibits the following activities: engaging in any illegal, hazardous, or disruptive activities that could negatively impact the property or violate the peace of any persons in the park; gambling, smoking, and drinking alcoholic drinks/liquor; use of videoke or any loud music or sounds that may disturb park visitors; use of single-use plastic or disposable items, including Styrofoam, straws, etc.; use of adhesive tapes, hooks, nails, or any material to tape/fasten or hang anything to walls and ceilings.',
  'The client shall be responsible for the safety and security of their personal properties/belongings. The QMC management assumes no responsibility for ANY damage or loss due to negligence of the applicant/guests or other persons or fortuitous/manmade events beyond the control of the management.',
  'No existing rules and regulations, city ordinances, and government laws shall be violated.',
  'The site shall be cleaned and cleared of debris and equipment right after the affair without further extension.',
  'The client shall be held responsible for any damage incurred during the activity.',
  'The reservation would be on a First-Come-First-Served basis and shall comply with the allowable hours set by the QMC management.',
  'Only fully paid applicants shall be issued with a Venue Clearance. Permits are non-transferable.',
  'The client must be fully paid three (3) days before their/its event.',
  'A refund of the deposit is not allowed. However, offsetting of deposit to another event and date within six (6) months from the canceled event is allowed.',
  'The QMC management has the discretion to demand the requesting party for an additional charge upon assessment of QMC management, such as expenses incurred for extended use of the venue, the high electricity consumption of equipment used in the event, and damages to property committed by the client.',
  'The QMC Administrator reserves the right to cancel the event if: (1) the venue has to be closed due to force majeure, (2) there is unexpected significant event to be hosted by the QC local government, and (3) reasonable grounds to believe that the behavior of the client/guest/participant at the event is likely to result in damage and/or injury to people.',
]

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
  y += MM * 0.7
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(value || '—', maxW)
  for (const line of lines) {
    y = ensureSpace(doc, y, margin, MM)
    doc.text(line, margin, y)
    y += MM * 0.85
  }
  return y + MM * 0.3
}

export function generateQmcParkApplicationPdfBlob(payload: QmcParkApplicationPayload): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Application form — use of park / memorial facilities', margin, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text(`Reference template: Quezon City QMC facilities (see ${payload.reference_pdf_url})`, margin, y)
  y += 4
  doc.text(`BPM reservation: ${payload.reservation_id} · Submitted: ${payload.application_date}`, margin, y)
  y += 6
  doc.setTextColor(0, 0, 0)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text("Applicant's information", margin, y)
  y += 5

  const orgLabel =
    ORGANIZATION_TYPES.find(o => o.value === payload.applicant.organization_type)?.label ?? payload.applicant.organization_type
  const orgLine =
    payload.applicant.organization_type === 'others' && payload.applicant.organization_type_other
      ? `${orgLabel}: ${payload.applicant.organization_type_other}`
      : orgLabel

  y = labelValue(doc, margin, maxW, y, 'Full name', payload.applicant.full_name)
  y = labelValue(doc, margin, maxW, y, 'Address', payload.applicant.address)
  y = labelValue(doc, margin, maxW, y, 'Contact no.', payload.applicant.contact_no)
  y = labelValue(doc, margin, maxW, y, 'Type of organization', orgLine)
  y = labelValue(doc, margin, maxW, y, 'Name of organization', payload.applicant.organization_name)

  y += 2
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('Event information', margin, y)
  y += 5

  const natureLabel =
    NATURE_OF_EVENT_TYPES.find(n => n.value === payload.event.nature_of_event)?.label ?? payload.event.nature_of_event
  const natureLine =
    payload.event.nature_of_event === 'others' && payload.event.nature_of_event_other
      ? `${natureLabel}: ${payload.event.nature_of_event_other}`
      : natureLabel

  y = labelValue(doc, margin, maxW, y, 'Requested venue', payload.event.requested_venue)
  y = labelValue(doc, margin, maxW, y, "Event's title", payload.event.event_title)
  y = labelValue(doc, margin, maxW, y, 'Nature of event', natureLine)
  y = labelValue(doc, margin, maxW, y, 'Number of participants', String(payload.event.number_of_participants))
  y = labelValue(doc, margin, maxW, y, "Event's date", payload.event.event_date)
  y = labelValue(doc, margin, maxW, y, 'Time for ingress', payload.event.time_ingress)
  y = labelValue(doc, margin, maxW, y, 'Time for egress', payload.event.time_egress)

  y += 3
  y = ensureSpace(doc, y, margin, 40)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Terms and conditions (summary)', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  QMC_TERMS_AND_CONDITIONS.forEach((t, i) => {
    const block = `${i + 1}. ${t}`
    const wrapped = doc.splitTextToSize(block, maxW)
    for (const w of wrapped) {
      y = ensureSpace(doc, y, margin, MM * 0.7)
      doc.text(w, margin, y)
      y += MM * 0.65
    }
  })

  y += 4
  y = ensureSpace(doc, y, margin, 20)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Certificate of agreement', margin, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  const agree = doc.splitTextToSize(
    'I certify that I have read and agree to the terms above. Electronic submission via BPM on ' +
      payload.agreed_at +
      '.',
    maxW
  )
  for (const line of agree) {
    y = ensureSpace(doc, y, margin, MM)
    doc.text(line, margin, y)
    y += MM * 0.85
  }

  return doc.output('blob')
}
