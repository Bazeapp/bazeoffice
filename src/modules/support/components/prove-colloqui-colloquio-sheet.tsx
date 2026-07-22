import { CalendarIcon, ClipboardListIcon } from "lucide-react"
import { useController } from "react-hook-form"
import { toast } from "sonner"

import { DetailField, DetailFieldControl, DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Form } from "@/components/ui/form"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  getLookupLabelForSave,
  getLookupSelectValue,
} from "@/modules/lavoratori/lib"
import { formatItalianDateTimeOr } from "@/lib/format-utils"
import { toStringValue } from "@/lib/value-utils"
import type { ProcessoMatchingRecord } from "@/types"

import type { ColloquioCalendarEvent, LookupOption } from "../types"

export type ProveColloquiColloquioSheetProps = {
  event: Extract<ColloquioCalendarEvent, { type: "colloquio" }> | null
  tipoIncontroOptions: LookupOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenRicercaDetail: (processId: string) => void
  patchProcess: (
    processId: string,
    patch: Partial<ProcessoMatchingRecord>,
  ) => Promise<ProcessoMatchingRecord>
}

function FieldColloquioEsitoSelect({
  name,
  options,
  disabled,
}: {
  name: string
  options: LookupOption[]
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const rawValue = typeof field.value === "string" ? field.value : ""
  const selectValue = getLookupSelectValue(rawValue, options, "none")
  const hasCurrent =
    selectValue === "none" || options.some((option) => option.value === selectValue)
  return (
    <Select
      value={selectValue}
      disabled={disabled}
      onValueChange={(next) =>
        field.onChange(next === "none" ? null : getLookupLabelForSave(next, options))
      }
    >
      <SelectTrigger className="bg-surface">
        <SelectValue placeholder="Seleziona..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Non segnato</SelectItem>
        {!hasCurrent ? <SelectItem value={selectValue}>{rawValue}</SelectItem> : null}
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function ProveColloquiColloquioSheet({
  event,
  tipoIncontroOptions,
  open,
  onOpenChange,
  onOpenRicercaDetail,
  patchProcess,
}: ProveColloquiColloquioSheetProps) {
  const processId = toStringValue(event?.process?.id)
  const workerLabel =
    [event?.lavoratore?.nome, event?.lavoratore?.cognome].filter(Boolean).join(" ") || "Lavoratore"
  const familyLabel =
    [event?.famiglia?.nome, event?.famiglia?.cognome].filter(Boolean).join(" ") ||
    event?.famiglia?.email ||
    "Famiglia"
  const address =
    [event?.process?.indirizzo_prova_via, event?.process?.indirizzo_prova_civico]
      .filter(Boolean)
      .join(" ") || "-"

  const form = useAutoSaveForm({
    defaults: {
      tipo_incontro_famiglia_lavoratore:
        event?.process?.tipo_incontro_famiglia_lavoratore ?? null,
    } as Record<string, unknown>,
    onSave: async (patch) => {
      if (!processId) return
      try {
        await patchProcess(processId, patch as Partial<ProcessoMatchingRecord>)
      } catch (caughtError) {
        toast.error(
          caughtError instanceof Error ? caughtError.message : "Errore aggiornando colloquio",
        )
      }
    },
  })

  return (
    <Form {...form}>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(96vw,720px)]! max-w-none! p-0 sm:max-w-none">
          <SheetHeader className="border-b bg-surface px-5 py-5">
            <div className="flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <SheetTitle className="truncate text-xl font-semibold">
                  {event ? `${workerLabel} in res. ${familyLabel}` : "Colloquio"}
                </SheetTitle>
                <SheetDescription className="mt-1">
                  Dettaglio colloquio collegato al processo di ricerca.
                </SheetDescription>
              </div>
              <Button
                type="button"
                disabled={!processId}
                onClick={() => {
                  if (!processId) return
                  onOpenChange(false)
                  onOpenRicercaDetail(processId)
                }}
              >
                Apri scheda completa
              </Button>
            </div>
          </SheetHeader>
          {event ? (
            <section className="h-full overflow-y-auto bg-surface-muted px-5 py-5">
              <div className="space-y-5">
                <DetailSectionBlock
                  title="Colloquio"
                  icon={<CalendarIcon className="size-4" />}
                  contentClassName="grid gap-4 md:grid-cols-2"
                >
                  <DetailField label="Famiglia" value={event.famiglia?.email ?? "-"} />
                  <DetailField label="Stato processo" value={event.process?.stato_res ?? "-"} />
                  <DetailField label="Lavoratore" value={workerLabel} />
                  <DetailField
                    label="Colloquio effettuato"
                    value={toStringValue(event.selection.colloquio_effettuato) ?? "-"}
                  />
                  <DetailField
                    label="Data e ora colloquio"
                    value={formatItalianDateTimeOr(event.start, "-")}
                  />
                  <DetailField label="Indirizzo prova" value={address} />
                  <DetailField label="Comune" value={event.process?.indirizzo_prova_comune ?? "-"} />
                </DetailSectionBlock>

                <DetailSectionBlock
                  title="Esito colloquio"
                  icon={<ClipboardListIcon className="size-4" />}
                  contentClassName="space-y-4"
                >
                  <DetailFieldControl label="prova_colloquio_res" className="max-w-sm">
                    <FieldColloquioEsitoSelect
                      name="tipo_incontro_famiglia_lavoratore"
                      options={tipoIncontroOptions}
                      disabled={!processId}
                    />
                  </DetailFieldControl>
                </DetailSectionBlock>
              </div>
            </section>
          ) : null}
        </SheetContent>
      </Sheet>
    </Form>
  )
}
