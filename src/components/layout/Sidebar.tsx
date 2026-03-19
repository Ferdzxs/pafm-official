import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { ROLE_NAV, ROLE_META } from "@/config/rbac";
import {
  Sun,
  Moon,
  Bell,
  Settings,
  Search,
  ChevronRight,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

// ─── Mock badge counts ──────────────────────────────────────────────────────
const INITIAL_BADGE_COUNTS: Record<string, number> = {
  pending_burials: 7,
  pending_assistance: 3,
  pending_certs: 5,
  pending_park_res: 4,
  pending_bar_res: 0, // Will be fetched
  assigned_tickets: 9,
  open_tickets: 12,
  pending_reconciliation: 6,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function TopBar({ sidebarCollapsed, onToggleSidebar }: TopBarProps) {
  const { user, unreadCount, notifications, markNotifRead, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))
        setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target as Node))
        setShowUser(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header
      className="shrink-0 flex items-center gap-3 px-3 sm:px-5 h-[60px] bg-surface-subtle border-b border-border-subtle sticky top-0 z-40"
    >
      {/* ── Sidebar toggle (left) ── */}
      <button
        onClick={onToggleSidebar}
        className="shrink-0 w-9 h-9 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[13px] text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] hover:text-[color:var(--text-primary)] transition-colors"
        title={sidebarCollapsed ? "Open navigation" : "Close navigation"}
      >
        {sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}
      </button>

      {/* ── Search bar (center) ── */}
      <div className="flex-1 flex justify-center">
        <div className="relative w-full max-w-xs sm:max-w-md lg:max-w-130">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-sidebar-sub)]"
          />
          <input
            type="text"
            placeholder="Search anything across the system…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full rounded-md border border-[color:var(--color-sidebar-border)] bg-[color:var(--color-bg-hover)] px-3 sm:px-4 py-2 pl-9 text-xs sm:text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-sidebar-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-base)] transition-colors"
          />
          {searchVal && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-sidebar-sub)] hover:text-[color:var(--text-primary)] transition-colors"
              onClick={() => setSearchVal("")}
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Right actions ── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Light / Dark toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] hover:text-[color:var(--text-primary)] transition-colors"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? (
            <Sun size={17} style={{ color: "#fbbf24" }} />
          ) : (
            <Moon size={17} style={{ color: "#6366f1" }} />
          )}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] hover:text-[color:var(--text-primary)]",
              isActive && "bg-[color:var(--color-sidebar-active-bg)] text-[color:var(--color-sidebar-text-active)]"
            )
          }
          title="Settings"
        >
          <Settings size={17} />
        </NavLink>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifs((v) => !v)}
            className="w-8 h-8 rounded-lg flex items-center justify-center relative text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] hover:text-[color:var(--text-primary)] transition-colors"
            title="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>

          {showNotifs && (
            <div
              className="absolute top-full right-0 mt-2 rounded-2xl shadow-2xl overflow-hidden animate-fade-in"
              style={{
                width: "320px",
                maxHeight: "400px",
                zIndex: 1000,
                background: "var(--color-popup-bg)",
                border: "1px solid var(--color-popup-border)",
              }}
            >
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{
                  borderBottom: "1px solid var(--color-sidebar-border)",
                }}
              >
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  Notifications
                </span>
                <span className="text-xs text-blue-500">
                  {unreadCount} unread
                </span>
              </div>
              <div className="overflow-y-auto" style={{ maxHeight: "340px" }}>
                {notifications.length === 0 ? (
                  <div
                    className="px-4 py-6 text-center text-sm"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notif_id}
                      onClick={() => markNotifRead(n.notif_id)}
                      className="px-4 py-3 cursor-pointer transition-colors"
                      style={{
                        background: n.is_read
                          ? "transparent"
                          : "rgba(59,130,246,0.05)",
                        borderBottom: "1px solid var(--color-sidebar-border)",
                      }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          "var(--color-popup-item-hover)")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLElement).style.background =
                          n.is_read ? "transparent" : "rgba(59,130,246,0.05)")
                      }
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                          style={{
                            background: n.is_read ? "transparent" : "#3b82f6",
                          }}
                        />
                        <div>
                          <div
                            className="text-xs font-semibold"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {n.title}
                          </div>
                          <div
                            className="text-xs mt-0.5 leading-relaxed"
                            style={{ color: "var(--color-popup-subtext)" }}
                          >
                            {n.message}
                          </div>
                          <div
                            className="text-[10px] mt-1"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div
          className="w-px h-5 mx-1 bg-[color:var(--color-sidebar-border)]"
        />

        {/* Profile */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUser((v) => !v)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-xl text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-sm">
              {user?.full_name.charAt(0) ?? "U"}
            </div>
            <div className="hidden sm:block text-left">
              <div
                className="text-xs font-semibold leading-tight"
                style={{ color: "var(--color-sidebar-user)" }}
              >
                {user?.full_name.split(" ").slice(-1)[0]}
              </div>
              <div
                className="text-[10px] leading-tight"
                style={{ color: "var(--color-sidebar-email)" }}
              >
                {user?.role.replace(/_/g, " ")}
              </div>
            </div>
            <ChevronRight
              size={12}
              className={`hidden sm:block transition-transform ${showUser ? "rotate-90" : ""}`}
              style={{ color: "var(--color-sidebar-sub)" }}
            />
          </button>

          {showUser && (
            <div
              className="absolute top-full right-0 mt-2 rounded-2xl shadow-2xl animate-fade-in overflow-hidden"
              style={{
                width: "200px",
                zIndex: 1000,
                background: "var(--color-popup-bg)",
                border: "1px solid var(--color-popup-border)",
              }}
            >
              {/* User info header */}
              <div
                className="px-4 py-3"
                style={{
                  borderBottom: "1px solid var(--color-sidebar-border)",
                }}
              >
                <div
                  className="text-xs font-semibold"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {user?.full_name}
                </div>
                <div
                  className="text-[10px] mt-0.5 truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {user?.email}
                </div>
              </div>
              <NavLink
                to="/profile"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--color-popup-text)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--color-popup-item-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
                onClick={() => setShowUser(false)}
              >
                <User size={14} /> My Profile
              </NavLink>
              <NavLink
                to="/settings"
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{ color: "var(--color-popup-text)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "var(--color-popup-item-hover)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
                onClick={() => setShowUser(false)}
              >
                <Settings size={14} /> Settings
              </NavLink>
              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 transition-colors"
                style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "rgba(239,68,68,0.08)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background =
                    "transparent")
                }
              >
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SIDEBAR  (logo + nav only — NO settings/profile/notifs)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { user } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState(INITIAL_BADGE_COUNTS);
  const navItems = user ? ROLE_NAV[user.role] : [];
  const roleMeta = user ? ROLE_META[user.role] : null;

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      // Only fetch if relevant for the current role
      const isBrgyUser =
        user.role === "punong_barangay" || user.role === "barangay_secretary";
      const isParksAdmin = user.role === "parks_admin";
      const isDesk = user.role === "reservation_officer";

      if (isBrgyUser) {
        const { count, error } = await supabase
          .from("barangay_reservation_record")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        if (!error && count !== null) {
          setBadgeCounts((prev) => ({ ...prev, pending_bar_res: count }));
        }
      }

      if (isParksAdmin) {
        const { count, error } = await supabase
          .from("park_reservation_record")
          .select("*", { count: "exact", head: true })
          .in("status", ["endorsed_to_admin", "pending"]);

        if (!error && count !== null) {
          setBadgeCounts((prev) => ({ ...prev, pending_park_res: count }));
        }
      }

      if (isDesk) {
        const { count, error } = await supabase
          .from("park_reservation_record")
          .select("*", { count: "exact", head: true })
          .in("status", ["pending", "pending_loi", "desk_logged"]);

        if (!error && count !== null) {
          setBadgeCounts((prev) => ({ ...prev, pending_park_res: count }));
        }
      }
    };

    fetchCounts();

    // Subscription for real-time updates (role-scoped tables)
    const tables: string[] = [];
    if (user.role === "punong_barangay" || user.role === "barangay_secretary") tables.push("barangay_reservation_record");
    if (user.role === "parks_admin" || user.role === "reservation_officer") tables.push("park_reservation_record");

    const channel = supabase
      .channel("db-changes")
      ;

    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => fetchCounts(),
      );
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-300 select-none shrink-0 md:static md:translate-x-0 shadow-sm bg-surface-subtle border-r border-border-subtle",
        collapsed ? "-translate-x-full md:w-17]" : "translate-x-0 w-64 md:w-55",
      )}
    >
      {/* ── Logo block ──────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center py-6 px-3 border-b border-border-subtle bg-surface-subtle"
      >
        {/* Large BPM logo mark */}
        <div
          className={clsx(
            "flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold shadow-sm transition-all duration-200",
            collapsed ? "w-10 h-10 text-sm" : "w-16 h-16 text-xl"
          )}
        >
          BPM
        </div>

        {/* System title below logo */}
        {!collapsed && (
          <div className="mt-3 text-center animate-fade-in">
            <div
              className="font-display font-bold text-sm leading-snug"
              style={{ color: "var(--color-sidebar-title)" }}
            >
              Public Assets
            </div>
            <div
              className="text-xs leading-snug"
              style={{ color: "var(--color-sidebar-sub)" }}
            >
              &amp; Facilities Mgmt
            </div>
          </div>
        )}
      </div>

      {/* ── Role badge ────────────────────────────────────── */}
      {!collapsed && roleMeta && (
        <div className="mx-3 mt-4 px-3 py-1.5 rounded-full bg-state-info-soft text-state-info text-xs font-semibold animate-fade-in">
          {roleMeta.label}
        </div>
      )}

      {/* ── Nav items ─────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-2 mt-3 space-y-0.5 pb-24 md:pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const badge = item.badgeKey ? badgeCounts[item.badgeKey] : 0;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                clsx(
                  "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 sidebar-nav-item",
                  isActive ? "sidebar-nav-active" : "sidebar-nav-inactive",
                )
              }
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 truncate animate-fade-in text-[13px]">
                    {item.label}
                  </span>
                  {badge > 0 && (
                    <span className="shrink-0 min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-state-info-soft text-state-info">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge > 0 && (
                <span className="absolute left-8 top-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
