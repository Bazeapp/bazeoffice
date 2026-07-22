import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  Link2Icon,
  PhoneCallIcon,
  RefreshCwIcon,
} from "lucide-react"
import { useController } from "react-hook-form"

import { AttachmentUploadSlot } from "@/components/shared-next/attachment-upload-slot"
import { DetailField, DetailFieldControl, DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  getTagClassName,
  resolveLookupColor,
} from "@/modules/lavoratori/lib"
import { cn } from "@/lib/utils"
import { buildPathForRoute } from "@/routes/app-routes"
import type { RapportoLavorativoRecord } from "@/types"

import { getTrialDayLabel, getTrialElapsedDays } from "../lib"
import { AUDIO_ACCEPT } from "../lib/prove-colloqui-view.constants"
import { formatProvaDate } from "../lib/prove-colloqui-view.utils"
import { useProveColloquiProvaSheet } from "../hooks/use-prove-colloqui-prova-sheet"
import type { LookupOption, ProvaCardData } from "../types"

export type ProveColloquiProvaSheetProps = {
  card: ProvaCardData | null
  statusOptions: LookupOption[]
  feedbackFamigliaOptions: LookupOption[]
  feedbackLavoratoreOptions: LookupOption[]
  ramoD2Options: LookupOption[]
  lookupColorsByDomain: Map<string, string>
  open: boolean
  onOpenChange: (open: boolean) => void
  patchRapporto: (
    rapportoId: string,
    patch: Partial<RapportoLavorativoRecord>,
  ) => Promise<RapportoLavorativoRecord>
}

function FieldStatoProvaSelect({
  name,
  options,
  resolveColor,
}: {
  name: string
  options: LookupOption[]
  resolveColor: (label: string | null) => string | null
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : null
  return (
    <Select
      value={getLookupSelectValue(current, options, "none")}
      onValueChange={(next) =>
        field.onChange(next === "none" ? null : getLookupLabelForSave(next, options))
      }
    >
      <SelectTrigger className={cn("bg-surface", getTagClassName(resolveColor(current)))}>
        <SelectValue placeholder="Stato prova" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessuno stato</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function FieldLookupSelect({
  name,
  options,
  placeholder,
  triggerClassName,
}: {
  name: string
  options: LookupOption[]
  placeholder?: string
  triggerClassName?: string
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={getLookupSelectValue(current, options, "none")}
      onValueChange={(next) =>
        field.onChange(next === "none" ? null : getLookupLabelForSave(next, options))
      }
    >
      <SelectTrigger className={triggerClassName ?? "bg-surface"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Nessuna selezione</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProveColloquiProvaSheet({
  card,
  statusOptions,
  feedbackFamigliaOptions,
  feedbackLavoratoreOptions,
  ramoD2Options,
  lookupColorsByDomain,
  open,
  onOpenChange,
  patchRapporto,
}: ProveColloquiProvaSheetProps) {
  const rapporto = card?.rapporto ?? null
  const famiglia = card?.famiglia ?? null
  const lavoratore = card?.lavoratore ?? null
  const trialElapsedDays = getTrialElapsedDays(rapporto?.data_inizio_rapporto)
  const rapportoPath = rapporto
    ? buildPathForRoute({
        mainSection: "gestione_contrattuale_rapporti",
        anagraficheTab: "famiglie",
        ricercaProcessId: null,
        selectedRapportoId: rapporto.id,
      })
    : null

  const {
    form,
    distribution,
    uploadingSlot,
    recordingError,
    handleUploadRecording,
    handleRemoveRecording,
  } = useProveColloquiProvaSheet({ card, patchRapporto })

  return (
    <Form {...form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,720px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-semibold">
                  {card?.title ?? "Dettaglio prova"}
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Dettaglio operativo del rapporto in prova con stato, riepilogo rapporto,
                  feedback e check-in.
                </SheetDescription>
                <p className="mt-1 text-sm text-muted-foreground">
                  Rapporto avviato il {formatProvaDate(rapporto?.data_inizio_rapporto)} · Oggi{" "}
                  {formatProvaDate(new Date().toISOString())} · {getTrialDayLabel(trialElapsedDays)}
                </p>
              </div>

              {rapporto ? (
                <DetailFieldControl label="Stato CS Prova" className="max-w-sm">
                  <FieldStatoProvaSelect
                    name="prova_stato_cs"
                    options={statusOptions}
                    resolveColor={(label) =>
                      resolveLookupColor(
                        lookupColorsByDomain,
                        "rapporti_lavorativi.prova_stato_cs",
                        label,
                      )
                    }
                  />
                </DetailFieldControl>
              ) : null}
            </div>
          </SheetHeader>

          {card && rapporto ? (
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
              <div className="mx-auto max-w-5xl space-y-5">
                <DetailSectionBlock
                  title="Rapporto"
                  icon={<ClipboardListIcon className="size-4" />}
                  action={
                    rapportoPath ? (
                      <Button type="button" variant="ghost" size="sm" asChild className="gap-1.5">
                        <a href={rapportoPath}>
                          <Link2Icon className="size-4" />
                          Vai al rapporto
                        </a>
                      </Button>
                    ) : null
                  }
                  contentClassName="space-y-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <DetailField
                      label="Stato Pratica Assunzione"
                      value={
                        <Badge
                          className={getTagClassName(
                            resolveLookupColor(
                              lookupColorsByDomain,
                              "rapporti_lavorativi.stato_assunzione",
                              rapporto.stato_assunzione,
                            ),
                          )}
                        >
                          {rapporto.stato_assunzione ?? "-"}
                        </Badge>
                      }
                    />
                    <DetailField label="Ore Settimanali" value={rapporto.ore_a_settimana ?? "-"} />
                    <DetailField label="Email Datore" value={famiglia?.email ?? "-"} />
                    <DetailField label="Nome Datore" value={card.famigliaLabel} />
                    <DetailField label="Email Lavoratore" value={lavoratore?.email ?? "-"} />
                    <DetailField label="Nome Lavoratore" value={card.lavoratoreLabel} />
                    <DetailField
                      label="Data Inizio Rapporto"
                      value={formatProvaDate(rapporto.data_inizio_rapporto)}
                    />
                    <DetailField label="Telefono famiglia" value={famiglia?.telefono ?? "-"} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
                    {distribution.map((item) => (
                      <div key={item.day} className="rounded-lg border bg-surface px-3 py-2">
                        <div className="text-xs font-medium text-muted-foreground">{item.day}</div>
                        <div className="mt-1 text-sm font-semibold">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="D0 - Pre-prova"
                  icon={<PhoneCallIcon className="size-4" />}
                  cardClassName="ring-1 ring-primary/15"
                  contentClassName="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Da compilare durante/dopo la call onboarding per segnare le priorità della
                    famiglia a livello di pulizia, organizzazione e rapporto con il lavoratore.
                  </p>
                  <DetailFieldControl label="Priorità famiglia">
                    <FieldTextarea
                      name="prova_priorita_famiglia"
                      placeholder="Pulizia, organizzazione, rapporto con il lavoratore..."
                      className="min-h-24 resize-y"
                    />
                  </DetailFieldControl>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="D1 - Feedback"
                  icon={<BarChart3Icon className="size-4" />}
                  cardClassName="ring-1 ring-primary/15"
                  contentClassName="grid gap-4 md:grid-cols-2"
                >
                  <DetailFieldControl label="Feedback Famiglia">
                    <FieldLookupSelect
                      name="prova_feedback_famiglia"
                      options={feedbackFamigliaOptions}
                      placeholder="Feedback famiglia"
                    />
                  </DetailFieldControl>
                  <DetailFieldControl label="Feedback Lavoratore">
                    <FieldLookupSelect
                      name="prova_feedback_lavoratore"
                      options={feedbackLavoratoreOptions}
                      placeholder="Feedback lavoratore"
                    />
                  </DetailFieldControl>
                  <DetailFieldControl label="Ramificazione D2">
                    <FieldLookupSelect
                      name="prova_ramo_d2"
                      options={ramoD2Options}
                      placeholder="Ramificazione D2"
                    />
                  </DetailFieldControl>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="D2 - Feedback"
                  icon={<RefreshCwIcon className="size-4" />}
                  cardClassName="ring-1 ring-primary/15"
                  contentClassName="space-y-4"
                >
                  <DetailFieldControl label="Note CS Lavoratore">
                    <FieldTextarea
                      name="prova_note_cs_lavoratore"
                      placeholder="Appunti CS sul lavoratore al D2"
                      className="min-h-24 resize-y"
                    />
                  </DetailFieldControl>
                  <DetailFieldControl label="Note CS Famiglia">
                    <FieldTextarea
                      name="prova_note_cs_famiglia"
                      placeholder="Appunti CS sulla famiglia al D2"
                      className="min-h-24 resize-y"
                    />
                  </DetailFieldControl>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="D7 - Check-in"
                  icon={<FileTextIcon className="size-4" />}
                  cardClassName="ring-1 ring-primary/15"
                  contentClassName="space-y-4"
                >
                  <p className="text-sm text-muted-foreground">
                    Il check-in deve essere impostato almeno dopo il secondo giorno di prova, a
                    distanza di una settimana dal D2. In caso di rapporti part-time o full-time,
                    impostarlo al quinto giorno di prova. Può essere spostato per esigenze operative
                    della situazione.
                  </p>
                  <DetailFieldControl label="Data Check-in" className="max-w-sm">
                    <FieldInput name="prova_data_checkin" type="date" className="bg-surface" />
                  </DetailFieldControl>
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="Registrazioni chiamate"
                  icon={<PhoneCallIcon className="size-4" />}
                  contentClassName="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <AttachmentUploadSlot
                      label="Chiamate lavoratore"
                      value={rapporto.registrazione_chiamate_lavoratori}
                      accept={AUDIO_ACCEPT}
                      emptyText="Nessuna registrazione caricata"
                      onAdd={(file) =>
                        void handleUploadRecording("registrazione_chiamate_lavoratori", file)
                      }
                      onRemove={(link) =>
                        void handleRemoveRecording("registrazione_chiamate_lavoratori", link)
                      }
                      onPreviewOpen={() => {}}
                      isUploading={uploadingSlot === "registrazione_chiamate_lavoratori"}
                    />
                    <AttachmentUploadSlot
                      label="Chiamate famiglie"
                      value={rapporto.registrazione_chiamate_famiglia}
                      accept={AUDIO_ACCEPT}
                      emptyText="Nessuna registrazione caricata"
                      onAdd={(file) =>
                        void handleUploadRecording("registrazione_chiamate_famiglia", file)
                      }
                      onRemove={(link) =>
                        void handleRemoveRecording("registrazione_chiamate_famiglia", link)
                      }
                      onPreviewOpen={() => {}}
                      isUploading={uploadingSlot === "registrazione_chiamate_famiglia"}
                    />
                  </div>
                  {recordingError ? (
                    <p className="text-sm text-red-600">{recordingError}</p>
                  ) : null}
                </DetailSectionBlock>
              </div>
            </section>
          ) : null}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
