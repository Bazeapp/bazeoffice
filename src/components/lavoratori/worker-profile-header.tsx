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
import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"
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
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
  headerLayout?: "side" | "stacked"
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
      badgeClassName: "bg-emerald-600 text-white",
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
  headerLayout = "side",
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
  const usesStackedHeaderLayout = headerLayout === "stacked"

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

  return (
    <div className="mb-2 flex items-start gap-5">
      <div className="flex w-52 shrink-0 flex-col gap-2 self-start">
        {isEditing && presentationPhotoSlots.length > 0 ? (
          <div
            className={`relative h-80 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
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
                      <Card className="h-full rounded-none border-0 py-0 shadow-none">
                        <CardContent className="bg-muted/20 relative flex h-full min-h-80 items-center justify-center p-0">
                          <img
                            src={photoUrl}
                            alt={`Foto profilo ${index + 1}`}
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
                            className={`absolute left-2 bottom-2 inline-flex size-5 items-center justify-center rounded-full ${qualificationStatus.badgeClassName}`}
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
          <div
            className={`bg-muted relative flex h-80 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
            title={qualificationStatus.label}
          >
            {worker.immagineUrl ? (
              <img
                src={worker.immagineUrl}
                alt={worker.nomeCompleto}
                className="h-full w-full object-contain"
              />
            ) : (
              <span className="text-muted-foreground px-2 text-center text-xs">
                Nessuna immagine
              </span>
            )}
            <span
              className={`absolute right-1 bottom-1 inline-flex size-5 items-center justify-center rounded-full ${qualificationStatus.badgeClassName}`}
            >
              <StatusIcon className="size-3.5" />
            </span>
          </div>
        )}

        {isEditing && showUploadPhotoAction ? (
          <Button
            type="button"
            variant="outline"
            className="w-full justify-center"
            onClick={() => onUploadPhoto?.()}
            disabled={!onUploadPhoto}
          >
            <UploadIcon className="size-4" />
            Carica nuova immagine
          </Button>
        ) : null}
      </div>

      <div className="min-w-0 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              {isEditing ? (
                <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
                  <Input
                    value={draft.nome}
                    onChange={(event) => updateDraftField("nome", event.target.value)}
                    onBlur={() => void commitField("nome")}
                    disabled={fieldsDisabled}
                    placeholder="Nome"
                    className="h-8 w-40 text-sm"
                  />
                  <Input
                    value={draft.cognome}
                    onChange={(event) => updateDraftField("cognome", event.target.value)}
                    onBlur={() => void commitField("cognome")}
                    disabled={fieldsDisabled}
                    placeholder="Cognome"
                    className="h-8 w-40 text-sm"
                  />
                </div>
              ) : (
                <p className="truncate text-2xl leading-tight font-semibold">{worker.nomeCompleto}</p>
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
                className="bg-background mt-2 min-h-20 text-sm"
              />
            ) : (
              <p className="text-muted-foreground line-clamp-4 text-sm leading-5">
                {asString(workerRow.descrizione_pubblica) || "-"}
              </p>
            )}
          </div>

        </div>

        <Separator className="my-3" />

        <div
          className={`grid items-start gap-6 ${
            usesStackedHeaderLayout
              ? "grid-cols-[minmax(0,1fr)_auto]"
              : showMotivazioneSelect
                ? "grid-cols-[minmax(0,1fr)_452px]"
                : "grid-cols-[minmax(0,1fr)_220px]"
          }`}
        >
          <div className="min-w-0 space-y-2">
            <div className="text-muted-foreground flex items-center gap-2">
              <MailIcon className="size-4 shrink-0" />
              {isEditing ? (
                <div className="w-full max-w-md">
                  <Input
                    type="email"
                    value={draft.email}
                    onChange={(event) => updateDraftField("email", event.target.value)}
                    onBlur={() => void commitField("email")}
                    disabled={fieldsDisabled}
                    className="h-7 text-sm"
                  />
                </div>
              ) : (
                <span className="truncate">{asString(workerRow.email) || "-"}</span>
              )}
            </div>

            <div className="text-muted-foreground flex items-center gap-2">
              <PhoneIcon className="size-4 shrink-0" />
              {isEditing ? (
                <div className="w-full max-w-xs">
                  <Input
                    type="tel"
                    value={draft.telefono}
                    onChange={(event) => updateDraftField("telefono", event.target.value)}
                    onBlur={() => void commitField("telefono")}
                    disabled={fieldsDisabled}
                    className="h-7 text-sm"
                  />
                </div>
              ) : (
                <span className="truncate">{asString(workerRow.telefono) || "-"}</span>
              )}
            </div>

            <div className="text-muted-foreground flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0" />
              <span className="truncate">{asString(workerRow.cap) || "-"}</span>
            </div>

            <div className="text-muted-foreground flex items-center gap-2">
              <VenusAndMarsIcon className="size-4 shrink-0" />
              {isEditing ? (
                canUseSessoSelect ? (
                  <div className="w-full max-w-xs">
                    <Select
                      value={draft.sesso || "none"}
                      onValueChange={(value) => void handleLookupFieldChange("sesso", value)}
                      disabled={fieldsDisabled}
                    >
                      <SelectTrigger className="h-7">
                        <SelectValue placeholder="Seleziona sesso" />
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
                  </div>
                ) : (
                  <Input
                    value={draft.sesso}
                    onChange={(event) => updateDraftField("sesso", event.target.value)}
                    onBlur={() => void commitField("sesso")}
                    disabled={fieldsDisabled}
                    placeholder="Sesso"
                    className="h-7 w-48 text-sm"
                  />
                )
              ) : (
                <span className="truncate">{asString(workerRow.sesso) || "-"}</span>
              )}
            </div>

            <div className="text-muted-foreground flex items-center gap-2">
              <FlagIcon className="size-4 shrink-0" />
              {isEditing ? (
                <div className="w-full max-w-xs">
                  <Select
                    value={draft.nazionalita || "none"}
                    onValueChange={(value) =>
                      void handleLookupFieldChange("nazionalita", value)
                    }
                    disabled={fieldsDisabled}
                  >
                    <SelectTrigger className="h-7">
                      <SelectValue placeholder="Seleziona nazionalita" />
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
                </div>
              ) : (
                <span className="truncate">{asString(workerRow.nazionalita) || "-"}</span>
              )}
            </div>

            <p className="text-muted-foreground flex items-center gap-2">
              <CalendarDaysIcon className="size-4 shrink-0" />
              {isEditing ? (
                <div className="w-full max-w-xs">
                  <Input
                    type="date"
                    value={draft.data_di_nascita}
                    onChange={(event) =>
                      updateDraftField("data_di_nascita", event.target.value)
                    }
                    onBlur={() => void commitField("data_di_nascita")}
                    disabled={fieldsDisabled}
                    className="h-7 text-sm"
                  />
                </div>
              ) : (
                <span className="truncate">{asString(workerRow.data_di_nascita) || "-"}</span>
              )}
            </p>

            <p className="text-muted-foreground flex items-center gap-2">
              <CakeIcon className="size-4 shrink-0" />
              <span className="truncate">{getAgeFromBirthDate(workerRow.data_di_nascita) ?? "-"}</span>
            </p>
          </div>

          <div
            className={`flex gap-3 self-start ${
              usesStackedHeaderLayout
                ? "ml-auto min-w-[220px] flex-col items-end"
                : "flex-col items-end"
            }`}
          >
            <div
              className={`flex gap-2 ${
                usesStackedHeaderLayout
                  ? "w-full flex-col items-end"
                  : "w-full justify-end"
              }`}
            >
              {showMotivazioneSelect ? (
                <div
                  className={
                    usesStackedHeaderLayout ? "w-full shrink-0" : "w-[230px] shrink-0"
                  }
                >
                  <Select
                    value={motivazione ?? "none"}
                    onValueChange={(value) =>
                      void onMotivazioneChange?.(value === "none" ? null : value)
                    }
                    disabled={resolvedMotivazioneDisabled}
                  >
                    <SelectTrigger className={`h-8 w-full ${motivationClassName}`}>
                      <SelectValue placeholder="Motivazione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna motivazione</SelectItem>
                      {motivazioniOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className={usesStackedHeaderLayout ? "w-full shrink-0" : "w-[220px] shrink-0"}>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
                    Stato lavoratore
                  </p>
                  <Select
                    value={selectedOptionValue(statoLavoratore, statoLavoratoreOptions)}
                    onValueChange={(value) =>
                      void onStatoLavoratoreChange?.(value === "none" ? null : value)
                    }
                    disabled={resolvedStatusDisabled}
                  >
                    <SelectTrigger className={`h-8 w-full ${selectedStatusClassName}`}>
                      <SelectValue placeholder="Stato lavoratore" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Senza stato</SelectItem>
                      {resolveSingleValueOptions(statoLavoratore, statoLavoratoreOptions).map(
                        (option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div
              className={
                usesStackedHeaderLayout ? "w-full shrink-0 self-end" : "w-[220px] shrink-0 self-end"
              }
            >
              <div className="space-y-1.5">
                <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
                  Disponibile
                </p>
                <Select
                  value={selectedOptionValue(disponibilita, disponibilitaOptions)}
                  onValueChange={(value) =>
                    void onDisponibilitaChange?.(value === "none" ? null : value)
                  }
                  disabled={resolvedDisponibilitaDisabled}
                >
                  <SelectTrigger className={`h-8 w-full ${selectedDisponibilitaClassName}`}>
                    <SelectValue placeholder="Disponibilita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non indicata</SelectItem>
                    {resolveSingleValueOptions(disponibilita, disponibilitaOptions).map(
                      (option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showDataRitornoDisponibilita ? (
              <div
                className={
                  usesStackedHeaderLayout
                    ? "w-full shrink-0 self-end"
                    : "w-[220px] shrink-0 self-end"
                }
              >
                <div className="space-y-1.5">
                  <p className="text-muted-foreground text-[11px] font-medium tracking-[0.18em] uppercase">
                    Ritorno disponibilita
                  </p>
                  <Input
                    type="date"
                    value={dataRitornoDisponibilita}
                    onChange={(event) =>
                      void onDataRitornoDisponibilitaChange?.(event.target.value)
                    }
                    disabled={resolvedDataRitornoDisponibilitaDisabled}
                    className="h-8 w-full bg-background text-sm"
                  />
                </div>
              </div>
            ) : null}

            <div
              className={`gap-3 ${
                usesStackedHeaderLayout
                  ? "flex w-full items-center justify-end self-end"
                  : "grid w-[220px] grid-cols-2 justify-items-end"
              }`}
            >
              {gateControls.map((control, index) => {
                const hr = getHrById(control.assigneeId)
                const Icon = control.icon
                const stateClasses = getGateAvatarStateClass(
                  control.isCompleted,
                  control.variant
                )

                return (
                  <div
                    key={control.label}
                    className={
                      !usesStackedHeaderLayout && index > 0
                        ? "border-border flex items-center justify-end border-l pl-3"
                        : usesStackedHeaderLayout
                          ? "flex items-center justify-end"
                          : "flex items-center justify-end"
                    }
                  >
                    <div
                      className="flex items-center gap-2"
                      title={`${control.label} assegnato a ${hr.label}`}
                    >
                      <Icon
                        strokeWidth={2.5}
                        className={`size-3.5 shrink-0 ${
                          control.isCompleted
                            ? control.variant === "certificato"
                              ? "text-emerald-600"
                              : "text-emerald-500"
                            : "text-zinc-400"
                        }`}
                      />
                      <Avatar
                        size="sm"
                        className={`${getAssigneeAvatarBorderClass(control.assigneeId)} ${stateClasses.ringClassName}`}
                      >
                        <AvatarFallback>{hr.avatar}</AvatarFallback>
                        <AvatarBadge className={stateClasses.badgeClassName}>
                          <Icon />
                        </AvatarBadge>
                      </Avatar>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
