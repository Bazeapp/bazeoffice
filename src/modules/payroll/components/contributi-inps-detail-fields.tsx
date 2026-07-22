import { CreditCardIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatItalianCurrency, formatItalianDateTimeOr } from "@/lib/format-utils"

import { PAYROLL_CURRENCY_OPTIONS } from "../lib"
import type { ContributiColumnData, ContributoInpsBoardCardData } from "../types"

type ContributiInpsDetailFieldsProps = {
  card: ContributoInpsBoardCardData
  columns: ContributiColumnData[]
  stageValue: string
  onStageChange: (nextValue: string) => void
}

export function ContributiInpsDetailFields({
  card,
  columns,
  stageValue,
  onStageChange,
}: ContributiInpsDetailFieldsProps) {
  return (
    <DetailSectionBlock
      title="Contributo INPS"
      icon={<CreditCardIcon className="text-muted-foreground size-5" />}
      contentClassName="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="ui-type-label">Stato contributo</p>
          <Select value={stageValue} onValueChange={(nextValue) => void onStageChange(nextValue)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map((column) => (
                <SelectItem key={column.id} value={column.id}>
                  {column.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Trimestre</p>
          <p className="font-medium">{card.trimestreLabel}</p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Importo contributo INPS</p>
          <FieldInput name="importo_contributi_inps" type="number" step="0.01" />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Valore PagoPA</p>
          <FieldInput name="valore_pagopa" type="number" step="0.01" />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Data invio famiglia</p>
          <FieldInput name="data_invio_famiglia" type="date" />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Creato il</p>
          <p className="font-medium">
            {formatItalianDateTimeOr(
              card.record.data_ora_creazione ?? card.record.creato_il,
              "Non disponibile",
            )}
          </p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Importo attuale</p>
          <p className="font-medium">
            {formatItalianCurrency(card.record.importo_contributi_inps, PAYROLL_CURRENCY_OPTIONS)}
          </p>
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">PagoPA attuale</p>
          <p className="font-medium">
            {formatItalianCurrency(card.record.valore_pagopa, PAYROLL_CURRENCY_OPTIONS)}
          </p>
        </div>
      </div>
    </DetailSectionBlock>
  )
}
