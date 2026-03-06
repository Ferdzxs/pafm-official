// Pure-React Dialog (modal) — no @radix-ui/react-dialog needed
import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
    if (!open) return null
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange?.(false)}
            />
            {/* Content slot */}
            <div className="relative z-10 w-full">
                {children}
            </div>
        </div>
    )
}

function DialogContent({ className, children, ...props }: React.ComponentProps<"div"> & { onClose?: () => void }) {
    return (
        <div
            className={cn(
                "relative mx-auto w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex flex-col gap-1.5 mb-4", className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("flex justify-end gap-2 mt-6", className)} {...props} />
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h3">) {
    return (
        <h3 className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
    )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <p className={cn("text-sm text-muted-foreground", className)} {...props} />
    )
}

function DialogClose({ onClick, className, ...props }: React.ComponentProps<"button">) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-1 focus:ring-ring",
                className
            )}
            {...props}
        >
            <X className="size-4" />
            <span className="sr-only">Close</span>
        </button>
    )
}

export {
    Dialog, DialogContent, DialogHeader, DialogFooter,
    DialogTitle, DialogDescription, DialogClose,
}
