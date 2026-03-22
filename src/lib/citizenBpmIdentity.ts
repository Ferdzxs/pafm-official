import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveCitizenIdentityForBpmQueries } from '@/lib/externalCitizenPortal'

/** Minimal user shape for BPM citizen lookups (localStorage session + external-linked accounts). */
export type CitizenSessionUser = {
  id: string
  email?: string | null
  is_citizen?: boolean
}

/**
 * Resolves `person_id` for the current citizen session, including external subsystem accounts
 * mirrored in `person` / `citizen_account` (e.g. account_id `EXT-{uuid}`).
 */
export async function getCitizenPersonIdForSession(
  supabase: SupabaseClient,
  user: CitizenSessionUser | null | undefined,
): Promise<string | null> {
  if (!user?.is_citizen) return null

  const { personId } = await resolveCitizenIdentityForBpmQueries(supabase, {
    accountId: user.id,
    email: user.email,
  })
  if (personId) return personId

  const { data: cit } = await supabase
    .from('citizen_account')
    .select('person_id')
    .eq('account_id', user.id)
    .maybeSingle()
  if (cit?.person_id) return cit.person_id

  if (user.email) {
    const { data: byEmail } = await supabase
      .from('citizen_account')
      .select('person_id')
      .eq('email', user.email)
      .maybeSingle()
    if (byEmail?.person_id) return byEmail.person_id
  }

  const { data: fromPerson } = await supabase
    .from('person')
    .select('person_id')
    .eq('account_id', user.id)
    .maybeSingle()
  return fromPerson?.person_id ?? null
}
