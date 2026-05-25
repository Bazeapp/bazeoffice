import * as React from "react"
import { MapPinIcon, PencilIcon } from "lucide-react"

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
import { DebouncedInput } from "@/components/ui/debounced-input"
import {
  getLookupOptionLabel,
  normalizeLookupDbLabels,
  normalizeLookupOptionValues,
} from "@/features/lavoratori/lib/lookup-utils"

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
  addressDraft: AddressDraft
  provinciaOptions: LookupOption[]
  mobilityOptions: LookupOption[]
  selectedVia?: string | null
  selectedCivico?: string | null
  selectedCap?: string | null
  selectedCitta?: string | null
  selectedProvincia?: string | null
  selectedMobility: string[]
  mobilityAnchor: React.RefObject<HTMLDivElement | null>
  onToggleEdit: () => void
  onFieldChange: (field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono", value: string) => void
  onFieldCommit: (field: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono", value: string) => void | Promise<void>
  onMobilityChange: (values: string[]) => void
}

const ADDRESS_FIELDS: Array<{
  key: "via" | "civico" | "cap" | "citta" | "provincia" | "citofono"
  label: string
}> = [
  { key: "provincia", label: "Provincia" },
  { key: "cap", label: "CAP" },
  { key: "via", label: "Via" },
  { key: "civico", label: "Civico" },
  { key: "citta", label: "Comune" },
  { key: "citofono", label: "Citofono" },
]

export function AddressSectionCard({
  isEditing,
  isUpdating,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  showMobility = true,
  addressDraft,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  provinciaOptions: _provinciaOptions,
  mobilityOptions,
  selectedVia,
  selectedCivico,
  selectedCap,
  selectedCitta,
  selectedProvincia,
  selectedMobility,
  mobilityAnchor,
  onToggleEdit,
  onFieldChange,
  onFieldCommit,
  onMobilityChange,
}: AddressSectionCardProps) {
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
          {ADDRESS_FIELDS.map((item) => (
            <div key={item.key} className="space-y-1">
              <FieldLabel>{item.label}</FieldLabel>
              <DebouncedInput
                committedValue={addressDraft[item.key]}
                onSave={async (value) => {
                  onFieldChange(item.key, value)
                  await onFieldCommit(item.key, value)
                }}
                // Intentionally NOT passing `disabled={isUpdating}`: a
                // transient disable during save forces the browser to fire
                // blur and the user gets kicked out of the field mid-typing.
                // Multiple in-flight saves are fine (last write wins).
                placeholder={item.label}
              />
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
            <Combobox
              multiple
              autoHighlight
              items={mobilityOptions.map((option) => option.value)}
              value={normalizeLookupOptionValues(
                addressDraft.come_ti_sposti,
                mobilityOptions,
              )}
              onValueChange={(nextValues) =>
                onMobilityChange(
                  normalizeLookupDbLabels(nextValues as string[], mobilityOptions),
                )
              }
              disabled={isUpdating}
            >
              <ComboboxChips ref={mobilityAnchor} className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>
                          {getLookupOptionLabel(mobilityOptions, value)}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder="Seleziona opzioni" />
                    </React.Fragment>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxContent anchor={mobilityAnchor} className="max-h-80">
                <ComboboxEmpty>Nessuna opzione trovata.</ComboboxEmpty>
                <ComboboxList className="max-h-72 overflow-y-auto">
                  {(item) => (
                    <ComboboxItem key={item} value={item}>
                      {getLookupOptionLabel(mobilityOptions, item)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          ) : selectedMobility.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedMobility.map((value) => (
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
