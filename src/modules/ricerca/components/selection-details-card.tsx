import * as React from "react"
import { ClipboardListIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { FieldLabel } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useController } from "react-hook-form"
import { Form } from "@/components/ui/form"
import { FieldTextarea } from "@/components/forms/field-components"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { asString, readArrayStrings } from "@/features/lavoratori/lib/base-utils"
import {
  getLookupLabelForSave,
  getLookupOptionLabel,
  getLookupSelectValue,
  getTagClassName,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
  resolveLookupColor,
  type LookupOption,
} from "@/features/lavoratori/lib/lookup-utils"

type SelectionDetailsRow = Record<string, unknown>

type SelectionDetailsCardProps = {
  selectionRow: SelectionDetailsRow
  lookupColorsByDomain: Map<string, string>
  statusOptions: LookupOption[]
  followupOptions: LookupOption[]
  archivioOptions: LookupOption[]
  nonSelezionatoOptions: LookupOption[]
  noMatchOptions: LookupOption[]
  onPatchField: (field: string, value: unknown) => Promise<void> | void
  disabled?: boolean
}

type SelectionDraft = {
  stato_selezione: string
  note_selezione: string
  motivo_inserimento_manuale: string
  followup_senza_risposta: string
  motivo_archivio: string
  motivo_non_selezionato: string[]
  motivo_no_match: string
}

function buildDraft(selectionRow: SelectionDetailsRow): SelectionDraft {
  return {
    stato_selezione: asString(selectionRow.stato_selezione),
    note_selezione: asString(selectionRow.note_selezione),
    motivo_inserimento_manuale: asString(selectionRow.motivo_inserimento_manuale),
    followup_senza_risposta: asString(selectionRow.followup_senza_risposta),
    motivo_archivio: asString(selectionRow.motivo_archivio),
    motivo_non_selezionato: readArrayStrings(selectionRow.motivo_non_selezionato),
    motivo_no_match: asString(selectionRow.motivo_no_match),
  }
}

function normalizeStatusToken(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim()
}

function MultiLookupField({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string[]
  options: LookupOption[]
  disabled: boolean
  onChange: (values: string[]) => void
}) {
  const anchor = useComboboxAnchor()
  const normalizedValue = React.useMemo(
    () => normalizeLookupOptionValues(value, options),
    [options, value],
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeLookupDbLabels(nextValues as string[], options))
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((itemValue: string) => {
                return (
                  <ComboboxChip key={itemValue}>
                    {getLookupOptionLabel(options, itemValue)}
                  </ComboboxChip>
                )
              })}
              <ComboboxChipsInput placeholder="Seleziona motivazioni" />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
        <ComboboxList className="max-h-72 overflow-y-auto">
          {(item) => (
            <ComboboxItem key={item} value={item}>
              {getLookupOptionLabel(options, item)}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

// FASE 5 BIS — thin wrapper form-aware del Select con mappatura label↔db
// (getLookupSelectValue/getLookupLabelForSave). Il form memorizza la LABEL DB.
function FieldLookupSelect({
  name,
  options,
  placeholder,
  noneLabel,
  disabled,
  triggerClassName,
  getItemClassName,
}: {
  name: string
  options: LookupOption[]
  placeholder: string
  noneLabel: string
  disabled?: boolean
  triggerClassName?: string
  getItemClassName?: (option: LookupOption) => string | undefined
}) {
  const { field } = useController({ name })
  const current = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={getLookupSelectValue(current, options, "none")}
      onValueChange={(value) =>
        field.onChange(value === "none" ? "" : getLookupLabelForSave(value, options))
      }
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName ?? "h-9 w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{noneLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className={getItemClassName?.(option)}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// FASE 5 BIS — thin wrapper form-aware del MultiLookupField (preserva la
// normalizzazione value-key↔db-label interna).
function FieldMultiLookup({
  name,
  options,
  disabled,
}: {
  name: string
  options: LookupOption[]
  disabled: boolean
}) {
  const { field } = useController({ name })
  const value = Array.isArray(field.value) ? (field.value as string[]) : []
  return (
    <MultiLookupField
      value={value}
      options={options}
      disabled={disabled}
      onChange={field.onChange}
    />
  )
}

export function SelectionDetailsCard({
  selectionRow,
  lookupColorsByDomain,
  statusOptions,
  followupOptions,
  archivioOptions,
  nonSelezionatoOptions,
  noMatchOptions,
  onPatchField,
  disabled = false,
}: SelectionDetailsCardProps) {
  // FASE 5 BIS — form + autosave. Il resync realtime (keepDirtyValues) e il
  // dirty-tracking sono gestiti da useAutoSaveForm; ogni campo si salva da solo
  // via onPatchField. La normalizzazione "" / [] → null è centralizzata qui.
  const form = useAutoSaveForm({
    defaults: buildDraft(selectionRow),
    onSave: async (patch) => {
      for (const [fieldName, value] of Object.entries(patch)) {
        const out = Array.isArray(value)
          ? value.length > 0
            ? value
            : null
          : typeof value === "string"
            ? value.trim() || null
            : value ?? null
        await onPatchField(fieldName, out)
      }
    },
  })

  const statoSelezione = form.watch("stato_selezione")
  const normalizedStatus = normalizeStatusToken(statoSelezione)
  const showFollowupSenzaRisposta = normalizedStatus === "non risponde"
  const showMotivazioneArchivio = normalizedStatus.includes("archivio")
  const isCandidatoPoorFit =
    normalizedStatus.includes("candidato") &&
    normalizedStatus.includes("poor") &&
    normalizedStatus.includes("fit")
  const showMotivazioneNonSelezionato =
    normalizedStatus === "non selezionato" ||
    normalizedStatus === "nascosto oot" ||
    isCandidatoPoorFit
  const showMotivazioneNoMatch = normalizedStatus === "no match"
  const resolveStatusColor = React.useCallback(
    (value: string) =>
      resolveLookupColor(lookupColorsByDomain, "selezioni_lavoratori.stato_selezione", value),
    [lookupColorsByDomain]
  )
  const selectedStatusClassName = getTagClassName(resolveStatusColor(statoSelezione))

  return (
    <Form {...form}>
    <DetailSectionBlock
      title="Selezione"
      icon={<ClipboardListIcon className="text-muted-foreground size-4" />}
      collapsible
      defaultOpen
      contentClassName="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <FieldLabel>
          Stato selezione
        </FieldLabel>
        <div className="max-w-sm">
          <FieldLookupSelect
            name="stato_selezione"
            options={statusOptions}
            placeholder="Seleziona stato"
            noneLabel="Nessuno stato"
            disabled={disabled}
            triggerClassName={`h-9 w-full ${selectedStatusClassName}`}
            getItemClassName={(option) =>
              getTagClassName(resolveStatusColor(option.label || option.value))
            }
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <FieldLabel>
          Appunti generali
        </FieldLabel>
        <FieldTextarea
          name="note_selezione"
          className="min-h-28 w-full text-sm"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <FieldLabel>
          Perché è stata inserita manualmente?
        </FieldLabel>
        <FieldTextarea
          name="motivo_inserimento_manuale"
          className="min-h-24 w-full text-sm"
        />
      </div>

      {showFollowupSenzaRisposta ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Followup senza risposta
          </FieldLabel>
          <div className="max-w-sm">
            <FieldLookupSelect
              name="followup_senza_risposta"
              options={followupOptions}
              placeholder="Seleziona followup"
              noneLabel="Nessun followup"
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}

      {showMotivazioneArchivio ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione archivio
          </FieldLabel>
          <div className="max-w-sm">
            <FieldLookupSelect
              name="motivo_archivio"
              options={archivioOptions}
              placeholder="Seleziona motivazione"
              noneLabel="Nessuna motivazione"
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}

      {showMotivazioneNonSelezionato ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione non selezionato
          </FieldLabel>
          <FieldMultiLookup
            name="motivo_non_selezionato"
            options={nonSelezionatoOptions}
            disabled={disabled}
          />
        </div>
      ) : null}

      {showMotivazioneNoMatch ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione no match
          </FieldLabel>
          <div className="max-w-sm">
            <FieldLookupSelect
              name="motivo_no_match"
              options={noMatchOptions}
              placeholder="Seleziona motivazione"
              noneLabel="Nessuna motivazione"
              disabled={disabled}
            />
          </div>
        </div>
      ) : null}
    </DetailSectionBlock>
    </Form>
  )
}
