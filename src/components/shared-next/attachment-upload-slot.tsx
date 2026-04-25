import * as React from "react"
import {
  ExternalLinkIcon,
  FileIcon,
  LoaderCircleIcon,
  PlusIcon,
  ScanSearchIcon,
} from "lucide-react"

import { Button } from "@/components/ui-next/button"
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
  if (!trimmed) return null
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
      if (!seen.has(directUrl)) {
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

    if (url && !seen.has(url)) {
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

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url)
}

export function AttachmentUploadSlot({
  label,
  value,
  onAdd,
  onPreviewOpen,
  isUploading,
}: {
  label: string
  value: unknown
  onAdd: (file: File) => void
  onPreviewOpen: (link: AttachmentLink) => void
  isUploading: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const links = React.useMemo(() => flattenAttachmentLinks(value, label), [label, value])
  const hasValue = hasAttachmentValue(value)
  const previewLink = links.find((link) => isImageUrl(link.url)) ?? null

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onAdd(file)
    }
    event.target.value = ""
  }

  function openFilePicker() {
    if (isUploading) return
    inputRef.current?.click()
  }

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border-dashed border bg-muted/10 px-3 py-2.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="bg-background flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
        {previewLink ? (
          <img
            src={previewLink.url}
            alt={previewLink.label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileIcon className="text-muted-foreground size-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
          {links[0]?.label ?? (hasValue ? "Documento caricato" : "Nessun file allegato")}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {previewLink ? (
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onPreviewOpen(previewLink)}
            aria-label={`Ingrandisci ${label}`}
            title={`Ingrandisci ${label}`}
          >
            <ScanSearchIcon className="size-3.5" />
          </Button>
        ) : null}
        {links[0] ? (
          <Button type="button" variant="outline" size="icon-sm" asChild>
            <a
              href={links[0].url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Apri file ${label}`}
              title={`Apri file ${label}`}
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          onClick={openFilePicker}
          disabled={isUploading}
          aria-label={hasValue ? `Sostituisci ${label}` : `Carica ${label}`}
          title={hasValue ? `Sostituisci ${label}` : `Carica ${label}`}
        >
          {isUploading ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
