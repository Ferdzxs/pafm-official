/**
 * In-page PDF previews for park reservations (LOI, application form, permit).
 * Matches the permits-payments dialog pattern: iframe + download, no navigation away.
 */

import React, { useEffect, useState } from "react"
import { Eye, Download, ExternalLink, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { generateQmcParkApplicationPdfBlob } from "@/lib/qmcParkApplicationForm"
import type { QmcParkApplicationPayload } from "@/lib/qmcParkApplicationForm"

function DocumentSection({
  title,
  src,
  downloadName,
}: {
  title: string
  src: string
  downloadName: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Eye size={14} className="text-primary" />
          {title}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest" asChild>
            <a href={src} target="_blank" rel="noopener noreferrer" download={downloadName}>
              <Download size={12} className="mr-1.5" />
              Download
            </a>
          </Button>
          <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary" asChild>
            <a href={src} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} className="mr-1.5" />
              New tab
            </a>
          </Button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-muted/30 overflow-hidden shadow-inner">
        <iframe
          title={title}
          src={`${src}#toolbar=1`}
          className="w-full min-h-[min(60vh,480px)] h-[min(60vh,480px)] bg-background"
        />
      </div>
    </div>
  )
}

export type ParkReservationDocumentsViewerProps = {
  reservationId: string
  loiUrl?: string | null
  /** Stored application PDF URL (digital_document.file_url) */
  applicationFormDocUrl?: string | null
  /** When no file URL, a QMC payload can be rendered to PDF client-side */
  applicationFormPayload?: QmcParkApplicationPayload | null
  permitUrl?: string | null
}

export function ParkReservationDocumentsViewer({
  reservationId,
  loiUrl,
  applicationFormDocUrl,
  applicationFormPayload,
  permitUrl,
}: ParkReservationDocumentsViewerProps) {
  const [appPayloadPreviewUrl, setAppPayloadPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (applicationFormDocUrl) {
      setAppPayloadPreviewUrl(null)
      return
    }
    const p = applicationFormPayload
    if (!p || p.source_form !== "qmc_facilities_2024_09") {
      setAppPayloadPreviewUrl(null)
      return
    }
    const blob = generateQmcParkApplicationPdfBlob(p)
    const url = URL.createObjectURL(blob)
    setAppPayloadPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [applicationFormDocUrl, applicationFormPayload])

  const applicationFormSrc = applicationFormDocUrl || appPayloadPreviewUrl
  const hasAny = Boolean(loiUrl || applicationFormSrc || permitUrl)

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" aria-hidden />
        No submitted documents on file yet for this reservation.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {loiUrl ? (
        <DocumentSection title="Letter of intent" src={loiUrl} downloadName={`loi-${reservationId}.pdf`} />
      ) : null}

      {applicationFormSrc ? (
        <DocumentSection
          title={applicationFormDocUrl ? "Application form (submitted file)" : "Application form (from submitted data)"}
          src={applicationFormSrc}
          downloadName={`application-${reservationId}.pdf`}
        />
      ) : null}

      {permitUrl ? (
        <DocumentSection title="Digital event permit" src={permitUrl} downloadName={`permit-${reservationId}.pdf`} />
      ) : null}
    </div>
  )
}
