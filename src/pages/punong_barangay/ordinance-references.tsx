import { supabase } from "@/lib/supabase";
import { AlertCircle, BookOpen, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'

type Ordinance = {
 ordinance_id: string;
 title: string;
 description: string | null;
 category: string;
 date_enacted: string;
 status: string;
};

const STATUS_BADGE: Record<string, string> = {
 active: "bg-emerald-400/15 text-emerald-400",
 amended: "bg-yellow-400/15 text-yellow-400",
 repealed: "bg-red-400/15 text-red-400",
};

export default function PBOrdinanceReferences() {
 const [ordinances, setOrdinances] = useState<Ordinance[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState("");
 const [categoryFilter, setCategoryFilter] = useState("All");
 const [statusFilter, setStatusFilter] = useState("all");
 const [selected, setSelected] = useState<Ordinance | null>(null);
 const [showAddForm, setShowAddForm] = useState(false);
 const [newOrd, setNewOrd] = useState({
 title: "",
 category: "",
 description: "",
 date_enacted: "",
 status: "active",
 });
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState<string | null>(null);

 useEffect(() => {
 loadOrdinances();
 }, []);

 async function loadOrdinances() {
 try {
  setLoading(true);
  setError(null);
  const { data, error } = await supabase
  .from("barangay_ordinances")
  .select("*")
  .order("date_enacted", { ascending: false });

  if (error) throw error;
  setOrdinances(data || []);
 } catch (err: unknown) {
  console.error("Error loading ordinances:", err);
  const message =
  err instanceof Error ? err.message : "Failed to load ordinances";
  setError(message);
  toast.error(message);
 } finally {
  setLoading(false);
 }
 }

 const categories = [
 "All",
 ...Array.from(new Set(ordinances.map((o) => o.category).filter(Boolean))),
 ];

 const filtered = ordinances.filter((o) => {
 const q = search.toLowerCase();
 return (
  ((o.title || "").toLowerCase().includes(q) ||
  (o.ordinance_id || "").toLowerCase().includes(q) ||
  (o.category || "").toLowerCase().includes(q)) &&
  (categoryFilter === "All" || o.category === categoryFilter) &&
  (statusFilter === "all" || o.status === statusFilter)
 );
 });

 /* PB can add new ordinances */
 async function addOrdinance() {
 if (!newOrd.title || !newOrd.date_enacted) {
  toast.error("Please fill in all required fields");
  return;
 }

 try {
  setSaving(true);
  const newId =
  "ORD-" + Math.random().toString(36).substring(2, 7).toUpperCase();
  const { error } = await supabase.from("barangay_ordinances").insert({
  ordinance_id: newId,
  title: newOrd.title,
  category: newOrd.category || "General",
  description: newOrd.description || null,
  date_enacted: newOrd.date_enacted,
  status: newOrd.status,
  });

  if (error) throw error;

  toast.success("Ordinance added successfully");
  setNewOrd({
  title: "",
  category: "",
  description: "",
  date_enacted: "",
  status: "active",
  });
  setShowAddForm(false);
  loadOrdinances();
 } catch (err: unknown) {
  console.error("Error adding ordinance:", err);
  const message =
  err instanceof Error ? err.message : "Failed to add ordinance";
  toast.error(message);
 } finally {
  setSaving(false);
 }
 }

 if (loading) {
 return (
  <div className="flex justify-center items-center min-h-[60vh]">
  <Loader2 className="animate-spin text-blue-400" />
  </div>
 );
 }

 if (error) {
 return (
  <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
  <AlertCircle size={40} className="text-red-400" />
  <p className="text-slate-400">{error}</p>
  <button className="btn-secondary" onClick={loadOrdinances}>
   Retry
  </button>
  </div>
 );
 }

 return (
 <div className=" px-6 py-6">
  {/* HEADER */}
  <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
  <div>
   <h1
   className="text-2xl font-bold flex items-center gap-2"
   style={{ color: "var(--color-text-primary)" }}
   >
   <BookOpen size={22} /> Ordinance References
   </h1>
   <p
   className="text-sm mt-1"
   style={{ color: "var(--color-text-muted)" }}
   >
   Barangay legislation records and resolutions
   </p>
  </div>
  <button className="btn-primary" onClick={() => setShowAddForm(true)}>
   <Plus size={15} /> Add Ordinance
  </button>
  </div>

  {/* STATS */}
  <div className="grid grid-cols-3 gap-3 mb-6">
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
    {s.label}
   </div>
   </div>
  ))}
  </div>

  {/* FILTERS */}
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
   value={categoryFilter}
   onChange={(e) => setCategoryFilter(e.target.value)}
  >
   {categories.map((c) => (
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

  {/* TABLE */}
  <div
  className="glass rounded-2xl overflow-hidden"
  style={{ border: "1px solid rgba(148,163,184,0.1)" }}
  >
  <table className="w-full text-sm">
   <thead>
   <tr className="border-b border-slate-700/40 text-slate-400">
    <th className="p-4 text-left">Ordinance ID</th>
    <th className="p-4 text-left">Title</th>
    <th className="p-4 text-left">Category</th>
    <th className="p-4 text-left">Date Enacted</th>
    <th className="p-4 text-left">Status</th>
   </tr>
   </thead>
   <tbody>
   {filtered.map((o) => (
    <tr
    key={o.ordinance_id}
    className="border-t border-slate-700/30 hover:bg-white/5 cursor-pointer"
    onClick={() => setSelected(o)}
    >
    <td className="p-4 font-mono text-white text-xs">
     {o.ordinance_id}
    </td>
    <td className="p-4 text-slate-300 flex gap-2 items-center">
     <BookOpen size={13} className="shrink-0" />
     <span className="truncate max-w-62.5">{o.title}</span>
    </td>
    <td className="p-4">
     <span
     className="text-[11px] px-2 py-0.5 rounded-full"
     style={{
      background: "rgba(255,255,255,0.06)",
      color: "var(--color-text-muted)",
     }}
     >
     {o.category}
     </span>
    </td>
    <td className="p-4 text-slate-400">
     {new Date(o.date_enacted).toLocaleDateString("en-PH")}
    </td>
    <td className="p-4">
     <span
     className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[o.status] || "bg-slate-400/15 text-slate-400"}`}
     >
     {o.status}
     </span>
    </td>
    </tr>
   ))}
   {filtered.length === 0 && (
    <tr>
    <td colSpan={5} className="text-center p-10 text-slate-500">
     No ordinances available.
    </td>
    </tr>
   )}
   </tbody>
  </table>
  </div>

  {/* ADD ORDINANCE MODAL */}
  <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
   <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
     <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
      <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
       Add Ordinance
      </DialogTitle>
      <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
       Create a new ordinance reference.
      </DialogDescription>
     </DialogHeader>

     <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
      <div>
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
        Title <span className="text-red-500">*</span>
       </label>
       <input
        className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
        placeholder="Ordinance title…"
        value={newOrd.title}
        onChange={(e) =>
         setNewOrd((p) => ({ ...p, title: e.target.value }))
        }
       />
      </div>
      <div>
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
        Category
       </label>
       <input
        className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
        placeholder="e.g. Public Order, Health & Sanitation…"
        value={newOrd.category}
        onChange={(e) =>
         setNewOrd((p) => ({ ...p, category: e.target.value }))
        }
       />
      </div>
      <div>
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
        Date Enacted <span className="text-red-500">*</span>
       </label>
       <input
        type="date"
        className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        value={newOrd.date_enacted}
        onChange={(e) =>
         setNewOrd((p) => ({ ...p, date_enacted: e.target.value }))
        }
       />
      </div>
      <div>
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
        Status
       </label>
       <select
        className="w-full h-11 px-4 rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        value={newOrd.status}
        onChange={(e) =>
         setNewOrd((p) => ({ ...p, status: e.target.value }))
        }
       >
        <option value="active">Active</option>
        <option value="amended">Amended</option>
        <option value="repealed">Repealed</option>
       </select>
      </div>
      <div>
       <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
        Description
       </label>
       <textarea
        className="w-full rounded-xl border border-input bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none p-4 placeholder:text-muted-foreground/50"
        rows={3}
        placeholder="Brief description of the ordinance…"
        value={newOrd.description || ''}
        onChange={(e) =>
         setNewOrd((p) => ({ ...p, description: e.target.value }))
        }
       />
      </div>
     </div>

     <div className="mt-6 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 shrink-0">
      <button
       className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm"
       onClick={() => setShowAddForm(false)}
      >
       Cancel
      </button>
      <button
       className="h-11 rounded-xl flex-1 sm:flex-none px-6 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
       disabled={!newOrd.title || !newOrd.date_enacted || saving}
       onClick={addOrdinance}
      >
       {saving ? (
        <Loader2 size={14} className="animate-spin" />
       ) : (
        <Plus size={14} />
       )}
       Save Ordinance
      </button>
     </div>
    </div>
   </DialogContent>
  </Dialog>

  {/* DETAIL MODAL */}
  <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
   <DialogContent className="max-w-lg p-0 overflow-hidden border-none bg-transparent shadow-none w-full">
    {selected && (
     <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col sidebar-scrollbar">
      <DialogHeader className="mb-6 space-y-1 text-left shrink-0">
       <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight flex items-center gap-2">
        {selected.ordinance_id}
       </DialogTitle>
       <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
        Ordinance Details
       </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 overflow-y-auto flex-1 sidebar-scrollbar pb-2">
       {[
        ["Title", selected.title],
        ["Category", selected.category],
        ["Status", selected.status],
        [
         "Date Enacted",
         new Date(selected.date_enacted).toLocaleDateString("en-PH"),
        ],
        ...(selected.description
         ? [["Description", selected.description]]
         : []),
       ].map(([l, v]) => (
        <div key={l as string} className="bg-background border border-border/50 p-4 rounded-xl shadow-sm">
         <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
          {l}
         </div>
         <div className="text-sm font-semibold text-foreground capitalize whitespace-pre-wrap">
          {v}
         </div>
        </div>
       ))}
      </div>

      <div className="mt-8 pt-6 border-t border-border/10 flex justify-end shrink-0">
       <button
        onClick={() => setSelected(null)}
        className="h-11 rounded-xl px-8 w-full sm:w-auto border border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all shadow-sm"
       >
        Close
       </button>
      </div>
     </div>
    )}
   </DialogContent>
  </Dialog>
 </div>
 );
}
