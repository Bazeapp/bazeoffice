import { BriefcaseBusinessIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Form } from "@/components/ui/form"
import { FieldInput } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import type { AssunzioniBoardCardData } from "../types"
import { toNullableNumber } from "../lib/detail-utils"
import { EditableField } from "./assunzioni-detail-fields"

export function RapportoDetailSections({
  card,
  onRapportoPatch,
}: {
  card: AssunzioniBoardCardData
  onRapportoPatch: (patch: Record<string, unknown>) => Promise<void>
}) {
  const rapporto = card.rapporto

  // FASE 5 BIS — form + autosave (sostituisce i 5 useDebouncedSave). onSave
  // instrada tutto su onRapportoPatch con le trasformazioni originali
  // (toNullableNumber per ore/paga, ||null per distribuzione/data).
  const form = useAutoSaveForm({
    defaults: {
      ore_a_settimana: rapporto?.ore_a_settimana ? String(rapporto.ore_a_settimana) : "",
      distribuzione_ore_settimana: rapporto?.distribuzione_ore_settimana ?? "",
      paga_oraria_lorda: rapporto?.paga_oraria_lorda ? String(rapporto.paga_oraria_lorda) : "",
      paga_mensile_lorda: rapporto?.paga_mensile_lorda ? String(rapporto.paga_mensile_lorda) : "",
      data_inizio_rapporto: rapporto?.data_inizio_rapporto ?? "",
    },
    onSave: async (patch) => {
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] =
          key === "ore_a_settimana" ||
          key === "paga_oraria_lorda" ||
          key === "paga_mensile_lorda"
            ? toNullableNumber(value as string)
            : (value as string) || null
      }
      await onRapportoPatch(out)
    },
  })

  return (
    <Form {...form}>
      <DetailSectionBlock
        title="Orario e paga rapporto"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        contentClassName="space-y-4"
      >
        <EditableField label="Ore di lavoro a settimana">
          <FieldInput name="ore_a_settimana" type="number" />
        </EditableField>
        <EditableField label="Distribuzione ore settimanali">
          <div className="space-y-2">
            <p className="ui-type-meta">Parte da domenica</p>
            <FieldInput name="distribuzione_ore_settimana" placeholder="0-0-0-0-0-0-0" />
          </div>
        </EditableField>
        <div className="grid gap-4 md:grid-cols-2">
          <EditableField label="Paga oraria">
            <FieldInput name="paga_oraria_lorda" type="number" step="0.01" />
          </EditableField>
          <EditableField label="Paga mensile">
            <FieldInput name="paga_mensile_lorda" type="number" step="0.01" />
          </EditableField>
        </div>
        <EditableField label="Data di assunzione">
          <FieldInput name="data_inizio_rapporto" type="date" />
        </EditableField>
      </DetailSectionBlock>
    </Form>
  )
}
