import { CalendarDaysIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput, FieldTextarea } from "@/components/forms/field-components"
import type { VariazioniDetailSheetViewModel } from "../hooks/use-variazioni-detail-sheet"
import type { VariazioniBoardCardData } from "../types"

export function VariazioniDetailVariazioneSection({
  card,
  editingDetails,
  setEditingDetails,
  detailsError,
  formatVariazioneBoardDate,
}: Pick<
  VariazioniDetailSheetViewModel,
  "editingDetails" | "setEditingDetails" | "detailsError" | "formatVariazioneBoardDate"
> & {
  card: VariazioniBoardCardData
}) {
  return (
    <DetailSectionBlock
      title="Dettagli variazione"
      icon={<CalendarDaysIcon className="size-4" />}
      action={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setEditingDetails((current) => !current)}
          aria-label="Modifica dettagli variazione"
        >
          <PencilIcon className="size-4" />
        </button>
      }
      contentClassName="space-y-5"
    >
      {editingDetails ? (
        <div className="grid gap-4">
          <label className="space-y-2">
            <span className="ui-type-label">Data di partenza</span>
            <FieldInput name="data_variazione" type="date" />
          </label>
          <label className="space-y-2">
            <span className="ui-type-label">Variazione da applicare</span>
            <FieldTextarea name="variazione_da_applicare" />
          </label>
          {detailsError ? (
            <p className="text-xs font-medium text-red-600">{detailsError}</p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <CalendarDaysIcon className="text-muted-foreground size-5 shrink-0" />
            <span className="text-muted-foreground">Data di partenza:</span>
            <span className="font-semibold text-foreground">
              {formatVariazioneBoardDate(card.record.data_variazione)}
            </span>
          </div>

          <div className="border-t border-border/70 pt-5 text-sm sm:text-base">
            <span className="text-muted-foreground">Variazione da applicare:</span>{" "}
            <span className="font-medium text-foreground">
              {card.variazioneDaApplicare ?? "-"}
            </span>
          </div>
        </>
      )}
    </DetailSectionBlock>
  )
}
