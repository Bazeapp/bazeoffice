const DEFAULT_BUCKET = "baze-bucket"

export type MinimalAttachment = {
  name: string
  path: string
  type: string
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeStoragePath(path: string, bucket = DEFAULT_BUCKET) {
  const normalizedPath = path.trim().replace(/^\/+/, "")
  if (!normalizedPath) return null
  if (normalizedPath.startsWith(`${bucket}/`)) return normalizedPath
  return `${bucket}/${normalizedPath}`
}

function pathFromPublicStorageUrl(value: unknown) {
  const raw = asTrimmedString(value)
  if (!raw) return null

  try {
    const parsed = new URL(raw)
    const marker = "/storage/v1/object/public/"
    const markerIndex = parsed.pathname.indexOf(marker)
    if (markerIndex < 0) return null
    const normalizedPath = decodeURIComponent(
      parsed.pathname.slice(markerIndex + marker.length),
    ).replace(/^\/+/, "")
    return normalizedPath || null
  } catch {
    return null
  }
}

function extractAttachmentName(source: Record<string, unknown>, path: string) {
  const explicitName =
    asTrimmedString(source.name) ||
    asTrimmedString(source.file_name) ||
    asTrimmedString(source.filename) ||
    asTrimmedString(source.original_filename) ||
    asTrimmedString(source.title)

  if (explicitName) return explicitName
  const pathParts = path.split("/").filter(Boolean)
  return pathParts[pathParts.length - 1] ?? "file"
}

export function buildAttachmentPayload(
  file: File,
  storagePath: string,
  bucket = DEFAULT_BUCKET,
): MinimalAttachment {
  const path = normalizeStoragePath(storagePath, bucket)
  if (!path) {
    throw new Error("Invalid storage path")
  }

  return {
    name: file.name || "file",
    path,
    type: file.type || "application/octet-stream",
  }
}

export function normalizeAttachmentItem(
  value: unknown,
  fallbackBucket = DEFAULT_BUCKET,
): MinimalAttachment | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const source = value as Record<string, unknown>
  const bucket = asTrimmedString(source.bucket) || fallbackBucket
  const rawPath =
    asTrimmedString(source.path) ||
    pathFromPublicStorageUrl(source.public_url) ||
    pathFromPublicStorageUrl(source.url) ||
    pathFromPublicStorageUrl(source.download_url) ||
    pathFromPublicStorageUrl(source.src)

  const path = rawPath ? normalizeStoragePath(rawPath, bucket) : null
  if (!path) return null

  return {
    name: extractAttachmentName(source, path),
    path,
    type:
      asTrimmedString(source.type) ||
      asTrimmedString(source.content_type) ||
      "application/octet-stream",
  }
}

export function normalizeAttachmentArray(
  value: unknown,
  fallbackBucket = DEFAULT_BUCKET,
): MinimalAttachment[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeAttachmentItem(item, fallbackBucket))
      .filter((item): item is MinimalAttachment => item !== null)
  }

  const normalized = normalizeAttachmentItem(value, fallbackBucket)
  return normalized ? [normalized] : []
}

export function attachmentPathToPublicUrl(path: string) {
  const normalizedPath = path.trim().replace(/^\/+/, "")
  if (!normalizedPath) return null

  const supabaseUrl = asTrimmedString(import.meta.env.VITE_SUPABASE_URL)
  if (!supabaseUrl) return null

  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${normalizedPath}`
}
