import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar, { TopBar } from './Sidebar'

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <div className="flex min-h-screen overflow-hidden bg-background">
            {/* ── Left: Sidebar (logo + nav only) ── */}
            <Sidebar collapsed={collapsed} />

            {/* ── Right: TopBar + main content stacked ── */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Sticky top header */}
                <TopBar
                    sidebarCollapsed={collapsed}
                    onToggleSidebar={() => setCollapsed(v => !v)}
                />

                {/* Scrollable page content */}
                <main className="flex-1 overflow-y-auto bg-[color:var(--surface-base)]">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
