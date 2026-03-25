import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UtilityRequirementChecklist } from '@/pages/citizen/apply-utility_request'

type Props = {
  ticketId: string
  ticketTypeKey: string
  /** Optional; otherwise fetched from water_connection_request when applicable */
  propertyType?: string | null
  label?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm'
}

/** Opens a dialog with the same citizen upload list used on Helpdesk triage (read-only for engineering). */
export function CitizenUploadsDialogTrigger({
  ticketId,
  ticketTypeKey,
  propertyType,
  label = 'Citizen documents',
  variant = 'outline',
  size = 'sm',
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant={variant} size={size} className="gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Citizen uploads</DialogTitle>
          <DialogDescription className="font-mono text-xs">{ticketId}</DialogDescription>
        </DialogHeader>
        <UtilityRequirementChecklist
          ticketId={ticketId}
          ticketTypeKey={ticketTypeKey}
          propertyType={propertyType}
          readOnly
        />
      </DialogContent>
    </Dialog>
  )
}
