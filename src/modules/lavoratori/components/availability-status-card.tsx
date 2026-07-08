import { CalendarDaysIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  getLookupLabelForSave,
  getLookupSelectValue,
  normalizeLookupComparableToken,
} from "../lib/lookup-utils"

const EMPTY_SELECT_VALUE = "none"

type LookupOption = {
  label: string
  value: string
}

type AvailabilityStatusDraft = {
  disponibilita: string
  data_ritorno_disponibilita: string
}

type AvailabilityStatusCardProps = {
  isEditing: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  isUpdating: boolean
  disponibilitaOptions: LookupOption[]
  draft: AvailabilityStatusDraft
  selectedDisponibilita: string
  selectedDisponibilitaBadgeClassName: string
  selectedDataRitorno: string
  onToggleEdit: () => void
  onDisponibilitaChange: (value: string) => void
  onDataRitornoChange: (value: string) => void
  onDataRitornoBlur: () => void
}

export function AvailabilityStatusCard({
  isEditing,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  isUpdating,
  disponibilitaOptions,
  draft,
  selectedDisponibilita,
  selectedDisponibilitaBadgeClassName,
  selectedDataRitorno,
  onToggleEdit,
  onDisponibilitaChange,
  onDataRitornoChange,
}: AvailabilityStatusCardProps) {
  const isReturnDateEnabled =
    normalizeLookupComparableToken(draft.disponibilita) === "non disponibile"

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
              <Select
                value={getLookupSelectValue(
                  draft.disponibilita,
                  disponibilitaOptions,
                  EMPTY_SELECT_VALUE
                )}
                onValueChange={(value) => {
                  const nextValue =
                    value === EMPTY_SELECT_VALUE
                      ? ""
                      : getLookupLabelForSave(value, disponibilitaOptions)
                  onDisponibilitaChange(nextValue)
                }}
                disabled={isUpdating}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_SELECT_VALUE}>Non indicata</SelectItem>
                  {disponibilitaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : selectedDisponibilita ? (
            <Badge variant="outline" className={selectedDisponibilitaBadgeClassName}>
              {selectedDisponibilita}
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
              <Input
                type="date"
                value={selectedDataRitorno}
                onChange={(event) => onDataRitornoChange(event.target.value)}
                disabled={!isReturnDateEnabled}
              />
            </div>
          ) : (
            <p className="text-sm text-foreground">{selectedDataRitorno || "-"}</p>
          )}
        </div>
      </div>
    </DetailSectionBlock>
  )
}
