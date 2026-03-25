/**
 * park-venues.tsx — Parks Administrator overhauled for UI/UX
 */

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import toast from "react-hot-toast"

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
  AlertTriangle,
  Info
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

// ─── TYPES ───
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

// ─── CONSTANTS ───
const VENUE_TYPE_LABELS: Record<string, string> = {
  pavilion: "Pavilion",
  picnic_area: "Picnic Area",
  open_field: "Open Field",
  campsite: "Campsite",
  events_ground: "Events Ground",
  court: "Court",
  jogging_path: "Jogging Path",
  swimming_pool: "Swimming Pool",
}

const VENUE_TYPE_OPTIONS = Object.entries(VENUE_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}))

// ─── HELPERS ───
function getStatusBadge(status: string) {
  switch (status) {
    case "available":
      return <Badge variant="success">Available</Badge>
    case "under_maintenance":
      return <Badge variant="warning">Maintenance</Badge>
    case "unavailable":
      return <Badge variant="destructive">Unavailable</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

function venueTypeLabel(type: string | null) {
  if (!type) return "—"
  return VENUE_TYPE_LABELS[type] ?? type
}

// ─── MAIN COMPONENT ───
export default function ParkVenues() {
  const { user } = useAuth()

  const [venues, setVenues] = useState<ParkVenue[]>([])
  const [adminOffices, setAdminOffices] = useState<AdminOffice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterType, setFilterType] = useState("all")

  // Modal States
  const [showFormModal, setShowFormModal] = useState(false)
  const [venueToEdit, setVenueToEdit] = useState<ParkVenue | null>(null)
  const [venueToView, setVenueToView] = useState<ParkVenue | null>(null)
  const [venueToDelete, setVenueToDelete] = useState<ParkVenue | null>(null)

  // Form State
  const [formData, setFormData] = useState<Partial<ParkVenue>>({
    park_venue_name: "",
    location: "",
    venue_type: "",
    admin_office_id: "",
    availability_status: "available",
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [{ data: venuesRes, error: vErr }, { data: officesRes, error: oErr }, { data: reservationsRes, error: rErr }] = await Promise.all([
        supabase.from("park_venue").select(`*, administration_office (admin_office_id, office_name, location)`).order("park_venue_id"),
        supabase.from("administration_office").select("admin_office_id, office_name, location").order("office_name"),
        supabase.from("park_reservation_record").select("park_venue_id")
      ])

      if (vErr) throw vErr
      if (oErr) throw oErr

      const countMap: Record<string, number> = {}
      ;(reservationsRes ?? []).forEach((r: any) => {
        countMap[r.park_venue_id] = (countMap[r.park_venue_id] ?? 0) + 1
      })

      setVenues((venuesRes ?? []).map((v: any) => ({
        ...v,
        _reservation_count: countMap[v.park_venue_id] ?? 0,
      })))
      setAdminOffices(officesRes ?? [])
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
      (filterType === "all" || v.venue_type === filterType)
    )
  })

  async function handleSave() {
    setSaving(true)
    try {
      if (venueToEdit) {
        // Edit Mode
        const { error: editErr } = await supabase
          .from("park_venue")
          .update({
            park_venue_name: formData.park_venue_name,
            location: formData.location || null,
            venue_type: formData.venue_type || null,
            admin_office_id: formData.admin_office_id || null,
            availability_status: formData.availability_status,
          })
          .eq("park_venue_id", venueToEdit.park_venue_id)
        
        if (editErr) throw editErr
        toast.success("Venue updated successfully.")
      } else {
        // Add Mode
        const maxId = venues
          .map((v) => parseInt(v.park_venue_id.replace("PV-", ""), 10))
          .filter((n) => !isNaN(n))
          .reduce((a, b) => Math.max(a, b), 0)
        
        const { error: insErr } = await supabase.from("park_venue").insert({
          park_venue_id: `PV-${String(maxId + 1).padStart(3, "0")}`,
          park_venue_name: formData.park_venue_name,
          location: formData.location || null,
          venue_type: formData.venue_type || null,
          admin_office_id: formData.admin_office_id || null,
          availability_status: formData.availability_status ?? "available",
        })
        
        if (insErr) throw insErr
        toast.success("New venue added successfully.")
      }
      
      setShowFormModal(false)
      setVenueToEdit(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!venueToDelete) return
    setSaving(true)
    try {
      const { error: delErr } = await supabase
        .from("park_venue")
        .delete()
        .eq("park_venue_id", venueToDelete.park_venue_id)
      
      if (delErr) throw delErr
      toast.success("Venue deleted successfully.")
      setVenueToDelete(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const openForm = (v: ParkVenue | null = null) => {
    setVenueToEdit(v)
    setFormData(v ? { ...v } : {
      park_venue_name: "",
      location: "",
      venue_type: "",
      admin_office_id: "",
      availability_status: "available",
    })
    setShowFormModal(true)
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in px-6 py-8 space-y-8">
      {/* HEADER */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="px-2 py-0.5" style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}>
            {meta.label}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Park Venues</h1>
          <p className="text-muted-foreground text-sm">Registry of parks, centers, and facilities monitorable for scheduling.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => openForm()}>
            <Plus className="mr-2 h-4 w-4" /> Add Venue
          </Button>
        </div>
      </header>

      {/* KPI HIGHLIGHTS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Registered", value: venues.length, icon: Package, color: "text-muted-foreground" },
          { label: "Open & Available", value: venues.filter(v => v.availability_status === 'available').length, icon: CheckCircle, color: "text-green-600" },
          { label: "In Maintenance", value: venues.filter(v => v.availability_status === 'under_maintenance').length, icon: Wrench, color: "text-yellow-600" },
          { label: "Currently Closed", value: venues.filter(v => v.availability_status === 'unavailable').length, icon: XCircle, color: "text-red-600" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
              </div>
              <kpi.icon className={cn("h-5 w-5 opacity-60", kpi.color)} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search venue name or location..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="available">Available</option>
            <option value="under_maintenance">Maintenance</option>
            <option value="unavailable">Unavailable</option>
          </select>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            {VENUE_TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {(search || filterStatus !== 'all' || filterType !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterType('all') }}>
              <X className="mr-2 h-4 w-4" /> Reset
            </Button>
          )}
        </div>
      </div>

      {/* TABLE */}
      <Card className="border-border shadow-sm overflow-hidden text-sm">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Venue Details</TableHead>
              <TableHead className="hidden lg:table-cell">Type</TableHead>
              <TableHead className="hidden md:table-cell">Office & Count</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center animate-pulse text-muted-foreground">
                  Synchronizing records...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                    <TreePine className="h-8 w-8 text-muted-foreground/30" />
                    <p>No venues found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.park_venue_id} className="group hover:bg-muted transition-colors">
                  <TableCell className="font-mono text-[10px] text-muted-foreground">
                    {v.park_venue_id}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground tracking-tight">{v.park_venue_name}</p>
                      {v.location && (
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {v.location}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="font-normal text-[10px] uppercase tracking-wider">
                      {venueTypeLabel(v.venue_type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-medium text-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3 opacity-60" />
                        {v.administration_office?.office_name || "LGU Main Office"}
                      </p>
                      <p className="text-[10px] text-muted-foreground italic">
                        {v._reservation_count || 0} total reservations
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(v.availability_status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setVenueToView(v)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openForm(v)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setVenueToDelete(v)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* FORM MODAL (Add/Edit) */}
      <Dialog open={showFormModal} onOpenChange={(open) => !open && setShowFormModal(false)}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
          <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
            <DialogHeader className="mb-6 space-y-1 text-left">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="uppercase font-bold tracking-widest px-3 border-border">
                  {venueToEdit ? 'UPDATE SYSTEM RECORD' : 'NEW ONBOARDING'}
                </Badge>
              </div>
              <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                {venueToEdit ? 'Update Venue Profile' : 'Create New Venue'}
              </DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground/80 mt-1">
                {venueToEdit ? 'Modify the details for this park facility.' : 'Enter details for a new recreational space.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <div className="surface-box border border-border/20 p-5 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="venue-name" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Official Venue Name *</Label>
                  <Input 
                    id="venue-name" 
                    className="h-11 bg-background text-sm"
                    placeholder="e.g. Quezon City Memorial Circle Fountain"
                    value={formData.park_venue_name}
                    onChange={(e) => setFormData(p => ({ ...p, park_venue_name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="venue-type" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Type of Space</Label>
                    <select
                      id="venue-type"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.venue_type || ''}
                      onChange={(e) => setFormData(p => ({ ...p, venue_type: e.target.value }))}
                    >
                      <option value="">— Select type —</option>
                      {VENUE_TYPE_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="venue-office" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Admin Office</Label>
                    <select
                      id="venue-office"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={formData.admin_office_id || ''}
                      onChange={(e) => setFormData(p => ({ ...p, admin_office_id: e.target.value }))}
                    >
                      <option value="">— Select Office —</option>
                      {adminOffices.map(o => (
                        <option key={o.admin_office_id} value={o.admin_office_id}>{o.office_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue-location" className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Specific Location / Landmarks</Label>
                  <Input 
                    id="venue-location" 
                    className="h-11 bg-background text-sm"
                    placeholder="landmarks, quadrant, nearby streets"
                    value={formData.location || ''}
                    onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-box group !rounded-xl !p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Public Availability Profile *</span>
                </div>
                <div className="grid grid-cols-3 gap-2 px-1">
                  {[
                    { value: "available", label: "Open", icon: CheckCircle, cls: "border-green-500 text-green-700 bg-green-50/50 dark:bg-green-900/20 dark:text-green-400 border-2" },
                    { value: "under_maintenance", label: "Repair", icon: Wrench, cls: "border-yellow-500 text-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/20 dark:text-yellow-400 border-2" },
                    { value: "unavailable", label: "Closed", icon: XCircle, cls: "border-red-500 text-red-700 bg-red-50/50 dark:bg-red-900/20 dark:text-red-400 border-2" },
                  ].map((opt) => {
                    const active = formData.availability_status === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setFormData(p => ({ ...p, availability_status: opt.value }))}
                        className={cn(
                          "flex flex-col items-center justify-center gap-2 rounded-xl py-4 transition-all duration-300",
                          active ? opt.cls : "border border-border/50 bg-background/50 hover:bg-muted hover:border-border text-muted-foreground"
                        )}
                      >
                        <opt.icon className="h-5 w-5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/10 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
              <Button variant="outline" className="h-11 rounded-xl px-8 w-full sm:w-auto border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all" onClick={() => setShowFormModal(false)}>Cancel</Button>
              <Button className="h-11 rounded-xl bg-primary hover:bg-primary/90 flex-1 sm:flex-none text-[11px] font-extrabold shadow-lg shadow-primary/20 uppercase tracking-widest" onClick={handleSave} disabled={saving || !formData.park_venue_name?.trim()}>
                {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
                {venueToEdit ? 'Update Details' : 'Register Venue'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VIEW DIALOG */}
      <Dialog open={!!venueToView} onOpenChange={(open) => !open && setVenueToView(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none">
          {venueToView && (
            <div className="card-premium mx-auto w-full animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto sidebar-scrollbar">
              <DialogHeader className="mb-6 space-y-1 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 border-border tracking-tighter opacity-70">
                    {venueToView.park_venue_id}
                  </Badge>
                  {getStatusBadge(venueToView.availability_status)}
                </div>
                <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground leading-tight">
                  {venueToView.park_venue_name}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 text-muted-foreground mt-1.5 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-primary/60" /> {venueToView.location || 'No specific location'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="surface-box group border border-border/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">Category</p>
                    <p className="text-sm font-bold text-foreground">{venueTypeLabel(venueToView.venue_type)}</p>
                  </div>
                  <div className="surface-box group border border-border/20 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1 group-hover:text-primary transition-colors">Reservations</p>
                    <p className="text-sm font-bold text-foreground">{venueToView._reservation_count || 0} <span className="text-[10px] font-normal opacity-60">Records</span></p>
                  </div>
                </div>

                {/* ADMINISTRATION BLOCK */}
                <div className="admin-box mt-2 group !p-5 !rounded-xl relative overflow-hidden">
                  <Building2 className="absolute -right-4 -bottom-4 h-24 w-24 text-primary/5 transition-transform group-hover:scale-110 duration-700 ease-out" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Administration</span>
                    </div>
                    <div className="text-sm font-bold text-foreground leading-tight px-1 mb-3">
                      {venueToView.administration_office?.office_name || "Quezon City Local Government"}
                    </div>
                    {venueToView.administration_office?.location && (
                      <div className="sep mt-1 pb-1">
                        <div className="flex items-start gap-2 text-[11px] text-muted-foreground font-medium italic mt-3">
                          <MapPin className="h-3.5 w-3.5 text-primary/40 shrink-0 mt-0.5" />
                          {venueToView.administration_office.location}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-border/10 flex items-center justify-end">
                <Button 
                  variant="outline" 
                   className="h-11 rounded-xl px-8 w-full sm:w-auto border-border bg-background text-[11px] font-extrabold uppercase tracking-widest text-foreground hover:bg-muted transition-all"
                  onClick={() => setVenueToView(null)}
                >
                  Close View
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRM */}
      <Dialog open={!!venueToDelete} onOpenChange={(open) => !open && setVenueToDelete(null)}>
        <DialogContent className="max-w-md">
          {venueToDelete && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" /> Delete Venue?
                </DialogTitle>
                <DialogDescription>
                  This will permanently remove <strong>{venueToDelete.park_venue_name}</strong> from the registry. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-destructive bg-destructive/20 p-4 flex gap-3 items-start">
                <Info className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed font-medium">
                  Warning: Deleting this venue will not remove its reservation history, but it will be missing from dashboards and new booking forms.
                </p>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="ghost" size="sm" onClick={() => setVenueToDelete(null)} disabled={saving}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                  {saving && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Permanent Deletion
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}