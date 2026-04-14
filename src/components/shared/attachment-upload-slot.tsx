import * as React from "react"
import {
  ExternalLinkIcon,
  FileIcon,
  LoaderCircleIcon,
  PlusIcon,
  ScanSearchIcon,
} from "lucide-react"

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

  if (!hasValue) {
    // ── Empty state ──────────────────────────────────────────────────────────
    return (
      <button
        type="button"
        onClick={openFilePicker}
        disabled={isUploading}
        className="w-full flex items-center gap-2 p-2 border border-dashed border-border rounded-md hover:border-primary/40 hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleInputChange}
        />
        <div className="w-10 h-8 rounded bg-muted/50 shrink-0 flex items-center justify-center">
          {isUploading ? (
            <LoaderCircleIcon className="size-3.5 text-muted-foreground animate-spin" />
          ) : (
            <FileIcon className="size-3.5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[11px] font-medium text-foreground truncate">{label}</p>
          <p className="text-[9px] text-muted-foreground">Nessun file allegato</p>
        </div>
        <PlusIcon className="size-3.5 text-muted-foreground shrink-0" />
      </button>
    )
  }

  // ── Filled state ────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-2 p-2 border border-border rounded-md bg-card group">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="w-10 h-8 rounded bg-muted shrink-0 overflow-hidden flex items-center justify-center">
        {previewLink ? (
          <img
            src={previewLink.url}
            alt={previewLink.label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <FileIcon className="size-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-foreground truncate">{label}</p>
        <p className="text-[9px] text-muted-foreground truncate">
          {links[0]?.label ?? "Documento caricato"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        {previewLink ? (
          <button
            type="button"
            onClick={() => onPreviewOpen(previewLink)}
            aria-label={`Ingrandisci ${label}`}
            title={`Ingrandisci ${label}`}
            className="p-1 rounded hover:bg-muted"
          >
            <ScanSearchIcon className="size-3.5 text-muted-foreground" />
          </button>
        ) : null}
        {links[0] ? (
          <a
            href={links[0].url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Apri file ${label}`}
            title={`Apri file ${label}`}
            className="p-1 rounded hover:bg-muted"
          >
            <ExternalLinkIcon className="size-3.5 text-muted-foreground" />
          </a>
        ) : null}
        <button
          type="button"
          onClick={openFilePicker}
          disabled={isUploading}
          aria-label={`Sostituisci ${label}`}
          title={`Sostituisci ${label}`}
          className="p-1 rounded hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
        >
          {isUploading ? (
            <LoaderCircleIcon className="size-3.5 text-muted-foreground animate-spin" />
          ) : (
            <PlusIcon className="size-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  )
}
