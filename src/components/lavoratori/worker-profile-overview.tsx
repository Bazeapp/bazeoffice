import {
  CakeIcon,
  CalendarDaysIcon,
  FlagIcon,
  LanguagesIcon,
  MailIcon,
  PhoneIcon,
  StarIcon,
  VenusAndMarsIcon,
} from "lucide-react"

import type { LavoratoreListItem } from "@/components/lavoratori/lavoratore-card"
import { asString, getAgeFromBirthDate } from "@/features/lavoratori/lib/base-utils"
import { getWorkerQualificationStatus } from "@/features/lavoratori/lib/status-utils"
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
  onSelectedPresentationPhotoIndexChange,
  onLivelloItalianoChange,
  onLivelloItalianoBlur,
  onFieldChange,
  onFieldBlur,
}: WorkerProfileOverviewProps) {
  const qualificationStatus = getWorkerQualificationStatus(worker)
  const StatusIcon = qualificationStatus.icon
  const canUseSessoSelect = sessoOptions.length > 0
  const canUseNazionalitaSelect = nazionalitaOptions.length > 0

  return (
    <div className="mb-6 flex items-stretch gap-5">
      <div className="flex w-52 shrink-0 flex-col gap-2 self-stretch">
        {isEditing && presentationPhotoSlots.length > 0 ? (
          <div
            className={`relative min-h-0 flex-1 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
            title={qualificationStatus.label}
          >
            <Carousel opts={{ loop: false }} className="h-full w-full">
              <CarouselContent className="ml-0 h-full">
                {presentationPhotoSlots.map((photoUrl, index) => (
                  <CarouselItem
                    key={photoUrl}
                    className="h-full basis-full pl-0"
                  >
                    <div className="h-full">
                      <Card className="h-full rounded-none border-0 py-0 shadow-none">
                        <CardContent className="relative flex h-full min-h-80 items-center justify-center p-0">
                          <img
                            src={photoUrl}
                            alt={`Foto profilo ${index + 1}`}
                            className="h-full w-full object-cover"
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
                              className="absolute right-2 bottom-2 rounded-full"
                              onClick={() =>
                                onSelectedPresentationPhotoIndexChange(index)
                              }
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
            className={`bg-muted relative flex flex-1 overflow-hidden rounded-lg border ${qualificationStatus.ringClassName}`}
            title={qualificationStatus.label}
          >
            {worker.immagineUrl ? (
              <img
                src={worker.immagineUrl}
                alt={worker.nomeCompleto}
                className="h-full w-full scale-[1.85] object-cover"
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
                  className="h-8 w-full text-sm sm:max-w-52"
                />
                <Input
                  value={draft.cognome}
                  onChange={(event) => onFieldChange?.("cognome", event.target.value)}
                  onBlur={() => onFieldBlur?.("cognome")}
                  placeholder="Cognome"
                  className="h-8 w-full text-sm sm:max-w-52"
                />
              </div>
              <Textarea
                value={draft.descrizione_pubblica}
                onChange={(event) =>
                  onFieldChange?.("descrizione_pubblica", event.target.value)
                }
                onBlur={() => onFieldBlur?.("descrizione_pubblica")}
                rows={3}
                className="bg-background min-h-24 text-sm"
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
          <p className="text-muted-foreground flex items-center gap-2">
            <MailIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.email}
                onChange={(event) => onFieldChange?.("email", event.target.value)}
                onBlur={() => onFieldBlur?.("email")}
                type="email"
                className="h-7 max-w-md text-sm"
              />
            ) : (
              <span className="truncate">{asString(workerRow.email) || "-"}</span>
            )}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <PhoneIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.telefono}
                onChange={(event) => onFieldChange?.("telefono", event.target.value)}
                onBlur={() => onFieldBlur?.("telefono")}
                type="tel"
                className="h-7 max-w-xs text-sm"
              />
            ) : (
              <span className="truncate">{asString(workerRow.telefono) || "-"}</span>
            )}
          </p>
          <div className="text-muted-foreground flex items-center gap-2">
            <LanguagesIcon className="size-4 shrink-0" />
            {isEditing && livelloItaliano !== undefined ? (
              <div className="w-full max-w-xs">
                <Select
                  value={livelloItaliano || undefined}
                  onValueChange={onLivelloItalianoChange}
                >
                  <SelectTrigger
                    className="bg-background h-7 text-sm"
                    onBlur={onLivelloItalianoBlur}
                  >
                    <SelectValue placeholder="Seleziona livello" />
                  </SelectTrigger>
                  <SelectContent>
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
          <p className="text-muted-foreground flex items-center gap-2">
            <VenusAndMarsIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              canUseSessoSelect ? (
                <div className="w-full max-w-xs">
                  <Select
                    value={draft.sesso || undefined}
                    onValueChange={(value) => onFieldChange?.("sesso", value)}
                  >
                    <SelectTrigger
                      className="h-7 text-sm"
                      onBlur={() => onFieldBlur?.("sesso")}
                    >
                      <SelectValue placeholder="Seleziona sesso" />
                    </SelectTrigger>
                    <SelectContent>
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
                  className="h-7 max-w-xs text-sm"
                />
              )
            ) : (
              <span className="truncate">{asString(workerRow.sesso) || "-"}</span>
            )}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <FlagIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              canUseNazionalitaSelect ? (
                <div className="w-full max-w-xs">
                  <Select
                    value={draft.nazionalita || undefined}
                    onValueChange={(value) =>
                      onFieldChange?.("nazionalita", value)
                    }
                  >
                    <SelectTrigger
                      className="h-7 text-sm"
                      onBlur={() => onFieldBlur?.("nazionalita")}
                    >
                      <SelectValue placeholder="Seleziona nazionalita" />
                    </SelectTrigger>
                    <SelectContent>
                      {nazionalitaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <Input
                  value={draft.nazionalita}
                  onChange={(event) => onFieldChange?.("nazionalita", event.target.value)}
                  onBlur={() => onFieldBlur?.("nazionalita")}
                  className="h-7 max-w-xs text-sm"
                />
              )
            ) : (
              <span className="truncate">{asString(workerRow.nazionalita) || "-"}</span>
            )}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <CalendarDaysIcon className="size-4 shrink-0" />
            {isEditing && draft ? (
              <Input
                value={draft.data_di_nascita}
                onChange={(event) => onFieldChange?.("data_di_nascita", event.target.value)}
                onBlur={() => onFieldBlur?.("data_di_nascita")}
                type="date"
                className="h-7 max-w-xs text-sm"
              />
            ) : (
              <span className="truncate">{asString(workerRow.data_di_nascita) || "-"}</span>
            )}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <CakeIcon className="size-4 shrink-0" />
            <span className="truncate">{getAgeFromBirthDate(workerRow.data_di_nascita) ?? "-"}</span>
          </p>
        </div>
      </div>
    </div>
  )
}
