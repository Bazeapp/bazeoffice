import * as React from "react"
import { CalendarDaysIcon, PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui-next/button"
import { Checkbox } from "@/components/ui-next/checkbox"
import { FieldLabel } from "@/components/ui-next/field"
import { Label } from "@/components/ui-next/label"
import { Textarea } from "@/components/ui-next/textarea"

type AvailabilityEditDay = {
  field: string
  label: string
}

type AvailabilityEditBand = {
  field: string
  label: string
}

type AvailabilityReadOnlyRow = {
  day: string
  activeByHour: boolean[]
}

type AvailabilityCalendarCardProps = {
  titleMeta: string
  isEditing: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  isUpdating: boolean
  editDays: AvailabilityEditDay[]
  editBands: AvailabilityEditBand[]
  hourLabels: string[]
  readOnlyRows: AvailabilityReadOnlyRow[]
  comparisonRows?: AvailabilityReadOnlyRow[]
  familyRequestsText?: string
  matrix: Record<string, boolean>
  vincoliOrari: string
  onToggleEdit: () => void
  onMatrixChange: (dayField: string, bandField: string, checked: boolean) => void
  onVincoliChange: (value: string) => void
  onVincoliBlur: () => void
  children?: React.ReactNode
}

export function AvailabilityCalendarCard({
  titleMeta,
  isEditing,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  isUpdating,
  editDays,
  editBands,
  hourLabels,
  readOnlyRows,
  comparisonRows = [],
  familyRequestsText,
  matrix,
  vincoliOrari,
  onToggleEdit,
  onMatrixChange,
  onVincoliChange,
  onVincoliBlur,
  children,
}: AvailabilityCalendarCardProps) {
  const comparisonByDay = React.useMemo(() => {
    const map = new Map<string, boolean[]>()
    for (const row of comparisonRows) {
      map.set(row.day, row.activeByHour)
    }
    return map
  }, [comparisonRows])

  return (
    <DetailSectionBlock
      title={
        <span className="flex items-center gap-2">
          <span>Calendario disponibilita</span>
          <span className="text-muted-foreground text-xs font-normal">
            {titleMeta}
          </span>
        </span>
      }
      icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isEditing ? "Termina modifica disponibilita" : "Modifica disponibilita"}
          title={isEditing ? "Termina modifica disponibilita" : "Modifica disponibilita"}
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
      <div className="space-y-4">
        {familyRequestsText ? (
          <div className="flex items-start gap-3 text-sm">
            <FieldLabel className="w-24 shrink-0">
              Richieste famiglia
            </FieldLabel>
            <div className="min-w-0 flex-1 text-foreground">
              <span className="whitespace-pre-wrap break-words">{familyRequestsText}</span>
            </div>
          </div>
        ) : null}

        {isEditing ? (
          <div className="overflow-x-auto">
            <div
              className="grid w-fit min-w-0 gap-2"
              style={{
                gridTemplateColumns: `5.5rem repeat(${editDays.length}, 4.5rem)`,
              }}
            >
              <div className="px-2 py-1" />
              {editDays.map((dayConfig) => (
                <div
                  key={`availability-edit-day-${dayConfig.field}`}
                  className="text-muted-foreground px-2 py-1 text-center text-[11px] font-medium"
                >
                  {dayConfig.label}
                </div>
              ))}

              {editBands.map((bandConfig) => (
                <React.Fragment key={`availability-edit-band-${bandConfig.field}`}>
                  <div className="text-muted-foreground flex items-center px-2 py-1 text-xs font-medium tracking-wide">
                    {bandConfig.label}
                  </div>
                  {editDays.map((dayConfig) => {
                    const key = `${dayConfig.field}:${bandConfig.field}`
                    const checkboxId = `availability-${dayConfig.field}-${bandConfig.field}`
                    return (
                      <Label
                        key={key}
                        htmlFor={checkboxId}
                        className="bg-muted/20 hover:bg-muted/30 justify-center rounded-md border px-2 py-2"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={matrix[key] === true}
                          disabled={isUpdating}
                          onCheckedChange={(checked) =>
                            onMatrixChange(dayConfig.field, bandConfig.field, checked === true)
                          }
                        />
                      </Label>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="space-y-[2px]">
              <div
                className="grid w-fit min-w-0"
                style={{
                  gridTemplateColumns: `4rem repeat(${hourLabels.length}, 1.6rem)`,
                }}
              >
                <div className="px-1 py-1" />
                {hourLabels.map((hourLabel) => (
                  <div key={`hour-${hourLabel}`} className="relative h-5 overflow-visible">
                    {Number.parseInt(hourLabel.slice(0, 2), 10) % 2 === 0 ? (
                      <span className="text-muted-foreground absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 text-[10px] font-medium tabular-nums">
                        {hourLabel.slice(0, 2)}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              {readOnlyRows.map((row) => (
                <div
                  key={`row-${row.day}`}
                  className="grid w-fit min-w-0"
                  style={{
                    gridTemplateColumns: `4rem repeat(${hourLabels.length}, 1.6rem)`,
                  }}
                >
                  <div className="text-muted-foreground px-1 py-1 text-xs font-medium">
                    {row.day}
                  </div>
                  {row.activeByHour.map((isActive, index) => (
                    <div key={`${row.day}-${hourLabels[index]}`} className="p-[2px]">
                      {(() => {
                        const comparisonActive = comparisonByDay.get(row.day)?.[index] === true
                        const className =
                          isActive && comparisonActive
                            ? "h-4 rounded-[5px] border border-emerald-400 bg-emerald-300"
                            : comparisonActive
                              ? "h-4 rounded-[5px] border border-rose-300 bg-rose-100"
                              : isActive
                                ? "h-4 rounded-[5px] border border-emerald-200 bg-emerald-50"
                                : "h-4 rounded-[5px] border border-border/50 bg-muted/25"
                        return <div className={className} />
                      })()}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="ui-type-label">Vincoli orari</div>
          {isEditing ? (
            <div className="w-full max-w-2xl">
              <Textarea
                value={vincoliOrari}
                onChange={(event) => onVincoliChange(event.target.value)}
                onBlur={onVincoliBlur}
                disabled={isUpdating}
                placeholder="Inserisci vincoli orari"
                rows={3}
                className="min-h-[5.25rem] w-full text-sm"
              />
            </div>
          ) : (
            <div className="w-full max-w-2xl">
              <div className="text-foreground whitespace-pre-wrap break-words text-sm">
                {vincoliOrari || "-"}
              </div>
            </div>
          )}
        </div>

        {children}
      </div>
    </DetailSectionBlock>
  )
}
