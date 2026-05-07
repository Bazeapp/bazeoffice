import * as React from "react"
import {
  BadgeCheckIcon,
  CakeIcon,
  CalendarDaysIcon,
  FlagIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  ShieldCheckIcon,
  SkullIcon,
  StarIcon,
  UploadIcon,
  VenusAndMarsIcon,
} from "lucide-react"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { Avatar } from "@/components/ui/avatar"
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
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  asString,
  getAgeFromBirthDate,
  readArrayStrings,
} from "@/features/lavoratori/lib/base-utils"
import {
  getTagClassName,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils"
import { getWorkerQualificationStatus } from "@/features/lavoratori/lib/status-utils"
import type { LavoratoreRecord } from "@/types/entities/lavoratore"

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

function buildDraft(row: LavoratoreRecord): WorkerProfileHeaderDraft {
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

function resolveSingleValueOptions(value: string | null, options: LookupOption[]) {
  if (options.length > 0) return options
  if (!value) return []
  return [{ value, label: value }]
}

function selectedOptionValue(selected: string | null, options: LookupOption[]) {
  const normalizedSelected = String(selected ?? "").trim().toLowerCase()
  if (!normalizedSelected) return "none"

  const resolved = resolveSingleValueOptions(selected, options)
  const match = resolved.find(
    (option) =>
      option.value.trim().toLowerCase() === normalizedSelected ||
      option.label.trim().toLowerCase() === normalizedSelected
  )

  return match?.value ?? "none"
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
  const [draft, setDraft] = React.useState<WorkerProfileHeaderDraft>(() =>
    buildDraft(workerRow)
  )

  React.useEffect(() => {
    setDraft(buildDraft(workerRow))
  }, [workerRow])

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
  const resolvedNazionalitaOptions = resolveSingleValueOptions(
    asString(workerRow.nazionalita) || null,
    nazionalitaOptions
  )
  const resolvedStatusDisabled = statoLavoratoreDisabled ?? !onStatoLavoratoreChange
  const resolvedDisponibilitaDisabled = disponibilitaDisabled ?? !onDisponibilitaChange
  const resolvedDataRitornoDisponibilitaDisabled =
    dataRitornoDisponibilitaDisabled ?? !onDataRitornoDisponibilitaChange
  const resolvedMotivazioneDisabled = motivazioneDisabled ?? !onMotivazioneChange

  const updateDraftField = React.useCallback(
    (field: WorkerProfileHeaderField, value: string) => {
      setDraft((current) => ({
        ...current,
        [field]: value,
      }))
    },
    []
  )

  const commitField = React.useCallback(
    async (field: WorkerProfileHeaderField) => {
      if (!onPatchField) return
      const rawValue = draft[field]
      const nextValue = field === "data_di_nascita" ? rawValue : rawValue.trim()
      await onPatchField(field, nextValue || null)
    },
    [draft, onPatchField]
  )

  const handleLookupFieldChange = React.useCallback(
    async (field: "sesso" | "nazionalita", value: string) => {
      const nextValue = value === "none" ? "" : value
      updateDraftField(field, nextValue)
      await onPatchField?.(field, nextValue || null)
    },
    [onPatchField, updateDraftField]
  )

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
        onValueChange={(next) =>
          void onValueChange?.(next === "none" ? null : next)
        }
        disabled={isDisabled}
      >
        <SelectTrigger className={cn("min-w-35", triggerClassName)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{emptyLabel}</SelectItem>
          {resolveSingleValueOptions(value, options).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
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
                          <img
                            src={photoUrl}
                            alt={`Foto profilo ${index + 1}`}
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
            <Avatar
              size="xl"
              src={worker.immagineUrl ?? undefined}
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
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={draft.nome}
                    onChange={(event) => updateDraftField("nome", event.target.value)}
                    onBlur={() => void commitField("nome")}
                    disabled={fieldsDisabled}
                    placeholder="Nome"
                    className="w-40"
                  />
                  <Input
                    value={draft.cognome}
                    onChange={(event) => updateDraftField("cognome", event.target.value)}
                    onBlur={() => void commitField("cognome")}
                    disabled={fieldsDisabled}
                    placeholder="Cognome"
                    className="w-40"
                  />
                </div>
              ) : (
                <h2 className="truncate text-2xl leading-tight font-semibold">
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
              <Textarea
                value={draft.descrizione_pubblica}
                onChange={(event) =>
                  updateDraftField("descrizione_pubblica", event.target.value)
                }
                onBlur={() => void commitField("descrizione_pubblica")}
                disabled={fieldsDisabled}
                className="mt-2 min-h-20"
              />
            ) : (
              <p className="text-muted-foreground line-clamp-3 text-sm leading-5 mt-1">
                {asString(workerRow.descrizione_pubblica) || "-"}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-start gap-3">
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
              <Input
                type="email"
                value={draft.email}
                onChange={(event) => updateDraftField("email", event.target.value)}
                onBlur={() => void commitField("email")}
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
              <Input
                type="tel"
                value={draft.telefono}
                onChange={(event) => updateDraftField("telefono", event.target.value)}
                onBlur={() => void commitField("telefono")}
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
                <Select
                  value={draft.sesso || "none"}
                  onValueChange={(value) => void handleLookupFieldChange("sesso", value)}
                  disabled={fieldsDisabled}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Sesso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non indicato</SelectItem>
                    {sessoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={draft.sesso}
                  onChange={(event) => updateDraftField("sesso", event.target.value)}
                  onBlur={() => void commitField("sesso")}
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
              <Select
                value={draft.nazionalita || "none"}
                onValueChange={(value) =>
                  void handleLookupFieldChange("nazionalita", value)
                }
                disabled={fieldsDisabled}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Nazionalita" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non indicata</SelectItem>
                  {resolvedNazionalitaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span>{asString(workerRow.nazionalita) || "-"}</span>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5">
            <CalendarDaysIcon className="size-3.5 shrink-0" />
            {isEditing ? (
              <Input
                type="date"
                value={draft.data_di_nascita}
                onChange={(event) =>
                  updateDraftField("data_di_nascita", event.target.value)
                }
                onBlur={() => void commitField("data_di_nascita")}
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
  )
}
