import { PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { formatItalianCurrency } from "@/lib/format-utils"
import type { VariazioniDetailSheetViewModel } from "../hooks/use-variazioni-detail-sheet"
import type { VariazioniBoardCardData } from "../types"
import { VariazioniFieldTipoContratto } from "./variazioni-field-tipo-contratto"

export function VariazioniDetailRapportoSection({
  card,
  editingRapporto,
  setEditingRapporto,
  rapportoError,
}: Pick<
  VariazioniDetailSheetViewModel,
  "editingRapporto" | "setEditingRapporto" | "rapportoError"
> & {
  card: VariazioniBoardCardData
}) {
  return (
    <DetailSectionBlock
      title="Dati rapporto lavorativo"
      icon={<PencilIcon className="size-4" />}
      action={
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => setEditingRapporto((current) => !current)}
          aria-label="Modifica dati rapporto lavorativo"
        >
          <PencilIcon className="size-4" />
        </button>
      }
      contentClassName="space-y-5"
    >
      <div className="grid gap-5 text-sm sm:text-base">
        {editingRapporto ? (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="ui-type-label">Paga oraria lorda</span>
              <FieldInput name="paga_oraria_lorda" type="number" step="0.01" />
            </label>
            <label className="space-y-2">
              <span className="ui-type-label">Ore settimanali</span>
              <FieldInput name="ore_a_settimana" type="number" step="0.5" />
            </label>
            <label className="space-y-2">
              <span className="ui-type-label">Tipo rapporto</span>
              <FieldInput name="tipo_rapporto" />
            </label>
            <label className="space-y-2">
              <span className="ui-type-label">Tipo contratto</span>
              <VariazioniFieldTipoContratto name="tipo_contratto" />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="ui-type-label">Distribuzione ore settimanali</span>
              <p className="ui-type-meta">Parte da domenica</p>
              <FieldInput
                name="distribuzione_ore_settimana"
                placeholder="0-0-0-0-0-0-0"
              />
            </label>
            {rapportoError ? (
              <p className="text-xs font-medium text-red-600 md:col-span-2">{rapportoError}</p>
            ) : null}
          </div>
        ) : (
          <>
            <p>
              <span className="text-muted-foreground">Paga oraria lorda:</span>{" "}
              <span className="font-medium text-foreground">
                {formatItalianCurrency(card.rapporto?.paga_oraria_lorda, { emptyLabel: "" })}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Ore settimanali:</span>{" "}
              <span className="font-medium text-foreground">{card.rapporto?.ore_a_settimana}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Tipo rapporto:</span>{" "}
              <span className="font-medium text-foreground">{card.rapporto?.tipo_rapporto}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Tipo contratto:</span>{" "}
              <span className="font-medium text-foreground">{card.rapporto?.tipo_contratto}</span>
            </p>
          </>
        )}
        {!editingRapporto ? (
          <div className="space-y-1">
            <p>
              <span className="text-muted-foreground">Distribuzione ore settimanali:</span>{" "}
              <span className="font-medium text-foreground">
                {card.rapporto?.distribuzione_ore_settimana ?? "-"}
              </span>
            </p>
            <p className="ui-type-meta">Parte da domenica</p>
          </div>
        ) : null}
      </div>
    </DetailSectionBlock>
  )
}
