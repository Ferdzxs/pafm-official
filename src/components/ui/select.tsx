// Pure-React Select — no @radix-ui/react-select needed
import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.ComponentProps<"select"> {
    placeholder?: string
}

function Select({ className, children, placeholder, ...props }: SelectProps) {
    return (
        <div className="relative">
            <select
                className={cn(
                    "flex h-9 w-full appearance-none rounded-md border border-input bg-background pr-8 pl-3 py-1 text-sm shadow-xs",
                    "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            >
                {placeholder && <option value="" disabled>{placeholder}</option>}
                {children}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 opacity-50" />
        </div>
    )
}

function SelectItem({ value, children, ...props }: React.ComponentProps<"option">) {
    return <option value={value} {...props}>{children}</option>
}

export { Select, SelectItem }
