import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_META } from "@/config/rbac";
import {
  ClipboardList,
  CheckSquare,
  BookOpen,
  FileText,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";

const PIE_COLORS = ["#e879f9", "#a78bfa", "#60a5fa", "#34d399"];

const STATUS_CLASS: Record<string, string> = {
  pending: "badge-pending",
  approved: "badge-approved",
  completed: "badge-completed",
  rejected: "badge-rejected",
};

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function PunongBarangayDashboardPage() {
  const { user } = useAuth();

  const [KPI_DATA, setKpiData] = useState([
    {
      label: "Pending Approvals",
      value: 0,
      change: 0,
      icon: Clock,
      color: "#fbbf24",
      path: "/barangay/pending",
    },
    {
      label: "Approved This Month",
      value: 0,
      change: 0,
      icon: CheckSquare,
      color: "#34d399",
      path: "/barangay/records",
    },
    {
      label: "Ordinances on File",
      value: 0,
      change: 0,
      icon: BookOpen,
      color: "#e879f9",
      path: "/barangay/ordinances",
    },
    {
      label: "Documents Filed",
      value: 0,
      change: 0,
      icon: FileText,
      color: "#60a5fa",
      path: "/barangay/documents",
    },
    {
      label: "Requests This Month",
      value: 0,
      change: 0,
      icon: ClipboardList,
      color: "#fb923c",
      path: "/barangay/requests",
    },
    {
      label: "Constituents Served",
      value: 0,
      change: 0,
      icon: Users,
      color: "#a78bfa",
      path: "/barangay/records",
    },
  ]);

  const [RECENT_ACTIVITY, setRecentActivity] = useState([]);
  const [MONTHLY_DATA, setMonthlyData] = useState([]);
  const [REQUEST_TYPES, setRequestTypes] = useState([]);

  // Fetch KPI data
  useEffect(() => {
    async function fetchKpi() {
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const pending = await supabase
        .from("reservations")
        .select("id")
        .eq("status", "pending");
      const approvedThisMonth = await supabase
        .from("reservations")
        .select("id")
        .eq("status", "approved")
        .gte(
          "created_at",
          `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
        );
      const ordinances = await supabase.from("ordinances").select("id");
      const documents = await supabase.from("documents").select("id");
      const requests = await supabase.from("requests").select("id");
      const constituents = await supabase.from("constituents").select("id");

      setKpiData([
        { ...KPI_DATA[0], value: pending.data?.length || 0 },
        { ...KPI_DATA[1], value: approvedThisMonth.data?.length || 0 },
        { ...KPI_DATA[2], value: ordinances.data?.length || 0 },
        { ...KPI_DATA[3], value: documents.data?.length || 0 },
        { ...KPI_DATA[4], value: requests.data?.length || 0 },
        { ...KPI_DATA[5], value: constituents.data?.length || 0 },
      ]);
    }
    fetchKpi();
  }, []);

  // Fetch recent activity
  useEffect(() => {
    async function fetchActivity() {
      const reservations = await supabase
        .from("reservations")
        .select("id, facility_name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const documents = await supabase
        .from("documents")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      const activity = [
        ...(reservations.data?.map((r) => ({
          id: r.id,
          action: "Reservation Request Filed",
          subject: r.facility_name,
          status: r.status,
          time: new Date(r.created_at).toLocaleString("en-PH", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        })) || []),
        ...(documents.data?.map((d) => ({
          id: d.id,
          action: "Document Filed",
          subject: d.title,
          status: "completed",
          time: new Date(d.created_at).toLocaleString("en-PH", {
            dateStyle: "short",
            timeStyle: "short",
          }),
        })) || []),
      ];

      setRecentActivity(
        activity.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        ),
      );
    }
    fetchActivity();
  }, []);

  // Fetch Monthly chart data
  useEffect(() => {
    async function fetchMonthlyData() {
      const { data } = await supabase
        .from("reservations")
        .select("id, status, created_at");

      const monthMap = {};

      data?.forEach((r) => {
        const month = new Date(r.created_at).toLocaleString("en-US", {
          month: "short",
        });
        if (!monthMap[month])
          monthMap[month] = { month, reservations: 0, approved: 0 };
        monthMap[month].reservations++;
        if (r.status === "approved") monthMap[month].approved++;
      });

      const sortedMonths = Object.values(monthMap).sort((a, b) => {
        const monthOrder = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });

      setMonthlyData(sortedMonths);
    }
    fetchMonthlyData();
  }, []);

  // Fetch Request Type breakdown for Pie chart
  useEffect(() => {
    async function fetchRequestTypes() {
      const facility = await supabase
        .from("requests")
        .select("id")
        .eq("type", "Facility Reservation");
      const documents = await supabase
        .from("requests")
        .select("id")
        .eq("type", "Document Request");
      const certificate = await supabase
        .from("requests")
        .select("id")
        .eq("type", "Certificate Issuance");
      const other = await supabase
        .from("requests")
        .select("id")
        .eq("type", "Other");

      setRequestTypes([
        { name: "Facility Reservations", value: facility.data?.length || 0 },
        { name: "Document Requests", value: documents.data?.length || 0 },
        { name: "Certificate Issuance", value: certificate.data?.length || 0 },
        { name: "Other Requests", value: other.data?.length || 0 },
      ]);
    }
    fetchRequestTypes();
  }, []);

  if (!user) return null;

  return (
    <div className="px-4 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="px-2.5 py-1 rounded-lg text-xs font-semibold"
            style={{
              background: ROLE_META[user.role].bgColor,
              color: ROLE_META[user.role].color,
            }}
          >
            {ROLE_META[user.role].label}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-text-muted)" }}
          >
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
        <h1
          className="font-display text-2xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {getGreeting()}, {user.full_name.split(" ").slice(-1)[0]}! 👋
        </h1>
        <p
          style={{ color: "var(--color-text-muted)" }}
          className="text-sm mt-1"
        >
          {user.office} · Barangay Records & Affairs
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          const isUp = kpi.change >= 0;
          return (
            <Link
              key={i}
              to={kpi.path}
              className="rounded-2xl p-5 card-hover block transition-all"
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${kpi.color}18` }}
                >
                  <Icon size={18} style={{ color: kpi.color }} />
                </div>
                {kpi.change !== 0 && (
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {isUp ? (
                      <TrendingUp size={11} />
                    ) : (
                      <TrendingDown size={11} />
                    )}
                    {Math.abs(kpi.change)}
                  </div>
                )}
              </div>
              <div
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                {kpi.value}
              </div>
              <div
                className="text-xs"
                style={{ color: "var(--color-text-muted)" }}
              >
                {kpi.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2
            className="font-semibold mb-4 text-sm"
            style={{ color: "var(--color-text-primary)" }}
          >
            Monthly Requests vs. Approvals
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MONTHLY_DATA} barGap={4}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "var(--color-text-primary)",
                }}
              />
              <Bar
                dataKey="reservations"
                name="Requests"
                fill="#e879f9"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="approved"
                name="Approved"
                fill="#34d399"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div
          className="rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <h2
            className="font-semibold mb-4 text-sm"
            style={{ color: "var(--color-text-primary)" }}
          >
            Request Breakdown
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={REQUEST_TYPES}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={60}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
                fontSize={10}
              >
                {REQUEST_TYPES.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-3">
            {REQUEST_TYPES.map((t, i) => (
              <div key={t.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: PIE_COLORS[i] }}
                />
                <span
                  className="text-xs truncate"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {t.name}
                </span>
                <span
                  className="text-xs font-semibold ml-auto"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {t.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="font-semibold"
              style={{ color: "var(--color-text-primary)" }}
            >
              Recent Activity
            </h2>
            <span
              className="text-xs"
              style={{ color: "var(--color-text-muted)" }}
            >
              Live updates
            </span>
          </div>
          <div className="space-y-1">
            {RECENT_ACTIVITY.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors cursor-pointer hover:opacity-80"
                style={{ background: "var(--color-bg-hover)" }}
              >
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {item.id.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    {item.action}
                  </div>
                  <div
                    className="text-xs truncate"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {item.subject}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLASS[item.status]}`}
                  >
                    {item.status}
                  </span>
                  <span
                    className="text-[10px] whitespace-nowrap"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
