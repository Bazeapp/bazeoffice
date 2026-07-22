import * as React from "react"

import { AvailabilityCalendarCard } from "@/modules/lavoratori/components/availability-calendar-card"
import { WorkerShiftPreferencesFields } from "@/modules/lavoratori/components/worker-shift-preferences-fields"
import {
  AVAILABILITY_EDIT_BANDS,
  AVAILABILITY_EDIT_DAYS,
  AVAILABILITY_DAY_LABELS,
  AVAILABILITY_HOUR_LABELS,
  isAvailabilityHourActive,
  parseAvailabilityPayload,
  readAvailabilitySlots,
  type AvailabilityEditBandField,
  type AvailabilityEditDayField,
} from "@/modules/lavoratori/lib"

import type { WorkerPipelineSummaryAvailabilityCardProps } from "../types/worker-pipeline-summary"

export function WorkerPipelineSummaryAvailabilityCard({
  availabilityTitleMeta,
  familyAvailabilityJson,
  familyWorkSchedule,
  familyWeeklyFrequency,
  processWeeklyHours,
  tipoRapportoOptions,
  tipoRapportoValues,
  onTipoRapportoChange,
  isEditing,
  onToggleEdit,
  isUpdating,
  lookupColorsByDomain,
  lavoriAccettabili,
  lavoriAccettabiliOptions,
  matrix,
  readOnlyRows,
  vincoliOrari,
  onLavoriAccettabiliChange,
  onMatrixChange,
  onVincoliChange,
  onSave,
}: WorkerPipelineSummaryAvailabilityCardProps) {
  const familyRequestsText = React.useMemo(() => {
    const schedule =
      familyWorkSchedule && familyWorkSchedule !== "-"
        ? familyWorkSchedule
        : null
    const weeklyHours =
      processWeeklyHours && processWeeklyHours !== "-"
        ? `${processWeeklyHours}h`
        : null
    const weeklyDays =
      familyWeeklyFrequency && familyWeeklyFrequency !== "-"
        ? `${familyWeeklyFrequency}g /settimana`
        : null
    const cadence = [weeklyHours, weeklyDays]
      .filter((item): item is string => Boolean(item))
      .join(" | ")

    if (schedule && cadence) return `${schedule} • ${cadence}`
    if (schedule) return schedule
    if (cadence) return cadence
    return ""
  }, [familyWeeklyFrequency, familyWorkSchedule, processWeeklyHours])

  const familyAvailabilityRows = React.useMemo(() => {
    const familyPayload = parseAvailabilityPayload(familyAvailabilityJson)
    if (!familyPayload?.weekly) return []
    return Object.keys(AVAILABILITY_DAY_LABELS)
      .slice(0, 6)
      .map((day) => {
        const typedDay = day as keyof typeof AVAILABILITY_DAY_LABELS
        const slots = readAvailabilitySlots(familyPayload.weekly, typedDay)
        return {
          day: AVAILABILITY_DAY_LABELS[typedDay],
          activeByHour: AVAILABILITY_HOUR_LABELS.map((hourLabel) =>
            isAvailabilityHourActive(slots, hourLabel),
          ),
        }
      })
  }, [familyAvailabilityJson])

  return (
    <AvailabilityCalendarCard
      titleMeta={availabilityTitleMeta}
      isEditing={isEditing}
      showEditAction
      collapsible
      isUpdating={isUpdating}
      editDays={AVAILABILITY_EDIT_DAYS.map(({ field, label }) => ({
        field,
        label,
      }))}
      editBands={AVAILABILITY_EDIT_BANDS.map(({ field, label }) => ({
        field,
        label,
      }))}
      hourLabels={AVAILABILITY_HOUR_LABELS}
      readOnlyRows={readOnlyRows}
      comparisonRows={familyAvailabilityRows}
      familyRequestsText={familyRequestsText}
      matrix={matrix}
      vincoliOrari={vincoliOrari}
      onToggleEdit={onToggleEdit}
      onMatrixChange={(dayField, bandField, checked) =>
        onMatrixChange(
          dayField as AvailabilityEditDayField,
          bandField as AvailabilityEditBandField,
          checked,
        )
      }
      onVincoliChange={onVincoliChange}
      onSave={onSave}
    >
      <WorkerShiftPreferencesFields
        fields={[
          {
            id: "ricerca-tipo-rapporto-lavorativo",
            label: "Tipo di rapporto",
            domain: "lavoratori.tipo_rapporto_lavorativo",
            value: tipoRapportoValues,
            options: tipoRapportoOptions,
            placeholder: "Seleziona tipo rapporto",
            onChange: onTipoRapportoChange,
          },
          {
            id: "ricerca-lavori-accettabili",
            label: "Lavori accettabili",
            domain: "lavoratori.check_lavori_accettabili",
            value: lavoriAccettabili,
            options: lavoriAccettabiliOptions,
            placeholder: "Seleziona lavori",
            onChange: onLavoriAccettabiliChange,
            sortByOptionOrder: true,
          },
        ]}
        isEditing={isEditing}
        isUpdating={isUpdating}
        lookupColorsByDomain={lookupColorsByDomain}
      />
    </AvailabilityCalendarCard>
  )
}
