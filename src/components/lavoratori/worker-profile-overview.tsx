import {
  CakeIcon,
  CalendarDaysIcon,
  FlagIcon,
  LanguagesIcon,
  MailIcon,
  PhoneIcon,
  StarIcon,
  UploadIcon,
  VenusAndMarsIcon,
} from "lucide-react"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { asString, getAgeFromBirthDate } from "@/features/lavoratori/lib/base-utils"
import { getWorkerQualificationStatus } from "@/features/lavoratori/lib/status-utils"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const EMPTY_SELECT_VALUE = "none"

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
import type { LavoratoreRecord } from "@/types/entities/lavoratore"

type WorkerProfileOverviewProps = {
  worker: LavoratoreListItem
  workerRow: LavoratoreRecord
  isEditing?: boolean
  draft?: {
    nome: string
    cognome: string
    email: string
    telefono: string
    sesso: string
    nazionalita: string
    data_di_nascita: string
    descrizione_pubblica: string
  }
  livelloItaliano?: string
  livelloItalianoOptions?: Array<{ label: string; value: string }>
  sessoOptions?: Array<{ label: string; value: string }>
  nazionalitaOptions?: Array<{ label: string; value: string }>
  presentationPhotoSlots?: string[]
  selectedPresentationPhotoIndex?: number
  showUploadPhotoAction?: boolean
  uploadingPhoto?: boolean
  onUploadPhoto?: () => void
  onSelectedPresentationPhotoIndexChange?: (value: number) => void
  onLivelloItalianoChange?: (value: string) => void
  onLivelloItalianoBlur?: () => void
  onFieldChange?: (field: string, value: string) => void
  onFieldBlur?: (field: string) => void
}

export function WorkerProfileOverview({
  worker,
  workerRow,
  isEditing = false,
  draft,
  livelloItaliano,
  livelloItalianoOptions = [],
  sessoOptions = [],
  nazionalitaOptions = [],
  presentationPhotoSlots = [],
  selectedPresentationPhotoIndex = 0,
  showUploadPhotoAction = false,
  uploadingPhoto = false,
  onUploadPhoto,
  onSelectedPresentationPhotoIndexChange,
  onLivelloItalianoChange,
  onLivelloItalianoBlur,
  onFieldChange,
  onFieldBlur,
}: WorkerProfileOverviewProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const StatusIcon = qualificationStatus.icon
  const canUseSessoSelect = sessoOptions.length > 0
  const resolvedNazionalitaOptions =
    nazionalitaOptions.length > 0
      ? nazionalitaOptions
      : draft?.nazionalita
        ? [{ label: draft.nazionalita, value: draft.nazionalita }]
        : []

  return (
    <div className="mb-6 flex items-start gap-4">
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
                              onClick={() =>
                                onSelectedPresentationPhotoIndexChange(index)
                              }
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
            disabled={uploadingPhoto || !onUploadPhoto}
            onClick={onUploadPhoto}
            className="w-full justify-center"
          >
            <UploadIcon className="size-3.5" />
            {uploadingPhoto ? "Caricamento..." : "Carica"}
          </Button>
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          {isEditing && draft ? (
            <div className="space-y-2">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={draft.nome}
                  onChange={(event) => onFieldChange?.("nome", event.target.value)}
                  onBlur={() => onFieldBlur?.("nome")}
                  placeholder="Nome"
                  className="w-full sm:max-w-52"
                />
                <Input
                  value={draft.cognome}
                  onChange={(event) => onFieldChange?.("cognome", event.target.value)}
                  onBlur={() => onFieldBlur?.("cognome")}
                  placeholder="Cognome"
                  className="w-full sm:max-w-52"
                />
              </div>
              <Textarea
                value={draft.descrizione_pubblica}
                onChange={(event) =>
                  onFieldChange?.("descrizione_pubblica", event.target.value)
                }
                onBlur={() => onFieldBlur?.("descrizione_pubblica")}
                rows={3}
                className="min-h-24"
              />
            </div>
          ) : (
            <>
              <div className="flex items-start gap-2">
                <p className="truncate text-2xl leading-tight font-semibold">
                  {worker.nomeCompleto}
                </p>
              </div>
              <p className="text-muted-foreground line-clamp-4 text-sm leading-5">
                {asString(workerRow.descrizione_pubblica) || "-"}
              </p>
            </>
          )}
        </div>

        <div className="space-y-2 pt-3">
          <div className="text-muted-foreground flex items-center gap-2">
            <MailIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.email}
                onChange={(event) => onFieldChange?.("email", event.target.value)}
                onBlur={() => onFieldBlur?.("email")}
                type="email"
                className="max-w-md"
              />
            ) : (
              <span className="truncate">{asString(workerRow.email) || "-"}</span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <PhoneIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.telefono}
                onChange={(event) => onFieldChange?.("telefono", event.target.value)}
                onBlur={() => onFieldBlur?.("telefono")}
                type="tel"
                className="max-w-xs"
              />
            ) : (
              <span className="truncate">{asString(workerRow.telefono) || "-"}</span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2" title="Livello italiano">
            <LanguagesIcon className="size-4 shrink-0" />
            {isEditing && livelloItaliano !== undefined ? (
              <div className="w-full max-w-xs">
                <Select
                  value={livelloItaliano || EMPTY_SELECT_VALUE}
                  onValueChange={(value) =>
                    onLivelloItalianoChange?.(
                      value === EMPTY_SELECT_VALUE ? "" : value
                    )
                  }
                >
                  <SelectTrigger onBlur={onLivelloItalianoBlur}>
                    <SelectValue placeholder="Seleziona livello" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
                    {livelloItalianoOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <span className="truncate">
                {livelloItalianoOptions.find(
                  (option) => option.value === asString(workerRow.livello_italiano)
                )?.label || asString(workerRow.livello_italiano) || "-"}
              </span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <VenusAndMarsIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              canUseSessoSelect ? (
                <div className="w-full max-w-xs">
                  <Select
                    value={draft.sesso || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      onFieldChange?.(
                        "sesso",
                        value === EMPTY_SELECT_VALUE ? "" : value
                      )
                    }
                  >
                    <SelectTrigger onBlur={() => onFieldBlur?.("sesso")}>
                      <SelectValue placeholder="Seleziona sesso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Non indicato</SelectItem>
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
                  onChange={(event) => onFieldChange?.("sesso", event.target.value)}
                  onBlur={() => onFieldBlur?.("sesso")}
                  className="max-w-xs"
                />
              )
            ) : (
              <span className="truncate">{asString(workerRow.sesso) || "-"}</span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <FlagIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <div className="w-full max-w-xs">
                <Select
                  value={draft.nazionalita || EMPTY_SELECT_VALUE}
                  onValueChange={(value) =>
                    onFieldChange?.(
                      "nazionalita",
                      value === EMPTY_SELECT_VALUE ? "" : value
                    )
                  }
                >
                  <SelectTrigger onBlur={() => onFieldBlur?.("nazionalita")}>
                    <SelectValue placeholder="Seleziona nazionalita" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SELECT_VALUE}>Non indicata</SelectItem>
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
          <div className="text-muted-foreground flex items-center gap-2">
            <CalendarDaysIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.data_di_nascita}
                onChange={(event) => onFieldChange?.("data_di_nascita", event.target.value)}
                onBlur={() => onFieldBlur?.("data_di_nascita")}
                type="date"
                className="max-w-xs"
              />
            ) : (
              <span className="truncate">{asString(workerRow.data_di_nascita) || "-"}</span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2">
            <CakeIcon className="size-4 shrink-0" />
            <span className="truncate">{getAgeFromBirthDate(workerRow.data_di_nascita) ?? "-"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
