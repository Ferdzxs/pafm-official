import React, { useEffect, useState, useCallback } from "react";
import { Search, Plus, FileText, Download, Tag, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

interface Ordinance {
 id: string;
 ordinance_no: string;
 title: string;
 category: string;
 date_enacted: string;
 status: "active" | "amended" | "repealed";
 summary: string;
}

interface RawOrdinanceData {
 ordinance_id: string;
 title: string;
 description: string | null;
 category: string;
 date_enacted: string;
 status: string;
}

const CATEGORIES = [
 "All",
 "Public Order",
 "Health & Sanitation",
 "Environment",
 "Finance",
 "Social Welfare",
 "Zoning",
 "Youth & Sports",
];

const STATUS_BADGE: Record<string, string> = {
 active: "badge-active",
 amended: "badge-pending",
 repealed: "badge-rejected",
};
const STATUS_COLOR: Record<string, string> = {
 active: "#34d399",
 amended: "#fbbf24",
 repealed: "#f87171",
};

export default function OrdinanceReferences() {
 const [ordinances, setOrdinances] = useState<Ordinance[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [category, setCategory] = useState("All");
 const [statusFilter, setStatusFilter] = useState("all");
 const [selected, setSelected] = useState<Ordinance | null>(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [formData, setFormData] = useState({
 ordinance_no: "",
 title: "",
 category: "",
 date_enacted: "",
 status: "active" as Ordinance["status"],
 summary: "",
 });
 const [saving, setSaving] = useState(false);

 const fetchData = useCallback(async () => {
 try {
  setLoading(true);
  const { data, error } = await supabase
  .from("barangay_ordinances")
  .select("*")
  .order("date_enacted", { ascending: false });

  if (error) throw error;

  const formatted: Ordinance[] = ((data as RawOrdinanceData[]) || []).map(
  (o) => ({
   id: o.ordinance_id,
   ordinance_no: o.ordinance_id, // Mapping ordinance_id to ordinance_no for UI consistency
   title: o.title,
   category: o.category,
   date_enacted: o.date_enacted,
   status: o.status as Ordinance["status"],
   summary: o.description || "No summary provided.",
  }),
  );

  setOrdinances(formatted);
 } catch (error: unknown) {
  console.error("Error fetching ordinances:", error);
  const message =
  error instanceof Error ? error.message : "Failed to load ordinances";
  toast.error(message);
 } finally {
  setLoading(false);
 }
 }, []);

 useEffect(() => {
 fetchData();
 }, [fetchData]);

 const handleCreateOrdinance = async (e: React.FormEvent) => {
 e.preventDefault();
 if (
  !formData.ordinance_no ||
  !formData.title ||
  !formData.date_enacted ||
  !formData.category
 ) {
  toast.error("Please fill in all required fields");
  return;
 }

 try {
  setSaving(true);
  const { error } = await supabase.from("barangay_ordinances").insert({
  ordinance_id: formData.ordinance_no,
  title: formData.title,
  category: formData.category,
  description: formData.summary,
  date_enacted: formData.date_enacted,
  status: formData.status,
  });

  if (error) throw error;

  toast.success("Ordinance successfully created");
  setShowAddModal(false);
  setFormData({
  ordinance_no: "",
  title: "",
  category: "",
  date_enacted: "",
  status: "active",
  summary: "",
  });
  fetchData();
 } catch (error: unknown) {
  console.error("Error creating ordinance:", error);
  const message =
  error instanceof Error ? error.message : "Failed to create ordinance";
  toast.error(message);
 } finally {
  setSaving(false);
 }
 };

 const filtered = ordinances.filter((o) => {
 const q = search.toLowerCase();
 return (
  (o.title.toLowerCase().includes(q) ||
  o.ordinance_no.toLowerCase().includes(q)) &&
  (category === "All" || o.category === category) &&
  (statusFilter === "all" || o.status === statusFilter)
 );
 });

 return (
 <div className="px-4 py-4 sm:px-6 lg:px-8 animate-fade-in">
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
  <div>
   <h1
   className="font-display text-2xl font-bold"
   style={{ color: "var(--color-text-primary)" }}
   >
   Ordinance References
   </h1>
   <p
   className="text-sm mt-0.5"
   style={{ color: "var(--color-text-muted)" }}
   >
   Brgy. Ordinances — Complete legislative reference
   </p>
  </div>
  <button className="btn-primary" onClick={() => setShowAddModal(true)}>
   <Plus size={15} /> Add Ordinance
  </button>
  </div>

  {/* Summary */}
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
  {[
   {
   label: "Active",
   count: ordinances.filter((o) => o.status === "active").length,
   color: "#34d399",
   },
   {
   label: "Amended",
   count: ordinances.filter((o) => o.status === "amended").length,
   color: "#fbbf24",
   },
   {
   label: "Repealed",
   count: ordinances.filter((o) => o.status === "repealed").length,
   color: "#f87171",
   },
  ].map((s) => (
   <div
   key={s.label}
   className="rounded-xl p-4"
   style={{
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
   }}
   >
   <div className="text-2xl font-bold" style={{ color: s.color }}>
    {s.count}
   </div>
   <div
    className="text-xs"
    style={{ color: "var(--color-text-muted)" }}
   >
    {s.label} Ordinances
   </div>
   </div>
  ))}
  </div>

  {/* Filters */}
  <div className="flex flex-row items-center gap-3 mb-5">
  <div className="relative flex-1">
   <Search
   size={14}
   className="absolute left-3 top-1/2 -translate-y-1/2"
   style={{ color: "var(--color-text-muted)" }}
   />
   <input
   className="input-field pl-10"
   placeholder="Search ordinances…"
   value={search}
   onChange={(e) => setSearch(e.target.value)}
   />
  </div>
  <select
   className="input-field flex-1"
   value={category}
   onChange={(e) => setCategory(e.target.value)}
  >
   {CATEGORIES.map((c) => (
   <option key={c}>{c}</option>
   ))}
  </select>
  <select
   className="input-field flex-1"
   value={statusFilter}
   onChange={(e) => setStatusFilter(e.target.value)}
  >
   <option value="all">All Status</option>
   <option value="active">Active</option>
   <option value="amended">Amended</option>
   <option value="repealed">Repealed</option>
  </select>
  </div>

  {/* Card grid */}
  {loading ? (
  <div
   className="flex flex-col items-center justify-center py-24 gap-4"
   style={{
   background: "var(--color-card)",
   border: "1px solid var(--color-border)",
   borderRadius: "1rem",
   }}
  >
   <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
   <p
   className="text-sm font-medium"
   style={{ color: "var(--color-text-muted)" }}
   >
   Fetching legislative records...
   </p>
  </div>
  ) : filtered.length > 0 ? (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
   {filtered.map((ord) => (
   <div
    key={ord.id}
    className="rounded-xl p-5 cursor-pointer transition-all card-hover"
    style={{
    background: "var(--color-card)",
    border: `1px solid ${STATUS_COLOR[ord.status]}22`,
    }}
    onClick={() => setSelected(ord)}
   >
    <div className="flex items-start justify-between mb-3">
    <div className="flex items-center gap-2">
     <div
     className="w-8 h-8 rounded-lg flex items-center justify-center"
     style={{ background: `${STATUS_COLOR[ord.status]}15` }}
     >
     <FileText
      size={14}
      style={{ color: STATUS_COLOR[ord.status] }}
     />
     </div>
     <span
     className="text-xs font-mono font-semibold"
     style={{ color: "var(--color-text-muted)" }}
     >
     {ord.ordinance_no}
     </span>
    </div>
    <span
     className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${STATUS_BADGE[ord.status]}`}
    >
     {ord.status}
    </span>
    </div>
    <h3
    className="text-sm font-semibold mb-2 leading-snug"
    style={{ color: "var(--color-text-primary)" }}
    >
    {ord.title}
    </h3>
    <p
    className="text-xs mb-3 line-clamp-2"
    style={{ color: "var(--color-text-muted)" }}
    >
    {ord.summary}
    </p>
    <div className="flex items-center justify-between">
    <span
     className="text-[10px] px-2 py-0.5 rounded-full"
     style={{
     background: "var(--color-bg-hover)",
     color: "var(--color-text-muted)",
     }}
    >
     <Tag size={9} className="inline mr-1" />
     {ord.category}
    </span>
    <span
     className="text-[10px]"
     style={{ color: "var(--color-text-muted)" }}
    >
     Enacted:{" "}
     {new Date(ord.date_enacted).toLocaleDateString("en-PH")}
    </span>
    </div>
   </div>
   ))}
  </div>
  ) : (
  <div
   className="py-24 text-center"
   style={{ color: "var(--color-text-muted)" }}
  >
   <FileText size={40} className="mx-auto mb-4 opacity-10" />
   <p>No ordinances match your search or filters.</p>
  </div>
  )}

  {/* Detail modal */}
  {selected && (
  <div
   className="fixed inset-0 z-50 flex items-center justify-center p-4"
   style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
  >
   <div
   className="rounded-2xl p-6 w-full max-w-lg animate-fade-in"
   style={{
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    maxHeight: "90vh",
    overflowY: "auto",
   }}
   >
   <div className="flex items-center justify-between mb-5">
    <h2
    className="font-bold text-lg"
    style={{ color: "var(--color-text-primary)" }}
    >
    {selected.ordinance_no}
    </h2>
    <button
    onClick={() => setSelected(null)}
    style={{ color: "var(--color-text-muted)" }}
    className="text-xl"
    >
    ✕
    </button>
   </div>
   <div className="space-y-3">
    {[
    ["Title", selected.title],
    ["Category", selected.category],
    ["Status", selected.status],
    [
     "Date Enacted",
     new Date(selected.date_enacted).toLocaleDateString("en-PH"),
    ],
    ["Summary", selected.summary],
    ].map(([l, v]) => (
    <div
     key={l}
     className="py-2"
     style={{ borderBottom: "1px solid var(--color-border)" }}
    >
     <div
     className="text-xs uppercase tracking-wide mb-1"
     style={{ color: "var(--color-text-muted)" }}
     >
     {l}
     </div>
     <div
     className="text-sm"
     style={{ color: "var(--color-text-primary)" }}
     >
     {v}
     </div>
    </div>
    ))}
   </div>
   <div className="flex gap-2 mt-6">
    <button className="btn-primary flex-1 justify-center">
    <Download size={14} /> Download PDF
    </button>
    <button
    className="btn-secondary flex-1 justify-center"
    onClick={() => setSelected(null)}
    >
    Close
    </button>
   </div>
   </div>
  </div>
  )}
  {/* Create Ordinance Modal */}
  {showAddModal && (
  <div
   className="fixed inset-0 z-50 flex items-center justify-center p-4"
   style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
  >
   <div
   className="rounded-2xl p-6 w-full max-w-lg animate-fade-in"
   style={{
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    maxHeight: "90vh",
    overflowY: "auto",
   }}
   >
   <div className="flex items-center justify-between mb-5">
    <h2
    className="font-bold text-lg"
    style={{ color: "var(--color-text-primary)" }}
    >
    New Barangay Ordinance
    </h2>
    <button
    onClick={() => setShowAddModal(false)}
    style={{ color: "var(--color-text-muted)" }}
    className="text-xl"
    >
    ✕
    </button>
   </div>
   <form onSubmit={handleCreateOrdinance} className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div className="space-y-1">
     <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
     >
     Ordinance No. *
     </label>
     <input
     className="input-field"
     placeholder="e.g. ORD-001"
     value={formData.ordinance_no}
     onChange={(e) =>
      setFormData({ ...formData, ordinance_no: e.target.value })
     }
     />
    </div>
    <div className="space-y-1">
     <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
     >
     Category *
     </label>
     <select
     className="input-field"
     value={formData.category}
     onChange={(e) =>
      setFormData({ ...formData, category: e.target.value })
     }
     >
     <option value="" disabled>
      Select Category
     </option>
     {CATEGORIES.filter((c) => c !== "All").map((c) => (
      <option key={c} value={c}>
      {c}
      </option>
     ))}
     </select>
    </div>
    </div>

    <div className="space-y-1">
    <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
    >
     Title *
    </label>
    <input
     className="input-field"
     placeholder="Official title of the ordinance"
     value={formData.title}
     onChange={(e) =>
     setFormData({ ...formData, title: e.target.value })
     }
    />
    </div>

    <div className="grid grid-cols-2 gap-4">
    <div className="space-y-1">
     <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
     >
     Date Enacted *
     </label>
     <input
     type="date"
     className="input-field"
     value={formData.date_enacted}
     onChange={(e) =>
      setFormData({ ...formData, date_enacted: e.target.value })
     }
     />
    </div>
    <div className="space-y-1">
     <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
     >
     Status
     </label>
     <select
     className="input-field"
     value={formData.status}
     onChange={(e) =>
      setFormData({
      ...formData,
      status: e.target.value as Ordinance["status"],
      })
     }
     >
     <option value="active">Active</option>
     <option value="amended">Amended</option>
     <option value="repealed">Repealed</option>
     </select>
    </div>
    </div>

    <div className="space-y-1">
    <label
     className="text-xs font-semibold uppercase tracking-wider"
     style={{ color: "var(--color-text-muted)" }}
    >
     Summary / Description
    </label>
    <textarea
     className="input-field min-h-25"
     placeholder="Brief explanation of the legislative intent..."
     value={formData.summary}
     onChange={(e) =>
     setFormData({ ...formData, summary: e.target.value })
     }
    />
    </div>

    <div className="flex gap-2 pt-4">
    <button
     type="submit"
     className="btn-primary flex-1 justify-center py-2.5"
     disabled={saving}
    >
     {saving ? (
     <Loader2 className="w-4 h-4 animate-spin" />
     ) : (
     <Plus size={16} />
     )}
     Create Ordinance
    </button>
    <button
     type="button"
     className="btn-secondary flex-1 justify-center py-2.5"
     onClick={() => setShowAddModal(false)}
    >
     Cancel
    </button>
    </div>
   </form>
   </div>
  </div>
  )}
 </div>
 );
}
