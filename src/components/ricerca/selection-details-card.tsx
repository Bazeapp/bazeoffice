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
import { DebouncedTextarea } from "@/components/ui/debounced-input"
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
  const [draft, setDraft] = React.useState<SelectionDraft>(() => buildDraft(selectionRow))

  React.useEffect(() => {
    setDraft(buildDraft(selectionRow))
  }, [selectionRow])

  const normalizedStatus = React.useMemo(
    () => normalizeStatusToken(draft.stato_selezione),
    [draft.stato_selezione]
  )
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
  const selectedStatusClassName = getTagClassName(resolveStatusColor(draft.stato_selezione))

  return (
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
          <Select
            value={getLookupSelectValue(draft.stato_selezione, statusOptions, "none")}
            onValueChange={(value) => {
              const nextValue = value === "none" ? "" : getLookupLabelForSave(value, statusOptions)
              setDraft((current) => ({ ...current, stato_selezione: nextValue }))
              void onPatchField("stato_selezione", nextValue || null)
            }}
            disabled={disabled}
          >
            <SelectTrigger className={`h-9 w-full ${selectedStatusClassName}`}>
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessuno stato</SelectItem>
              {statusOptions.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className={getTagClassName(resolveStatusColor(option.label || option.value))}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <FieldLabel>
          Appunti generali
        </FieldLabel>
        <DebouncedTextarea
          committedValue={draft.note_selezione}
          onSave={async (value) => {
            setDraft((current) => ({ ...current, note_selezione: value }))
            await onPatchField("note_selezione", value.trim() || null)
          }}
          className="min-h-28 w-full text-sm"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <FieldLabel>
          Perché è stata inserita manualmente?
        </FieldLabel>
        <DebouncedTextarea
          committedValue={draft.motivo_inserimento_manuale}
          onSave={async (value) => {
            setDraft((current) => ({
              ...current,
              motivo_inserimento_manuale: value,
            }))
            await onPatchField(
              "motivo_inserimento_manuale",
              value.trim() || null,
            )
          }}
          className="min-h-24 w-full text-sm"
        />
      </div>

      {showFollowupSenzaRisposta ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Followup senza risposta
          </FieldLabel>
          <div className="max-w-sm">
            <Select
              value={getLookupSelectValue(draft.followup_senza_risposta, followupOptions, "none")}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : getLookupLabelForSave(value, followupOptions)
                setDraft((current) => ({ ...current, followup_senza_risposta: nextValue }))
                void onPatchField("followup_senza_risposta", nextValue || null)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Seleziona followup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessun followup</SelectItem>
                {followupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {showMotivazioneArchivio ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione archivio
          </FieldLabel>
          <div className="max-w-sm">
            <Select
              value={getLookupSelectValue(draft.motivo_archivio, archivioOptions, "none")}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : getLookupLabelForSave(value, archivioOptions)
                setDraft((current) => ({ ...current, motivo_archivio: nextValue }))
                void onPatchField("motivo_archivio", nextValue || null)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Seleziona motivazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna motivazione</SelectItem>
                {archivioOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      {showMotivazioneNonSelezionato ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione non selezionato
          </FieldLabel>
          <MultiLookupField
            value={draft.motivo_non_selezionato}
            options={nonSelezionatoOptions}
            disabled={disabled}
            onChange={(values) => {
              setDraft((current) => ({ ...current, motivo_non_selezionato: values }))
              void onPatchField("motivo_non_selezionato", values.length > 0 ? values : null)
            }}
          />
        </div>
      ) : null}

      {showMotivazioneNoMatch ? (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
          <FieldLabel>
            Motivazione no match
          </FieldLabel>
          <div className="max-w-sm">
            <Select
              value={getLookupSelectValue(draft.motivo_no_match, noMatchOptions, "none")}
              onValueChange={(value) => {
                const nextValue = value === "none" ? "" : getLookupLabelForSave(value, noMatchOptions)
                setDraft((current) => ({ ...current, motivo_no_match: nextValue }))
                void onPatchField("motivo_no_match", nextValue || null)
              }}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue placeholder="Seleziona motivazione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nessuna motivazione</SelectItem>
                {noMatchOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}
    </DetailSectionBlock>
  )
}
