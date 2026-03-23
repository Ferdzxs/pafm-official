import React, { type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type AdminDeskPageShellProps = {
  /** Role badge label (e.g. from ROLE_META[role].label) */
  roleLabel: string
  roleColor: string
  roleBgColor: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** When false, outer max-width matches full-bleed tools */
  wide?: boolean
}

/**
 * Shared page frame aligned with parks admin / reservation desk (badge + title + actions + content stack).
 */
export function AdminDeskPageShell({
  roleLabel,
  roleColor,
  roleBgColor,
  title,
  description,
  actions,
  children,
  className,
  wide,
}: AdminDeskPageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto animate-fade-in px-6 py-8 space-y-8',
        wide ? 'max-w-[100rem]' : 'max-w-(--breakpoint-2xl)',
        className,
      )}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge
            variant="outline"
            className="px-2 py-0.5"
            style={{ borderColor: roleColor, color: roleColor, backgroundColor: roleBgColor }}
          >
            {roleLabel}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {description ? (
            <p className="text-muted-foreground text-sm max-w-2xl text-pretty">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div> : null}
      </header>
      {children}
    </div>
  )
}
