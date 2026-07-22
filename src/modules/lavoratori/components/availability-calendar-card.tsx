import * as React from "react"
import { CalendarDaysIcon, CircleHelpIcon, PencilIcon, SaveIcon } from "lucide-react"
import { useWatch } from "react-hook-form"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { FieldLabel } from "@/components/ui/field"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Form } from "@/components/ui/form"
import { FieldTextarea } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"

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
  vincoliOrari?: string
  /** Quando "parent-form", il campo vincoli usa FieldTextarea nel form del parent. */
  vincoliPersistMode?: "nested-form" | "parent-form"
  onToggleEdit: () => void
  onSave?: () => void
  onMatrixChange: (dayField: string, bandField: string, checked: boolean) => void
  onVincoliChange?: (value: string) => void
  /**
   * Se fornito, "Vincoli orari" autosalva (debounced) tramite DebouncedTextarea
   * invece del solo aggiornamento bozza + bottone Salva. Robusto contro il
   * clobber da resync realtime (useDebouncedSave ignora committedValue dopo che
   * l'utente ha digitato) e non perde il testo se il save batch non parte.
   */
  onVincoliSave?: (value: string) => Promise<void> | void
  /** Record a cui i vincoli sono legati (id worker): flush/resync al cambio. */
  vincoliIdentity?: unknown
  children?: React.ReactNode
}

function VincoliOrariField({
  isEditing,
  isUpdating,
  vincoliOrari = "",
  vincoliPersistMode,
  vincoliAutosaveEnabled = false,
  onVincoliChange,
}: {
  isEditing: boolean
  isUpdating: boolean
  vincoliOrari?: string
  vincoliPersistMode: "nested-form" | "parent-form"
  vincoliAutosaveEnabled?: boolean
  onVincoliChange?: (value: string) => void
}) {
  const parentFormValue = useWatch({ name: "vincoli_orari_disponibilita" }) as
    | string
    | undefined
  const displayValue =
    vincoliPersistMode === "parent-form"
      ? typeof parentFormValue === "string"
        ? parentFormValue
        : ""
      : vincoliOrari

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <div className="ui-type-label">Vincoli orari</div>
        <HoverCard openDelay={120}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex size-5 items-center justify-center rounded-full transition-colors"
              aria-label="Linee guida vincoli orari"
              title="Linee guida vincoli orari"
            >
              <CircleHelpIcon className="size-3.5" />
            </button>
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-[24rem] space-y-3 p-4">
            <p className="text-sm font-semibold">Come scrivere i vincoli</p>
            <div className="text-muted-foreground space-y-2 text-sm leading-6">
              <p>
                Usa frasi semplici nel formato:
                <span className="text-foreground font-medium"> Disponibile/Non disponibile + giorni + fascia oraria</span>.
              </p>
              <p>
                Scrivi orari in 24h, giorni espliciti e regole separate da punto o punto e virgola.
              </p>
              <p className="text-foreground font-medium">
                Esempio: Disponibile lun-ven 12:00-19:00. Non disponibile sab-dom.
              </p>
              <p>Evita frasi ambigue come "libera dalle 12 in poi" o "no sabato".</p>
            </div>
          </HoverCardContent>
        </HoverCard>
      </div>
      {isEditing ? (
        <div className="w-full max-w-2xl">
          {vincoliPersistMode === "parent-form" ? (
            <FieldTextarea
              name="vincoli_orari_disponibilita"
              placeholder="Inserisci vincoli orari"
              rows={3}
              className="min-h-[5.25rem] w-full text-sm"
            />
          ) : vincoliAutosaveEnabled ? (
            <FieldTextarea
              name="vincoli_orari"
              placeholder="Inserisci vincoli orari"
              rows={3}
              className="min-h-[5.25rem] w-full text-sm"
            />
          ) : (
            <Textarea
              value={vincoliOrari}
              onChange={(event) => onVincoliChange?.(event.target.value)}
              disabled={isUpdating}
              placeholder="Inserisci vincoli orari"
              rows={3}
              className="min-h-[5.25rem] w-full text-sm"
            />
          )}
        </div>
      ) : (
        <div className="w-full max-w-2xl">
          <div className="text-foreground whitespace-pre-wrap break-words text-sm">
            {displayValue || "-"}
          </div>
        </div>
      )}
    </div>
  )
}

function AvailabilityCalendarCardBody({
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
  vincoliOrari = "",
  vincoliPersistMode,
  vincoliAutosaveEnabled = false,
  onToggleEdit,
  onSave,
  onMatrixChange,
  onVincoliChange,
  children,
}: Omit<AvailabilityCalendarCardProps, "onVincoliSave" | "vincoliIdentity"> & {
  vincoliPersistMode: "nested-form" | "parent-form"
  vincoliAutosaveEnabled?: boolean
}) {
  const comparisonByDay = React.useMemo(() => {
    const map = new Map<string, boolean[]>()
    for (const row of comparisonRows) {
      map.set(row.day, row.activeByHour)
    }
    return map
  }, [comparisonRows])
  const hasComparisonRows = comparisonRows.length > 0

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
      action={showEditAction || onSave ? (
        <div className="flex items-center gap-1.5">
          {isEditing && onSave ? (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onSave}
              disabled={isUpdating}
            >
              <SaveIcon />
              {isUpdating ? "Salvataggio" : "Salva"}
            </Button>
          ) : null}
          {showEditAction ? (
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
          ) : null}
        </div>
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
                  className="text-muted-foreground px-2 py-1 text-center text-2xs font-medium"
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
                        const className = hasComparisonRows
                          ? comparisonActive
                            ? isActive
                              ? "h-4 rounded-[5px] border border-emerald-500 bg-emerald-300"
                              : "h-4 rounded-[5px] border border-red-300 bg-red-200"
                            : isActive
                              ? "h-4 rounded-[5px] border border-emerald-100 bg-emerald-50"
                              : "h-4 rounded-[5px] border border-border/50 bg-muted/25"
                          : isActive
                            ? "h-4 rounded-[5px] border border-emerald-300 bg-emerald-200"
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

        <VincoliOrariField
          isEditing={isEditing}
          isUpdating={isUpdating}
          vincoliOrari={vincoliOrari}
          vincoliPersistMode={vincoliPersistMode}
          vincoliAutosaveEnabled={vincoliAutosaveEnabled}
          onVincoliChange={onVincoliChange}
        />

        {children}
      </div>
    </DetailSectionBlock>
  )
}

function NestedFormAvailabilityCalendarCard(
  props: AvailabilityCalendarCardProps & {
    resolvedPersistMode: "nested-form"
  },
) {
  const {
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
    vincoliOrari = "",
    resolvedPersistMode,
    onToggleEdit,
    onSave,
    onMatrixChange,
    onVincoliChange,
    onVincoliSave,
    children,
  } = props

  const form = useAutoSaveForm({
    defaults: { vincoli_orari: vincoliOrari },
    onSave: async (patch) => {
      if (!onVincoliSave) return
      if ("vincoli_orari" in patch) {
        await onVincoliSave(patch.vincoli_orari ?? "")
      }
    },
  })

  return (
    <Form {...form}>
      <AvailabilityCalendarCardBody
        titleMeta={titleMeta}
        isEditing={isEditing}
        showEditAction={showEditAction}
        collapsible={collapsible}
        defaultOpen={defaultOpen}
        isUpdating={isUpdating}
        editDays={editDays}
        editBands={editBands}
        hourLabels={hourLabels}
        readOnlyRows={readOnlyRows}
        comparisonRows={comparisonRows}
        familyRequestsText={familyRequestsText}
        matrix={matrix}
        vincoliOrari={vincoliOrari}
        vincoliPersistMode={resolvedPersistMode}
        vincoliAutosaveEnabled={Boolean(onVincoliSave)}
        onToggleEdit={onToggleEdit}
        onSave={onSave}
        onMatrixChange={onMatrixChange}
        onVincoliChange={onVincoliChange}
        children={children}
      />
    </Form>
  )
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
  vincoliOrari = "",
  vincoliPersistMode = "nested-form",
  onToggleEdit,
  onSave,
  onMatrixChange,
  onVincoliChange,
  onVincoliSave,
  children,
}: AvailabilityCalendarCardProps) {
  const resolvedPersistMode =
    vincoliPersistMode === "parent-form" ? "parent-form" : "nested-form"

  if (resolvedPersistMode === "parent-form") {
    return (
      <AvailabilityCalendarCardBody
        titleMeta={titleMeta}
        isEditing={isEditing}
        showEditAction={showEditAction}
        collapsible={collapsible}
        defaultOpen={defaultOpen}
        isUpdating={isUpdating}
        editDays={editDays}
        editBands={editBands}
        hourLabels={hourLabels}
        readOnlyRows={readOnlyRows}
        comparisonRows={comparisonRows}
        familyRequestsText={familyRequestsText}
        matrix={matrix}
        vincoliPersistMode={resolvedPersistMode}
        onToggleEdit={onToggleEdit}
        onSave={onSave}
        onMatrixChange={onMatrixChange}
        children={children}
      />
    )
  }

  return (
    <NestedFormAvailabilityCalendarCard
      titleMeta={titleMeta}
      isEditing={isEditing}
      showEditAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      isUpdating={isUpdating}
      editDays={editDays}
      editBands={editBands}
      hourLabels={hourLabels}
      readOnlyRows={readOnlyRows}
      comparisonRows={comparisonRows}
      familyRequestsText={familyRequestsText}
      matrix={matrix}
      vincoliOrari={vincoliOrari}
      resolvedPersistMode={resolvedPersistMode}
      onToggleEdit={onToggleEdit}
      onSave={onSave}
      onMatrixChange={onMatrixChange}
      onVincoliChange={onVincoliChange}
      onVincoliSave={onVincoliSave}
      children={children}
    />
  )
}
