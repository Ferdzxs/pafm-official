# Premium Card Template & Centering Program

This document provides the complete source code for the enhanced, readable, viewport-centered card design used in the Parks Administration module. It features perfect viewport-locking, consistent light/dark mode aesthetics, and **viewport-height enforcement** to prevent cards from exceeding the screen.

## 1. Centering Program (`dialog.tsx`)
This component uses **Radix UI Portals** to move the modal to the root of the document, making it immune to parent layouts. It uses a fixed flex-centered wrapper to keep the card perfectly in the middle of your screen.

```tsx
import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    {/* This wrapper ensures perfect fixed centering even while background scrolls */}
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto pointer-events-none">
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 grid w-full max-w-lg gap-4 bg-transparent p-0 duration-200 pointer-events-auto",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </div>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export { Dialog, DialogContent }
```

## 2. Premium Design Tokens (`index.css`)
These utility classes provide the high-contrast aesthetic and height enforcement.

```css
/* Premium Card Base */
.card-premium {
  @apply rounded-[22px] border border-border bg-card p-8 shadow-2xl transition-all;
  background: var(--color-card);
}

/* Viewport height enforcement and internal scrolling */
.card-scroll {
  @apply max-h-[90vh] overflow-y-auto sidebar-scrollbar;
  scroll-padding: 2rem;
}

/* Administration Box */
.admin-box {
  @apply rounded-[12px] p-5 relative overflow-hidden border transition-all duration-200;
  background: var(--color-card);
}

.sep {
  @apply border-t mt-4 pt-4 border-border/10;
}

/* Light/Dark Parity Overrides */
[data-theme="dark"] .admin-box {
  background: rgba(31, 41, 55, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.08) !important;
}

[data-theme="light"] .admin-box {
  background: #ffffff !important;
  border-color: #e5e7eb !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

/* Scrollbar support */
.sidebar-scrollbar::-webkit-scrollbar { width: 6px; }
.sidebar-scrollbar::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 99px;
}
```

## 3. Printable Card Template (JSX/TSX)
Use this structure inside your `DialogContent`. Note the `max-h-[90vh]` and `overflow-y-auto` classes which ensure the card doesn't exceed the screen height and provides a professional scrollbar.

```tsx
<DialogContent className="max-w-md border-none bg-transparent shadow-none">
  <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
    {/* Header: Title and Identifiers */}
    <div className="mb-6 space-y-1">
      <div className="flex items-center gap-2 mb-2">
         <Badge variant="outline" className="font-mono text-[10px]">PV-001</Badge>
         <Badge className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px] font-bold">In Operation</Badge>
      </div>
      <h3 className="text-2xl font-extrabold tracking-tight text-foreground font-display leading-tight">
        La Mesa Eco Park — Campsite A
      </h3>
      <p className="text-sm text-muted-foreground flex items-center gap-1.5 font-medium mt-1">
        <MapPin size={14} className="text-primary/60" /> East Fairview, Quezon City
      </p>
    </div>

    {/* Info Grid: Metadata Tags */}
    <div className="grid grid-cols-2 gap-4 mb-6">
       <div className="p-4 bg-muted/30 rounded-xl border border-border/50 group hover:border-primary/30 transition-colors">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Category</p>
          <p className="text-sm font-bold truncate">Outdoor Events</p>
       </div>
       <div className="p-4 bg-muted/30 rounded-xl border border-border/50 group hover:border-primary/30 transition-colors">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Utility Capacity</p>
          <p className="text-sm font-bold truncate">High Capacity</p>
       </div>
    </div>

    {/* Administration Box (Premium High-Contrast Block) */}
    <div className="admin-box group">
      <Building2 className="absolute top-4 right-4 h-12 w-12 text-primary/5 transition-transform group-hover:scale-110 duration-500" />
      <div className="flex items-center gap-2 mb-3">
        <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Building2 className="h-4 w-4" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Monitoring Office</span>
      </div>
      <div className="text-sm font-extrabold text-foreground px-1 leading-tight">
        Parks & Facilities Monitoring Division (PFMD)
      </div>
      <div className="sep mt-4">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium italic">
          <MapPin className="h-3 w-3 text-primary/40" /> Ground Floor, QC Civic Center C
        </div>
      </div>
    </div>
    
    {/* Action Footer */}
    <div className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end gap-3">
       <Button variant="secondary" className="rounded-xl h-11 px-8 font-extrabold text-[11px] uppercase tracking-widest hover:bg-muted transition-all">
         Close Register Entry
       </Button>
    </div>
  </div>
</DialogContent>
```

---
**Features Checklist:**
- [x] **Always Centered:** Portals ensure fixed positioning relative to the screen.
- [x] **Viewport Bound:** `.card-scroll` ensures the card never exceeds 90% of screen height.
- [x] **Readable:** High-contrast typography and grouping.
- [x] **Dark Mode Parity:** Custom CSS overrides for dark surfaces.
