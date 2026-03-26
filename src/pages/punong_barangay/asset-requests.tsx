/**
 * Punong Barangay — Asset & resource requests (light/dark + premium dialog)
 */

import React, { useEffect, useState, useMemo } from "react"
import {
  Package,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  RefreshCw,
  Paperclip,
  Building2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "react-hot-toast"
import { useAuth } from "@/contexts/AuthContext"
import { ROLE_META } from "@/config/rbac"
import { cn } from "@/lib/utils"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type RequestRow = {
  id: string
  item: string
  status: string
  date: string
  priority: string
  notes: string
}

const OFFICE_NAME = "Barangay Secretariat"

function priorityBadge(priority: string) {
  switch (priority) {
    case "High":
      return <Badge variant="destructive" className="font-semibold">{priority}</Badge>
    case "Low":
      return <Badge variant="success" className="font-semibold">{priority}</Badge>
    default:
      return <Badge variant="warning" className="font-semibold">{priority}</Badge>
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "Pending":
      return <Badge variant="warning">{status}</Badge>
    case "Approved":
      return <Badge variant="success">{status}</Badge>
    case "Rejected":
      return <Badge variant="destructive">{status}</Badge>
    case "In Progress":
      return <Badge variant="info">{status}</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function PunongBarangayAssetRequestsPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [properties, setProperties] = useState<any[]>([])

  const [formItem, setFormItem] = useState("")
  const [formPropertyId, setFormPropertyId] = useState("")
  const [formPreviousCondition, setFormPreviousCondition] = useState("")
  const [formAcquiredOn, setFormAcquiredOn] = useState("")
  const [formRegisteredArea, setFormRegisteredArea] = useState("")
  const [formPriority, setFormPriority] = useState("Medium")
  const [formNotes, setFormNotes] = useState("")
  const [formFiles, setFormFiles] = useState<Record<string, File | null>>({
    letter: null,
    ra16: null,
    nr15: null,
  })

  const loadProperties = async () => {
    const { data: officeData, error: officeErr } = await supabase
      .from("government_office")
      .select("office_id")
      .eq("office_name", OFFICE_NAME)
      .maybeSingle()

    if (officeErr || !officeData) {
      console.error("Failed to load office for property filter", officeErr)
      setProperties([])
      return
    }

    const { data } = await supabase
      .from("property")
      .select("property_id, property_name, location, asset_condition, acquisition_date, area_size")
      .eq("managing_office", officeData.office_id)
      .order("property_name", { ascending: true })
    setProperties(data || [])
  }

  const load = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from("inventory_request")
      .select(
        `
                inventory_request_id,
                inventory_scope,
                status,
                date_requested,
                cycle_type,
                government_office!requesting_office ( office_name )
            `,
      )
      .order("date_requested", { ascending: false })

    if (error) {
      console.error(error)
      toast.error("Failed to load requests.")
      setIsLoading(false)
      return
    }

    const mapped: RequestRow[] = (data || [])
      .filter((r: any) => r.government_office?.office_name === OFFICE_NAME)
      .map((r: any) => ({
        id: r.inventory_request_id,
        item: r.inventory_scope || "General request",
        status: (() => {
          const s = r.status?.toLowerCase()
          if (s === "approved" || s === "completed") return "Approved"
          if (s === "rejected") return "Rejected"
          if (s === "in_progress") return "In Progress"
          return "Pending"
        })(),
        date: r.date_requested || "",
        priority: ["Low", "Medium", "High"].includes(r.cycle_type) ? r.cycle_type : "Medium",
        notes: "",
      }))

    setRequests(mapped)
    setIsLoading(false)
  }

  useEffect(() => {
    load()
    loadProperties()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return requests
    const q = search.toLowerCase()
    return requests.filter((r) => r.id.toLowerCase().includes(q) || r.item.toLowerCase().includes(q))
  }, [requests, search])

  const stats = useMemo(
    () => ({
      Pending: requests.filter((r) => r.status === "Pending").length,
      Approved: requests.filter((r) => r.status === "Approved").length,
      Rejected: requests.filter((r) => r.status === "Rejected").length,
    }),
    [requests],
  )

  const allowedFileTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ]

  const isValidFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    const allowedExtensions = ["pdf", "doc", "docx", "jpg", "jpeg", "png"]
    if (allowedFileTypes.includes(file.type)) return true
    if (allowedExtensions.includes(extension)) return true
    return false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formItem.trim()) {
      toast.error("Please enter an item or service.")
      return
    }
    if (!formPropertyId) {
      toast.error("Please select a target property.")
      return
    }

    if (!formFiles["ra16"] && !formFiles["nr15"]) {
      toast.error("Please attach either Land Assessment Form (RA-16) or Building / Structure Form (NR-15).")
      return
    }

    const filesToValidate = Object.entries(formFiles).filter(([, file]) => file)
    for (const [, file] of filesToValidate) {
      if (file && !isValidFile(file)) {
        toast.error("One or more attached files are not a permitted format. Allowed: PDF, DOC, DOCX, JPG, PNG.")
        return
      }
    }

    setSubmitting(true)

    const { data: officeData, error: officeErr } = await supabase
      .from("government_office")
      .select("office_id")
      .eq("office_name", OFFICE_NAME)
      .maybeSingle()

    if (officeErr || !officeData) {
      toast.error("Could not find office record.")
      setSubmitting(false)
      return
    }

    const today = new Date().toISOString().split("T")[0]
    const reqId = `REQ-BR-${Date.now()}`

    const attachedDocs = Object.entries(formFiles).filter(([, f]) => f !== null)
    const docLabel = attachedDocs
      .map(([k]) => (k === "letter" ? "Request Letter" : k === "ra16" ? "RA-16" : "NR-15"))
      .join(", ")

    const extraInfo = [
      formPreviousCondition && `Last Condition: ${formPreviousCondition}`,
      formAcquiredOn && `Acquired On: ${formAcquiredOn}`,
      formRegisteredArea && `Registered Area: ${formRegisteredArea}`,
    ]
      .filter(Boolean)
      .join(" | ")

    const scopeWithDocs =
      formItem.trim() +
      (docLabel ? ` [Docs: ${docLabel}]` : "") +
      (extraInfo ? ` [${extraInfo}]` : "") +
      (formNotes.trim() ? ` [Notes: ${formNotes.trim()}]` : "")

    const { error } = await supabase.from("inventory_request").insert({
      inventory_request_id: reqId,
      requesting_office: officeData.office_id,
      inventory_scope: scopeWithDocs,
      status: "pending",
      date_requested: today,
      cycle_type: formPriority,
      property_id: formPropertyId,
    })

    if (error) {
      console.error(error)
      toast.error("Failed to submit request: " + error.message)
    } else {
      const toBase64 = (file: File): Promise<string> =>
        new Promise((res, rej) => {
          const r = new FileReader()
          r.onload = () => res(r.result as string)
          r.onerror = rej
          r.readAsDataURL(file)
        })

      await Promise.all(
        attachedDocs.map(async ([key, file]) => {
          try {
            const dataUrl = await toBase64(file!)
            await supabase.from("digital_document").insert({
              document_id: `DOC-${reqId}-${key}`,
              document_type: `asset_request_${key}`,
              reference_no: reqId,
              date_created: today,
              status: "attached",
              created_by_office: officeData.office_id,
              received_by_employee: null,
              person_id: null,
              file_url: dataUrl,
            })
          } catch (err) {
            console.error("Failed to save doc:", err)
          }
        }),
      )
      toast.success("Request submitted to RMCD!")
      setShowModal(false)
      setFormItem("")
      setFormPropertyId("")
      setFormPreviousCondition("")
      setFormAcquiredOn("")
      setFormRegisteredArea("")
      setFormPriority("Medium")
      setFormNotes("")
      setFormFiles({ letter: null, ra16: null, nr15: null })
      load()
    }
    setSubmitting(false)
  }

  if (!user) return null
  const meta = ROLE_META[user.role]

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) animate-fade-in space-y-8 px-6 py-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Badge
            variant="outline"
            className="px-2 py-0.5"
            style={{ borderColor: meta.color, color: meta.color, backgroundColor: meta.bgColor }}
          >
            {meta.label}
          </Badge>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Asset &amp; Resource Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Submit and track maintenance or resource requests sent to FAMCD.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="shadow-sm" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Pending", value: stats.Pending, icon: Clock, tone: "text-amber-600 dark:text-amber-400" },
          { label: "Approved", value: stats.Approved, icon: CheckCircle, tone: "text-emerald-600 dark:text-emerald-400" },
          { label: "Rejected", value: stats.Rejected, icon: XCircle, tone: "text-red-600 dark:text-red-400" },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <Card key={i} className="border-border shadow-xs">
              <CardContent className="flex items-center gap-4 p-4">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/80 ring-1 ring-border/60",
                    stat.tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search request ID or item…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {search && (
          <Button variant="ghost" size="sm" onClick={() => setSearch("")}>
            <Filter className="mr-2 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      <Card className="overflow-hidden border-border shadow-xs">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Request ID</TableHead>
              <TableHead className="font-semibold">Item / Service</TableHead>
              <TableHead className="font-semibold">Date Requested</TableHead>
              <TableHead className="font-semibold">Priority</TableHead>
              <TableHead className="text-right font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                  Loading requests…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center text-muted-foreground">
                  No requests found. Use &quot;New Request&quot; to submit one.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((req) => (
                <TableRow key={req.id} className="hover:bg-muted/40">
                  <TableCell className="font-mono text-xs font-semibold text-primary">{req.id}</TableCell>
                  <TableCell className="max-w-[280px] truncate font-medium text-foreground">{req.item}</TableCell>
                  <TableCell className="text-muted-foreground">{req.date}</TableCell>
                  <TableCell>{priorityBadge(req.priority)}</TableCell>
                  <TableCell className="text-right">{statusBadge(req.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg w-[min(100vw-2rem,36rem)] p-0 overflow-hidden border-none bg-transparent shadow-none sm:max-w-xl">
          <div className="card-premium sidebar-scrollbar mx-auto max-h-[90vh] w-full animate-in zoom-in-95 duration-300 overflow-y-auto p-6 sm:p-8">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <Package className="h-6 w-6" />
              </div>
              <DialogTitle className="font-display text-2xl font-extrabold tracking-tight text-foreground">
                New Asset Request
              </DialogTitle>
              <DialogDescription className="font-medium text-muted-foreground">
                Submitting to FAMCD — Punong Barangay
              </DialogDescription>
            </DialogHeader>

            <div className="admin-box group relative mt-6 overflow-hidden">
              <Building2 className="absolute right-4 top-4 h-12 w-12 text-primary/10 transition-transform duration-500 group-hover:scale-110" />
              <div className="relative z-10 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary shadow-inner">
                  <Building2 className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                  Requesting office
                </span>
              </div>
              <p className="relative z-10 mt-2 px-1 text-sm font-extrabold leading-tight text-foreground">{OFFICE_NAME}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pb-item" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Item / service requested *
                </Label>
                <Input
                  id="pb-item"
                  required
                  placeholder="e.g. Community hall tables, floodlight repairs"
                  value={formItem}
                  onChange={(e) => setFormItem(e.target.value)}
                  className="rounded-xl border-border/40 bg-background/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pb-prop" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Target property *
                </Label>
                <select
                  id="pb-prop"
                  required
                  className="flex h-11 w-full rounded-xl border border-border/40 bg-background/50 px-4 py-2 text-sm font-medium shadow-sm outline-none transition-all focus:ring-2 focus:ring-primary/20"
                  value={formPropertyId}
                  onChange={(e) => {
                    const val = e.target.value
                    setFormPropertyId(val)
                    const selected = properties.find((p) => p.property_id === val)
                    setFormPreviousCondition(selected?.asset_condition || "")
                    setFormAcquiredOn(selected?.acquisition_date || "")
                    setFormRegisteredArea(selected?.area_size || "")
                  }}
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => (
                    <option key={p.property_id} value={p.property_id}>
                      {p.property_name} ({p.location || "No location"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Last known condition
                  </Label>
                  <select
                    className="flex h-11 w-full rounded-xl border border-border/40 bg-background/50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                    value={formPreviousCondition}
                    onChange={(e) => setFormPreviousCondition(e.target.value)}
                  >
                    <option value="">Select…</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                    <option value="Condemned / Beyond Repair">Condemned / Beyond Repair</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Acquired on</Label>
                  <Input
                    type="date"
                    value={formAcquiredOn}
                    onChange={(e) => setFormAcquiredOn(e.target.value)}
                    className="rounded-xl border-border/40 bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Registered area
                  </Label>
                  <Input
                    placeholder="e.g. 2,100 sqm"
                    value={formRegisteredArea}
                    onChange={(e) => setFormRegisteredArea(e.target.value)}
                    className="rounded-xl border-border/40 bg-background/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pb-pri" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Priority
                </Label>
                <select
                  id="pb-pri"
                  className="flex h-11 w-full rounded-xl border border-border/40 bg-background/50 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  value={formPriority}
                  onChange={(e) => setFormPriority(e.target.value)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pb-notes" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Notes (optional)
                </Label>
                <Textarea
                  id="pb-notes"
                  rows={3}
                  placeholder="Additional context for FAMCD…"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="resize-none rounded-xl border-border/40 bg-background/50"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Supporting documents{" "}
                  <span className="font-normal normal-case">(letter optional; RA-16 or NR-15 required)</span>
                </Label>
                <div className="space-y-2">
                  {[
                    { key: "letter", label: "Request Letter", hint: "QCG-GSD-FAIS-IRL" },
                    { key: "ra16", label: "Land Assessment Form", hint: "RA-16" },
                    { key: "nr15", label: "Building / Structure Form", hint: "NR-15" },
                  ].map((doc) => (
                    <div
                      key={doc.key}
                      className="flex items-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/20 p-2.5"
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">
                          {doc.label}{" "}
                          <span className="text-muted-foreground">({doc.hint})</span>
                        </p>
                        {formFiles[doc.key] ? (
                          <p className="truncate text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            ✓ {formFiles[doc.key]!.name}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">No file selected</p>
                        )}
                      </div>
                      <label className="shrink-0 cursor-pointer rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/15">
                        Browse
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            if (file && !isValidFile(file)) {
                              toast.error("Invalid file type. Supported: PDF, DOC, DOCX, JPG, PNG.")
                              return
                            }
                            setFormFiles((prev) => ({ ...prev, [doc.key]: file }))
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">Accepted: PDF, Word, JPG, PNG</p>
              </div>

              <DialogFooter className="mt-8 flex-col gap-2 border-t border-border/10 pt-6 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="h-11 rounded-xl font-bold uppercase tracking-widest" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="h-11 rounded-xl font-extrabold shadow-lg shadow-primary/15">
                  {submitting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Submit to FAMCD
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
