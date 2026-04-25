import { CalendarDaysIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  onDataRitornoBlur,
}: AvailabilityStatusCardProps) {
  const isReturnDateEnabled = draft.disponibilita === "Non disponibile"

  return (
    <DetailSectionBlock
      title="Disponibilita"
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
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
      ) : undefined}
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <FieldTitle>
            Stato disponibilita
          </FieldTitle>
          {isEditing ? (
            <div className="max-w-xs">
              <Select
                value={draft.disponibilita || undefined}
                onValueChange={onDisponibilitaChange}
                disabled={isUpdating}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleziona stato" />
                </SelectTrigger>
                <SelectContent>
                  {disponibilitaOptions.map((option) => (
                    <SelectItem key={option.value} value={option.label}>
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
          <FieldTitle>
            Ritorno disponibilita
          </FieldTitle>
          {isEditing ? (
            <div className="max-w-xs">
              <Input
                type="date"
                value={draft.data_ritorno_disponibilita}
                onChange={(event) => onDataRitornoChange(event.target.value)}
                onBlur={onDataRitornoBlur}
                disabled={isUpdating || !isReturnDateEnabled}
                className="h-9 text-sm"
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
