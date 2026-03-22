import { jsPDF } from 'jspdf'

export type ParkLoiPdfInput = {
  reservationId: string
  applicantName: string
  contactNumber: string
  email: string
  eventTitle: string
  venueName: string
  venueLocation: string
  preferredDate: string
  preferredTimeNote: string
  letterBody: string
}

const MM_LINE = 5.5

function ensureSpace(doc: jsPDF, y: number, margin: number, needed: number): number {
  const pageH = doc.internal.pageSize.getHeight()
  if (y + needed > pageH - margin) {
    doc.addPage()
    return margin
  }
  return y
}

/** Builds a printable Letter of Intent PDF from form data (client-side). */
export function generateParkLoiPdfBlob(input: ParkLoiPdfInput): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const pageW = doc.internal.pageSize.getWidth()
  const maxW = pageW - margin * 2
  let y = margin

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Letter of Intent — Park Venue Use', margin, y)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(70, 70, 70)
  doc.text(`Reference: ${input.reservationId}`, margin, y)
  y += 5
  doc.text(`Generated: ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`, margin, y)
  y += 9
  doc.setTextColor(0, 0, 0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('Applicant', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const applicantBlock = [
    `Name: ${input.applicantName}`,
    `Mobile: ${input.contactNumber}`,
    `Email: ${input.email}`,
  ]
  for (const line of applicantBlock) {
    const wrapped = doc.splitTextToSize(line, maxW)
    for (const w of wrapped) {
      y = ensureSpace(doc, y, margin, MM_LINE)
      doc.text(w, margin, y)
      y += MM_LINE
    }
  }
  y += 4

  y = ensureSpace(doc, y, margin, 20)
  doc.setFont('helvetica', 'bold')
  doc.text('Event details', margin, y)
  y += 6
  doc.setFont('helvetica', 'normal')
  const detailBlock = [
    `Activity: ${input.eventTitle}`,
    `Preferred venue: ${input.venueName} — ${input.venueLocation}`,
    `Preferred date: ${input.preferredDate}`,
    `Preferred time: ${input.preferredTimeNote.trim() || 'TBD'}`,
  ]
  for (const line of detailBlock) {
    const wrapped = doc.splitTextToSize(line, maxW)
    for (const w of wrapped) {
      y = ensureSpace(doc, y, margin, MM_LINE)
      doc.text(w, margin, y)
      y += MM_LINE
    }
  }
  y += 6

  y = ensureSpace(doc, y, margin, 12)
  doc.setFont('helvetica', 'bold')
  doc.text('Statement of intent', margin, y)
  y += 7
  doc.setFont('helvetica', 'normal')
  const body = doc.splitTextToSize(input.letterBody.trim(), maxW)
  for (const w of body) {
    y = ensureSpace(doc, y, margin, MM_LINE)
    doc.text(w, margin, y)
    y += MM_LINE
  }

  y += 8
  y = ensureSpace(doc, y, margin, 8)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(
    'This document was generated from your submission in the Barangay Portal.',
    margin,
    y
  )

  return doc.output('blob')
}
