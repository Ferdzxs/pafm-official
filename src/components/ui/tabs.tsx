// Pure HTML Tabs — no @radix-ui/react-tabs needed
import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextType {
    activeTab: string
    setActiveTab: (tab: string) => void
}
const TabsCtx = React.createContext<TabsContextType>({ activeTab: '', setActiveTab: () => { } })

interface TabsProps extends React.ComponentProps<"div"> {
    defaultValue?: string
    value?: string
    onValueChange?: (value: string) => void
}

function Tabs({ defaultValue = '', value, onValueChange, className, children, ...props }: TabsProps) {
    const [internal, setInternal] = React.useState(defaultValue)
    const active = value ?? internal
    const set = (v: string) => { setInternal(v); onValueChange?.(v) }
    return (
        <TabsCtx.Provider value={{ activeTab: active, setActiveTab: set }}>
            <div className={cn("", className)} {...props}>{children}</div>
        </TabsCtx.Provider>
    )
}

function TabsList({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground", className)}
            role="tablist"
            {...props}
        />
    )
}

interface TabsTriggerProps extends React.ComponentProps<"button"> { value: string }
function TabsTrigger({ className, value, children, ...props }: TabsTriggerProps) {
    const { activeTab, setActiveTab } = React.useContext(TabsCtx)
    const isActive = activeTab === value
    return (
        <button
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveTab(value)}
            className={cn(
                "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                isActive
                    ? "bg-background text-foreground shadow border border-border-subtle"
                    : "border border-transparent hover:bg-bg-hover",
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
}

interface TabsContentProps extends React.ComponentProps<"div"> { value: string }
function TabsContent({ className, value, children, ...props }: TabsContentProps) {
    const { activeTab } = React.useContext(TabsCtx)
    if (activeTab !== value) return null
    return (
        <div role="tabpanel" className={cn("mt-2", className)} {...props}>{children}</div>
    )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
