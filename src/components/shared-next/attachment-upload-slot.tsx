import * as React from "react"
import {
  ExternalLinkIcon,
  FileIcon,
  LoaderCircleIcon,
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

export function AttachmentUploadSlot({
  label,
  value,
  onAdd,
  onRemove,
  onPreviewOpen,
  isUploading,
  multiple = true,
}: {
  label: string
  value: unknown
  onAdd: (file: File) => void | Promise<void>
  onRemove?: (link: AttachmentLink) => void | Promise<void>
  onPreviewOpen: (link: AttachmentLink) => void
  isUploading: boolean
  multiple?: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const links = React.useMemo(() => flattenAttachmentLinks(value, label), [label, value])
  const hasValue = hasAttachmentValue(value)
  const previewLink = links.find((link) => isImageUrl(link.url)) ?? null

  async function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length > 0) {
      for (const file of files) {
        await onAdd(file)
      }
    }
    event.target.value = ""
  }

  function openFilePicker() {
    if (isUploading) return
    inputRef.current?.click()
  }

  return (
    <div className="space-y-2 rounded-xl border-dashed border bg-muted/10 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple={multiple}
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
          <p className="text-muted-foreground mt-0.5 truncate text-2xs">
            {links.length > 1
              ? `${links.length} file caricati`
              : links[0]?.label ?? (hasValue ? "Documento caricato" : "Nessun file allegato")}
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
      {links.length > 1 && onRemove ? (
        <div className="space-y-1 border-t border-border/60 pt-2">
          {links.map((link) => (
            <div
              key={link.url}
              className="flex min-w-0 items-center gap-2 text-2xs text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate">{link.label}</span>
              <Button type="button" variant="ghost" size="icon-sm" asChild>
                <a href={link.url} target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-3" />
                </a>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => void onRemove(link)}
                disabled={isUploading}
              >
                <Trash2Icon className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
