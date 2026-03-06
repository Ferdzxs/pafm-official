// Pure-React Scroll Area — no @radix-ui needed
import * as React from "react"
import { cn } from "@/lib/utils"

function ScrollArea({ className, children, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("relative overflow-auto", className)}
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
            {...props}
        >
            {children}
        </div>
    )
}

export { ScrollArea }
