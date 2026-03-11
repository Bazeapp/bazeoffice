import * as React from "react"
import {
  CalendarDaysIcon,
  FileBadge2Icon,
  FolderArchiveIcon,
  IdCardIcon,
  LoaderCircleIcon,
  PencilIcon,
  PlusIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { DetailSectionCard } from "@/components/shared/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { FieldDescription, FieldSet, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getTagClassName, resolveLookupColor, type LookupOption } from "@/features/lavoratori/lib/lookup-utils"
import { createRecord, updateRecord } from "@/lib/anagrafiche-api"
import { supabase } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import type { DocumentoLavoratoreRecord } from "@/types/entities/documento-lavoratore"

type DocumentAttachmentValues = {
  allegato_codice_fiscale_fronte: unknown
  allegato_codice_fiscale_retro: unknown
  allegato_documento_identita_fronte: unknown
  allegato_documento_identita_retro: unknown
  allegato_permesso_di_soggiorno_fronte: unknown
  allegato_permesso_di_soggiorno_retro: unknown
  allegato_ricevuta_rinnovo_permesso: unknown
}

type DocumentsDraft = {
  stato_verifica_documenti: string
  documenti_in_regola: string
  data_scadenza_naspi: string
}

type DocumentsCardProps = {
  workerId: string | null
  isEditing: boolean
  isUpdating: boolean
  draft: DocumentsDraft
  selectedValues: DocumentsDraft
  documents: DocumentoLavoratoreRecord[]
  fallbackDocuments: DocumentAttachmentValues
  documentsLoading: boolean
  verificationOptions: LookupOption[]
  statoDocumentiOptions: LookupOption[]
  lookupColorsByDomain: Map<string, string>
  onToggleEdit: () => void
  onVerificationChange: (value: string) => void
  onStatoDocumentiChange: (value: string) => void
  onNaspiChange: (value: string) => void
  onNaspiBlur: () => void
  onDocumentUpsert: (row: DocumentoLavoratoreRecord) => void
  onUploadError: React.Dispatch<React.SetStateAction<string | null>>
}

type AttachmentSlotConfig = {
  label: string
  field: keyof DocumentoLavoratoreRecord
}

type AttachmentGroupConfig = {
  title: string
  icon: React.ReactNode
  slots: AttachmentSlotConfig[]
}

type AttachmentLink = {
  url: string
  label: string
}

type StoredAttachmentPayload = {
  bucket: string
  content_type: string
  file_name: string
  name: string
  path: string
  public_url: string
  size: number
  uploaded_at: string
}

const ATTACHMENT_GROUPS: AttachmentGroupConfig[] = [
  {
    title: "Codice fiscale",
    icon: <FileBadge2Icon className="text-muted-foreground size-4" />,
    slots: [
      { label: "Fronte", field: "allegato_codice_fiscale_fronte" },
      { label: "Retro", field: "allegato_codice_fiscale_retro" },
    ],
  },
  {
    title: "Documento di identita",
    icon: <IdCardIcon className="text-muted-foreground size-4" />,
    slots: [
      { label: "Fronte", field: "allegato_documento_identita_fronte" },
      { label: "Retro", field: "allegato_documento_identita_retro" },
    ],
  },
  {
    title: "Permesso di soggiorno",
    icon: <ShieldCheckIcon className="text-muted-foreground size-4" />,
    slots: [
      { label: "Fronte", field: "allegato_permesso_di_soggiorno_fronte" },
      { label: "Retro", field: "allegato_permesso_di_soggiorno_retro" },
    ],
  },
  {
    title: "Ricevuta rinnovo permesso",
    icon: <FolderArchiveIcon className="text-muted-foreground size-4" />,
    slots: [{ label: "Allegato", field: "allegato_ricevuta_rinnovo_permesso" }],
  },
]

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

function flattenAttachmentLinks(value: unknown, fallbackLabel: string): AttachmentLink[] {
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

function hasAttachmentValue(value: unknown) {
  if (value == null) return false
  if (typeof value === "string") return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (isObject(value)) return Object.keys(value).length > 0
  return true
}

function isImageUrl(url: string) {
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url)
}

function sanitizeFileName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
}

function pickAttachmentValue(
  documents: DocumentoLavoratoreRecord[],
  field: keyof DocumentoLavoratoreRecord,
  fallbackDocuments?: Partial<DocumentAttachmentValues>
) {
  for (const document of documents) {
    const value = document[field]
    if (!hasAttachmentValue(value)) continue
    return value
  }

  const fallbackValue = fallbackDocuments?.[field as keyof DocumentAttachmentValues]
  if (hasAttachmentValue(fallbackValue)) {
    return fallbackValue
  }

  return null
}

function ReadOnlyLookupBadge({
  value,
  domain,
  lookupColorsByDomain,
  emptyLabel = "-",
}: {
  value: string
  domain: string
  lookupColorsByDomain: Map<string, string>
  emptyLabel?: string
}) {
  if (!value) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>
  }

  return (
    <Badge
      variant="outline"
      className={getTagClassName(resolveLookupColor(lookupColorsByDomain, domain, value))}
    >
      {value}
    </Badge>
  )
}

function AttachmentSlot({
  field,
  label,
  value,
  onAdd,
  onPreviewOpen,
  isUploading,
}: {
  field: keyof DocumentoLavoratoreRecord
  label: string
  value: unknown
  onAdd: (field: keyof DocumentoLavoratoreRecord, file: File) => void
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
      onAdd(field, file)
    }
    event.target.value = ""
  }

  function openFilePicker() {
    if (isUploading) return
    inputRef.current?.click()
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {!hasValue ? (
          <span className="text-muted-foreground text-xs">Non allegato</span>
        ) : links.length === 0 ? (
          <Badge variant="outline">Presente</Badge>
        ) : null}
      </div>
      {previewLink ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => onPreviewOpen(previewLink)}
            className="group flex h-64 w-full items-center justify-center overflow-hidden rounded-lg bg-background"
          >
            <img
              src={previewLink.url}
              alt={previewLink.label}
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={(event) => {
              event.stopPropagation()
              openFilePicker()
            }}
            className="absolute right-3 bottom-3 z-10 bg-background/90 shadow-sm backdrop-blur-xs"
            aria-label="Aggiungi documento"
            title="Aggiungi documento"
            disabled={isUploading}
          >
            {isUploading ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
          </Button>
        </div>
      ) : null}
      <div className="flex items-start justify-between gap-2">
        {links.length > 0 && !previewLink ? (
          <div className="flex flex-wrap gap-2">
            {links.map((link, index) => (
              <Button key={`${link.url}-${index}`} type="button" variant="outline" size="sm" asChild>
                <a href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </Button>
            ))}
          </div>
        ) : (
          <div />
        )}
        {!previewLink ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            className="shrink-0"
            disabled={isUploading}
          >
            {isUploading ? (
              <LoaderCircleIcon className="size-3.5 animate-spin" />
            ) : (
              <PlusIcon className="size-3.5" />
            )}
            Aggiungi documento
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function AttachmentGroupCard({
  group,
  documents,
  fallbackDocuments,
  onAdd,
  onPreviewOpen,
  uploadingField,
}: {
  group: AttachmentGroupConfig
  documents: DocumentoLavoratoreRecord[]
  fallbackDocuments: DocumentAttachmentValues
  onAdd: (field: keyof DocumentoLavoratoreRecord, file: File) => void
  onPreviewOpen: (link: AttachmentLink) => void
  uploadingField: keyof DocumentoLavoratoreRecord | null
}) {
  const slotValues = group.slots.map((slot) => ({
    ...slot,
    value: pickAttachmentValue(documents, slot.field, fallbackDocuments),
  }))

  return (
    <div className="relative">
      <div className="text-foreground absolute top-0 left-3 z-10 inline-flex -translate-y-1/2 items-center gap-2 px-2 text-base font-semibold">
        {group.icon}
        <span>{group.title}</span>
      </div>
      <div
        className={cn(
          "rounded-xl border border-dashed bg-background p-3 pt-5",
          group.slots.length === 1 ? "w-full sm:inline-block sm:w-auto" : "w-full",
        )}
      >
        <div
          className={cn(
            "grid gap-3",
            group.slots.length > 1 ? "md:grid-cols-2" : "grid-cols-1",
          )}
        >
          {slotValues.map((slot) => (
            <div
              key={slot.field}
              className={cn(group.slots.length === 1 && "w-full sm:w-[17.5rem]")}
            >
              <AttachmentSlot
                field={slot.field}
                label={slot.label}
                value={slot.value}
                onAdd={onAdd}
                onPreviewOpen={onPreviewOpen}
                isUploading={uploadingField === slot.field}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AttachmentPlaceholderSlot({
  field,
  label,
  onAdd,
  isUploading,
}: {
  field: keyof DocumentoLavoratoreRecord
  label: string
  onAdd: (field: keyof DocumentoLavoratoreRecord, file: File) => void
  isUploading: boolean
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onAdd(field, file)
    }
    event.target.value = ""
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed bg-muted/20">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? (
            <LoaderCircleIcon className="size-3.5 animate-spin" />
          ) : (
            <PlusIcon className="size-3.5" />
          )}
          Aggiungi documento
        </Button>
      </div>
    </div>
  )
}

function AttachmentPlaceholderGroupCard({
  group,
  onAdd,
  uploadingField,
}: {
  group: AttachmentGroupConfig
  onAdd: (field: keyof DocumentoLavoratoreRecord, file: File) => void
  uploadingField: keyof DocumentoLavoratoreRecord | null
}) {
  return (
    <div className="relative">
      <div className="text-foreground absolute top-0 left-3 z-10 inline-flex -translate-y-1/2 items-center gap-2 px-2 text-base font-semibold">
        {group.icon}
        <span>{group.title}</span>
      </div>
      <div
        className={cn(
          "rounded-xl border border-dashed bg-background p-3 pt-5",
          group.slots.length === 1 ? "w-full sm:inline-block sm:w-auto" : "w-full"
        )}
      >
        <div
          className={cn(
            "grid gap-3",
            group.slots.length > 1 ? "md:grid-cols-2" : "grid-cols-1"
          )}
        >
          {group.slots.map((slot) => (
            <div
              key={slot.field}
              className={cn(group.slots.length === 1 && "w-full sm:w-[17.5rem]")}
            >
              <AttachmentPlaceholderSlot
                field={slot.field}
                label={slot.label}
                onAdd={onAdd}
                isUploading={uploadingField === slot.field}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function DocumentsCard({
  workerId,
  isEditing,
  isUpdating,
  draft,
  selectedValues,
  documents,
  fallbackDocuments,
  documentsLoading,
  verificationOptions,
  statoDocumentiOptions,
  lookupColorsByDomain,
  onToggleEdit,
  onVerificationChange,
  onStatoDocumentiChange,
  onNaspiChange,
  onNaspiBlur,
  onDocumentUpsert,
  onUploadError,
}: DocumentsCardProps) {
  const [selectedPreview, setSelectedPreview] = React.useState<AttachmentLink | null>(null)
  const [uploadingField, setUploadingField] =
    React.useState<keyof DocumentoLavoratoreRecord | null>(null)
  const hasAnyDocuments = React.useMemo(
    () =>
      ATTACHMENT_GROUPS.some((group) =>
        group.slots.some((slot) =>
          hasAttachmentValue(
            pickAttachmentValue(documents, slot.field, fallbackDocuments)
          )
        )
      ),
    [documents, fallbackDocuments]
  )

  const handleUpload = React.useCallback(
    async (field: keyof DocumentoLavoratoreRecord, file: File) => {
      if (!workerId) return

      onUploadError(null)
      setUploadingField(field)

      try {
        const safeName = sanitizeFileName(file.name || "documento")
        const storagePath = [
          "lavoratori",
          workerId,
          "documenti",
          field,
          `${Date.now()}-${safeName}`,
        ].join("/")

        const uploadResult = await supabase.storage
          .from("baze-bucket")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type || undefined,
          })

        if (uploadResult.error) {
          throw uploadResult.error
        }

        const publicUrlResult = supabase.storage.from("baze-bucket").getPublicUrl(storagePath)
        const payload: StoredAttachmentPayload = {
          bucket: "baze-bucket",
          content_type: file.type || "application/octet-stream",
          file_name: file.name,
          name: file.name,
          path: storagePath,
          public_url: publicUrlResult.data.publicUrl,
          size: file.size,
          uploaded_at: new Date().toISOString(),
        }

        const targetDocument =
          documents.find((document) => hasAttachmentValue(document[field])) ?? documents[0] ?? null

        if (targetDocument) {
          const response = await updateRecord("documenti_lavoratori", targetDocument.id, {
            [field]: payload,
            lavoratore_id: workerId,
          })
          onDocumentUpsert(response.row as DocumentoLavoratoreRecord)
        } else {
          const response = await createRecord("documenti_lavoratori", {
            lavoratore_id: workerId,
            [field]: payload,
          })
          onDocumentUpsert(response.row as DocumentoLavoratoreRecord)
        }
      } catch (caughtError) {
        onUploadError(
          caughtError instanceof Error ? caughtError.message : "Errore caricando documento"
        )
      } finally {
        setUploadingField(null)
      }
    },
    [documents, onDocumentUpsert, onUploadError, workerId]
  )

  return (
    <DetailSectionCard
      title="Documenti"
      titleIcon={<FolderArchiveIcon className="text-muted-foreground size-4" />}
      titleAction={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onToggleEdit}
          aria-label={isEditing ? "Termina modifica documenti" : "Modifica documenti"}
          title={isEditing ? "Termina modifica documenti" : "Modifica documenti"}
          disabled={isUpdating}
        >
          <PencilIcon className="size-4" />
        </Button>
      }
      titleOnBorder
      contentClassName="space-y-5 pt-2"
    >
      <FieldSet className="gap-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Check documenti verificati da Baze
            </FieldTitle>
            {isEditing ? (
              <Select
                value={draft.stato_verifica_documenti || undefined}
                onValueChange={onVerificationChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="bg-muted/35">
                  <SelectValue placeholder="Seleziona stato verifica" />
                </SelectTrigger>
                <SelectContent>
                  {verificationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex min-h-11 items-center">
                <ReadOnlyLookupBadge
                  value={selectedValues.stato_verifica_documenti}
                  domain="lavoratori.stato_verifica_documenti"
                  lookupColorsByDomain={lookupColorsByDomain}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
              Stato documenti
            </FieldTitle>
            {isEditing ? (
              <Select
                value={draft.documenti_in_regola || undefined}
                onValueChange={onStatoDocumentiChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="bg-muted/35">
                  <SelectValue placeholder="Seleziona stato documenti" />
                </SelectTrigger>
                <SelectContent>
                  {statoDocumentiOptions.map((option) => (
                    <SelectItem key={option.value} value={option.label}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex min-h-11 items-center">
                <ReadOnlyLookupBadge
                  value={selectedValues.documenti_in_regola}
                  domain="lavoratori.documenti_in_regola"
                  lookupColorsByDomain={lookupColorsByDomain}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          {documentsLoading ? (
            <FieldDescription>Caricamento documenti...</FieldDescription>
          ) : !hasAnyDocuments ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {ATTACHMENT_GROUPS.map((group) => (
                <AttachmentPlaceholderGroupCard
                  key={group.title}
                  group={group}
                  onAdd={handleUpload}
                  uploadingField={uploadingField}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {ATTACHMENT_GROUPS.map((group) => (
                <AttachmentGroupCard
                  key={group.title}
                  group={group}
                  documents={documents}
                  fallbackDocuments={fallbackDocuments}
                  onAdd={handleUpload}
                  onPreviewOpen={setSelectedPreview}
                  uploadingField={uploadingField}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <FieldTitle className="text-muted-foreground text-xs font-medium tracking-wide">
            Data scadenza Naspi
          </FieldTitle>
          {isEditing ? (
            <div className="space-y-2">
              <Input
                type="date"
                value={draft.data_scadenza_naspi}
                onChange={(event) => onNaspiChange(event.target.value)}
                onBlur={onNaspiBlur}
                disabled={isUpdating}
                className="bg-muted/35"
              />
              <FieldDescription>Da inserire solo se e in Naspi.</FieldDescription>
            </div>
          ) : (
            <div className="flex min-h-11 items-center gap-2">
              <CalendarDaysIcon className="text-muted-foreground size-4" />
              <span className={cn("text-sm", !selectedValues.data_scadenza_naspi && "text-muted-foreground")}>
                {selectedValues.data_scadenza_naspi || "-"}
              </span>
            </div>
          )}
        </div>
      </FieldSet>
      <Dialog open={Boolean(selectedPreview)} onOpenChange={(open) => !open && setSelectedPreview(null)}>
        <DialogContent
          className="max-w-[min(96vw,72rem)] border-none bg-black/90 p-2 shadow-none sm:max-w-[min(96vw,72rem)]"
          showCloseButton={true}
        >
          <DialogTitle className="sr-only">
            {selectedPreview?.label ?? "Anteprima documento"}
          </DialogTitle>
          {selectedPreview ? (
            <div className="flex max-h-[88vh] items-center justify-center overflow-hidden rounded-lg">
              <img
                src={selectedPreview.url}
                alt={selectedPreview.label}
                className="max-h-[88vh] w-auto max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DetailSectionCard>
  )
}
