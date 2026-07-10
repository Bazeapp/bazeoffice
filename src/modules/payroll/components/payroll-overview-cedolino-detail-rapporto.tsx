import { ClipboardListIcon, PencilIcon } from "lucide-react"

import { FieldInput, FieldSelect } from "@/components/forms/field-components"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"

import { CASO_PARTICOLARE_OPTIONS, formatDateOnly } from "../lib"
import type { CedolinoDetailRapportoProps } from "../types"

export function PayrollOverviewCedolinoDetailRapporto({
  card,
  rapporto,
  famiglia,
}: CedolinoDetailRapportoProps) {
  return (
    <DetailSectionBlock
      title="Dettagli rapporto"
      icon={<ClipboardListIcon className="text-muted-foreground size-5" />}
      action={<PencilIcon className="text-muted-foreground size-4" />}
      contentClassName="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="ui-type-label">Data creazione rapporto</p>
          <p className="font-medium">
            {formatDateOnly(rapporto?.creata ?? card.record.data_ora_creazione)}
          </p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Data fine rapporto</p>
          {rapporto?.data_fine_rapporto ? (
            <p className="font-medium">{formatDateOnly(rapporto.data_fine_rapporto)}</p>
          ) : (
            <Badge
              variant="secondary"
              className="w-fit rounded-full bg-emerald-100 px-3 text-emerald-700 hover:bg-emerald-100"
            >
              In corso
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Nome</p>
          <p className="font-medium">{famiglia?.nome ?? "Non disponibile"}</p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Email</p>
          <p className="font-medium">
            {famiglia?.email ?? famiglia?.customer_email ?? "Non disponibile"}
          </p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Codice Datore Webcolf</p>
          <p className="font-medium">{rapporto?.codice_datore_webcolf ?? "Non disponibile"}</p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Codice Lavoratore Webcolf</p>
          <p className="font-medium">{rapporto?.codice_dipendente_webcolf ?? "Non disponibile"}</p>
        </div>
        <div className="space-y-2">
          <label className="ui-type-label">Data invio famiglia</label>
          <FieldInput name="data_invio_famiglia" type="date" />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Caso particolare?</p>
          <FieldSelect name="caso_particolare" options={CASO_PARTICOLARE_OPTIONS} />
        </div>
      </div>
    </DetailSectionBlock>
  )
}
