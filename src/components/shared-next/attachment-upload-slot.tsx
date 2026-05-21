import * as React from "react"
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  FileIcon,
  LoaderCircleIcon,
  OctagonAlertIcon,
  PlusIcon,
  ScanSearchIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  flattenAttachmentLinks,
  hasAttachmentValue,
  type AttachmentLink,
} from "./attachment-utils"

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url)
}

function isAudioLink(link: AttachmentLink) {
  if (link.type?.startsWith("audio/")) return true
  return /\.(mp3|m4a|wav|ogg|opus|aac)(\?.*)?$/i.test(link.url)
}

function formatFileSize(size: number | undefined) {
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

export function AttachmentUploadSlot({
  label,
  value,
  onAdd,
  onRemove,
  onPreviewOpen,
  isUploading,
  multiple = true,
  accept = "image/*,application/pdf",
  emptyText = "Nessun file allegato",
  showStatusIndicator = false,
}: {
  label: string
  value: unknown
  onAdd: (file: File) => void | Promise<void>
  onRemove?: (link: AttachmentLink) => void | Promise<void>
  onPreviewOpen: (link: AttachmentLink) => void
  isUploading: boolean
  multiple?: boolean
  accept?: string
  emptyText?: string
  showStatusIndicator?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const [isDragActive, setIsDragActive] = React.useState(false)
  const links = React.useMemo(() => flattenAttachmentLinks(value, label), [label, value])
  const hasValue = hasAttachmentValue(value)
  const previewLink = links.find((link) => isImageUrl(link.url)) ?? null
  const audioLinks = links.filter(isAudioLink)

  async function addFiles(files: File[]) {
    if (files.length > 0) {
      for (const file of files) {
        await onAdd(file)
      }
    }
  }

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    await addFiles(Array.from(event.target.files ?? []))
    event.target.value = ""
  }

  function openFilePicker() {
    if (isUploading) return
    inputRef.current?.click()
  }

  return (
    <div
      className={
        "space-y-2 rounded-xl border border-dashed bg-muted/10 px-3 py-2.5 transition-colors " +
        (isDragActive ? "border-primary bg-primary/5" : "")
      }
      onDragEnter={(event) => {
        event.preventDefault()
        if (!isUploading) setIsDragActive(true)
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        setIsDragActive(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setIsDragActive(false)
        if (isUploading) return
        void addFiles(Array.from(event.dataTransfer.files ?? []))
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
          accept={accept}
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
            {showStatusIndicator ? (
              hasValue ? (
                <CheckCircle2Icon
                  className="size-4 shrink-0 text-green-600"
                  aria-label="File presente"
                />
              ) : (
                <OctagonAlertIcon
                  className="size-4 shrink-0 text-red-500"
                  aria-label="File mancante"
                />
              )
            ) : null}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-2xs">
            {links.length > 1
              ? `${links.length} file caricati`
              : links[0]?.label ?? (hasValue ? "Documento caricato" : emptyText)}
          </p>
          <button
            type="button"
            className="mt-1 text-left text-2xs text-primary underline-offset-2 hover:underline"
            onClick={openFilePicker}
            disabled={isUploading}
          >
            Drop files here or browse
          </button>
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
          {links[0] && onRemove ? (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void onRemove(links[0])}
              disabled={isUploading}
              aria-label={`Rimuovi file ${label}`}
              title={`Rimuovi file ${label}`}
            >
              <Trash2Icon className="size-3.5" />
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={openFilePicker}
            disabled={isUploading}
            aria-label={hasValue && !multiple ? `Sostituisci ${label}` : hasValue ? `Aggiungi file a ${label}` : `Carica ${label}`}
            title={hasValue && !multiple ? `Sostituisci ${label}` : hasValue ? `Aggiungi file a ${label}` : `Carica ${label}`}
          >
            {isUploading ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
          </Button>
        </div>
      </div>
      {links.length > 1 ? (
        <div className="space-y-1 border-t border-border/60 pt-2">
          {links.map((link) => (
            <div
              key={link.url}
              className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate">
                {link.label}
                {formatFileSize(link.size) ? ` · ${formatFileSize(link.size)}` : ""}
              </span>
              <Button type="button" variant="ghost" size="icon-sm" asChild>
                <a href={link.url} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Button>
              {onRemove ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void onRemove(link)}
                  disabled={isUploading}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {audioLinks.length > 0 ? (
        <div className="space-y-2 border-t border-border/60 pt-2">
          {audioLinks.map((link) => (
            <div key={`audio-${link.url}`} className="space-y-1">
              <div className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground">
                <span className="min-w-0 flex-1 truncate">{link.label}</span>
                {formatFileSize(link.size) ? <span className="shrink-0">{formatFileSize(link.size)}</span> : null}
              </div>
              <audio controls src={link.url} className="h-9 w-full" preload="metadata">
                <a href={link.url} target="_blank" rel="noreferrer">
                  Apri audio
                </a>
              </audio>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
