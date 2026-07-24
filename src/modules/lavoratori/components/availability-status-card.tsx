import { CalendarDaysIcon, PencilIcon } from "lucide-react"
import { useController, useWatch } from "react-hook-form"

import { FieldInput } from "@/components/forms/field-components"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  normalizeLookupComparableToken,
} from "@/lib/lookup-utils"

const EMPTY_SELECT_VALUE = "none"

type LookupOption = {
  label: string
  value: string
}

type AvailabilityStatusCardProps = {
  isEditing: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  isUpdating: boolean
  disponibilitaOptions: LookupOption[]
  selectedDisponibilitaBadgeClassName: string
  onToggleEdit: () => void
}

function DisponibilitaSelect({
  options,
  disabled,
}: {
  options: LookupOption[]
  disabled?: boolean
}) {
  const { field } = useController({ name: "disponibilita" })
  const value = typeof field.value === "string" ? field.value : ""

  return (
    <Select
      value={getLookupSelectValue(value, options, EMPTY_SELECT_VALUE)}
      onValueChange={(nextValue) => {
        const normalized =
          nextValue === EMPTY_SELECT_VALUE
            ? ""
            : getLookupLabelForSave(nextValue, options)
        field.onChange(normalized)
      }}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="Seleziona stato" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={EMPTY_SELECT_VALUE}>Non indicata</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function AvailabilityStatusCard({
  isEditing,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  isUpdating,
  disponibilitaOptions,
  selectedDisponibilitaBadgeClassName,
  onToggleEdit,
}: AvailabilityStatusCardProps) {
  const disponibilita = useWatch({ name: "disponibilita" }) as string | undefined
  const dataRitorno = useWatch({ name: "data_ritorno_disponibilita" }) as
    | string
    | undefined
  const disponibilitaValue = typeof disponibilita === "string" ? disponibilita : ""
  const dataRitornoValue = typeof dataRitorno === "string" ? dataRitorno : ""
  const isReturnDateEnabled =
    normalizeLookupComparableToken(disponibilitaValue) === "non disponibile"

  return (
    <DetailSectionBlock
      title="Disponibilita"
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={
              isEditing
                ? "Termina modifica stato disponibilita"
                : "Modifica stato disponibilita"
            }
            title={
              isEditing
                ? "Termina modifica stato disponibilita"
                : "Modifica stato disponibilita"
            }
            onClick={onToggleEdit}
          >
            <PencilIcon />
          </Button>
        </div>
      ) : undefined}
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <FieldLabel>
            Stato disponibilita
          </FieldLabel>
          {isEditing ? (
            <div className="max-w-xs">
              <DisponibilitaSelect
                options={disponibilitaOptions}
                disabled={isUpdating}
              />
            </div>
          ) : disponibilitaValue ? (
            <Badge variant="outline" className={selectedDisponibilitaBadgeClassName}>
              {disponibilitaValue}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        <div className={isEditing && !isReturnDateEnabled ? "space-y-1 opacity-50" : "space-y-1"}>
          <FieldLabel>
            Ritorno disponibilita
          </FieldLabel>
          {isEditing ? (
            <div className="max-w-xs">
              <FieldInput
                name="data_ritorno_disponibilita"
                type="date"
                disabled={!isReturnDateEnabled}
              />
            </div>
          ) : (
            <p className="text-sm text-foreground">{dataRitornoValue || "-"}</p>
          )}
        </div>
      </div>
    </DetailSectionBlock>
  )
}
