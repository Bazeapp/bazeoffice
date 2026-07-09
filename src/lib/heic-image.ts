// Render-time HEIC/HEIF conversion (BAZ-21).
//
// Desktop browsers cannot decode HEIC in an <img>, so stored HEIC documents and
// photos render broken. This module is the ONLY importer of `heic-to`: it detects
// HEIC by extension or MIME type and converts a stored image URL into a
// browser-renderable JPEG object URL, lazily (dynamic import, so the ~735 KB
// decoder chunk loads only when a HEIC is actually shown) and cached per session.
//
// The decode call is isolated in `convert()` so it can later be swapped for the
// `heic-to/next` web-worker entry without touching callers.

const HEIC_EXT = /\.(heic|heif)(\?.*)?$/i
const HEIC_MIME = /^image\/hei[cf]$/i

const JPEG_QUALITY = 0.85

// Guard against a hung request (a stalled connection that neither resolves nor
// errors) leaving the viewer stuck on the loading spinner forever.
const FETCH_TIMEOUT_MS = 20_000

// Per-session cache: source URL -> promise of a converted JPEG object URL.
// Caching the promise (not the resolved value) also de-duplicates concurrent
// requests for the same image.
const cache = new Map<string, Promise<string>>()

// Cap the working set and revoke evicted object URLs so blobs don't leak.
// Exported for tests; the in-scope surfaces (document viewer + profile foto)
// keep the real working set far below this.
export const HEIC_CACHE_LIMIT = 40

export function isHeicImage(input: { url?: string | null; type?: string | null }): boolean {
  const type = input.type?.trim()
  if (type && HEIC_MIME.test(type)) return true
  const url = input.url
  if (url && HEIC_EXT.test(url)) return true
  return false
}

async function convert(url: string): Promise<string> {
  const { heicTo } = await import("heic-to")

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  let response: Response
  try {
    response = await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }

  if (!response.ok) {
    throw new Error(`Impossibile scaricare il file (${response.status})`)
  }
  const blob = await response.blob()
  const jpeg = await heicTo({ blob, type: "image/jpeg", quality: JPEG_QUALITY })
  return URL.createObjectURL(jpeg)
}

/**
 * Returns a browser-renderable image URL for a stored image.
 * Non-HEIC inputs are returned unchanged. HEIC/HEIF inputs are decoded to a
 * cached JPEG object URL. Rejects if the conversion fails (callers render a
 * fallback).
 */
export function getRenderableImageSrc(url: string, type?: string | null): Promise<string> {
  if (!isHeicImage({ url, type })) {
    return Promise.resolve(url)
  }

  const existing = cache.get(url)
  if (existing) {
    // LRU bump: re-insert so a currently-viewed image is the newest entry and
    // won't be the eviction victim (whose object URL gets revoked).
    cache.delete(url)
    cache.set(url, existing)
    return existing
  }

  const pending = convert(url)
  cache.set(url, pending)

  // On failure, drop the entry so a later view can retry.
  pending.catch(() => {
    if (cache.get(url) === pending) cache.delete(url)
  })

  if (cache.size > HEIC_CACHE_LIMIT) {
    const oldestKey = cache.keys().next().value
    if (oldestKey !== undefined && oldestKey !== url) {
      const evicted = cache.get(oldestKey)
      cache.delete(oldestKey)
      evicted?.then((objectUrl) => URL.revokeObjectURL(objectUrl)).catch(() => {})
    }
  }

  return pending
}

/** Test-only: clear the module-level cache (revoking object URLs) for isolation. */
export function __resetHeicImageCacheForTests(): void {
  for (const pending of cache.values()) {
    pending.then((objectUrl) => URL.revokeObjectURL(objectUrl)).catch(() => {})
  }
  cache.clear()
}
