// Pure-React Dropdown Menu — no @radix-ui needed
import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
}

function DropdownMenu({ open, onOpenChange, children }: DropdownMenuProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isOpen = open ?? internalOpen
    const setOpen = (v: boolean) => { setInternalOpen(v); onOpenChange?.(v) }
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const h = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', h)
        return () => document.removeEventListener('mousedown', h)
    }, [])

    return (
        <div ref={ref} className="relative inline-block">
            {React.Children.map(children, child =>
                React.isValidElement(child)
                    ? React.cloneElement(child as any, { _isOpen: isOpen, _setOpen: setOpen })
                    : child
            )}
        </div>
    )
}

function DropdownMenuTrigger({ children, asChild, _isOpen, _setOpen, ...props }: any) {
    const child = asChild ? React.Children.only(children) : null
    if (asChild && React.isValidElement(child)) {
        return React.cloneElement(child as any, {
            ...props,
            onClick: (e: any) => { _setOpen?.(!_isOpen); (child.props as any).onClick?.(e) }
        })
    }
    return (
        <button onClick={() => _setOpen?.(!_isOpen)} {...props}>{children}</button>
    )
}

function DropdownMenuContent({ className, children, align = 'end', _isOpen, sideOffset = 4, ...props }: any) {
    if (!_isOpen) return null
    const alignClass = align === 'end' ? 'right-0' : align === 'start' ? 'left-0' : 'left-1/2 -translate-x-1/2'
    return (
        <div
            className={cn(
                `absolute top-full ${alignClass} mt-1 z-50 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md animate-fade-in`,
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function DropdownMenuItem({ className, onClick, children, ...props }: React.ComponentProps<"div"> & { onClick?: () => void }) {
    return (
        <div
            role="menuitem"
            onClick={onClick}
            className={cn(
                "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors focus:bg-accent hover:bg-accent hover:text-accent-foreground outline-none",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("-mx-1 my-1 h-px bg-muted", className)} role="separator" {...props} />
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<"div">) {
    return <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)} {...props} />
}

// Compat shims
const DropdownMenuGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>

export {
    DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
    DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup,
}
