// Pure-React Tooltip — no @radix-ui needed
import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
    content: React.ReactNode
    side?: "top" | "bottom" | "left" | "right"
    children: React.ReactNode
    className?: string
}

function Tooltip({ content, side = "top", children, className }: TooltipProps) {
    const [visible, setVisible] = React.useState(false)

    const posClass = {
        top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
        bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
        left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
        right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
    }[side]

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div
                    className={cn(
                        "absolute z-50 rounded-md bg-popover border border-border px-3 py-1.5 text-xs text-popover-foreground shadow-md whitespace-nowrap pointer-events-none",
                        posClass,
                        className
                    )}
                >
                    {content}
                </div>
            )}
        </div>
    )
}

// Compatibility shims for code that uses Tooltip compound pattern
const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const TooltipTrigger = ({ children }: { children: React.ReactNode; asChild?: boolean }) => <>{children}</>
const TooltipContent = ({ children, className }: { children: React.ReactNode; className?: string }) => <>{children}</>

export { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent }
