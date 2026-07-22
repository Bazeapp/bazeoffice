import { CalendarX2Icon, FileTextIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  FieldInput,
  FieldSelect,
  FieldTextarea,
} from "@/components/forms/field-components"
import { cn } from "@/lib/utils"
import {
  formatChiusuraDisplayDate,
  getLicenziamentoVariant,
  getLookupBadgeClasses,
} from "../lib/chiusure-board-visual"
import type { ChiusureDetailSheetViewModel } from "../hooks/use-chiusure-detail-sheet"
import type { ChiusureBoardCardData } from "../types"

export function ChiusureDetailFields({
  card,
  editingDetails,
  detailsError,
  tipoLicenziamentoSelectOptions,
  toggleEditingDetails,
}: Pick<
  ChiusureDetailSheetViewModel,
  | "editingDetails"
  | "detailsError"
  | "tipoLicenziamentoSelectOptions"
  | "toggleEditingDetails"
> & {
  card: ChiusureBoardCardData
}) {
  return (
    <DetailSectionBlock
      title="Dettagli chiusura"
      icon={<FileTextIcon className="size-4" />}
      action={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={toggleEditingDetails}
          aria-label="Modifica dettagli chiusura"
        >
          <PencilIcon className="size-4" />
        </button>
      }
      contentClassName="space-y-5"
    >
      {editingDetails ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="ui-type-label">Data fine rapporto</span>
            <FieldInput name="data_fine_rapporto" type="date" />
          </label>
          <label className="space-y-2">
            <span className="ui-type-label">Tipo licenziamento/dimissione</span>
            <FieldSelect
              name="tipo_licenziamento"
              placeholder="Seleziona tipo"
              options={tipoLicenziamentoSelectOptions}
            />
          </label>
          <label className="space-y-2">
            <span className="ui-type-label">Tipo decesso</span>
            <FieldInput name="tipo_decesso" />
          </label>
          <label className="space-y-2">
            <span className="ui-type-label">Presenze ultimo mese</span>
            <FieldInput name="presenze_ultimo_mese" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="ui-type-label">Motivazione</span>
            <FieldTextarea name="motivazione_cessazione_rapporto" />
          </label>
          <label className="space-y-2 md:col-span-2">
            <span className="ui-type-label">Informazioni aggiuntive</span>
            <FieldTextarea name="informazioni_aggiuntive" />
          </label>
          {detailsError ? (
            <p className="text-xs font-medium text-red-600 md:col-span-2">{detailsError}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <CalendarX2Icon className="text-muted-foreground size-5 shrink-0" />
            <span className="text-muted-foreground">Data fine rapporto:</span>
            <span className="font-semibold text-foreground">
              {formatChiusuraDisplayDate(card.record.data_fine_rapporto)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base">
            <span className="text-muted-foreground">Tipo:</span>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-sm font-medium",
                card.tipoColor
                  ? getLookupBadgeClasses(card.tipoColor)
                  : getLicenziamentoVariant(card.record.tipo_licenziamento),
              )}
            >
              {card.tipoLabel}
            </span>
          </div>

          <div className="grid gap-4 border-t border-border/70 pt-5 text-sm sm:text-base">
            <p>
              <span className="text-muted-foreground">Presenze ultimo mese:</span>{" "}
              <span className="font-medium text-foreground">
                {card.record.presenze_ultimo_mese ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Motivazione:</span>{" "}
              <span className="font-medium text-foreground">
                {card.record.motivazione_cessazione_rapporto ?? "-"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Informazioni aggiuntive:</span>{" "}
              <span className="font-medium text-foreground">
                {card.record.informazioni_aggiuntive ?? "-"}
              </span>
            </p>
          </div>
        </>
      )}
    </DetailSectionBlock>
  )
}
