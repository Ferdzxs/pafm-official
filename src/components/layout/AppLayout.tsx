import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar, { TopBar } from './Sidebar'

export default function AppLayout() {
    const [collapsed, setCollapsed] = useState(false)
    const closeSidebarOnMobile = () => {
        if (window.matchMedia('(max-width: 767px)').matches) {
            setCollapsed(true)
        }
    }

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* ── Left: Sidebar (logo + nav only) ── */}
            <Sidebar collapsed={collapsed} onCloseSidebar={() => setCollapsed(true)} />

            {/* ── Right: TopBar + main content stacked ── */}
            <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
                {/* Sticky top header */}
                <TopBar
                    sidebarCollapsed={collapsed}
                    onToggleSidebar={() => setCollapsed(v => !v)}
                    onCloseSidebar={() => setCollapsed(true)}
                />

                {/* Scrollable page content */}
                <main
                    className="relative z-0 flex-1 min-h-0 overflow-y-auto bg-[color:var(--surface-base)]"
                    onMouseDown={closeSidebarOnMobile}
                >
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
