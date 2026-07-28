import * as React from "react"
import { MapPinIcon, PencilIcon } from "lucide-react"
import { useController, useWatch } from "react-hook-form"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
} from "@/components/ui/combobox"
import { FieldLabel } from "@/components/ui/field"
import { Form } from "@/components/ui/form"
import { FieldInput } from "@/components/forms/field-components"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import {
  getLookupOptionLabel,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
} from "@/lib/lookup-utils"

type LookupOption = {
  label: string
  value: string
}

type AddressDraft = {
  via: string
  civico: string
  cap: string
  citta: string
  provincia: string
  citofono: string
  come_ti_sposti: string[]
}

type AddressSectionCardProps = {
  isEditing: boolean
  isUpdating: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  showMobility?: boolean
  addressDraft?: AddressDraft
  provinciaOptions: LookupOption[]
  mobilityOptions: LookupOption[]
  selectedVia?: string | null
  selectedCivico?: string | null
  selectedCap?: string | null
  selectedCitta?: string | null
  selectedProvincia?: string | null
  selectedMobility?: string[]
  mobilityAnchor: React.RefObject<HTMLDivElement | null>
  /** Quando "parent-form", i campi usano il form del parent (gateFieldsForm). */
  addressPersistMode?: "nested-form" | "parent-form"
  onToggleEdit: () => void
  onFieldChange?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
    value: string,
  ) => void
  onFieldCommit?: (
    field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono",
    value: string,
  ) => void | Promise<void>
  onMobilityChange?: (values: string[]) => void
}

type AddressTextKey = "via" | "civico" | "cap" | "citta" | "citofono"

const ADDRESS_TEXT_FIELDS: Array<{ key: AddressTextKey; label: string }> = [
  { key: "cap", label: "CAP" },
  { key: "via", label: "Via" },
  { key: "civico", label: "Civico" },
  { key: "citta", label: "Comune" },
  { key: "citofono", label: "Citofono" },
]

function FieldProvinciaSelect({
  name,
  options,
}: {
  name: string
  options: LookupOption[]
}) {
  const { field } = useController({ name })
  const value = typeof field.value === "string" ? field.value : ""
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => field.onChange(next === "none" ? "" : next)}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Seleziona provincia" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function FieldMobilityCombobox({
  name,
  options,
  anchor,
  disabled,
}: {
  name: string
  options: LookupOption[]
  anchor: React.RefObject<HTMLDivElement | null>
  disabled?: boolean
}) {
  const { field } = useController({ name })
  const stored = Array.isArray(field.value) ? (field.value as string[]) : []
  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizeLookupOptionValues(stored, options)}
      onValueChange={(nextValues) =>
        field.onChange(
          normalizeLookupDbLabels(nextValues as string[], options),
        )
      }
      disabled={disabled}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <React.Fragment>
              {values.map((value: string) => (
                <ComboboxChip key={value}>
                  {getLookupOptionLabel(options, value)}
                </ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Seleziona opzioni" />
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

function AddressSectionCardBody({
  isEditing,
  isUpdating,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  showMobility = true,
  provinciaOptions,
  mobilityOptions,
  selectedVia,
  selectedCivico,
  selectedCap,
  selectedCitta,
  selectedProvincia,
  selectedMobility = [],
  mobilityAnchor,
  addressPersistMode,
  onToggleEdit,
}: {
  isEditing: boolean
  isUpdating: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  showMobility?: boolean
  provinciaOptions: LookupOption[]
  mobilityOptions: LookupOption[]
  selectedVia?: string | null
  selectedCivico?: string | null
  selectedCap?: string | null
  selectedCitta?: string | null
  selectedProvincia?: string | null
  selectedMobility?: string[]
  mobilityAnchor: React.RefObject<HTMLDivElement | null>
  addressPersistMode: "nested-form" | "parent-form"
  onToggleEdit: () => void
}) {
  const parentMobility = useWatch({
    name: "come_ti_sposti",
    disabled: addressPersistMode !== "parent-form",
  }) as string[] | undefined
  const mobilityValues =
    addressPersistMode === "parent-form" && Array.isArray(parentMobility)
      ? parentMobility
      : selectedMobility

  const composedAddress = [selectedVia, selectedCivico, selectedCap, selectedCitta, selectedProvincia]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter((v) => v && v !== "-")
    .join(" • ")

  return (
    <DetailSectionBlock
      title="Indirizzo"
      icon={<MapPinIcon className="text-muted-foreground size-4" />}
      action={showEditAction ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={isEditing ? "Termina modifica indirizzo" : "Modifica indirizzo"}
          title={isEditing ? "Termina modifica indirizzo" : "Modifica indirizzo"}
          onClick={onToggleEdit}
        >
          <PencilIcon />
        </Button>
      ) : undefined}
      showDefaultAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      contentClassName="space-y-3"
    >
      {isEditing ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <FieldLabel>Provincia</FieldLabel>
            <FieldProvinciaSelect name="provincia" options={provinciaOptions} />
          </div>
          {ADDRESS_TEXT_FIELDS.map((item) => (
            <div key={item.key} className="space-y-1">
              <FieldLabel>{item.label}</FieldLabel>
              <FieldInput name={item.key} placeholder={item.label} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm">{composedAddress || "-"}</p>
      )}

      {showMobility ? (
        <div className="space-y-1">
          <FieldLabel>Mobilita</FieldLabel>
          {isEditing ? (
            <FieldMobilityCombobox
              name="come_ti_sposti"
              options={mobilityOptions}
              anchor={mobilityAnchor}
              disabled={isUpdating}
            />
          ) : mobilityValues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {mobilityValues.map((value) => (
                <Badge key={value} variant="outline">
                  {value}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="truncate text-sm">-</p>
          )}
        </div>
      ) : null}
    </DetailSectionBlock>
  )
}

function NestedFormAddressSectionCard(
  props: AddressSectionCardProps & {
    resolvedPersistMode: "nested-form"
    addressDraft: AddressDraft
  },
) {
  const {
    isEditing,
    isUpdating,
    showEditAction = true,
    collapsible = true,
    defaultOpen = true,
    showMobility = true,
    addressDraft,
    provinciaOptions,
    mobilityOptions,
    selectedVia,
    selectedCivico,
    selectedCap,
    selectedCitta,
    selectedProvincia,
    selectedMobility = [],
    mobilityAnchor,
    resolvedPersistMode,
    onToggleEdit,
    onFieldCommit,
    onMobilityChange,
  } = props

  const form = useAutoSaveForm<AddressDraft>({
    defaults: {
      via: addressDraft.via,
      civico: addressDraft.civico,
      cap: addressDraft.cap,
      citta: addressDraft.citta,
      provincia: addressDraft.provincia,
      citofono: addressDraft.citofono,
      come_ti_sposti: addressDraft.come_ti_sposti,
    },
    onSave: async (patch) => {
      for (const [key, value] of Object.entries(patch)) {
        if (key === "come_ti_sposti") {
          onMobilityChange?.(Array.isArray(value) ? (value as string[]) : [])
        } else {
          await onFieldCommit?.(
            key as AddressTextKey | "provincia",
            (value as string) ?? "",
          )
        }
      }
    },
  })

  return (
    <Form {...form}>
      <AddressSectionCardBody
        isEditing={isEditing}
        isUpdating={isUpdating}
        showEditAction={showEditAction}
        collapsible={collapsible}
        defaultOpen={defaultOpen}
        showMobility={showMobility}
        provinciaOptions={provinciaOptions}
        mobilityOptions={mobilityOptions}
        selectedVia={selectedVia}
        selectedCivico={selectedCivico}
        selectedCap={selectedCap}
        selectedCitta={selectedCitta}
        selectedProvincia={selectedProvincia}
        selectedMobility={selectedMobility}
        mobilityAnchor={mobilityAnchor}
        addressPersistMode={resolvedPersistMode}
        onToggleEdit={onToggleEdit}
      />
    </Form>
  )
}

export function AddressSectionCard({
  isEditing,
  isUpdating,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  showMobility = true,
  addressDraft,
  provinciaOptions,
  mobilityOptions,
  selectedVia,
  selectedCivico,
  selectedCap,
  selectedCitta,
  selectedProvincia,
  selectedMobility = [],
  mobilityAnchor,
  addressPersistMode = "nested-form",
  onToggleEdit,
  onFieldCommit,
  onMobilityChange,
}: AddressSectionCardProps) {
  const resolvedPersistMode =
    addressPersistMode === "parent-form" ? "parent-form" : "nested-form"

  if (resolvedPersistMode === "parent-form") {
    return (
      <AddressSectionCardBody
        isEditing={isEditing}
        isUpdating={isUpdating}
        showEditAction={showEditAction}
        collapsible={collapsible}
        defaultOpen={defaultOpen}
        showMobility={showMobility}
        provinciaOptions={provinciaOptions}
        mobilityOptions={mobilityOptions}
        selectedVia={selectedVia}
        selectedCivico={selectedCivico}
        selectedCap={selectedCap}
        selectedCitta={selectedCitta}
        selectedProvincia={selectedProvincia}
        selectedMobility={selectedMobility}
        mobilityAnchor={mobilityAnchor}
        addressPersistMode={resolvedPersistMode}
        onToggleEdit={onToggleEdit}
      />
    )
  }

  if (!addressDraft) {
    throw new Error("AddressSectionCard richiede addressDraft in nested-form mode")
  }

  return (
    <NestedFormAddressSectionCard
      isEditing={isEditing}
      isUpdating={isUpdating}
      showEditAction={showEditAction}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      showMobility={showMobility}
      addressDraft={addressDraft}
      provinciaOptions={provinciaOptions}
      mobilityOptions={mobilityOptions}
      selectedVia={selectedVia}
      selectedCivico={selectedCivico}
      selectedCap={selectedCap}
      selectedCitta={selectedCitta}
      selectedProvincia={selectedProvincia}
      selectedMobility={selectedMobility}
      mobilityAnchor={mobilityAnchor}
      resolvedPersistMode={resolvedPersistMode}
      onToggleEdit={onToggleEdit}
      onFieldCommit={onFieldCommit}
      onMobilityChange={onMobilityChange}
    />
  )
}
