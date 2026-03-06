// Pure HTML Avatar — no @radix-ui/react-avatar needed
import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.ComponentProps<"div"> {
    src?: string
    alt?: string
    fallback?: React.ReactNode
    size?: "sm" | "md" | "lg"
}

function Avatar({ className, src, alt, fallback, size = "md", ...props }: AvatarProps) {
    const [err, setErr] = React.useState(false)

    const sizeClass = {
        sm: "size-6 text-xs",
        md: "size-8 text-sm",
        lg: "size-10 text-base",
    }[size]

    return (
        <div
            className={cn(
                "relative flex shrink-0 overflow-hidden rounded-full bg-muted",
                sizeClass,
                className
            )}
            {...props}
        >
            {src && !err ? (
                <img
                    src={src}
                    alt={alt ?? ""}
                    className="aspect-square size-full object-cover"
                    onError={() => setErr(true)}
                />
            ) : (
                <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                    {fallback}
                </div>
            )}
        </div>
    )
}

export { Avatar }
