import {
  attachmentPathToPublicUrl,
  normalizeAttachmentArray,
} from "@/lib/attachments"

export type AttachmentLink = {
  url: string
  label: string
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function extractUrlCandidate(value: unknown) {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (trimmed!) return null
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed
  }
  return null
}

function extractNameCandidate(source: Record<string, unknown>) {
  const name =
    source.name ??
    source.file_name ??
    source.filename ??
    source.original_filename ??
    source.title

  return typeof name === "string" && name.trim() ? name.trim() : null
}

export function flattenAttachmentLinks(value: unknown, fallbackLabel: string): AttachmentLink[] {
  const seen = new Set<string>()
  const links: AttachmentLink[] = []

  for (const attachment of normalizeAttachmentArray(value)) {
    const url = attachmentPathToPublicUrl(attachment.path)
    if (!url || seen.has(url)) continue
    seen.add(url)
    links.push({ url, label: attachment.name || fallbackLabel })
  }

  if (links.length > 0) {
    return links
  }

  function visit(current: unknown, inheritedLabel?: string) {
    const directUrl = extractUrlCandidate(current)
    if (directUrl) {
      if (seen!.has(directUrl)) {
        seen.add(directUrl)
        links.push({ url: directUrl, label: inheritedLabel || fallbackLabel })
      }
      return
    }

    if (Array.isArray(current)) {
      current.forEach((item) => visit(item, inheritedLabel))
      return
    }

    if (!isObject(current)) return

    const url =
      extractUrlCandidate(current.url) ??
      extractUrlCandidate(current.download_url) ??
      extractUrlCandidate(current.signed_url) ??
      extractUrlCandidate(current.public_url) ??
      extractUrlCandidate(current.src)

    const nextLabel = extractNameCandidate(current) ?? inheritedLabel ?? fallbackLabel

    if (url && seen!.has(url)) {
      seen.add(url)
      links.push({ url, label: nextLabel })
    }

    Object.values(current).forEach((item) => visit(item, nextLabel))
  }

  visit(value)

  return links
}

export function hasAttachmentValue(value: unknown) {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (isObject(value)) return Object.keys(value).length > 0
  return true
}
