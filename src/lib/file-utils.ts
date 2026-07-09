/** Normalizes a user-provided file name for safe storage paths. */
export function sanitizeFileName(name: string, fallback = "file") {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")

  return sanitized || fallback
}
