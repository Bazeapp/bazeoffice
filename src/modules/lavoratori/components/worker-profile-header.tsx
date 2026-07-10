import * as React from "react"
import {
  BadgeCheckIcon,
  CakeIcon,
  CalendarDaysIcon,
  CopyIcon,
  ExternalLinkIcon,
  FlagIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  Share2Icon,
  ShieldCheckIcon,
  SkullIcon,
  StarIcon,
  UploadIcon,
  VenusAndMarsIcon,
} from "lucide-react"
import { toast } from "sonner"
import { useController } from "react-hook-form"

import type { LavoratoreListItem } from "../components/lavoratore-card"
import { Avatar } from "@/components/ui/avatar"
import { WorkerAvatar } from "./worker-avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { cn } from "@/lib/utils"
import { AttachmentImage } from "@/components/shared-next/attachment-image"
import {
  asString,
  getAgeFromBirthDate,
  readArrayStrings,
} from "../lib/base-utils"
import {
  getLookupLabelForSave,
  getTagClassName,
  resolveLookupSingleValueOptions,
  getLookupSelectValue,
  type LookupOption,
} from "../lib/lookup-utils"
import { getWorkerQualificationStatus } from "../lib/status-utils"
import type { LavoratoreRecord } from "../types/lavoratore"

export type WorkerProfileHeaderField =
  | "nome"
  | "cognome"
  | "descrizione_pubblica"
  | "email"
  | "telefono"
  | "sesso"
  | "nazionalita"
  | "data_di_nascita"

type WorkerProfileHeaderDraft = Record<WorkerProfileHeaderField, string>

type WorkerProfileHeaderProps = {
  worker: LavoratoreListItem
  workerRow: LavoratoreRecord
  statoLavoratoreOptions?: LookupOption[]
  disponibilitaOptions?: LookupOption[]
  motivazioniOptions?: LookupOption[]
  sessoOptions?: LookupOption[]
  nazionalitaOptions?: LookupOption[]
  onPatchField?: (
    field: WorkerProfileHeaderField,
    value: string | null
  ) => Promise<void> | void
  onStatoLavoratoreChange?: (value: string | null) => Promise<void> | void
  onDisponibilitaChange?: (value: string | null) => Promise<void> | void
  onDataRitornoDisponibilitaChange?: (value: string) => Promise<void> | void
  onMotivazioneChange?: (value: string | null) => Promise<void> | void
  fieldsDisabled?: boolean
  statoLavoratoreDisabled?: boolean
  disponibilitaDisabled?: boolean
  dataRitornoDisponibilitaDisabled?: boolean
  motivazioneDisabled?: boolean
  blacklistChecked?: boolean
  onBlacklistToggle?: (nextValue: boolean) => Promise<void> | void
  blacklistDisabled?: boolean
  presentationPhotoSlots?: string[]
  selectedPresentationPhotoIndex?: number
  onSelectedPresentationPhotoIndexChange?: (value: number) => void
  showAiImageEditAction?: boolean
  onAiImageEdit?: () => void
  showUploadPhotoAction?: boolean
  onUploadPhoto?: () => void
  selectedMotivazioneClassName?: string
}

const HR_OPTIONS = [
  { id: "giulia", label: "Giulia", avatar: "G" },
  { id: "elisa", label: "Elisa", avatar: "E" },
  { id: "francesca", label: "Francesca", avatar: "F" },
] as const

type HrId = (typeof HR_OPTIONS)[number]["id"]

function initialsFromName(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  )
}

function buildFormDefaults(row: LavoratoreRecord): WorkerProfileHeaderDraft {
  return {
    nome: asString(row.nome),
    cognome: asString(row.cognome),
    descrizione_pubblica: asString(row.descrizione_pubblica),
    email: asString(row.email),
    telefono: asString(row.telefono),
    sesso: asString(row.sesso),
    nazionalita: asString(row.nazionalita),
    data_di_nascita: asString(row.data_di_nascita),
  }
}

function hashString(input: string) {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

function getAssigneeIdFromSeed(seed: string): HrId {
  const index = hashString(seed) % HR_OPTIONS.length
  return HR_OPTIONS[index].id
}

function getHrById(assigneeId: HrId) {
  return HR_OPTIONS.find((option) => option.id === assigneeId) ?? HR_OPTIONS[0]
}

function getAssigneeAvatarBorderClass(assigneeId: HrId) {
  switch (assigneeId) {
    case "giulia":
      return "after:border-emerald-500"
    case "elisa":
      return "after:border-sky-500"
    case "francesca":
      return "after:border-violet-500"
    default:
      return ""
  }
}

function getGateAvatarStateClass(isCompleted: boolean, variant: "idoneo" | "certificato") {
  if (!isCompleted) {
    return {
      ringClassName: "ring-2 ring-zinc-300/50",
      badgeClassName: "bg-zinc-300 text-zinc-900",
    }
  }

  if (variant === "certificato") {
    return {
      ringClassName: "ring-2 ring-emerald-600/40",
      badgeClassName: "bg-success text-foreground-on-accent",
    }
  }

  return {
    ringClassName: "ring-2 ring-emerald-400/40",
    badgeClassName: "bg-emerald-400 text-emerald-950",
  }
}

function selectedOptionValue(selected: string | null, options: LookupOption[]) {
  return getLookupSelectValue(selected, options, "none")
}

// FASE 5 BIS — Select lookup (sesso/nazionalita) agganciato al form. La chiave
// del form contiene la LABEL DB (così i defaults da workerRow.X funzionano e
// onSave la passa direttamente a onPatchField). Il wrapper preserva il mapping
// label DB ↔ option-value (getLookupSelectValue / getLookupLabelForSave),
// resolveLookupSingleValueOptions per le opzioni e l'opzione "none" → "".
function FieldLookupSelect({
  name,
  options,
  placeholder,
  emptyLabel,
  triggerClassName,
  disabled,
}: {
  name: string
  options: LookupOption[]
  placeholder: string
  emptyLabel: string
  triggerClassName?: string
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const stored = typeof field.value === "string" ? field.value : ""
  const resolvedOptions = resolveLookupSingleValueOptions(stored || null, options)
  return (
    <Select
      value={getLookupSelectValue(stored, resolvedOptions, "none")}
      onValueChange={(next) =>
        field.onChange(next === "none" ? "" : getLookupLabelForSave(next, resolvedOptions))
      }
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{emptyLabel}</SelectItem>
        {resolvedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function WorkerProfileHeader({
  worker,
  workerRow,
  statoLavoratoreOptions = [],
  disponibilitaOptions = [],
  motivazioniOptions = [],
  sessoOptions = [],
  nazionalitaOptions = [],
  onPatchField,
  onStatoLavoratoreChange,
  onDisponibilitaChange,
  onDataRitornoDisponibilitaChange,
  onMotivazioneChange,
  fieldsDisabled = false,
  statoLavoratoreDisabled,
  disponibilitaDisabled,
  dataRitornoDisponibilitaDisabled,
  motivazioneDisabled,
  blacklistChecked = false,
  onBlacklistToggle,
  blacklistDisabled = false,
  presentationPhotoSlots = [],
  selectedPresentationPhotoIndex = 0,
  onSelectedPresentationPhotoIndexChange,
  showUploadPhotoAction = false,
  onUploadPhoto,
  selectedMotivazioneClassName,
}: WorkerProfileHeaderProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const StatusIcon = qualificationStatus.icon
  const statoLavoratore = asString(workerRow.stato_lavoratore)
  const disponibilita = asString(workerRow.disponibilita)
  const motivazione = readArrayStrings(workerRow.motivazione_non_idoneo)[0] ?? null
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    setIsEditing(false)
  }, [worker.id])

  const selectedStatusToken = (statoLavoratore ?? "").trim().toLowerCase().replaceAll("_", " ")
  const selectedDisponibilitaToken = (disponibilita ?? "")
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
  const dataRitornoDisponibilita = asString(workerRow.data_ritorno_disponibilita)
  const selectedStatusClassName =
    statoLavoratore &&
    (selectedStatusToken.includes("non qualificato") ||
      selectedStatusToken.includes("non idoneo"))
      ? "border-rose-200 bg-rose-100 text-rose-700"
      : "border-emerald-200 bg-emerald-100 text-emerald-700"
  const selectedDisponibilitaClassName =
    disponibilita && selectedDisponibilitaToken.includes("non disponibile")
      ? "border-rose-200 bg-rose-100 text-rose-700"
      : "border-emerald-200 bg-emerald-100 text-emerald-700"
  const motivationClassName = selectedMotivazioneClassName?.trim()
    ? selectedMotivazioneClassName
    : getTagClassName(null)
  const showMotivazioneSelect = selectedStatusToken === "non idoneo"
  const showDataRitornoDisponibilita =
    selectedDisponibilitaToken === "non disponibile"
  const gateControls = [
    {
      label: "Gate 1",
      icon: ShieldCheckIcon,
      assigneeId: getAssigneeIdFromSeed(`${worker.id}:gate-1`),
      isCompleted: worker.isIdoneo,
      variant: "idoneo" as const,
    },
    {
      label: "Gate 2",
      icon: BadgeCheckIcon,
      assigneeId: getAssigneeIdFromSeed(`${worker.id}:gate-2`),
      isCompleted: worker.isCertificato,
      variant: "certificato" as const,
    },
  ]

  const canUseSessoSelect = sessoOptions.length > 0
  const resolvedSessoOptions = resolveLookupSingleValueOptions(
    asString(workerRow.sesso) || null,
    sessoOptions
  )
  const resolvedNazionalitaOptions = resolveLookupSingleValueOptions(
    asString(workerRow.nazionalita) || null,
    nazionalitaOptions
  )
  const resolvedStatusDisabled = statoLavoratoreDisabled ?? !onStatoLavoratoreChange
  const resolvedDisponibilitaDisabled = disponibilitaDisabled ?? !onDisponibilitaChange
  const resolvedDataRitornoDisponibilitaDisabled =
    dataRitornoDisponibilitaDisabled ?? !onDataRitornoDisponibilitaChange
  const resolvedMotivazioneDisabled = motivazioneDisabled ?? !onMotivazioneChange

  // FASE 5 BIS — form + autosave. I defaults sono i valori server del record
  // (gli stessi init dei vecchi useDebouncedSave). onSave instrada ogni chiave
  // cambiata a onPatchField con le STESSE trasformazioni dell'originale:
  //  - testi → value.trim() || null
  //  - data_di_nascita → value || null
  //  - sesso/nazionalita (lookup) → la chiave del form contiene già la label DB
  //    (i wrapper sotto convertono option-value ↔ label), "" → null.
  const form = useAutoSaveForm<WorkerProfileHeaderDraft>({
    defaults: buildFormDefaults(workerRow),
    onSave: async (patch) => {
      for (const [key, rawValue] of Object.entries(patch)) {
        const field = key as WorkerProfileHeaderField
        const value = typeof rawValue === "string" ? rawValue : ""
        if (field === "data_di_nascita") {
          await onPatchField?.(field, value || null)
        } else {
          // testi + lookup (sesso/nazionalita): la label DB è già nel form.
          await onPatchField?.(field, value.trim() || null)
        }
      }
    },
  })

  const renderInlineLookupSelect = (
    label: string,
    value: string,
    options: LookupOption[],
    onValueChange: ((value: string | null) => Promise<void> | void) | undefined,
    triggerClassName: string,
    placeholder: string,
    isDisabled: boolean,
    emptyLabel: string,
  ) => (
    <div className="flex flex-col gap-1">
      <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">
        {label}
      </p>
      <Select
        value={selectedOptionValue(value, options)}
        onValueChange={(next) => {
          const nextValue =
            next === "none" ? null : getLookupLabelForSave(next, options)
          void onValueChange?.(nextValue)
        }}
        disabled={isDisabled}
      >
        <SelectTrigger className={cn("min-w-35", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{emptyLabel}</SelectItem>
          {resolveLookupSingleValueOptions(value, options).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Form {...form}>
    <div className="flex items-start gap-4">
      <div className="flex shrink-0 flex-col items-start gap-2 self-start">
        {isEditing && presentationPhotoSlots.length > 0 ? (
          <div
            className={cn(
              "relative h-32 w-32 overflow-hidden rounded-lg border",
              qualificationStatus.ringClassName,
            )}
            title={qualificationStatus.label}
          >
            <Carousel
              key={presentationPhotoSlots.join("|")}
              opts={{ loop: false }}
              className="h-full w-full"
            >
              <CarouselContent className="ml-0 h-full">
                {presentationPhotoSlots.map((photoUrl, index) => (
                  <CarouselItem key={photoUrl} className="h-full basis-full pl-0">
                    <div className="h-full">
                      <Card className="h-full rounded-none border-0 shadow-none">
                        <CardContent className="bg-muted/20 relative flex h-full items-center justify-center p-0">
                          <AttachmentImage
                            src={photoUrl}
                            alt={`Foto profilo ${index + 1}`}
                            downloadName={`Foto profilo ${index + 1}`}
                            loading={index === 0 ? "eager" : "lazy"}
                            decoding="async"
                            className="h-full w-full object-contain"
                          />
                          {onSelectedPresentationPhotoIndexChange ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant={
                                selectedPresentationPhotoIndex === index
                                  ? "default"
                                  : "secondary"
                              }
                              aria-label={
                                selectedPresentationPhotoIndex === index
                                  ? "Foto principale"
                                  : "Imposta come foto principale"
                              }
                              title={
                                selectedPresentationPhotoIndex === index
                                  ? "Foto principale"
                                  : "Imposta come foto principale"
                              }
                              className="absolute top-2 right-2 rounded-full bg-background/90"
                              onClick={() => onSelectedPresentationPhotoIndexChange(index)}
                            >
                              <StarIcon className="size-4" />
                            </Button>
                          ) : null}
                          <span
                            className={cn(
                              "absolute left-2 bottom-2 inline-flex size-5 items-center justify-center rounded-full",
                              qualificationStatus.badgeClassName,
                            )}
                          >
                            <StatusIcon className="size-3.5" />
                          </span>
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2" />
              <CarouselNext className="right-2" />
            </Carousel>
          </div>
        ) : (
          <div className="relative inline-block">
            <WorkerAvatar
              size="xl"
              src={worker.immagineUrl}
              type={worker.immagineType}
              alt={worker.nomeCompleto}
              fallback={initialsFromName(worker.nomeCompleto)}
              className={qualificationStatus.ringClassName}
            />
            <span
              aria-hidden
              title={qualificationStatus.label}
              className={cn(
                "absolute -bottom-0.5 -right-0.5 inline-flex size-5 items-center justify-center rounded-full ring-2 ring-white",
                qualificationStatus.badgeClassName,
              )}
            >
              <StatusIcon className="size-3" />
            </span>
          </div>
        )}

        {isEditing && showUploadPhotoAction ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-center"
            onClick={() => onUploadPhoto?.()}
            disabled={!onUploadPhoto}
          >
            <UploadIcon className="size-3.5" />
            Carica
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="min-w-0">
          <div className="min-w-0">
            <div className="flex min-w-0 items-start gap-2">
              {isEditing ? (
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  <FieldInput
                    name="nome"
                    disabled={fieldsDisabled}
                    placeholder="Nome"
                    className="w-40"
                  />
                  <FieldInput
                    name="cognome"
                    disabled={fieldsDisabled}
                    placeholder="Cognome"
                    className="w-40"
                  />
                </div>
              ) : (
                <h2 className="line-clamp-2 min-w-0 text-2xl leading-tight font-semibold break-words">
                  {worker.nomeCompleto}
                </h2>
              )}

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={isEditing ? "Termina modifica profilo" : "Modifica profilo"}
                  title={isEditing ? "Termina modifica profilo" : "Modifica profilo"}
                  onClick={() => setIsEditing((current) => !current)}
                >
                  <PencilIcon />
                </Button>
                {onBlacklistToggle ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      blacklistChecked ? "Rimuovi da blacklist" : "Aggiungi a blacklist"
                    }
                    title={
                      blacklistChecked ? "Rimuovi da blacklist" : "Aggiungi a blacklist"
                    }
                    onClick={() => void onBlacklistToggle(!blacklistChecked)}
                    disabled={blacklistDisabled}
                    className={blacklistChecked ? "text-red-600 hover:text-red-700" : undefined}
                  >
                    <SkullIcon />
                  </Button>
                ) : null}
              </div>
            </div>

            {isEditing ? (
              <FieldTextarea
                name="descrizione_pubblica"
                disabled={fieldsDisabled}
                className="mt-2 min-h-20"
              />
            ) : (
              <p className="text-muted-foreground line-clamp-3 text-sm leading-5 mt-1">
                {asString(workerRow.descrizione_pubblica) || "-"}
              </p>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-3">
            {showMotivazioneSelect
              ? renderInlineLookupSelect(
                  "Motivazione",
                  motivazione ?? "",
                  motivazioniOptions,
                  onMotivazioneChange,
                  motivationClassName,
                  "Motivazione",
                  resolvedMotivazioneDisabled,
                  "Nessuna",
                )
              : null}
            {renderInlineLookupSelect(
              "Stato",
              statoLavoratore,
              statoLavoratoreOptions,
              onStatoLavoratoreChange,
              selectedStatusClassName,
              "Stato",
              resolvedStatusDisabled,
              "Senza stato",
            )}
            {renderInlineLookupSelect(
              "Disponibile",
              disponibilita,
              disponibilitaOptions,
              onDisponibilitaChange,
              selectedDisponibilitaClassName,
              "Disponibilita",
              resolvedDisponibilitaDisabled,
              "Non indicata",
            )}
            {showDataRitornoDisponibilita ? (
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-[0.14em]">
                  Ritorno
                </p>
                <Input
                  type="date"
                  value={dataRitornoDisponibilita}
                  onChange={(event) =>
                    void onDataRitornoDisponibilitaChange?.(event.target.value)
                  }
                  disabled={resolvedDataRitornoDisponibilitaDisabled}
                  className="min-w-35"
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <MailIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              <FieldInput
                name="email"
                type="email"
                disabled={fieldsDisabled}
                className="w-64"
              />
            ) : (
              <span className="truncate">{asString(workerRow.email) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <PhoneIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              <FieldInput
                name="telefono"
                type="tel"
                disabled={fieldsDisabled}
                className="w-40"
              />
            ) : (
              <span>{asString(workerRow.telefono) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span>{asString(workerRow.cap) || "-"}</span>
          </span>

          <span className="inline-flex items-center gap-1.5">
            <VenusAndMarsIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              canUseSessoSelect ? (
                <FieldLookupSelect
                  name="sesso"
                  options={resolvedSessoOptions}
                  placeholder="Sesso"
                  emptyLabel="Non indicato"
                  triggerClassName="w-36"
                  disabled={fieldsDisabled}
                />
              ) : (
                <FieldInput
                  name="sesso"
                  disabled={fieldsDisabled}
                  placeholder="Sesso"
                  className="w-36"
                />
              )
            ) : (
              <span>{asString(workerRow.sesso) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <FlagIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              <FieldLookupSelect
                name="nazionalita"
                options={resolvedNazionalitaOptions}
                placeholder="Nazionalita"
                emptyLabel="Non indicata"
                triggerClassName="w-44"
                disabled={fieldsDisabled}
              />
            ) : (
              <span>{asString(workerRow.nazionalita) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              <FieldInput
                name="data_di_nascita"
                type="date"
                disabled={fieldsDisabled}
                className="w-40"
              />
            ) : (
              <span>{asString(workerRow.data_di_nascita) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CakeIcon className="size-3.5 shrink-0" />
            <span>{getAgeFromBirthDate(workerRow.data_di_nascita) ?? "-"}</span>
          </span>

          {worker.id ? (
            <span
              className="inline-flex items-center gap-1.5 min-w-0"
              title="Link invito referral"
            >
              <Share2Icon className="size-3.5 shrink-0" />
              <span>Link Referral</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                title="Copia link invito"
                onClick={() => {
                  const url = `https://lavoro.bazeapp.com/v2/registrazione/invita-amici?invito_referrer=${worker.id}`
                  void navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success("Link invito copiato"))
                    .catch(() => toast.error("Impossibile copiare"))
                }}
              >
                <CopyIcon className="size-3.5" />
              </Button>
              <a
                href={`https://lavoro.bazeapp.com/v2/registrazione/invita-amici?invito_referrer=${worker.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                title="Apri link invito"
              >
                <ExternalLinkIcon className="size-3.5" />
              </a>
            </span>
          ) : null}

          {gateControls.map((control) => {
            const hr = getHrById(control.assigneeId)
            const Icon = control.icon
            const stateClasses = getGateAvatarStateClass(
              control.isCompleted,
              control.variant,
            )
            return (
              <span
                key={control.label}
                className="inline-flex items-center gap-1.5"
                title={`${control.label} · ${hr.label}`}
              >
                <Icon
                  strokeWidth={2.5}
                  className={cn(
                    "size-3.5 shrink-0",
                    control.isCompleted
                      ? control.variant === "certificato"
                        ? "text-emerald-600"
                        : "text-emerald-500"
                      : "text-zinc-400",
                  )}
                />
                <span className="relative inline-block">
                  <Avatar
                    size="xs"
                    fallback={hr.avatar}
                    className={cn(
                      getAssigneeAvatarBorderClass(control.assigneeId),
                      stateClasses.ringClassName,
                    )}
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 inline-flex size-2.5 items-center justify-center rounded-full ring-2 ring-white [&_svg]:size-1.5",
                      stateClasses.badgeClassName,
                    )}
                  >
                    <Icon />
                  </span>
                </span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
    </Form>
  )
}
