import { supabase } from '@/lib/supabase'

/** Must match `apply-utility_request.tsx` bucket name */
export const BUCKET_UTILITY_DOCS = 'utility-docs'

/**
 * Extract storage object path from a Supabase public/signed URL for this bucket.
 * Handles multiple URL shapes (project URL, /storage/v1/, etc.).
 */
export function extractUtilityDocStoragePath(fileUrl: string): string | null {
  if (!fileUrl?.trim()) return null
  const clean = fileUrl.split('?')[0] ?? fileUrl
  const patterns = [
    /\/storage\/v1\/object\/(?:public|sign)\/utility-docs\/(.+)$/i,
    /\/object\/(?:public|sign)\/utility-docs\/(.+)$/i,
    new RegExp(`/${BUCKET_UTILITY_DOCS}/(.+)$`, 'i'),
  ]
  for (const re of patterns) {
    const m = clean.match(re)
    if (m?.[1]) {
      try {
        return decodeURIComponent(m[1])
      } catch {
        return m[1]
      }
    }
  }
  return null
}

/**
 * Prefer a time-limited signed URL (works for private buckets); fall back to the stored URL.
 */
export async function resolveUtilityDocumentViewUrl(fileUrl: string | null | undefined): Promise<string | null> {
  if (!fileUrl?.trim()) return null
  const path = extractUtilityDocStoragePath(fileUrl)
  if (!path) return fileUrl.trim()
  const { data, error } = await supabase.storage.from(BUCKET_UTILITY_DOCS).createSignedUrl(path, 3600)
  // utility-docs is private: the stored "public" URL often 404s (bucket missing or not public).
  // Never fall back to that URL — it surfaces raw JSON errors in the browser.
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export type UtilityDocRowForView = {
  id: string
  file_url: string | null | undefined
  requirement_key: string
  file_name: string
  /** Preferred: exact object key inside bucket (from upload) */
  storage_object_path?: string | null
}

/** List all file object paths under prefix (recursive). */
async function listAllFilePathsUnder(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(BUCKET_UTILITY_DOCS).list(prefix, { limit: 1000 })
  if (error || !data?.length) return []
  const out: string[] = []
  for (const item of data) {
    const itemPath = `${prefix}/${item.name}`
    const meta = item.metadata as { size?: number; mimetype?: string } | null
    const hasSize = meta != null && typeof meta.size === 'number'
    if (hasSize || /\.[a-z0-9]{2,8}$/i.test(item.name)) {
      out.push(itemPath)
    } else {
      out.push(...(await listAllFilePathsUnder(itemPath)))
    }
  }
  return out
}

async function tryListAndPickSignedUrl(folder: string, fileNameHint: string): Promise<string | null> {
  const { data: items, error } = await supabase.storage.from(BUCKET_UTILITY_DOCS).list(folder, {
    limit: 100,
    sortBy: { column: 'name', order: 'desc' },
  })
  if (error || !items?.length) return null

  const safeHint = fileNameHint.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  const baseHint = safeHint.replace(/\.[^.]+$/, '')

  const pick =
    items.find(f => f.name.toLowerCase().includes(safeHint)) ||
    (baseHint.length >= 4 ? items.find(f => f.name.toLowerCase().includes(baseHint)) : undefined) ||
    items[0]

  if (!pick?.name) return null
  const objectPath = `${folder}/${pick.name}`
  const { data, error: signErr } = await supabase.storage.from(BUCKET_UTILITY_DOCS).createSignedUrl(objectPath, 3600)
  if (signErr || !data?.signedUrl) return null
  return data.signedUrl
}

/**
 * When DB has no usable URL, find objects under ticket/requirement or anywhere under ticket.
 */
export async function recoverUtilityDocumentSignedUrl(
  ticketId: string,
  requirementKey: string,
  fileNameHint: string,
): Promise<string | null> {
  const direct = await tryListAndPickSignedUrl(`${ticketId}/${requirementKey}`, fileNameHint)
  if (direct) return direct

  const all = await listAllFilePathsUnder(ticketId)
  if (!all.length) return null

  const reqSeg = `/${requirementKey}/`
  const preferred = all.filter(p => p.includes(reqSeg))
  const pool = preferred.length ? preferred : all

  const safeHint = fileNameHint.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase()
  let objectPath =
    pool.find(p => p.toLowerCase().includes(safeHint)) ||
    (safeHint.length >= 4 ? pool.find(p => p.toLowerCase().includes(safeHint.replace(/\.[^.]+$/, ''))) : undefined) ||
    pool[0]

  if (!objectPath) return null
  const { data, error: signErr } = await supabase.storage.from(BUCKET_UTILITY_DOCS).createSignedUrl(objectPath, 3600)
  if (signErr || !data?.signedUrl) return null
  return data.signedUrl
}

export async function resolveUtilityDocumentViewUrls(
  docs: UtilityDocRowForView[],
  ticketId: string,
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  await Promise.all(
    docs.map(async d => {
      const path = d.storage_object_path?.trim()
      if (path) {
        const { data, error } = await supabase.storage.from(BUCKET_UTILITY_DOCS).createSignedUrl(path, 3600)
        if (!error && data?.signedUrl) {
          out[d.id] = data.signedUrl
          return
        }
      }
      if (d.file_url?.trim()) {
        const url = await resolveUtilityDocumentViewUrl(d.file_url)
        if (url) out[d.id] = url
        return
      }
      const recovered = await recoverUtilityDocumentSignedUrl(ticketId, d.requirement_key, d.file_name)
      if (recovered) out[d.id] = recovered
    }),
  )
  return out
}
