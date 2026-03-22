import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Inner surface for premium modals (see docs/premium-card-template.md).
 * Use inside `<DialogContent className={premiumDialogShellClasses(...)}>`.
 * Close button from DialogContent sits top-right; add `pr-12` on headers that align with the title row.
 */
export function DialogPremiumInner({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'card-premium mx-auto w-full max-h-[min(92vh,880px)] max-w-full animate-in zoom-in-95 duration-300 overflow-y-auto sidebar-scrollbar text-foreground',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Transparent shell so the visible surface is `card-premium` (light/dark from index.css). */
export function premiumDialogShellClasses(maxWidthClass = 'max-w-xl') {
  return cn(
    'border-none bg-transparent p-0 shadow-none gap-0 outline-none',
    'w-[min(100vw-1.5rem,42rem)]',
    maxWidthClass,
    'sm:w-[min(100vw-2rem,48rem)]',
  )
}
