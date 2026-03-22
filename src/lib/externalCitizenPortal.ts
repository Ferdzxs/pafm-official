import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const externalUrl = import.meta.env.VITE_CITIZEN_SUPABASE_URL as string | undefined;
const externalAnonKey = import.meta.env.VITE_CITIZEN_SUPABASE_ANON_KEY as string | undefined;

export const externalCitizenSupabase =
  externalUrl && externalAnonKey ? createClient(externalUrl, externalAnonKey) : null;

export const EXTERNAL_SESSION_STORAGE_KEY = "bpm_external_supabase_session";

/** BPM stores this in `citizen_account.password_hash` when the real password lives in the citizen portal Auth. */
export const EXTERNAL_AUTH_PASSWORD_PLACEHOLDER = "__EXTERNAL_AUTH__";

type ExternalProfile = Record<string, any> | null;

/**
 * Check password against the citizen portal Supabase Auth (source of truth for linked accounts).
 * On success, the shared client holds a valid session (needed for updateUser).
 */
export async function verifyCitizenPortalPassword(
  email: string,
  password: string
): Promise<boolean> {
  if (!externalCitizenSupabase || !email?.trim() || !password) return false;
  const { error } = await externalCitizenSupabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  return !error;
}

/** Persist session tokens after password update (refresh token may rotate). */
export async function persistExternalCitizenSessionFromClient(): Promise<void> {
  if (!externalCitizenSupabase || typeof localStorage === "undefined") return;
  const {
    data: { session },
  } = await externalCitizenSupabase.auth.getSession();
  if (session?.access_token && session?.refresh_token) {
    localStorage.setItem(
      EXTERNAL_SESSION_STORAGE_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
    );
  }
}

export interface ExternalCitizenSyncResult {
  localAccountId: string;
  localPersonId: string;
  externalUserId: string;
  profile: ExternalProfile;
  externalSession: {
    access_token: string;
    refresh_token: string;
  } | null;
}

async function selectWithCandidateColumns(
  table: string,
  columns: string[],
  value: string
): Promise<any[]> {
  if (!externalCitizenSupabase) return [];

  for (const col of columns) {
    const { data, error } = await externalCitizenSupabase
      .from(table)
      .select("*")
      .eq(col, value)
      .limit(200);

    if (!error) return data ?? [];
  }

  return [];
}

export function pickContactFromProfile(profile: ExternalProfile): string {
  if (!profile || typeof profile !== "object") return "";
  const contactKeys = [
    "contact_number",
    "contact_no",
    "phone_number",
    "mobile_number",
    "mobile_no",
    "phone",
    "contact",
    "telephone",
    "tel_no",
    "cp_number",
    "cellphone",
    "mobile",
    "tel",
    "viber",
    "contact_info",
    "phone_no",
  ];
  for (const key of contactKeys) {
    const value = profile[key];
    if (value != null && typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  const lower = (s: string) => s.toLowerCase();
  for (const [key, value] of Object.entries(profile)) {
    if (value == null) continue;
    const k = lower(key);
    if (
      (k.includes("contact") || k.includes("phone") || k.includes("mobile") || k.includes("tel") || k.includes("viber") || k.includes("cp_")) &&
      typeof value === "string" &&
      value.trim()
    ) {
      return String(value).trim();
    }
  }
  const meta = profile.raw_user_meta_data ?? profile.user_metadata ?? profile.metadata;
  if (meta && typeof meta === "object") {
    for (const key of contactKeys) {
      const v = (meta as Record<string, unknown>)[key];
      if (v != null && typeof v === "string" && v.trim()) return v.trim();
    }
  }
  return "";
}

function profileName(profile: ExternalProfile, fallbackEmail: string): string {
  const fromFullName = profile?.full_name ?? profile?.name;
  if (typeof fromFullName === "string" && fromFullName.trim()) return fromFullName.trim();

  const firstName = profile?.first_name;
  const lastName = profile?.last_name;
  if (typeof firstName === "string" || typeof lastName === "string") {
    const built = `${firstName ?? ""} ${lastName ?? ""}`.trim();
    if (built) return built;
  }

  return fallbackEmail.split("@")[0] || "Citizen";
}

export async function loginAndSyncExternalCitizen(
  email: string,
  password: string,
  localSupabase: any
): Promise<ExternalCitizenSyncResult | null> {
  if (!externalCitizenSupabase) return null;

  const { data: authData, error: authError } = await externalCitizenSupabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) return null;

  const externalUserId = authData.user.id;
  const localAccountId = `EXT-${externalUserId}`;
  const localPersonId = `EXTPER-${externalUserId}`;

  const { data: profileById } = await externalCitizenSupabase
    .from("profiles")
    .select("*")
    .eq("id", externalUserId)
    .maybeSingle();

  const profileRowsByUser = await selectWithCandidateColumns("profiles", ["user_id", "account_id"], externalUserId);
  const profile = profileById ?? profileRowsByUser[0] ?? null;

  // Pull related records so data is available for future UI/pages.
  // This does not overwrite your existing module tables.
  const profileId = profile?.id ? String(profile.id) : null;
  const userLookupCols = ["user_id", "account_id", "citizen_id"];
  const profileLookupCols = ["profile_id"];

  await Promise.all([
    selectWithCandidateColumns("user_roles", userLookupCols, externalUserId),
    selectWithCandidateColumns("certificate_requests", userLookupCols, externalUserId),
    selectWithCandidateColumns("feedback", userLookupCols, externalUserId),
    selectWithCandidateColumns("notifications", userLookupCols, externalUserId),
    selectWithCandidateColumns("survey_responses", userLookupCols, externalUserId),
    selectWithCandidateColumns("survey_answers", userLookupCols, externalUserId),
    profileId ? selectWithCandidateColumns("certificate_requests", profileLookupCols, profileId) : Promise.resolve([]),
    externalCitizenSupabase.from("surveys").select("*").limit(200),
    externalCitizenSupabase.from("survey_questions").select("*").limit(500),
  ]);

  const fullName = profileName(profile, email);
  const address = (profile?.address as string | undefined) ?? null;
  const contact = pickContactFromProfile(profile) || null;

  await localSupabase.from("person").upsert(
    {
      person_id: localPersonId,
      full_name: fullName,
      address,
      contact_number: contact,
      account_id: localAccountId,
      valid_id_type: "external_citizen_portal",
      valid_id_number: externalUserId,
    },
    { onConflict: "person_id" }
  );

  await localSupabase.from("citizen_account").upsert(
    {
      account_id: localAccountId,
      person_id: localPersonId,
      email,
      password_hash: EXTERNAL_AUTH_PASSWORD_PLACEHOLDER,
      verification_status: "verified",
      registered_date: new Date().toISOString().slice(0, 10),
      registry_ref_no: `EXT-${externalUserId.slice(0, 12).toUpperCase()}`,
    },
    { onConflict: "account_id" }
  );

  const externalSession = authData.session
    ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      }
    : null;

  return { localAccountId, localPersonId, externalUserId, profile, externalSession };
}

/** person_id + account_id used to filter BPM (main) tables: applications, digital_document, etc. */
export type CitizenIdentityForBpm = {
  personId: string | null;
  accountId: string | null;
};

/**
 * Resolves citizen identifiers for queries against the main BPM database.
 * When `VITE_CITIZEN_SUPABASE_*` is configured, reads `citizen_account` (and optionally `person`)
 * from that subsystem first so `person_id` matches rows stored in BPM.
 * Falls back to the main Supabase `citizen_account` / `person` mirror.
 */
export async function resolveCitizenIdentityForBpmQueries(
  mainSupabase: SupabaseClient,
  params: { accountId: string; email?: string | null }
): Promise<CitizenIdentityForBpm> {
  const { accountId, email } = params;
  const em = email?.trim() || null;

  const pick = (row: Record<string, unknown> | null | undefined): CitizenIdentityForBpm => {
    if (!row || typeof row !== "object") return { personId: null, accountId: null };
    const pid = row.person_id ?? row.personId;
    const aid = row.account_id ?? row.accountId ?? row.id;
    const personId = typeof pid === "string" && pid.trim() ? pid.trim() : null;
    const acc =
      typeof aid === "string" && aid.trim()
        ? aid.trim()
        : typeof accountId === "string"
          ? accountId
          : null;
    return { personId, accountId: acc };
  };

  const tryExternalCitizenAccount = async (): Promise<CitizenIdentityForBpm | null> => {
    if (!externalCitizenSupabase) return null;

    const tryRow = (data: Record<string, unknown> | null, error: unknown): CitizenIdentityForBpm | null => {
      if (error) return null;
      const id = pick(data);
      return id.personId ? id : null;
    };

    {
      const { data, error } = await externalCitizenSupabase
        .from("citizen_account")
        .select("person_id, account_id")
        .eq("account_id", accountId)
        .maybeSingle();
      const got = tryRow(data as Record<string, unknown> | null, error);
      if (got) return got;
    }
    if (em) {
      const { data, error } = await externalCitizenSupabase
        .from("citizen_account")
        .select("person_id, account_id")
        .eq("email", em)
        .maybeSingle();
      const got = tryRow(data as Record<string, unknown> | null, error);
      if (got) return got;
    }
    {
      const { data, error } = await externalCitizenSupabase
        .from("citizen_account")
        .select("person_id, account_id")
        .eq("id", accountId)
        .maybeSingle();
      const got = tryRow(data as Record<string, unknown> | null, error);
      if (got) return got;
    }

    const { data: extPerson, error: extPersonErr } = await externalCitizenSupabase
      .from("person")
      .select("person_id, account_id")
      .eq("account_id", accountId)
      .maybeSingle();
    if (!extPersonErr) {
      const fromPerson = pick(extPerson as Record<string, unknown>);
      if (fromPerson.personId) return fromPerson;
    }

    return null;
  };

  const ext = await tryExternalCitizenAccount();
  if (ext?.personId) return ext;

  const { data: cit } = await mainSupabase
    .from("citizen_account")
    .select("person_id, account_id")
    .eq("account_id", accountId)
    .maybeSingle();
  const fromCit = pick(cit as Record<string, unknown>);
  if (fromCit.personId) return fromCit;

  const { data: row } = await mainSupabase
    .from("person")
    .select("person_id, account_id")
    .eq("account_id", accountId)
    .maybeSingle();
  const fromPersonMain = pick(row as Record<string, unknown>);
  if (fromPersonMain.personId) return fromPersonMain;

  /** Linked external / seed accounts are often found by email when account_id already matches BPM row. */
  if (em) {
    const { data: citByEmail } = await mainSupabase
      .from("citizen_account")
      .select("person_id, account_id")
      .eq("email", em)
      .maybeSingle();
    const fromEmail = pick(citByEmail as Record<string, unknown>);
    if (fromEmail.personId) return fromEmail;
  }

  return { personId: null, accountId: null };
}
