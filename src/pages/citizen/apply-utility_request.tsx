import React, { useState, useEffect } from "react";
import {
 Upload,
 CheckCircle,
 Loader2,
 AlertCircle,
 Droplets,
 AlertTriangle,
 MapPin,
 FileText,
 ChevronDown,
 ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { getCitizenPersonIdForSession } from "@/lib/citizenBpmIdentity";
import {
  BPM_PERSON_SELECT_MINIMAL,
  computePersonAddress,
  computePersonFullName,
  pickAddressFromProfile,
  profileDisplayName,
} from "@/lib/citizenProfileDisplay";
import {
 type ServiceCategory,
 type WaterSubtype,
 type LeakSubtype,
 UTILITY_REQUEST_TYPES,
 UTILITY_TICKET_TYPES,
 LEAK_TYPES,
 PROPERTY_TYPES,
 PRIORITY_MAP,
 resolveUtilityTicketMeta,
} from "@/config/utilityRequest";
import { BUCKET_UTILITY_DOCS, resolveUtilityDocumentViewUrls } from "@/lib/utilityRequestDocuments";

// ─── Requirements text & upload spec (from docs) — kept in this page only ───
const REQUIREMENTS_WATER_NO_EXISTING = {
 instruction: "Below are the initial documentary requirements. Other documents may be required based on agency recommendation. Kindly prepare these requirements.",
 privatelyOwned: [
 "Transfer Certificate of Title (TCT), Deed of Sale, or Contract to Sell (original and photocopy) covering the property where the water service connection will be installed",
 "Valid government-issued ID with three specimen signatures",
 "Tax Identification Number",
 ],
 openDepressed: [
 "Certification from the National Anti-Poverty Commission or any authorized government agency (e.g. NHA, Urban Poor Affairs Office — Certified True Copy, SHFC)",
 "Valid government-issued ID with three specimen signatures",
 "Tax Identification Number",
 ],
 note: "The water service connection (WSC) will be placed under the name of the owner. Application fee is between Php 10,723.08 and Php 10,757.07 (exclusive of guaranty deposit).",
} as const;

const REQUIREMENTS_WATER_ADDITIONAL_METER = {
 instruction: "Below are the initial documentary requirements. Other documents may be required. Kindly prepare these requirements or email them to the Business Area office.",
 privatelyOwned: [
 "Transfer Certificate of Title (TCT), Deed of Sale, or Contract to Sell (original and photocopy)",
 "Valid government-issued ID with three specimen signatures",
 "Tax Identification Number",
 "Latest Maynilad water bill of existing owner",
 "Permission to install additional meter, or authorization letter",
 ],
 openDepressed: [
 "Certification from NAPC or NHA/UPAO/SHFC (Certified True Copy)",
 "Valid government-issued ID with three specimen signatures",
 "Tax Identification Number",
 "Latest Maynilad water bill of existing owner",
 "Permission to install additional meter, or authorization letter",
 ],
 note: "Additional meter application fee is between Php 4,735.84 and Php 4,750.85 (estimate).",
} as const;

const REQUIREMENTS_LEAK_OWNER = {
 points: [
 "Type of leak (water meter / service pipe / street main)",
 "Full name of registered owner / applicant (account name as on SOA)",
 "Active mobile / Viber or landline number",
 "Exact address / location and nearest landmark",
 "Designated Business Area (e.g. South Quezon City)",
 ],
 canOptional: "Contract Account Number (CAN), 8-digit, optional.",
} as const;

const REQUIREMENTS_LEAK_REPRESENTATIVE = {
 points: [
 "Type of leak, Full name of registered owner, Your relationship, Your name as representative",
 "Active mobile / Viber or landline, Exact address, Business Area",
 ],
 authorizationNote:
 "If you are transacting on behalf of the registered owner, the agency may require a Customer Authorization Form signed by the registered owner. Please upload valid IDs: at least one each for the registered owner and the authorized representative.",
 canOptional: "Contract Account Number (CAN), 8-digit, optional.",
} as const;

const REQUIREMENTS_DRAINAGE = {
 subtitle: "Road, Drainage, and Bridges Maintenance Division — Declogging, desilting, manhole cover, sidewalk/curb/gutter/inlet repair",
 checklist: ["Name of requestor", "Exact location of reported area/site involved", "Contact number", "Photos"],
 instruction: "Submit a letter-request with the above information through:",
 submitChannels: [
 "Official email: engineering@quezoncity.gov.ph",
 "Department Facebook / Viber Community / Walk-in",
 ],
 note: "Fees: None. Processing time: up to 23 days.",
} as const;

const LEAK_RELATIONSHIP_OPTIONS = [
 { id: "children_relative", label: "Children / Relative" },
 { id: "tenant", label: "Tenant" },
 { id: "authorized_rep", label: "Authorized representative" },
 { id: "other", label: "Other" },
] as const;

const LEAK_BUSINESS_AREAS = [
 { id: "south_qc", label: "South Quezon City" },
 { id: "north_qc", label: "North Quezon City" },
 { id: "other", label: "Other" },
] as const;

/** Upload requirement spec per request type. requirement_key is used in DB and storage path. */
function getRequirementUploadSpec(
 category: ServiceCategory,
 waterSubtype?: WaterSubtype,
 propertyType?: string,
 leakSubtype?: LeakSubtype
): { key: string; label: string; required: boolean }[] {
 if (category === "water_connection") {
 const isPrivate = propertyType !== "open_depressed";
 const base = isPrivate
  ? [
   { key: "tct_deed_contract", label: "TCT / Deed of Sale / Contract to Sell (photo or PDF)", required: true },
   { key: "govt_id", label: "Valid government-issued ID (3 specimen signatures)", required: true },
   { key: "tin", label: "Tax Identification Number (document or photo)", required: false },
  ]
  : [
   { key: "certification_napc", label: "Certification (NAPC/NHA/UPAO/SHFC)", required: true },
   { key: "govt_id", label: "Valid government-issued ID (3 specimen signatures)", required: true },
   { key: "tin", label: "Tax Identification Number (document or photo)", required: false },
  ];
 if (waterSubtype === "additional_meter") {
  return [
  ...base,
  { key: "latest_bill", label: "Latest water bill of existing owner", required: true },
  { key: "permission_letter", label: "Permission to install additional meter / authorization letter", required: true },
  ];
 }
 return base;
 }
 if (category === "leak_report" && leakSubtype === "representative") {
 return [
  { key: "authorization_form", label: "Customer Authorization Form (signed by owner)", required: true },
  { key: "id_owner", label: "Valid ID of registered owner", required: true },
  { key: "id_representative", label: "Valid ID of authorized representative", required: true },
 ];
 }
 if (category === "drainage") {
 return [{ key: "photos", label: "Photos of site / location (at least one)", required: true }];
 }
 return [];
}

function generateTicketId(): string {
 const y = new Date().getFullYear();
 const n = String(Date.now()).slice(-6);
 return `ST-${y}-${n}`;
}

function generateWaterRequestId(): string {
 return `WCR-${String(Date.now()).slice(-8)}`;
}
function generateLeakReportId(): string {
 return `LR-${String(Date.now()).slice(-8)}`;
}
function generateDrainageRequestId(): string {
 return `DR-${String(Date.now()).slice(-8)}`;
}

type FormState = {
 // Common
 full_name: string;
 contact_number: string;
 email: string;
 address: string;
 description: string;
 consent: boolean;
 requirements_confirmed: boolean;
 // Water
 category: ServiceCategory;
 water_subtype?: WaterSubtype;
 property_type: string;
 existing_account_ref: string;
 latest_bill_ref: string;
 permission_note: string;
 // Leak
 leak_subtype?: LeakSubtype;
 leak_type: string;
 severity: string;
 owner_name: string;
 relationship: string;
 representative_name: string;
 contract_account_number: string;
 business_area: string;
 // Drainage
 issue_description: string;
};

/** Key = requirement_key, value = list of files (e.g. multiple for photos) */
type UploadsState = Record<string, File[]>;

const initialForm: FormState = {
 full_name: "",
 contact_number: "",
 email: "",
 address: "",
 description: "",
 consent: false,
 requirements_confirmed: false,
 category: "water_connection",
 water_subtype: "no_existing_water",
 property_type: "residential",
 existing_account_ref: "",
 latest_bill_ref: "",
 permission_note: "",
 leak_subtype: "owner",
 leak_type: "",
 severity: "medium",
 owner_name: "",
 relationship: "",
 representative_name: "",
 contract_account_number: "",
 business_area: "south_qc",
 issue_description: "",
};

const DRAINAGE_ISSUE_PRESETS = [
 "Declogging / blocked drainage line",
 "Desilting / silt buildup",
 "Damaged or missing manhole cover",
 "Sidewalk / curb / gutter repair",
 "Inlet / catch basin repair",
 "Flooding after rain (standing water)",
 "Foul odor from drain",
] as const;

type Step = 1 | 2 | 3;

export default function ApplyUtilityRequestPage() {
 const { user } = useAuth();
 const [profileMergeKey, setProfileMergeKey] = useState(0);
 const [drainageQuickKey, setDrainageQuickKey] = useState(0);
 const [step, setStep] = useState<Step>(1);
 const [submitting, setSubmitting] = useState(false);
 const [submitted, setSubmitted] = useState(false);
 const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
 const [requirementsOpen, setRequirementsOpen] = useState(true);
 const [uploads, setUploads] = useState<UploadsState>({});
 const [form, setForm] = useState<FormState>(() => ({
 ...initialForm,
 full_name: user?.full_name ?? "",
 }));

 const setUpload = (key: string, files: FileList | null) => {
 if (!files?.length) {
  setUploads((prev) => {
  const next = { ...prev };
  delete next[key];
  return next;
  });
  return;
 }
 setUploads((prev) => ({ ...prev, [key]: Array.from(files) }));
 };

 const update = (k: keyof FormState, v: string | boolean) =>
 setForm((prev) => ({ ...prev, [k]: v }));

 useEffect(() => {
  if (!user?.is_citizen) return;
  let cancelled = false;
  const key = profileMergeKey;
  void (async () => {
   const pid = await getCitizenPersonIdForSession(supabase, user);
   if (!pid || cancelled) return;
   const { data, error } = await supabase
    .from("person")
    .select(BPM_PERSON_SELECT_MINIMAL)
    .eq("person_id", pid)
    .maybeSingle();
   if (cancelled || error || !data || key !== profileMergeKey) return;
   const row = data as unknown as Record<string, unknown>;
   const full =
    (typeof row.full_name === "string" && row.full_name.trim()) ||
    computePersonFullName(row) ||
    profileDisplayName(row, user.email ?? "");
   const contact =
    typeof row.contact_number === "string" && row.contact_number.trim()
     ? row.contact_number.trim()
     : "";
   const emailFill = (user.email ?? "").trim();
   const addr =
    (typeof row.address === "string" && row.address.trim()) ||
    computePersonAddress(row) ||
    pickAddressFromProfile(row);
   setForm((prev) => ({
    ...prev,
    full_name: prev.full_name.trim() || full,
    contact_number: prev.contact_number.trim() || contact,
    email: prev.email.trim() || emailFill,
    address: prev.address.trim() || addr,
   }));
  })();
  return () => {
   cancelled = true;
  };
 }, [user, profileMergeKey]);

 const setCategory = (category: ServiceCategory) => {
 setForm((prev) => {
  const nextLeakSubtype = category === "leak_report" ? "owner" : undefined;
  return {
   ...prev,
   category,
   water_subtype: category === "water_connection" ? "no_existing_water" : undefined,
   leak_subtype: nextLeakSubtype,
   owner_name:
    category === "leak_report" &&
    nextLeakSubtype === "owner" &&
    !prev.owner_name.trim()
     ? prev.full_name
     : prev.owner_name,
  };
 });
 };

 const buildDescription = (): string => {
 const parts: string[] = [];
 if (form.description) parts.push(form.description);
 if (form.category === "water_connection") {
  const sub = form.water_subtype === "additional_meter" ? "Additional meter" : "No existing water";
  parts.unshift(`[${sub}]`);
  if (form.water_subtype === "additional_meter") {
  if (form.existing_account_ref) parts.push(`Account ref: ${form.existing_account_ref}`);
  if (form.permission_note) parts.push(`Permission: ${form.permission_note}`);
  }
 }
 if (form.category === "leak_report") {
  const sub = form.leak_subtype === "representative" ? "Reported by representative" : "Reported by owner";
  parts.unshift(`[${sub}]`);
  if (form.leak_type) parts.push(`Leak type: ${form.leak_type}`);
  if (form.owner_name) parts.push(`Account owner: ${form.owner_name}`);
  if (form.contract_account_number) parts.push(`CAN: ${form.contract_account_number}`);
  const bizLabel = LEAK_BUSINESS_AREAS.find((b) => b.id === form.business_area)?.label ?? form.business_area;
  if (form.business_area) parts.push(`Business area: ${bizLabel}`);
  if (form.leak_subtype === "representative" && form.representative_name) parts.push(`Representative: ${form.representative_name}`);
 }
 if (form.category === "drainage" && form.issue_description) parts.unshift(form.issue_description);
 return parts.join(" ");
 };

 const getPriority = (): "low" | "medium" | "high" | "critical" => {
 if (form.category === "leak_report") {
  const p = PRIORITY_MAP[form.severity] ?? "medium";
  return form.severity === "high" || form.severity === "critical" ? "high" : p;
 }
 return "medium";
 };

 const computeTicketType = (): string => {
 if (form.category === "water_connection") {
  return form.water_subtype === "additional_meter"
  ? "water_connection:additional_meter"
  : "water_connection:new";
 }
 if (form.category === "leak_report") {
  return form.leak_subtype === "representative" ? "leak:representative" : "leak:owner";
 }
 return "drainage";
 };

 const validate = (): string | null => {
 if (!form.full_name?.trim()) return "Full name is required.";
 if (!form.contact_number?.trim()) return "Contact number is required.";
 if (!form.address?.trim()) return "Address / location is required.";
 if (!form.consent) return "You must agree to the data privacy notice.";
 if (form.category === "water_connection") {
  if (!form.requirements_confirmed) return "You must confirm that you will prepare the required documents.";
  if (form.water_subtype === "additional_meter" && !form.existing_account_ref?.trim())
  return "Existing account reference is required for additional meter.";
 }
 if (form.category === "leak_report") {
  if (!form.leak_type) return "Please select type of leak.";
  if (!form.owner_name?.trim()) return "Full name of registered owner / applicant is required.";
  const can = form.contract_account_number?.trim().replace(/\D/g, "");
  if (can && (can.length !== 8 || parseInt(can, 10) > 90000000))
  return "Contract Account Number (CAN) must be 8 digits and ≤ 90000000.";
  if (form.leak_subtype === "representative") {
  if (!form.relationship?.trim()) return "Relationship to owner is required.";
  if (!form.representative_name?.trim()) return "Your name (representative) is required.";
  }
 }
 if (form.category === "drainage" && !form.issue_description?.trim())
  return "Issue description is required for drainage requests.";
 const uploadSpec = getRequirementUploadSpec(
  form.category,
  form.water_subtype,
  form.property_type,
  form.leak_subtype
 );
 for (const spec of uploadSpec) {
  if (!spec.required) continue;
  const files = uploads[spec.key];
  if (!files?.length) return `Please upload: ${spec.label}`;
 }
 return null;
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!user?.id) {
  toast.error("You must be logged in to submit.");
  return;
 }
 const err = validate();
 if (err) {
  toast.error(err);
  return;
 }
 setSubmitting(true);
 try {
  const personId = user.is_citizen ? await getCitizenPersonIdForSession(supabase, user) : null;
  if (user.is_citizen && !personId) {
   toast.error("Could not link your citizen profile (person_id). Sign out and sign in again.");
   return;
  }

  const ticketId = generateTicketId();
  const description = buildDescription();
  const priority = getPriority();
  const ticketType = computeTicketType();

  const { error: ticketErr } = await supabase.from("service_tickets").insert({
  ticket_id: ticketId,
  ticket_type: ticketType,
  requester_name: form.full_name.trim(),
  requester_contact: form.contact_number.trim(),
  description: description || "No description provided.",
  location: form.address.trim(),
  priority,
  status: "submitted",
  person_id: personId,
  });
  if (ticketErr) throw ticketErr;

  if (form.category === "water_connection") {
  const waterRequestId = generateWaterRequestId();
  await supabase.from("water_connection_request").insert({
   water_request_id: waterRequestId,
   ticket_id: ticketId,
   person_id: personId,
   property_type: form.property_type,
   status: "pending",
  });
  } else if (form.category === "leak_report") {
  const leakReportId = generateLeakReportId();
  await supabase.from("leak_report").insert({
   leak_report_id: leakReportId,
   ticket_id: ticketId,
   person_id: personId,
   urgency_classification: form.severity === "high" || form.severity === "critical" ? "high" : "medium",
   status: "open",
  });
  } else if (form.category === "drainage") {
  const drainageRequestId = generateDrainageRequestId();
  await supabase.from("drainage_request").insert({
   drainage_request_id: drainageRequestId,
   ticket_id: ticketId,
   person_id: personId,
   issue_description: form.issue_description.trim(),
   date_reported: new Date().toISOString().split("T")[0],
   status: "open",
  });
  }

  await supabase.from("notification_log").insert({
  notif_id: `NLOG-${Date.now()}`,
  account_id: user.id,
  module_reference: "utility",
  reference_id: ticketId,
  notif_type: "ticket_received",
  message: `Your utility request ${ticketId} has been received and is pending review.`,
  });

  const uploadSpec = getRequirementUploadSpec(
  form.category,
  form.water_subtype,
  form.property_type,
  form.leak_subtype
  );
  for (const spec of uploadSpec) {
  const files = uploads[spec.key];
  if (!files?.length) continue;
  for (let i = 0; i < files.length; i++) {
   const file = files[i];
   const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
   const path = `${ticketId}/${spec.key}/${Date.now()}-${i}-${safeName}`;
   const { error: upErr } = await supabase.storage.from(BUCKET_UTILITY_DOCS).upload(path, file, { upsert: true });
   if (upErr) {
   console.warn("Storage upload failed for " + spec.key, upErr);
   // Do not insert a DB row with an empty file_url — that confuses Helpdesk ("Upload failed — empty URL").
   toast.error(`Could not upload ${spec.label}: ${upErr.message}`);
   continue;
   }
   const { data: urlData } = supabase.storage.from(BUCKET_UTILITY_DOCS).getPublicUrl(path);
   const publicUrl = urlData.publicUrl ?? "";
   const docId = `URD-${ticketId}-${spec.key}-${i}-${Date.now()}`;
   const rowWithPath = {
    id: docId,
    ticket_id: ticketId,
    requirement_key: spec.key,
    file_name: file.name,
    file_url: publicUrl,
    storage_object_path: path,
   };
   const rowLegacy = {
    id: docId,
    ticket_id: ticketId,
    requirement_key: spec.key,
    file_name: file.name,
    file_url: publicUrl,
   };
   async function insertDoc(payload: typeof rowWithPath | typeof rowLegacy) {
    return (await supabase.from("utility_request_document").insert(payload as Record<string, unknown>)).error;
   }
   let insErr = await insertDoc(rowWithPath);
   if (insErr && /storage_object_path|column/i.test(insErr.message)) {
    insErr = await insertDoc(rowLegacy);
   }
   if (insErr) {
   console.error("utility_request_document insert failed (retrying once)", insErr);
   insErr = await insertDoc({ ...rowWithPath, id: `${docId}-r` });
   if (insErr && /storage_object_path|column/i.test(insErr.message)) {
    insErr = await insertDoc({ ...rowLegacy, id: `${docId}-r` });
   }
   }
   if (insErr) {
   console.error("utility_request_document insert failed after retry", insErr);
   toast.error(
    `File uploaded to storage but the document record could not be saved. Run sql/add_utility_request_document_storage_path.sql — object path: ${path}`,
   );
   }
  }
  }

  setSubmittedTicketId(ticketId);
  setSubmitted(true);
  setUploads({});
  toast.success("Request submitted successfully.");
 } catch (e: unknown) {
  const msg = e instanceof Error ? e.message : "Failed to submit request.";
  toast.error(msg);
 } finally {
  setSubmitting(false);
 }
 };

 if (submitted) {
 return (
  <div className="px-4 py-6 sm:px-6 flex items-center justify-center min-h-[80vh] animate-fade-in">
  <div className="text-center max-w-sm bg-card border border-border-subtle rounded-2xl px-6 py-8 shadow-md">
   <div className="w-14 h-14 rounded-full bg-state-success-soft border border-state-success/40 flex items-center justify-center mx-auto mb-4">
   <CheckCircle size={26} className="text-state-success" />
   </div>
   <h2 className="font-display font-bold text-2xl text-foreground mb-2">
   Request submitted
   </h2>
   {submittedTicketId && (
   <p className="text-primary font-mono text-sm mb-2">
    Reference: {submittedTicketId}
   </p>
   )}
   <p className="text-sm text-muted-foreground mb-6">
   Your utility request has been routed to the Utility Helpdesk. You can track it under My Applications.
   </p>
   <button
   className="btn-primary mx-auto"
   onClick={() => {
    setSubmitted(false);
    setSubmittedTicketId(null);
    setStep(1);
    setUploads({});
    setProfileMergeKey((k) => k + 1);
    setDrainageQuickKey((k) => k + 1);
    setForm({ ...initialForm, full_name: user?.full_name ?? "" });
   }}
   >
   Submit another request
   </button>
  </div>
  </div>
 );
 }

 const categoryConfig = UTILITY_REQUEST_TYPES[form.category];
 const isWater = form.category === "water_connection";
 const isLeak = form.category === "leak_report";
 const isDrainage = form.category === "drainage";

 const canProceedStep1 = form.full_name?.trim() && form.contact_number?.trim() && form.address?.trim();

 return (
 <div className="px-4 py-6 sm:px-6 lg:px-8 animate-fade-in pb-12">
  <header className="mb-8">
  <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
   Utility service request
  </h1>
  <p className="text-sm mt-1.5 text-muted-foreground">
   Water connection, leak reports, and drainage — complete each step to submit your request.
  </p>
  </header>

  {/* Step progress */}
  <nav
  className="flex items-stretch gap-0 mb-8 rounded-xl border border-border-subtle bg-card p-1"
  aria-label="Application steps"
  >
  {([1, 2, 3] as const).map((s) => {
   const isActive = step === s
   const isComplete = step > s
   return (
   <button
    key={s}
    type="button"
    onClick={() => step > s && setStep(s)}
    className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg text-sm font-medium transition-all ${
    isActive
     ? "bg-primary text-primary-foreground shadow-sm"
     : isComplete
     ? "bg-muted text-foreground"
     : "bg-transparent text-muted-foreground"
    }`}
   >
    {isComplete ? (
    <CheckCircle size={16} className="shrink-0" />
    ) : (
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-border-subtle">
     {s}
    </span>
    )}
    <span className="hidden sm:inline text-left">
    {s === 1 ? "Type & your info" : s === 2 ? "Request details" : "Documents & submit"}
    </span>
   </button>
   )
  })}
  </nav>

  <div className="rounded-2xl border border-border-subtle bg-card shadow-sm overflow-hidden">
  <div className="p-6 sm:p-8">
  {/* ── Step 1: Request type, requirements, your info ── */}
  {step === 1 && (
   <div className="space-y-6 animate-fade-in">
   <div>
    <h2 className="text-lg font-semibold text-foreground mb-1">
    Step 1 — Request type & your information
    </h2>
    <p className="text-sm text-muted-foreground">
    Choose the type of request and enter your contact details.
    </p>
   </div>

   <section className="space-y-3">
    <label className="block text-sm font-medium text-foreground">
    Request type <span className="text-destructive">*</span>
    </label>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {[
     { id: "water_connection" as const, icon: Droplets, label: "New Water Supply", desc: "Apply for water connection" },
     { id: "leak_report" as const, icon: AlertTriangle, label: "Report a Leak", desc: "Report a pipe leak" },
     { id: "drainage" as const, icon: MapPin, label: "Drainage", desc: "Declogging or repair" },
    ].map(({ id, icon: Icon, label, desc }) => {
     const active = form.category === id;
     return (
     <button
      key={id}
      type="button"
      onClick={() => setCategory(id)}
      className={`p-3 text-left rounded-xl border transition-all ${
      active
       ? "border-primary bg-primary/5"
       : "border-border-subtle bg-background"
      }`}
     >
      <Icon
      size={18}
      className={`mb-2 ${active ? "text-primary" : "text-muted-foreground"}`}
      />
      <div
      className={`font-semibold text-sm mb-0.5 ${
       active ? "text-foreground" : "text-foreground"
      }`}
      >
      {label}
      </div>
      <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
     </button>
     );
    })}
    </div>
   </section>

   {isWater && categoryConfig.subtypes.length > 0 && (
    <section className="space-y-2">
    <label className="block text-sm font-medium text-foreground">Water application</label>
    <div className="flex gap-3">
     {categoryConfig.subtypes.map((sub) => (
     <button
      key={sub.id}
      type="button"
      onClick={() => update("water_subtype", sub.id)}
      className={`px-3 py-2 rounded-lg text-sm border ${
      form.water_subtype === sub.id
       ? "bg-primary/10 border-primary text-primary"
       : "border-border-subtle text-muted-foreground"
      }`}
     >
      {sub.label}
     </button>
     ))}
    </div>
    </section>
   )}

   {isLeak && categoryConfig.subtypes.length > 0 && (
    <section className="space-y-2">
    <label className="block text-sm font-medium text-foreground">
     Are you the account owner?
    </label>
    <div className="flex gap-3">
     {categoryConfig.subtypes.map((sub) => (
     <button
      key={sub.id}
      type="button"
      onClick={() =>
      setForm((prev) => ({
       ...prev,
       leak_subtype: sub.id as LeakSubtype,
       owner_name:
        sub.id === "owner" && !prev.owner_name.trim() ? prev.full_name : prev.owner_name,
      }))
      }
      className={`px-3 py-2 rounded-lg text-sm border ${
      form.leak_subtype === sub.id
       ? "bg-primary/10 border-primary text-primary"
       : "border-border-subtle text-muted-foreground"
      }`}
     >
      {sub.label}
     </button>
     ))}
    </div>
    </section>
   )}

   {/* Requirements to prepare (collapsible) */}
   <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
    <button
    type="button"
    onClick={() => setRequirementsOpen((o) => !o)}
    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-amber-500/10 transition-colors"
    >
    <FileText size={18} className="text-amber-500 shrink-0" />
    <span className="text-sm font-semibold text-foreground">
     Requirements you need to prepare
    </span>
    {requirementsOpen ? (
     <ChevronDown size={18} className="ml-auto text-muted-foreground" />
    ) : (
     <ChevronRight size={18} className="ml-auto text-muted-foreground" />
    )}
    </button>
    {requirementsOpen && (
    <div className="px-4 pb-4 pt-0 space-y-3 border-t border-slate-700/50">
     {isWater && (form.water_subtype === "no_existing_water" ? (
     <>
      <p className="text-sm text-muted-foreground leading-relaxed">
      {REQUIREMENTS_WATER_NO_EXISTING.instruction}
      </p>
      <div className="text-sm text-foreground space-y-3">
      <div>
       <p className="font-medium text-foreground mb-1">Privately owned property</p>
       <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
       {REQUIREMENTS_WATER_NO_EXISTING.privatelyOwned.map((item, i) => (
        <li key={i}>{item}</li>
       ))}
       </ul>
      </div>
      <div>
       <p className="font-medium text-foreground mb-1">Open / depressed communities</p>
       <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
       {REQUIREMENTS_WATER_NO_EXISTING.openDepressed.map((item, i) => (
        <li key={i}>{item}</li>
       ))}
       </ul>
      </div>
      </div>
      <p className="text-sm text-muted-foreground italic">
      {REQUIREMENTS_WATER_NO_EXISTING.note}
      </p>
     </>
     ) : (
     <>
      <p className="text-sm text-muted-foreground leading-relaxed">
      {REQUIREMENTS_WATER_ADDITIONAL_METER.instruction}
      </p>
      <div className="text-sm text-foreground space-y-3">
      <div>
       <p className="font-medium text-foreground mb-1">Privately owned property</p>
       <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
       {REQUIREMENTS_WATER_ADDITIONAL_METER.privatelyOwned.map((item, i) => (
        <li key={i}>{item}</li>
       ))}
       </ul>
      </div>
      <div>
       <p className="font-medium text-foreground mb-1">Open / depressed communities</p>
       <ul className="list-disc list-inside space-y-1 text-muted-foreground leading-relaxed">
       {REQUIREMENTS_WATER_ADDITIONAL_METER.openDepressed.map((item, i) => (
        <li key={i}>{item}</li>
       ))}
       </ul>
      </div>
      </div>
      <p className="text-sm text-muted-foreground italic">
      {REQUIREMENTS_WATER_ADDITIONAL_METER.note}
      </p>
     </>
     ))}
     {isLeak && (form.leak_subtype === "representative" ? (
     <>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 leading-relaxed">
      {REQUIREMENTS_LEAK_REPRESENTATIVE.points.map((p, i) => (
       <li key={i}>{p}</li>
      ))}
      </ul>
      <p className="text-sm text-amber-800 bg-amber-100 rounded-lg p-3 border border-amber-300">
      {REQUIREMENTS_LEAK_REPRESENTATIVE.authorizationNote}
      </p>
      <p className="text-sm text-muted-foreground">
      {REQUIREMENTS_LEAK_REPRESENTATIVE.canOptional}
      </p>
     </>
     ) : (
     <>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 leading-relaxed">
      {REQUIREMENTS_LEAK_OWNER.points.map((p, i) => (
       <li key={i}>{p}</li>
      ))}
      </ul>
      <p className="text-sm text-muted-foreground">
      {REQUIREMENTS_LEAK_OWNER.canOptional}
      </p>
     </>
     ))}
     {isDrainage && (
     <>
      <p className="text-sm font-medium text-foreground">
      {REQUIREMENTS_DRAINAGE.subtitle}
      </p>
      <p className="text-sm text-muted-foreground">Letter-request must include:</p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 leading-relaxed">
      {REQUIREMENTS_DRAINAGE.checklist.map((c, i) => (
       <li key={i}>{c}</li>
      ))}
      </ul>
      <p className="text-sm text-muted-foreground mt-2">
      {REQUIREMENTS_DRAINAGE.instruction}
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
      {REQUIREMENTS_DRAINAGE.submitChannels.map((ch, i) => (
       <li key={i}>{ch}</li>
      ))}
      </ul>
      <p className="text-sm text-muted-foreground italic">
      {REQUIREMENTS_DRAINAGE.note}
      </p>
     </>
     )}
    </div>
    )}
   </section>

   <section className="pt-2 border-t border-border-subtle">
    <h3 className="text-sm font-medium text-foreground mb-3">
    Your information
    </h3>
    <div className="space-y-4">
    {[
     { key: "full_name" as const, label: "Full name", placeholder: "Enter your full name", type: "text", required: true },
     { key: "contact_number" as const, label: "Contact number", placeholder: "09xxxxxxxxx", type: "tel", required: true },
     { key: "email" as const, label: "Email", placeholder: "email@example.com (optional)", type: "email", required: false },
     { key: "address" as const, label: isLeak ? "Exact address / location of leak" : "Service address / location", placeholder: "Street, barangay, city or nearest landmark", type: "textarea", required: true },
    ].map((f) => (
     <div key={f.key}>
     <label className="block text-sm font-medium text-foreground mb-1.5">
      {f.label} {f.required && <span className="text-destructive">*</span>}
     </label>
     {f.type === "textarea" ? (
      <textarea
      className="input-field w-full rounded-lg"
      rows={2}
      placeholder={f.placeholder}
      value={form[f.key]}
      onChange={(e) => update(f.key, e.target.value)}
      required={f.required}
      />
     ) : (
      <input
      type={f.type}
      className="input-field w-full rounded-lg"
      placeholder={f.placeholder}
      value={form[f.key]}
      onChange={(e) => update(f.key, e.target.value)}
      required={f.required}
      />
     )}
     </div>
    ))}
    </div>
   </section>

   <div className="flex justify-end pt-2">
    <button
    type="button"
    className="btn-primary px-6 py-2.5 rounded-lg font-medium"
    onClick={() => setStep(2)}
    disabled={!canProceedStep1}
    >
    Next: Request details →
    </button>
   </div>
   </div>
  )}

  {/* ── Step 2: Request details (type-specific) ── */}
  {step === 2 && (
   <div className="space-y-6 animate-fade-in">
   <div>
    <h2 className="text-lg font-semibold text-foreground">
    Step 2 — Request details
    </h2>
    <p className="text-sm text-muted-foreground mt-1">
    Provide specifics for your {categoryConfig?.label ?? form.category} request.
    </p>
   </div>

   {isWater && (
    <section className="space-y-4">
    <h3 className="text-sm font-medium text-foreground">
     Property & account
    </h3>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Property type <span className="text-destructive">*</span>
     </label>
     <select
     className="input-field w-full rounded-lg"
     value={form.property_type}
     onChange={(e) => update("property_type", e.target.value)}
     required
     >
     {PROPERTY_TYPES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
     <option value="open_depressed">Open / depressed community</option>
     </select>
    </div>
    {form.water_subtype === "additional_meter" && (
     <div className="space-y-4 pt-2 border-t border-border-subtle">
     <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      Existing account number / reference{" "}
      <span className="text-destructive">*</span>
      </label>
      <input
      type="text"
      className="input-field w-full rounded-lg"
      placeholder="Account number or reference"
      value={form.existing_account_ref}
      onChange={(e) => update("existing_account_ref", e.target.value)}
      />
     </div>
     <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      Latest bill reference (optional)
      </label>
      <input
      type="text"
      className="input-field w-full rounded-lg"
      placeholder="e.g. bill number"
      value={form.latest_bill_ref}
      onChange={(e) => update("latest_bill_ref", e.target.value)}
      />
     </div>
     <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      Permission / authorization note
      </label>
      <input
      type="text"
      className="input-field w-full rounded-lg"
      placeholder="e.g. permission to install additional meter"
      value={form.permission_note}
      onChange={(e) => update("permission_note", e.target.value)}
      />
     </div>
     </div>
    )}
    </section>
   )}

   {isLeak && (
    <section className="space-y-4">
    <h3 className="text-sm font-medium text-foreground">
     Leak information
    </h3>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Type of leak <span className="text-destructive">*</span>
     </label>
     <select
     className="input-field w-full rounded-lg"
     value={form.leak_type}
     onChange={(e) => update("leak_type", e.target.value)}
     required
     >
     <option value="">Select...</option>
     {LEAK_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
     </select>
    </div>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Contract Account Number (CAN) — optional
     </label>
     <input
     type="text"
     className="input-field w-full rounded-lg"
     placeholder="8-digit CAN (e.g. 12345678)"
     maxLength={8}
     value={form.contract_account_number}
     onChange={(e) => {
      const v = e.target.value.replace(/\D/g, "").slice(0, 8)
      update("contract_account_number", v)
     }}
     />
     <p className="text-xs text-muted-foreground mt-1">
     Must be ≤ 90000000 if provided.
     </p>
    </div>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Full name of registered owner / applicant{" "}
     <span className="text-destructive">*</span>
     </label>
     <input
     type="text"
     className="input-field w-full rounded-lg"
     placeholder="Account name as on SOA"
     value={form.owner_name}
     onChange={(e) => update("owner_name", e.target.value)}
     />
    </div>
    {form.leak_subtype === "representative" && (
     <div className="space-y-4 pt-2 border-t border-border-subtle">
     <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      Relationship to owner <span className="text-destructive">*</span>
      </label>
      <select
      className="input-field w-full rounded-lg"
      value={form.relationship}
      onChange={(e) => update("relationship", e.target.value)}
      required
      >
      <option value="">Select...</option>
      {LEAK_RELATIONSHIP_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
     </div>
     <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      Your name (contact person / representative){" "}
      <span className="text-destructive">*</span>
      </label>
      <input
      type="text"
      className="input-field w-full rounded-lg"
      placeholder="Your full name"
      value={form.representative_name}
      onChange={(e) => update("representative_name", e.target.value)}
      />
     </div>
     </div>
    )}
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Business area <span className="text-destructive">*</span>
     </label>
     <select
     className="input-field w-full rounded-lg"
     value={form.business_area}
     onChange={(e) => update("business_area", e.target.value)}
     >
     {LEAK_BUSINESS_AREAS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
     </select>
    </div>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Severity
     </label>
     <select
     className="input-field w-full rounded-lg"
     value={form.severity}
     onChange={(e) => update("severity", e.target.value)}
     >
     <option value="low">Low (Minor drip or small puddle)</option>
     <option value="medium">Medium (Steady stream or pooling)</option>
     <option value="high">High (Geyser, flooding, road hazard)</option>
     <option value="critical">Critical / Emergency</option>
     </select>
    </div>
    </section>
   )}

   {isDrainage && (
    <section className="space-y-4">
    <h3 className="text-sm font-medium text-foreground">
     Drainage issue
    </h3>
    <div>
     <label className="block text-sm font-medium text-foreground mb-1.5">
     Issue description <span className="text-destructive">*</span>
     </label>
     <select
     key={drainageQuickKey}
     className="input-field w-full rounded-lg mb-2"
     defaultValue=""
     onChange={(e) => {
      const v = e.target.value;
      if (v) {
       update("issue_description", v);
       setDrainageQuickKey((k) => k + 1);
      }
     }}
     aria-label="Quick-fill drainage issue template"
     >
     <option value="">Quick-fill common issue (optional)…</option>
     {DRAINAGE_ISSUE_PRESETS.map((p) => (
      <option key={p} value={p}>
       {p}
      </option>
     ))}
     </select>
     <textarea
     className="input-field w-full rounded-lg"
     rows={3}
     placeholder="Describe the drainage issue (declogging, desilting, repair…) — editable after quick-fill"
     value={form.issue_description}
     onChange={(e) => update("issue_description", e.target.value)}
     required
     />
    </div>
    </section>
   )}

   <section className="pt-2 border-t border-border-subtle">
    <label className="block text-sm font-medium text-foreground mb-1.5">
    Additional details
    </label>
    <textarea
    className="input-field w-full rounded-lg"
    rows={2}
    placeholder="Any other information..."
    value={form.description}
    onChange={(e) => update("description", e.target.value)}
    />
   </section>

   <div className="flex justify-between gap-3 pt-2">
    <button
    type="button"
    className="btn-secondary px-5 py-2.5 rounded-lg font-medium"
    onClick={() => setStep(1)}
    >
    ← Back
    </button>
    <button
    type="button"
    className="btn-primary px-6 py-2.5 rounded-lg font-medium"
    onClick={() => setStep(3)}
    >
    Next: Documents & submit →
    </button>
   </div>
   </div>
  )}

  {/* ── Step 3: Upload documents, consent, submit ── */}
  {step === 3 && (
   <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
   <div>
    <h2 className="text-lg font-semibold text-foreground">
    Step 3 — Upload documents & confirm
    </h2>
    <p className="text-sm text-muted-foreground mt-1">
    Attach required files and confirm your consent to submit.
    </p>
   </div>

   {/* Required documents / photos to upload */}
   {(() => {
   const spec = getRequirementUploadSpec(
    form.category,
    form.water_subtype,
    form.property_type,
    form.leak_subtype
   );
   if (!spec.length) return null;
   return (
    <section className="space-y-4">
    <h3 className="text-sm font-medium text-foreground">
     Required documents / photos{" "}
     <span className="text-destructive">*</span>
    </h3>
    <div className="space-y-4">
     {spec.map((s) => (
     <div key={s.key}>
      <label className="block text-sm font-medium text-foreground mb-1.5">
      {s.label} {s.required && <span className="text-amber-600">*</span>}
      </label>
      <input
      type="file"
      accept="image/*,.pdf,.doc,.docx"
      multiple={s.key === "photos"}
      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      onChange={(e) => setUpload(s.key, e.target.files)}
      />
      {uploads[s.key]?.length > 0 && (
      <p className="text-xs text-state-success mt-1.5">
       {uploads[s.key].length} file(s) selected
      </p>
      )}
     </div>
     ))}
    </div>
    </section>
   );
   })()}

   <section className="rounded-xl border border-border-subtle bg-muted/60 p-4 space-y-4">
    <h3 className="text-sm font-medium text-foreground">
    Confirm before submitting
    </h3>
    <label className="flex items-start gap-3 cursor-pointer group">
    <input type="checkbox" id="consent" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} className="mt-1 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30" />
    <span className="text-sm text-muted-foreground group-hover:text-foreground">
     I have read and agree to the data privacy notice. I consent to the collection and processing of my information for this utility request.
    </span>
    </label>
    {isWater && (
    <label className="flex items-start gap-3 cursor-pointer group">
     <input type="checkbox" id="requirements_confirmed" checked={form.requirements_confirmed} onChange={(e) => update("requirements_confirmed", e.target.checked)} className="mt-1 rounded border-slate-600 text-blue-500 focus:ring-blue-500/30" />
     <span className="text-sm text-muted-foreground group-hover:text-foreground">
     Yes, I will prepare the required documents listed above and submit them as instructed.
     </span>
    </label>
    )}
   </section>

   <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-start gap-3">
    <AlertCircle size={18} className="text-primary shrink-0 mt-0.5" />
    <p className="text-sm text-muted-foreground leading-relaxed">
    Your request will be logged and routed to the Utility Helpdesk for classification and assignment.
    </p>
   </div>

   <div className="flex justify-between gap-3 pt-2">
    <button
    type="button"
    className="btn-secondary px-5 py-2.5 rounded-lg font-medium"
    onClick={() => setStep(2)}
    >
    ← Back
    </button>
    <button
    type="submit"
    className="btn-primary px-6 py-2.5 rounded-lg font-medium flex items-center gap-2"
    disabled={submitting}
    >
    {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting…</> : "✓ Submit Request"}
    </button>
   </div>
   </form>
  )}
  </div>
 </div>
 </div>
 );
}

// ─── Exported for helpdesk/engineering: requirements checklist + view citizen uploads ───
export type UtilityRequirementDoc = {
 id: string;
 ticket_id: string;
 requirement_key: string;
 file_name: string;
 file_url: string;
 /** Object key in bucket utility-docs — preferred for signed URLs */
 storage_object_path?: string | null;
 uploaded_at: string;
 verified_at: string | null;
 verified_by: string | null;
};

export function UtilityRequirementChecklist({
 ticketId,
 ticketTypeKey,
 propertyType: propertyTypeProp,
 verifiedBy,
 readOnly = false,
}: {
 ticketId: string;
 /** Value from `service_tickets.ticket_type` */
 ticketTypeKey: string;
 propertyType?: string | null;
 verifiedBy?: string;
 /** Engineering view: open files but cannot mark verified */
 readOnly?: boolean;
}) {
 const meta = resolveUtilityTicketMeta(ticketTypeKey);
 const [propertyType, setPropertyType] = useState<string>(() => propertyTypeProp?.trim() || "residential");

 useEffect(() => {
 if (propertyTypeProp != null && String(propertyTypeProp).trim() !== "") {
  setPropertyType(String(propertyTypeProp));
  return;
 }
 if (meta.category !== "water_connection") return;
 let cancelled = false;
 void supabase
  .from("water_connection_request")
  .select("property_type")
  .eq("ticket_id", ticketId)
  .maybeSingle()
  .then(({ data }) => {
  if (!cancelled && data?.property_type) setPropertyType(data.property_type);
  });
 return () => {
  cancelled = true;
 };
 }, [ticketId, meta.category, propertyTypeProp]);

 const [docs, setDocs] = useState<UtilityRequirementDoc[]>([]);
 const [loadErr, setLoadErr] = useState<string | null>(null);
 const [loading, setLoading] = useState(true);
 const [viewUrls, setViewUrls] = useState<Record<string, string>>({});
 const [togglingId, setTogglingId] = useState<string | null>(null);

 useEffect(() => {
 let cancelled = false;
 const load = async () => {
  setLoading(true);
  setLoadErr(null);
  const { data, error } = await supabase
  .from("utility_request_document")
  .select("id, ticket_id, requirement_key, file_name, file_url, storage_object_path, uploaded_at, verified_at, verified_by")
  .eq("ticket_id", ticketId)
  .order("requirement_key");
  if (cancelled) return;
  if (error) {
  setLoadErr(error.message);
  setDocs([]);
  } else {
  setDocs((data as UtilityRequirementDoc[]) ?? []);
  }
  setLoading(false);
 };
 void load();
 return () => {
  cancelled = true;
 };
 }, [ticketId]);

 useEffect(() => {
 if (!docs.length) {
  setViewUrls({});
  return;
 }
 let cancelled = false;
 void resolveUtilityDocumentViewUrls(docs, ticketId).then((map) => {
  if (!cancelled) setViewUrls(map);
 });
 return () => {
  cancelled = true;
 };
 }, [docs, ticketId]);

 const expectedSpec = getRequirementUploadSpec(
 meta.category,
 meta.waterSubtype,
 propertyType,
 meta.leakSubtype
 );
 const keyToLabel = Object.fromEntries(expectedSpec.map((s) => [s.key, s.label]));

 const toggleVerified = async (id: string, currentlyVerified: boolean) => {
 if (readOnly) return;
 setTogglingId(id);
 try {
  await supabase
  .from("utility_request_document")
  .update({
   verified_at: currentlyVerified ? null : new Date().toISOString(),
   verified_by: currentlyVerified ? null : verifiedBy ?? "staff",
  })
  .eq("id", id);
  setDocs((prev) =>
  prev.map((d) =>
   d.id === id
   ? {
    ...d,
    verified_at: currentlyVerified ? null : new Date().toISOString(),
    verified_by: currentlyVerified ? null : verifiedBy ?? "staff",
    }
   : d
  )
  );
 } finally {
  setTogglingId(null);
 }
 };

 if (loading) {
 return (
  <div className="mt-4 pt-4 border-t border-border/60">
  <p className="text-xs text-muted-foreground py-2">Loading citizen documents…</p>
  </div>
 );
 }

 if (loadErr) {
 return (
  <div className="mt-4 pt-4 border-t border-border/60 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm text-destructive">
  Could not load uploads: {loadErr}
  <span className="block text-[11px] text-muted-foreground mt-1">
   Ensure table <code className="font-mono">utility_request_document</code> exists and RLS allows read for your Supabase role.
  </span>
  </div>
 );
 }

 return (
 <div className="mt-4 pt-4 border-t border-border/60">
  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
  Requirements — citizen uploads
  </div>
  <ul className="space-y-2">
  {docs.length === 0 && expectedSpec.length > 0 && (
   <li className="text-xs text-amber-600 dark:text-amber-400">No documents uploaded yet.</li>
  )}
  {docs.map((d) => (
   <li key={d.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 flex-wrap text-sm rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
   <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
    <span className="font-medium text-foreground">{keyToLabel[d.requirement_key] ?? d.requirement_key}</span>
    <span className="text-muted-foreground truncate max-w-[200px] text-xs" title={d.file_name}>
    {d.file_name}
    </span>
   </div>
   <div className="flex items-center gap-2 shrink-0">
    {viewUrls[d.id] || d.file_url?.trim() ? (
    <a
     href={viewUrls[d.id] ?? d.file_url}
     target="_blank"
     rel="noopener noreferrer"
     className="text-primary hover:underline text-xs font-semibold"
    >
     Open file
    </a>
    ) : (
    <span className="text-xs text-amber-600">
     Could not open file. Run <code className="font-mono text-[10px]">sql/add_utility_request_document_storage_path.sql</code> in Supabase, apply{' '}
     <code className="font-mono text-[10px]">sql/supabase_utility_docs_storage_and_rls.sql</code>, then re-submit the request.
    </span>
    )}
    {!readOnly && (
    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
     <input
     type="checkbox"
     checked={!!d.verified_at}
     onChange={() => void toggleVerified(d.id, !!d.verified_at)}
     disabled={togglingId === d.id}
     className="rounded border-border"
     />
     Verified
    </label>
    )}
    {readOnly && d.verified_at && (
    <span className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">Verified</span>
    )}
   </div>
   </li>
  ))}
  </ul>
  {expectedSpec.length > 0 && (
  <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
   Expected for this request type: {expectedSpec.map((s) => s.label).join("; ")}
  </p>
  )}
 </div>
 );
}
