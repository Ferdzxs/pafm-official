# Implementation Plan: Global Premium Card Adoption

We need to systematically update every popup modal ([Dialog](file:///c:/Users/Windows%2010%20Lite/Downloads/MUNJOR/BPM/SYSTEM/SYSTEM%20OFFICIAL/BPM.3.0%20%28INCLUDED%20ADMIN%29/BPM.2.0/src/components/ui/dialog.tsx#55-67)) across the entire application to use the new premium card template defined in [docs/premium-card-template.md](file:///c:/Users/Windows%2010%20Lite/Downloads/MUNJOR/BPM/SYSTEM/SYSTEM%20OFFICIAL/BPM.3.0%20%28INCLUDED%20ADMIN%29/BPM.2.0/docs/premium-card-template.md). This will ensure perfect viewport centering, scrollability for tall content, and a unified, high-contrast aesthetic in both light and dark modes.

## Goal Description
The current application uses inconsistent dialog structures. Many dialogs do not have proper max-height constraints or overflow handling, causing tall content to extend beyond the screen, breaking the UI. Additionally, older dialogs lack the premium styling (`card-premium`, `admin-box`, `surface-box`) that provides a polished look. 

We will refactor every `<DialogContent>` block to strictly follow the new blueprint.

## The Target Blueprint
Every dialog content block should be refactored to this structure:

```tsx
<DialogContent className="max-w-md border-none bg-transparent shadow-none p-0">
  <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
    {/* Header */}
    <DialogHeader className="mb-6">
      {/* ... Title, Description, Badges ... */}
    </DialogHeader>

    {/* Body Context using surface-box or admin-box where appropriate */}
    <div className="space-y-6">
       {/* ... content ... */}
    </div>

    {/* Footer */}
    <DialogFooter className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end">
      {/* ... Buttons ... */}
    </DialogFooter>
  </div>
</DialogContent>
```

## User Review Required
> [!IMPORTANT]
> Because there are over 60 files to update, I propose breaking this down into phases (as outlined in [task.md](file:///c:/Users/Windows%2010%20Lite/.gemini/antigravity/brain/5a8c5bb5-7993-4da4-8c6a-21520cc8070e/task.md)). This prevents overwhelming single commits and allows us to verify chunks of the application systematically. 
> 
> **Are you comfortable with me tackling these module by module according to the phases in [task.md](file:///c:/Users/Windows%2010%20Lite/.gemini/antigravity/brain/5a8c5bb5-7993-4da4-8c6a-21520cc8070e/task.md)?**

## Proposed Changes

We will systematically review and rewrite the JSX structure of the [Dialog](file:///c:/Users/Windows%2010%20Lite/Downloads/MUNJOR/BPM/SYSTEM/SYSTEM%20OFFICIAL/BPM.3.0%20%28INCLUDED%20ADMIN%29/BPM.2.0/src/components/ui/dialog.tsx#55-67) components within all files located in the `src/pages/` subdirectories.

### Key Refactoring Rules
1. **Remove Old Overlays:** Ensure we don't manually map or style Radix overlays if we are using the new bulletproof `dialog.tsx` base component.
2. **Apply Wrapper:** Wrap the actual content of the `DialogContent` in the `<div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">`.
3. **Clean Up `DialogContent` Props:** Strip `DialogContent` of background, borders, and padding (`className="max-w-md border-none bg-transparent shadow-none p-0"`), delegating all aesthetics to the inner wrapper.
4. **Enhance Readability:** Apply `.surface-box` and `.admin-box` to distinct data groupings within the dialog to match the requested premium look.
5. **Standardize Footers:** Add `border-t border-border/10` to `DialogFooter` to visually separate actions from scrolling content.

## Verification Plan

### Manual Verification
1.  **Visual Inspection:** Open a sample dialog from each refactored module.
2.  **Scroll Test:** Verify that the dialog is centered and does not clip off the screen. For tall dialogs, ensure the internal `sidebar-scrollbar` appears and functions smoothly.
3.  **Theme Test:** Toggle between light and dark modes to ensure borders, backgrounds, and shadows adapt beautifully as defined in `index.css`.
