import type { SupabaseClient } from '@supabase/supabase-js'
import {
  EXTERNAL_SESSION_STORAGE_KEY,
  externalCitizenSupabase,
  pickContactFromProfile as extPickContact,
} from '@/lib/externalCitizenPortal'

/** Columns that exist on BPM `person` in latest.sql — includes all structured demographic & address
 *  fields that the DB trigger auto-computes into full_name / address. */
export const BPM_PERSON_SELECT_MINIMAL =
  'person_id, full_name, address, contact_number, valid_id_type, valid_id_number, account_id,' +
  'first_name, middle_name, last_name, suffix, birth_date, gender, civil_status,' +
  'street_address, barangay, city, province, postal_code'

export function profileDisplayName(profile: Record<string, any> | null | undefined, fallbackEmail: string): string {
  if (!profile || typeof profile !== 'object') {
    return fallbackEmail.split('@')[0] || 'Citizen'
  }
  const fromFull = profile.full_name ?? profile.name
  if (typeof fromFull === 'string' && fromFull.trim()) return fromFull.trim()
  const first = profile.first_name ?? profile.firstname ?? profile.given_name
  const last = profile.last_name ?? profile.lastname ?? profile.surname
  const built = `${first ?? ''} ${last ?? ''}`.trim()
  if (built) return built
  return fallbackEmail.split('@')[0] || 'Citizen'
}

export function pickAddressFromProfile(profile: Record<string, any> | null | undefined): string {
  if (!profile) return ''
  const keys = ['address', 'full_address', 'residential_address', 'street_address', 'Street_address', 'street']
  for (const k of keys) {
    const v = profile[k]
    if (v != null && typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/**
 * Client-side mirror of the Supabase `person_compute_full_name_and_address` trigger.
 *
 * Replicates the trigger's full_name logic:
 *   concat_ws(' ', first_name, middle_name, last_name, suffix)  — skips blanks
 *
 * Returns an empty string when none of the parts are present (caller should keep
 * the existing DB value in that case).
 */
export function computePersonFullName(row: Record<string, any> | null | undefined): string {
  if (!row) return ''
  const t = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const parts = [t(row.first_name), t(row.middle_name), t(row.last_name), t(row.suffix)].filter(Boolean)
  return parts.join(' ')
}

/**
 * Client-side mirror of the Supabase `person_compute_full_name_and_address` trigger.
 *
 * Replicates the trigger's address logic:
 *   concat_ws(', ', street_address, barangay, city, postal_code, province)  — skips blanks
 *
 * Returns an empty string when none of the parts are present.
 */
export function computePersonAddress(row: Record<string, any> | null | undefined): string {
  if (!row) return ''
  const t = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const parts = [
    t(row.street_address) || t((row as any).Street_address),
    t(row.barangay),
    t(row.city),
    t(row.postal_code),
    t(row.province),
  ].filter(Boolean)
  return parts.join(', ')
}


/** Restore citizen-portal auth session from BPM localStorage (for RLS on `profiles`). */
export async function restoreExternalCitizenSession(client: SupabaseClient): Promise<void> {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem(EXTERNAL_SESSION_STORAGE_KEY)
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as { access_token?: string; refresh_token?: string }
    if (parsed?.access_token && parsed?.refresh_token) {
      await client.auth.setSession({
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
      })
    }
  } catch {
    /* ignore */
  }
}

export type ExternalCitizenProfileFetch = {
  externalUserId: string
  profile: Record<string, any> | null
}

/**
 * Load `profiles` row from the external citizen Supabase (when configured).
 * Does not touch BPM tables.
 */
export async function fetchExternalCitizenProfileRow(
  externalClient: SupabaseClient,
  opts: { accountId: string; email: string | null }
): Promise<ExternalCitizenProfileFetch | null> {
  const { accountId, email } = opts
  let externalUserId: string | null = accountId.startsWith('EXT-') ? accountId.replace(/^EXT-/, '') : null

  await restoreExternalCitizenSession(externalClient)

  const {
    data: { user: authUser },
  } = await externalClient.auth.getUser()
  if (!externalUserId && authUser?.id) externalUserId = authUser.id

  let profile: Record<string, any> | null = null
  if (externalUserId) {
    const { data } = await externalClient.from('profiles').select('*').eq('id', externalUserId).maybeSingle()
    profile = (data as Record<string, any>) ?? null
  }
  if (!profile && email?.trim()) {
    const { data: byEmail } = await externalClient.from('profiles').select('*').eq('email', email.trim()).limit(1)
    profile = ((byEmail?.[0] as Record<string, any>) ?? null) as Record<string, any> | null
    if (!externalUserId && profile?.id != null) externalUserId = String(profile.id)
  }

  if (!externalUserId) return null
  return { externalUserId, profile }
}

/**
 * Writes citizen portal `profiles` fields into BPM `person` (minimal columns only).
 * Call after successful portal sign-in so Profile and other BPM pages read one local source.
 */
export async function syncExternalProfileIntoBpmPerson(
  mainSupabase: SupabaseClient,
  opts: {
    personId: string
    accountId: string
    externalUserId: string
    profile: Record<string, any> | null | undefined
  }
): Promise<{ ok: boolean; error?: string }> {
  const profile = opts.profile
  if (!profile || typeof profile !== 'object' || Object.keys(profile).length === 0) {
    return { ok: true }
  }
  const extDisplayName = profileDisplayName(profile, '')
  const hasPayload =
    !!extPickContact(profile) ||
    !!pickAddressFromProfile(profile) ||
    (!!extDisplayName && extDisplayName !== 'Citizen')
  if (!hasPayload) return { ok: true }

  const patch = buildMinimalPersonPatchFromExternal(profile, opts.externalUserId, opts.accountId)
  const { error } = await mainSupabase.from('person').update(patch).eq('person_id', opts.personId)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** BPM `person` update payload only — avoids PostgREST errors on unknown columns. */
export function buildMinimalPersonPatchFromExternal(
  profile: Record<string, any>,
  externalUserId: string,
  accountId: string
): Record<string, unknown> {
  const fullName = profileDisplayName(profile, '')
  const address = pickAddressFromProfile(profile) || null
  const contact = extPickContact(profile) || null
  const payload: Record<string, unknown> = {
    full_name: fullName || 'Citizen',
    address,
    contact_number: contact,
    valid_id_type: 'external_citizen_portal',
    valid_id_number: externalUserId,
    account_id: accountId,
  }
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined || v === '') continue
    cleaned[k] = v
  }
  cleaned.full_name = fullName || 'Citizen'
  cleaned.valid_id_type = 'external_citizen_portal'
  cleaned.valid_id_number = externalUserId
  cleaned.account_id = accountId
  return cleaned
}

export type CitizenHeaderIdentity = {
  full_name: string
  email: string
}

/**
 * Display name for header/profile: external `profiles` first (if configured), else BPM person, else session.
 */
export async function resolveCitizenDisplayIdentity(
  mainSupabase: SupabaseClient,
  opts: { accountId: string; email: string | null; sessionFullName: string }
): Promise<CitizenHeaderIdentity> {
  const email = opts.email?.trim() || ''
  let { data: acct } = await mainSupabase
    .from('citizen_account')
    .select(`email, person_id, person(${BPM_PERSON_SELECT_MINIMAL})`)
    .eq('account_id', opts.accountId)
    .maybeSingle()
  if (!acct && email) {
    const { data: byEmail } = await mainSupabase
      .from('citizen_account')
      .select(`email, person_id, person(${BPM_PERSON_SELECT_MINIMAL})`)
      .eq('email', email)
      .maybeSingle()
    acct = byEmail
  }

  const acctRow = acct as Record<string, any> | null
  const p = Array.isArray(acctRow?.person) ? acctRow.person[0] : acctRow?.person
  const localName = (p?.full_name as string | undefined)?.trim() || ''
  const localEmail = (acctRow?.email as string | undefined)?.trim() || email

  const ext = externalCitizenSupabase
  if (!ext) {
    return {
      full_name: localName || opts.sessionFullName || email.split('@')[0] || 'Citizen',
      email: localEmail,
    }
  }

  try {
    const fetched = await fetchExternalCitizenProfileRow(ext, {
      accountId: opts.accountId,
      email: localEmail || email,
    })
    if (fetched?.profile) {
      const extName = profileDisplayName(fetched.profile, localEmail || email)
      if (extName && extName !== 'Citizen') {
        return { full_name: extName, email: localEmail || email }
      }
    }
  } catch {
    /* use local */
  }

  return {
    full_name: localName || opts.sessionFullName || email.split('@')[0] || 'Citizen',
    email: localEmail || email,
  }
}
