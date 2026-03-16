import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"

import {
  Plus,
  Pencil,
  Trash2,
  Search,
  MapPin,
  TreePine,
  CheckCircle,
  Wrench,
  XCircle,
  X,
  ChevronDown,
  Building2,
  RefreshCw,
  Eye,
  Package,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
type AvailabilityStatus = "available" | "under_maintenance" | "unavailable" | string

interface AdminOffice {
  admin_office_id: string
  office_name: string
  location: string | null
}

interface ParkVenue {
  park_venue_id: string
  park_venue_name: string
  location: string | null
  venue_type: string | null
  admin_office_id: string | null
  availability_status: AvailabilityStatus
  administration_office?: AdminOffice | null
  _reservation_count?: number
}

// ─────────────────────────────────────────────
// HELPERS — same badge palette as dashboard
// ─────────────────────────────────────────────
const VENUE_TYPE_LABELS: Record<string, string> = {
  pavilion:      "Pavilion",
  picnic_area:   "Picnic Area",
  open_field:    "Open Field",
  campsite:      "Campsite",
  events_ground: "Events Ground",
  court:         "Court",
  jogging_path:  "Jogging Path",
  swimming_pool: "Swimming Pool",
}

const VENUE_TYPE_OPTIONS = Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

function statusColor(status: string) {
  if (status === "available")         return "bg-green-600"
  if (status === "under_maintenance") return "bg-yellow-500"
  if (status === "unavailable")       return "bg-red-600"
  return "bg-slate-500"
}

function statusLabel(status: string) {
  if (status === "available")         return "Available"
  if (status === "under_maintenance") return "Under Maintenance"
  if (status === "unavailable")       return "Unavailable"
  return status
}

function venueTypeLabel(type: string | null) {
  if (!type) return "—"
  return VENUE_TYPE_LABELS[type] ?? type
}

// ─────────────────────────────────────────────
// MODAL WRAPPER
// ─────────────────────────────────────────────
function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VENUE FORM
// ─────────────────────────────────────────────
function VenueForm({
  initial = {},
  adminOffices,
  onSubmit,
  onCancel,
  loading,
  isEdit = false,
}: {
  initial?: Partial<ParkVenue>
  adminOffices: AdminOffice[]
  onSubmit: (data: Partial<ParkVenue>) => Promise<void>
  onCancel: () => void
  loading: boolean
  isEdit?: boolean
}) {
  const [form, setForm] = useState<Partial<ParkVenue>>({
    park_venue_name: "",
    location: "",
    venue_type: "",
    admin_office_id: "",
    availability_status: "available",
    ...initial,
  })

  function set(field: keyof ParkVenue, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const inputCls =
    "w-full border border-slate-700 rounded-md px-3 py-2 text-sm bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 transition"
  const labelCls = "block text-xs font-medium text-slate-400 mb-1"

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Venue Name *</label>
        <input
          className={inputCls}
          placeholder="e.g. Quezon Memorial Circle — Main Pavilion"
          value={form.park_venue_name ?? ""}
          onChange={(e) => set("park_venue_name", e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Location</label>
        <input
          className={inputCls}
          placeholder="e.g. Elliptical Rd, QC"
          value={form.location ?? ""}
          onChange={(e) => set("location", e.target.value)}
        />
      </div>

      <div>
        <label className={labelCls}>Venue Type</label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none pr-8"}
            value={form.venue_type ?? ""}
            onChange={(e) => set("venue_type", e.target.value)}
          >
            <option value="">— Select type —</option>
            {VENUE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Availability status — prominent visual toggle */}
      <div>
        <label className={labelCls}>Availability Status *</label>
        <div className="grid grid-cols-3 gap-2 mt-1">
          {[
            { value: "available",         label: "Available",    icon: "✅", active: "bg-green-600 text-white border-green-600"   },
            { value: "under_maintenance", label: "Maintenance",  icon: "🔧", active: "bg-yellow-500 text-white border-yellow-500" },
            { value: "unavailable",       label: "Unavailable",  icon: "🚫", active: "bg-red-600 text-white border-red-600"       },
          ].map((opt) => {
            const isActive = (form.availability_status ?? "available") === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => set("availability_status", opt.value)}
                className={`flex flex-col items-center justify-center gap-1 py-3 rounded-lg border-2 text-xs font-medium transition-all
                  ${isActive ? opt.active : "border-slate-700 text-slate-500 hover:border-slate-500 hover:bg-slate-800"}`}
              >
                <span className="text-base">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className={labelCls}>Administering Office</label>
        <div className="relative">
          <select
            className={inputCls + " appearance-none pr-8"}
            value={form.admin_office_id ?? ""}
            onChange={(e) => set("admin_office_id", e.target.value)}
          >
            <option value="">— None —</option>
            {adminOffices.map((o) => (
              <option key={o.admin_office_id} value={o.admin_office_id}>{o.office_name}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          onClick={() => onSubmit(form)}
          disabled={loading || !form.park_venue_name?.trim()}
          className="px-5 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition"
        >
          {loading ? "Saving…" : isEdit ? "Save Changes" : "Add Venue"}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// VIEW DETAIL MODAL
// ─────────────────────────────────────────────
function VenueDetailModal({
  venue,
  onClose,
}: {
  venue: ParkVenue
  onClose: () => void
}) {
  return (
    <Modal title="Venue Details" onClose={onClose}>
      <div className="space-y-3">
        <div className="flex justify-between items-start border-b border-slate-700 pb-3">
          <div>
            <p className="font-semibold text-sm text-slate-100">{venue.park_venue_name}</p>
            {venue.location && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {venue.location}
              </p>
            )}
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusColor(venue.availability_status)}`}>
            {statusLabel(venue.availability_status)}
          </span>
        </div>

        {[
          { label: "Venue ID",     value: venue.park_venue_id },
          { label: "Type",         value: venueTypeLabel(venue.venue_type ?? null) },
          { label: "Reservations", value: `${venue._reservation_count ?? 0} total` },
          { label: "Office",       value: venue.administration_office?.office_name ?? "—" },
        ].map(({ label, value }) => (
          <div key={label} className="flex justify-between items-center">
            <span className="text-xs text-slate-400">{label}</span>
            <span className="text-xs font-medium text-slate-100 text-right max-w-[60%]">{value}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// DELETE CONFIRM MODAL
// ─────────────────────────────────────────────
function DeleteConfirmModal({
  venue,
  loading,
  onConfirm,
  onCancel,
}: {
  venue: ParkVenue
  loading: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}) {
  return (
    <Modal title="Delete Venue" onClose={onCancel}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-slate-100">{venue.park_venue_name}</span>?
          This cannot be undone and may affect existing reservation records.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 text-sm rounded-md bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition"
          >
            {loading ? "Deleting…" : "Delete Venue"}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────
export default function ParkVenues() {
  const { user } = useAuth()

  const [venues, setVenues]             = useState<ParkVenue[]>([])
  const [adminOffices, setAdminOffices] = useState<AdminOffice[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const [search, setSearch]             = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType]     = useState("all")

  const [showAddModal, setShowAddModal] = useState(false)
  const [editVenue, setEditVenue]       = useState<ParkVenue | null>(null)
  const [viewVenue, setViewVenue]       = useState<ParkVenue | null>(null)
  const [deleteVenue, setDeleteVenue]   = useState<ParkVenue | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [venuesRes, officesRes, reservationsRes] = await Promise.all([
        supabase
          .from("park_venue")
          .select(`*, administration_office (admin_office_id, office_name, location)`)
          .order("park_venue_id"),
        supabase
          .from("administration_office")
          .select("admin_office_id, office_name, location")
          .order("office_name"),
        supabase
          .from("park_reservation_record")
          .select("park_venue_id"),
      ])

      if (venuesRes.error)  throw venuesRes.error
      if (officesRes.error) throw officesRes.error

      const countMap: Record<string, number> = {}
      ;(reservationsRes.data ?? []).forEach((r: any) => {
        countMap[r.park_venue_id] = (countMap[r.park_venue_id] ?? 0) + 1
      })

      setVenues(
        (venuesRes.data ?? []).map((v: any) => ({
          ...v,
          _reservation_count: countMap[v.park_venue_id] ?? 0,
        }))
      )
      setAdminOffices(officesRes.data ?? [])
    } catch (err: any) {
      setError(err.message ?? "Failed to load venues.")
    } finally {
      setLoading(false)
    }
  }

  const filtered = venues.filter((v) => {
    const q = search.toLowerCase()
    return (
      (!q || v.park_venue_name.toLowerCase().includes(q) || (v.location ?? "").toLowerCase().includes(q)) &&
      (filterStatus === "all" || v.availability_status === filterStatus) &&
      (filterType   === "all" || v.venue_type === filterType)
    )
  })

  const kpis = [
    { label: "Total Venues",       value: venues.length,                                                       icon: Package    },
    { label: "Available",          value: venues.filter((v) => v.availability_status === "available").length,         icon: CheckCircle },
    { label: "Under Maintenance",  value: venues.filter((v) => v.availability_status === "under_maintenance").length, icon: Wrench      },
    { label: "Unavailable",        value: venues.filter((v) => v.availability_status === "unavailable").length,       icon: XCircle     },
  ]

  async function handleAdd(data: Partial<ParkVenue>) {
    setSaving(true)
    try {
      const maxId = venues
        .map((v) => parseInt(v.park_venue_id.replace("PV-", ""), 10))
        .filter((n) => !isNaN(n))
        .reduce((a, b) => Math.max(a, b), 0)
      const { error } = await supabase.from("park_venue").insert({
        park_venue_id:       `PV-${String(maxId + 1).padStart(3, "0")}`,
        park_venue_name:     data.park_venue_name,
        location:            data.location || null,
        venue_type:          data.venue_type || null,
        admin_office_id:     data.admin_office_id || null,
        availability_status: data.availability_status ?? "available",
      })
      if (error) throw error
      setShowAddModal(false)
      await loadData()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleEdit(data: Partial<ParkVenue>) {
    if (!editVenue) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("park_venue")
        .update({
          park_venue_name:     data.park_venue_name,
          location:            data.location || null,
          venue_type:          data.venue_type || null,
          admin_office_id:     data.admin_office_id || null,
          availability_status: data.availability_status,
        })
        .eq("park_venue_id", editVenue.park_venue_id)
      if (error) throw error
      setEditVenue(null)
      await loadData()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteVenue) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from("park_venue")
        .delete()
        .eq("park_venue_id", deleteVenue.park_venue_id)
      if (error) throw error
      setDeleteVenue(null)
      await loadData()
    } catch (err: any) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">

      {/* HEADER — identical pattern to dashboard */}
      <div className="mb-8">
        <span
          className="px-3 py-1 rounded text-xs font-semibold"
          style={{ background: meta.bgColor, color: meta.color }}
        >
          {meta.label}
        </span>
        <h1 className="text-2xl font-bold mt-2">Park Venues</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage and monitor all park and recreation venues available for reservation.
        </p>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <XCircle size={15} className="shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto"><X size={13} /></button>
        </div>
      )}

      {/* KPI CARDS — exact same structure as dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <Card key={i}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <Icon size={18} />
                </div>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs text-muted-foreground">{kpi.label}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search venues…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="under_maintenance">Under Maintenance</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="relative">
          <select
            className="appearance-none pl-3 pr-8 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {VENUE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        <div className="flex-1" />

        <button
          onClick={loadData}
          className="p-2 rounded-md border text-muted-foreground hover:bg-muted transition"
          title="Refresh"
        >
          <RefreshCw size={14} />
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition"
        >
          <Plus size={14} />
          Add Venue
        </button>
      </div>

      {/* VENUES LIST — same card + divide-y + border-b pattern as dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>
            All Venues
            <span className="text-xs font-normal text-muted-foreground ml-2">
              ({filtered.length} of {venues.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" />
              Loading venues…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TreePine size={28} className="mb-2 opacity-30" />
              <p className="text-sm">No venues found.</p>
              {(search || filterStatus !== "all" || filterType !== "all") && (
                <button
                  onClick={() => { setSearch(""); setFilterStatus("all"); setFilterType("all") }}
                  className="mt-1.5 text-xs text-primary hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-6">
              {filtered.map((venue) => (
                <div
                  key={venue.park_venue_id}
                  className="flex justify-between items-center border-b pb-3 group"
                >
                  {/* Name + meta */}
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="text-sm font-medium">{venue.park_venue_name}</div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {venue.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin size={10} />{venue.location}
                        </span>
                      )}
                      {venue.administration_office && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Building2 size={10} />{venue.administration_office.office_name}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {venueTypeLabel(venue.venue_type ?? null)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {venue._reservation_count ?? 0} reservations
                      </span>
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${statusColor(venue.availability_status)}`}>
                      {statusLabel(venue.availability_status)}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setViewVenue(venue)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => setEditVenue(venue)}
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteVenue(venue)}
                        className="p-1.5 rounded text-muted-foreground hover:text-red-600 hover:bg-red-50 transition"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODALS */}
      {showAddModal && (
        <Modal title="Add New Venue" onClose={() => setShowAddModal(false)}>
          <VenueForm
            adminOffices={adminOffices}
            onSubmit={handleAdd}
            onCancel={() => setShowAddModal(false)}
            loading={saving}
          />
        </Modal>
      )}

      {editVenue && (
        <Modal title="Edit Venue" onClose={() => setEditVenue(null)}>
          <VenueForm
            initial={editVenue}
            adminOffices={adminOffices}
            onSubmit={handleEdit}
            onCancel={() => setEditVenue(null)}
            loading={saving}
            isEdit
          />
        </Modal>
      )}

      {viewVenue && (
        <VenueDetailModal venue={viewVenue} onClose={() => setViewVenue(null)} />
      )}

      {deleteVenue && (
        <DeleteConfirmModal
          venue={deleteVenue}
          loading={saving}
          onConfirm={handleDelete}
          onCancel={() => setDeleteVenue(null)}
        />
      )}
    </div>
  )
}