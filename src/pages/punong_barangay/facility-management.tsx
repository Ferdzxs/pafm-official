/**
 * Punong Barangay — Barangay facility CRUD (barangay_facility).
 */
import React, { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import toast from "react-hot-toast"
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type BarangayRow = { barangay_id: string; barangay_name: string }

type FacilityRow = {
  barangay_facility_id: string
  barangay_id: string | null
  facility_name: string
  facility_type: string | null
  rental_rate: number | null
  ordinance_reference: string | null
  availability_status: string | null
  barangay?: { barangay_name: string } | null
}

function newFacilityId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `BF-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`
  }
  return `BF-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

const FACILITY_TYPES = [
  { value: "hall", label: "Hall" },
  { value: "court", label: "Court" },
  { value: "room", label: "Room" },
  { value: "multipurpose", label: "Multipurpose" },
  { value: "other", label: "Other" },
]

const AVAILABILITY = [
  { value: "available", label: "Available" },
  { value: "unavailable", label: "Unavailable" },
]

export default function PunongBarangayFacilityManagement() {
  const { user } = useAuth()
  const [barangays, setBarangays] = useState<BarangayRow[]>([])
  const [rows, setRows] = useState<FacilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FacilityRow | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    barangay_facility_id: "",
    barangay_id: "",
    facility_name: "",
    facility_type: "hall",
    rental_rate: "0",
    ordinance_reference: "",
    availability_status: "available",
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: bData, error: bErr }, { data: fData, error: fErr }] = await Promise.all([
        supabase.from("barangay").select("barangay_id, barangay_name").order("barangay_name"),
        supabase
          .from("barangay_facility")
          .select(
            `
            barangay_facility_id,
            barangay_id,
            facility_name,
            facility_type,
            rental_rate,
            ordinance_reference,
            availability_status,
            barangay ( barangay_name )
          `,
          )
          .order("facility_name"),
      ])
      if (bErr) throw bErr
      if (fErr) throw fErr
      setBarangays((bData as BarangayRow[]) ?? [])
      setRows((fData as unknown as FacilityRow[]) ?? [])
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to load facilities")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    const first = barangays[0]?.barangay_id ?? ""
    setEditing(null)
    setForm({
      barangay_facility_id: newFacilityId(),
      barangay_id: first,
      facility_name: "",
      facility_type: "hall",
      rental_rate: "0",
      ordinance_reference: "",
      availability_status: "available",
    })
    setDialogOpen(true)
  }

  const openEdit = (r: FacilityRow) => {
    setEditing(r)
    setForm({
      barangay_facility_id: r.barangay_facility_id,
      barangay_id: r.barangay_id ?? "",
      facility_name: r.facility_name,
      facility_type: r.facility_type || "hall",
      rental_rate: String(r.rental_rate ?? 0),
      ordinance_reference: r.ordinance_reference ?? "",
      availability_status: r.availability_status || "available",
    })
    setDialogOpen(true)
  }

  const save = async () => {
    const name = form.facility_name.trim()
    if (!name) {
      toast.error("Facility name is required.")
      return
    }
    if (!form.barangay_id) {
      toast.error("Select a barangay.")
      return
    }
    const rental = Number(form.rental_rate)
    if (Number.isNaN(rental) || rental < 0) {
      toast.error("Rental rate must be a number ≥ 0.")
      return
    }

    setSaving(true)
    try {
      const payload = {
        barangay_facility_id: form.barangay_facility_id.trim(),
        barangay_id: form.barangay_id,
        facility_name: name,
        facility_type: form.facility_type || null,
        rental_rate: rental,
        ordinance_reference: form.ordinance_reference.trim() || null,
        availability_status: form.availability_status,
      }

      if (editing) {
        const { error } = await supabase
          .from("barangay_facility")
          .update({
            barangay_id: payload.barangay_id,
            facility_name: payload.facility_name,
            facility_type: payload.facility_type,
            rental_rate: payload.rental_rate,
            ordinance_reference: payload.ordinance_reference,
            availability_status: payload.availability_status,
          })
          .eq("barangay_facility_id", editing.barangay_facility_id)
        if (error) throw error
        toast.success("Facility updated.")
      } else {
        const { error } = await supabase.from("barangay_facility").insert(payload)
        if (error) throw error
        toast.success("Facility created.")
      }
      setDialogOpen(false)
      await load()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (r: FacilityRow) => {
    if (!window.confirm(`Delete “${r.facility_name}”? Reservations referencing it will block deletion.`)) return
    const { error } = await supabase.from("barangay_facility").delete().eq("barangay_facility_id", r.barangay_facility_id)
    if (error) {
      if (/foreign key|violates/i.test(error.message)) {
        toast.error("Cannot delete: this facility has reservations. Set status to Unavailable instead.")
      } else {
        toast.error(error.message)
      }
      return
    }
    toast.success("Facility removed.")
    setRows(prev => prev.filter(x => x.barangay_facility_id !== r.barangay_facility_id))
  }

  const filtered = rows.filter(r => {
    const q = search.toLowerCase()
    if (!q) return true
    const bn = Array.isArray(r.barangay)
      ? r.barangay[0]?.barangay_name
      : r.barangay?.barangay_name
    return (
      r.facility_name.toLowerCase().includes(q) ||
      r.barangay_facility_id.toLowerCase().includes(q) ||
      (bn && bn.toLowerCase().includes(q))
    )
  })

  const meta = user ? ROLE_META[user.role] : null

  if (!user) return null

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 animate-fade-in max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          {meta && (
            <span
              className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold mb-2"
              style={{ background: meta.bgColor, color: meta.color }}
            >
              {meta.label}
            </span>
          )}
          <h1 className="font-display text-2xl font-bold text-foreground">Facility management</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Create and maintain barangay facilities citizens can reserve. Deletion is blocked if reservations exist.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="gap-2" onClick={openCreate} disabled={loading || barangays.length === 0}>
            <Plus className="h-4 w-4" />
            Add facility
          </Button>
        </div>
      </div>

      {barangays.length === 0 && !loading && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          No barangay records found in the database. Seed <code className="text-xs">barangay</code> first.
        </div>
      )}

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, ID, barangay…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-2">
            <Loader2 className="h-8 w-8 animate-spin" />
            Loading facilities…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-left">
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 font-semibold">Facility</th>
                  <th className="p-3 font-semibold">Barangay</th>
                  <th className="p-3 font-semibold">Type</th>
                  <th className="p-3 font-semibold">Rental</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const bn = Array.isArray(r.barangay)
                    ? r.barangay[0]?.barangay_name
                    : r.barangay?.barangay_name
                  return (
                    <tr key={r.barangay_facility_id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.barangay_facility_id}</td>
                      <td className="p-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          {r.facility_name}
                        </div>
                      </td>
                      <td className="p-3">{bn ?? "—"}</td>
                      <td className="p-3 capitalize">{r.facility_type ?? "—"}</td>
                      <td className="p-3 tabular-nums">
                        {Number(r.rental_rate ?? 0) > 0 ? `₱${Number(r.rental_rate).toLocaleString()}` : "Free"}
                      </td>
                      <td className="p-3">
                        <Badge variant={r.availability_status === "available" ? "default" : "secondary"}>
                          {r.availability_status ?? "—"}
                        </Badge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(r)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void remove(r)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">No facilities match your search.</p>
            )}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit facility" : "New facility"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="bf-id">Facility ID</Label>
                <Input
                  id="bf-id"
                  value={form.barangay_facility_id}
                  onChange={e => setForm(f => ({ ...f, barangay_facility_id: e.target.value }))}
                  className="font-mono text-xs"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="bf-bry">Barangay</Label>
              <select
                id="bf-bry"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.barangay_id}
                onChange={e => setForm(f => ({ ...f, barangay_id: e.target.value }))}
              >
                <option value="">Select…</option>
                {barangays.map(b => (
                  <option key={b.barangay_id} value={b.barangay_id}>
                    {b.barangay_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-name">Facility name</Label>
              <Input
                id="bf-name"
                value={form.facility_name}
                onChange={e => setForm(f => ({ ...f, facility_name: e.target.value }))}
                placeholder="e.g. Multi-Purpose Hall"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bf-type">Type</Label>
                <select
                  id="bf-type"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.facility_type}
                  onChange={e => setForm(f => ({ ...f, facility_type: e.target.value }))}
                >
                  {FACILITY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bf-rent">Rental (₱)</Label>
                <Input
                  id="bf-rent"
                  type="number"
                  min={0}
                  step={1}
                  value={form.rental_rate}
                  onChange={e => setForm(f => ({ ...f, rental_rate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-ord">Ordinance reference (optional)</Label>
              <Input
                id="bf-ord"
                value={form.ordinance_reference}
                onChange={e => setForm(f => ({ ...f, ordinance_reference: e.target.value }))}
                placeholder="e.g. Ord. No. 34 s.2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bf-st">Availability</Label>
              <select
                id="bf-st"
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.availability_status}
                onChange={e => setForm(f => ({ ...f, availability_status: e.target.value }))}
              >
                {AVAILABILITY.map(t => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
