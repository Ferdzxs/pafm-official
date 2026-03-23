import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { resolveCitizenDisplayIdentity } from "@/lib/citizenProfileDisplay";
import { ROLE_NAV, ROLE_META } from "@/config/rbac";
import {
  Sun,
  Moon,
  Bell,
  Search,
  ChevronRight,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// ─── Mock badge counts ──────────────────────────────────────────────────────
const INITIAL_BADGE_COUNTS: Record<string, number> = {
  pending_burials: 7,
  pending_assistance: 3,
  pending_certs: 5,
  pending_park_res: 4,
  pending_bar_res: 0,
  barangay_intake_queue: 0,
  assigned_tickets: 9,
  open_tickets: 12,
  pending_reconciliation: 6,
  pending_payments: 0,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TOP BAR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface TopBarProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onCloseSidebar: () => void;
}

export function TopBar({ sidebarCollapsed, onToggleSidebar, onCloseSidebar }: TopBarProps) {
  const { user, unreadCount, notifications, markNotifRead, logout, updateSessionUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.is_citizen) return;
    let cancelled = false;
    void (async () => {
      try {
        const resolved = await resolveCitizenDisplayIdentity(supabase, {
          accountId: user.id,
          email: user.email,
          sessionFullName: user.full_name,
        });
        if (cancelled) return;
        const next = resolved.full_name?.trim();
        if (next && next !== user.full_name) {
          updateSessionUser({ full_name: next });
        }
      } catch {
        /* keep session name */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.is_citizen, user?.email, user?.full_name, updateSessionUser]);

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
      className="relative shrink-0 flex items-center gap-3 px-3 sm:px-5 h-[60px] bg-surface-subtle border-b border-border-subtle sticky top-0 z-20"
      onMouseDown={() => {
        if (!sidebarCollapsed && window.matchMedia("(max-width: 767px)").matches) {
          onCloseSidebar();
        }
      }}
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
            className="w-full rounded-md border border-[color:var(--color-sidebar-border)] bg-[color:var(--color-bg-hover)] px-3 sm:px-4 py-2 pl-10 text-xs sm:text-sm text-[color:var(--color-text-primary)] placeholder:text-[color:var(--color-sidebar-sub)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface-base)] transition-colors"
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
            <div className="absolute top-full right-0 mt-2 w-[340px] z-[1100] bg-popover text-popover-foreground rounded-xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-3 flex items-center justify-between border-b border-border bg-muted/20">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="info" className="text-[9px] px-1.5 h-4 font-bold">
                    {unreadCount} NEW
                  </Badge>
                )}
              </div>
              <div className="overflow-y-auto sidebar-scrollbar max-h-[350px]">
                {notifications.length === 0 ? (
                  <div className="px-6 py-10 text-center flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                      <Bell size={20} className="opacity-20" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">No updates right now</span>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.notif_id}
                      onClick={() => markNotifRead(n.notif_id)}
                      className={cn(
                        "px-4 py-3.5 cursor-pointer transition-colors border-b border-border/50 hover:bg-accent/50 group relative text-left",
                        !n.is_read && "bg-primary/[0.03]"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {!n.is_read && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1 shrink-0" />}
                        <div className="flex-1 space-y-0.5">
                          <p className={cn("text-xs font-semibold leading-tight", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {n.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                            {n.message}
                          </p>
                          <div className="flex items-center gap-1.5 pt-1 text-[9px] font-medium text-muted-foreground/60 uppercase tracking-tighter">
                            <span>{new Date(n.created_at).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
              {(user?.full_name?.trim() || "U").charAt(0)}
            </div>
            <div className="hidden sm:block text-left min-w-0 max-w-[140px]">
              <div
                className="text-xs font-semibold leading-tight truncate"
                style={{ color: "var(--color-sidebar-user)" }}
                title={user?.full_name || undefined}
              >
                {user?.is_citizen
                  ? (user.full_name?.trim() || user.email?.split("@")[0] || "Citizen")
                  : (user?.full_name?.split(" ").slice(-1)[0] ?? "User")}
              </div>
              <div
                className="text-[10px] leading-tight truncate"
                style={{ color: "var(--color-sidebar-email)" }}
                title={user?.is_citizen ? user?.email : undefined}
              >
                {user?.is_citizen
                  ? (user.email || "Citizen account")
                  : (user?.role.replace(/_/g, " ") ?? "")}
              </div>
            </div>
            <ChevronRight
              size={12}
              className={`hidden sm:block transition-transform ${showUser ? "rotate-90" : ""}`}
              style={{ color: "var(--color-sidebar-sub)" }}
            />
          </button>

          {showUser && (
            <div className="absolute top-full right-0 mt-2 w-64 z-[1100] bg-popover text-popover-foreground rounded-xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="px-4 py-4 border-b border-border bg-muted/20 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shadow-md mb-2">
                  {(user?.full_name?.trim() || "U").charAt(0)}
                </div>
                <p className="text-sm font-bold text-foreground truncate w-full" title={user?.full_name || undefined}>
                  {user?.full_name?.trim() || user?.email?.split("@")[0] || "User"}
                </p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5 truncate w-full px-1">
                  {user?.is_citizen ? (user.email || "Citizen") : (user?.role.replace(/_/g, " ") ?? "")}
                </p>
              </div>
              <div className="p-1.5 space-y-0.5">
                <NavLink
                  to="/profile"
                  className="flex items-center gap-3 px-3.5 py-2.5 text-[11px] font-bold text-foreground/70 hover:text-primary hover:bg-primary/5 rounded-lg transition-all group"
                  onClick={() => setShowUser(false)}
                >
                  <User size={15} className="group-hover:scale-110 transition-transform text-muted-foreground group-hover:text-primary" /> 
                  <span className="tracking-wide">MY ACCOUNT</span>
                </NavLink>
                <div className="h-px bg-border/50 my-1 mx-2" />
                
                <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-[11px] font-bold text-red-500 hover:bg-red-500/5 rounded-lg transition-all group"
                >
                  <LogOut size={15} className="group-hover:translate-x-1 transition-transform" /> 
                  <span className="tracking-wide uppercase">Sign Out</span>
                </button>
              </div>
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
  onCloseSidebar: () => void;
}

export default function Sidebar({ collapsed, onCloseSidebar }: SidebarProps) {
  const { user } = useAuth();
  const [badgeCounts, setBadgeCounts] = useState(INITIAL_BADGE_COUNTS);
  const navItems = user ? ROLE_NAV[user.role] : [];
  const roleMeta = user ? ROLE_META[user.role] : null;

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      // Only fetch if relevant for the current role
      const isParksAdmin = user.role === "parks_admin";
      const isDesk = user.role === "reservation_officer";
      const isTreasurer = user.role === "treasurer";

      if (isTreasurer) {
        const [{ count: parkC }, { count: barC }, { count: utilC }] = await Promise.all([
          supabase
            .from("park_reservation_record")
            .select("*", { count: "exact", head: true })
            .in("status", ["application_validated", "order_of_payment_issued"]),
          supabase
            .from("barangay_reservation_record")
            .select("*", { count: "exact", head: true })
            .in("status", ["awaiting_treasury", "order_of_payment_issued"]),
          supabase
            .from("service_tickets")
            .select("*", { count: "exact", head: true })
            .in("ticket_type", [
              "water_connection:new",
              "water_connection:additional_meter",
              "water_connection",
            ])
            .in("status", ["awaiting_treasury", "order_of_payment_issued"]),
        ])
        const total = (parkC ?? 0) + (barC ?? 0) + (utilC ?? 0)
        setBadgeCounts((prev) => ({ ...prev, pending_payments: total }))
      }

      if (user.role === "punong_barangay") {
        const { count, error } = await supabase
          .from("barangay_reservation_record")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending_pb_approval")

        if (!error && count !== null) {
          setBadgeCounts((prev) => ({ ...prev, pending_bar_res: count }))
        }
      }

      if (user.role === "barangay_secretary") {
        const { count, error } = await supabase
          .from("barangay_reservation_record")
          .select("*", { count: "exact", head: true })
          .eq("status", "submitted")

        if (!error && count !== null) {
          setBadgeCounts((prev) => ({ ...prev, barangay_intake_queue: count }))
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
    if (user.role === "treasurer") {
      tables.push("park_reservation_record");
      tables.push("barangay_reservation_record");
      tables.push("digital_payment");
      tables.push("service_tickets");
      tables.push("installation_record");
      tables.push("technical_assessment");
    }

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
        "fixed inset-y-0 left-0 z-50 flex h-screen flex-col transition-transform duration-300 select-none shrink-0 md:sticky md:top-0 md:translate-x-0 shadow-sm bg-[color:var(--color-sidebar-bg)] border-r border-border-subtle opacity-100",
        collapsed ? "-translate-x-full md:w-17" : "translate-x-0 w-64 md:w-55",
      )}
    >
      {/* ── Logo block ──────────────────────────────────────── */}
      <div
        className="flex flex-col items-center justify-center py-6 px-3 border-b border-border-subtle bg-[color:var(--color-sidebar-bg)]"
      >
        {!collapsed && (
          <button
            type="button"
            onClick={onCloseSidebar}
            className="md:hidden absolute top-2 right-2 w-8 h-8 rounded-lg flex items-center justify-center text-[color:var(--color-sidebar-text)] hover:bg-[color:var(--color-sidebar-hover)] hover:text-[color:var(--color-text-primary)] transition-colors"
            title="Close navigation"
          >
            <X size={16} />
          </button>
        )}

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
              &amp; Facilities Management
            </div>
            <div
              className="text-xs leading-snug"
              style={{ color: "var(--color-sidebar-sub)" }}
            >
             
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
      <nav className="sidebar-scrollbar flex-1 overflow-y-auto px-2 mt-3 space-y-0.5 pb-24 md:pb-4">
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
