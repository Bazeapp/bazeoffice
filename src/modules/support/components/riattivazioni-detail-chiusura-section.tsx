import { FileTextIcon } from "lucide-react"

import { DetailField, DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { formatItalianDate } from "@/lib/value-utils"

import type { RiattivazioniBoardCardData } from "../types"
import { RiattivazioniDetailScontoSelect } from "./riattivazioni-detail-sconto-select"

export type RiattivazioniDetailChiusuraSectionProps = {
  card: RiattivazioniBoardCardData
  error: string | null
}

export function RiattivazioniDetailChiusuraSection({
  card,
  error,
}: RiattivazioniDetailChiusuraSectionProps) {
  return (
    <DetailSectionBlock
      title="Dati chiusura"
      icon={<FileTextIcon className="size-4" />}
      contentClassName="grid gap-4 md:grid-cols-2"
    >
      <DetailField
        label="Data fine rapporto"
        value={formatItalianDate(card.record.data_fine_rapporto)}
      />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Data recall riattivazione</span>
        <FieldInput name="data_per_riattivazione" type="date" className="bg-surface" />
      </label>
      <DetailField label="Tipo" value={card.tipoLabel} />
      <DetailField
        label="Presenze ultimo mese"
        value={card.record.presenze_ultimo_mese ?? "-"}
      />
      <DetailField label="Email" value={card.email} />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Sconto proposto riattivazione</span>
        <RiattivazioniDetailScontoSelect name="sconto_proposto_riattivazione" />
      </div>
      <DetailField
        label="Motivazione"
        value={card.record.motivazione_lost ?? "-"}
        multiline
        className="md:col-span-2"
      />
      <DetailField
        label="Informazioni aggiuntive"
        value={card.record.informazioni_aggiuntive ?? "-"}
        multiline
        className="md:col-span-2"
      />
      {error ? (
        <p className="text-xs font-medium text-red-600 md:col-span-2">{error}</p>
      ) : null}
    </DetailSectionBlock>
  )
}
