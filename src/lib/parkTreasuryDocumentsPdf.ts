import { jsPDF } from 'jspdf'

/** Shared module label for OR PDFs (treasurer list, collections, citizen). */
export function formatReceiptModuleLabel(docType: string | null): string {
  if (!docType) return 'General'
  if (docType.includes('burial') || docType.includes('interment')) return 'Burial'
  if (docType.includes('park')) return 'Parks & Recreation'
  if (docType.includes('barangay')) return 'Barangay'
  if (docType === 'order_of_payment_utility') return 'Water Supply & Drainage'
  if (docType.includes('water') || docType.includes('utility') || docType.includes('connection')) return 'Utility'
  return docType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const REPUBLIC = 'Republic of the Philippines'
const LGU = 'Quezon City Government'
const TREASURY = 'Revenue Collection & Treasury Services'

const MM = 3.8

function fmtDisplayDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return String(iso)
  return new Date(t).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })
}

/** Outer double-line border like fiscal / treasury forms */
function drawOfficialFormFrame(doc: jsPDF, pageW: number, pageH: number) {
  const inset = 10
  doc.setDrawColor(35, 35, 35)
  doc.setLineWidth(0.45)
  doc.rect(inset, inset, pageW - inset * 2, pageH - inset * 2)
  doc.setDrawColor(120, 120, 120)
  doc.setLineWidth(0.2)
  doc.rect(inset + 1.2, inset + 1.2, pageW - (inset + 1.2) * 2, pageH - (inset + 1.2) * 2)
}

function drawDoubleRule(doc: jsPDF, y: number, margin: number, width: number) {
  doc.setDrawColor(20, 20, 20)
  doc.setLineWidth(0.4)
  doc.line(margin, y, margin + width, y)
  doc.line(margin, y + 1.2, margin + width, y + 1.2)
}

function drawThinRule(doc: jsPDF, y: number, margin: number, width: number) {
  doc.setDrawColor(100, 100, 100)
  doc.setLineWidth(0.15)
  doc.line(margin, y, margin + width, y)
}

export type ParkOrderOfPaymentPdfInput = {
  documentNo: string
  reservationRef: string
  opDate: string
  payorName: string
  venueLabel: string | null
  eventDate: string | null
  timeSlot: string | null
  amountDue: number
  paymentRecordId: string
  feeStatus: string
}

export type ParkOfficialReceiptPdfInput = {
  orNo: string
  payorName: string
  amountPaid: number
  paymentDate: string | null
  paymentMethod: string | null
  transactionRef: string | null
  documentRef: string | null
  moduleLabel: string
  paymentRecordId: string
}

function rowLine(doc: jsPDF, margin: number, y: number, label: string, value: string, maxW: number): number {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text(label, margin, y)
  doc.setFont('helvetica', 'normal')
  const lines = doc.splitTextToSize(value || '—', maxW - 55)
  let yy = y
  for (const line of lines) {
    doc.text(line, margin + 52, yy)
    yy += MM * 0.85
  }
  return yy + MM * 0.35
}

function footerNote(doc: jsPDF, pageW: number, margin: number, y: number) {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(80, 80, 80)
  const note =
    'This is a computer-generated document. No signature is required unless otherwise indicated by the issuing office.'
  const lines = doc.splitTextToSize(note, pageW - margin * 2)
  let yy = y
  for (const line of lines) {
    doc.text(line, margin, yy)
    yy += MM * 0.75
  }
  doc.setTextColor(0, 0, 0)
}

/** Digital Order of Payment — formal LGU-style layout */
export function downloadParkOrderOfPaymentPdf(input: ParkOrderOfPaymentPdfInput, filename?: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  drawOfficialFormFrame(doc, pageW, pageH)
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 16

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(REPUBLIC, margin, y)
  y += MM * 0.9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(LGU, margin, y)
  y += MM * 0.9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(TREASURY, margin, y)
  y += MM * 1.5

  drawDoubleRule(doc, y, margin, contentW)
  y += 6

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('DIGITAL ORDER OF PAYMENT', margin, y)
  y += MM * 1.1
  doc.setLineWidth(0.25)
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, y, margin + 78, y)
  y += MM * 1.2

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  doc.text('For park reservation / facility use fees', margin, y)
  y += MM * 1.8
  doc.setTextColor(0, 0, 0)

  drawThinRule(doc, y, margin, contentW)
  y += MM * 1.2

  y = rowLine(doc, margin, y, 'Document No.', input.documentNo, contentW)
  y = rowLine(doc, margin, y, 'Reservation reference', input.reservationRef, contentW)
  y = rowLine(doc, margin, y, 'Date of issue', input.opDate, contentW)
  y = rowLine(doc, margin, y, 'Payor', input.payorName, contentW)
  y = rowLine(doc, margin, y, 'Venue / facility', input.venueLabel || '—', contentW)
  if (input.eventDate || input.timeSlot) {
    y = rowLine(
      doc,
      margin,
      y,
      'Event schedule',
      [input.eventDate, input.timeSlot].filter(Boolean).join(' · ') || '—',
      contentW,
    )
  }
  y += MM * 0.8

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)
  doc.rect(margin, y, contentW, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('TOTAL AMOUNT DUE', margin + 4, y + 7)
  doc.setFontSize(16)
  doc.text(`PHP ${input.amountDue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 4, y + 14)
  y += 22

  y = rowLine(doc, margin, y, 'Payment record ID', input.paymentRecordId, contentW)
  y = rowLine(doc, margin, y, 'Fee status', input.feeStatus.toUpperCase(), contentW)

  y += MM * 2
  y += MM * 0.5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Present this order when paying at the Treasury counter or complete payment online through the portal.', margin, y)
  y += MM * 0.9
  doc.text('Payment is subject to verification and posting by Revenue Collection & Treasury Services.', margin, y)

  y = 280
  footerNote(doc, pageW, margin, y)

  doc.save(filename ?? `Order-of-Payment-${input.reservationRef.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`)
}

/** Digital Official Receipt — matches treasury OR style across modules */
export function downloadParkOfficialReceiptPdf(input: ParkOfficialReceiptPdfInput, filename?: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  drawOfficialFormFrame(doc, pageW, pageH)
  const margin = 18
  const contentW = pageW - margin * 2
  let y = 16

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(REPUBLIC, margin, y)
  y += MM * 0.9
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text(LGU, margin, y)
  y += MM * 0.9
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(TREASURY, margin, y)
  y += MM * 1.5

  drawDoubleRule(doc, y, margin, contentW)
  y += 6

  const headerTop = y
  const orBoxW = 72
  const orBoxH = 16
  const orBoxX = pageW - margin - orBoxW

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('OFFICIAL RECEIPT', margin, headerTop + 5.5)
  doc.setLineWidth(0.25)
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, headerTop + 7, margin + 58, headerTop + 7)

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.rect(orBoxX, headerTop, orBoxW, orBoxH)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(60, 60, 60)
  doc.text('O.R. No.', orBoxX + 3, headerTop + 5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(String(input.orNo), orBoxX + 3, headerTop + 12)

  y = headerTop + orBoxH + 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  doc.text(`Module: ${input.moduleLabel}`, margin, y)
  y += MM * 1.8
  doc.setTextColor(0, 0, 0)

  drawThinRule(doc, y, margin, contentW)
  y += MM * 1.2

  y = rowLine(doc, margin, y, 'Received from', input.payorName, contentW)
  y = rowLine(doc, margin, y, 'Document / reference', input.documentRef || '—', contentW)
  y += MM * 0.9

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.25)
  doc.rect(margin, y, contentW, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('AMOUNT PAID', margin + 4, y + 7)
  doc.setFontSize(16)
  doc.text(`PHP ${input.amountPaid.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 4, y + 14)
  y += 22

  y = rowLine(doc, margin, y, 'Payment date', fmtDisplayDateTime(input.paymentDate), contentW)
  y = rowLine(doc, margin, y, 'Payment method', (input.paymentMethod || '—').replace(/_/g, ' '), contentW)
  y = rowLine(doc, margin, y, 'Transaction reference', input.transactionRef || '—', contentW)
  y = rowLine(doc, margin, y, 'Payment record ID', input.paymentRecordId, contentW)

  y += MM * 2
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('This receipt serves as proof of payment for the purpose stated above.', margin, y)

  y = 280
  footerNote(doc, pageW, margin, y)

  doc.save(filename ?? `Official-Receipt-${String(input.orNo).replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`)
}
