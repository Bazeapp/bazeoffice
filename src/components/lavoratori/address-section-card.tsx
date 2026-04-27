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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type LookupOption = {
  label: string
  value: string
}

type AddressDraft = {
  provincia: string
  cap: string
  indirizzo_residenza_completo: string
  come_ti_sposti: string[]
}

type AddressSectionCardProps = {
  isEditing: boolean
  isUpdating: boolean
  showEditAction?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  showCap?: boolean
  addressDraft: AddressDraft
  provinciaOptions: LookupOption[]
  mobilityOptions: LookupOption[]
  selectedProvincia: string
  selectedCap: string
  selectedAddress: string
  selectedMobility: string[]
  mobilityAnchor: React.RefObject<HTMLDivElement | null>
  onToggleEdit: () => void
  onProvinciaChange: (value: string) => void
  onCapChange: (value: string) => void
  onCapBlur: () => void
  onAddressChange: (value: string) => void
  onAddressBlur: () => void
  onMobilityChange: (values: string[]) => void
}

export function AddressSectionCard({
  isEditing,
  isUpdating,
  showEditAction = true,
  collapsible = true,
  defaultOpen = true,
  showCap = true,
  addressDraft,
  provinciaOptions,
  mobilityOptions,
  selectedProvincia,
  selectedCap,
  selectedAddress,
  selectedMobility,
  mobilityAnchor,
  onToggleEdit,
  onProvinciaChange,
  onCapChange,
  onCapBlur,
  onAddressChange,
  onAddressBlur,
  onMobilityChange,
}: AddressSectionCardProps) {
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
      <div
        className={
          showCap
            ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[130px_100px_minmax(0,2fr)_minmax(240px,1fr)]"
            : "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[130px_minmax(0,2fr)_minmax(240px,1fr)]"
        }
      >
        <div className="space-y-1">
          <FieldLabel>Provincia</FieldLabel>
          {isEditing ? (
            <Select
              value={addressDraft.provincia || undefined}
              onValueChange={onProvinciaChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinciaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="truncate text-sm">{selectedProvincia || "-"}</p>
          )}
        </div>

        {showCap ? (
          <div className="space-y-1">
            <FieldLabel>CAP</FieldLabel>
            {isEditing ? (
              <Input
                value={addressDraft.cap}
                onChange={(event) => {
                  const normalized = event.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9 ]/g, "")
                    .slice(0, 10)
                  onCapChange(normalized)
                }}
                onBlur={onCapBlur}
                disabled={isUpdating}
                placeholder="CAP"
              />
            ) : (
              <p className="truncate text-sm">{selectedCap || "-"}</p>
            )}
          </div>
        ) : null}

        <div className="space-y-1">
          <FieldLabel>Indirizzo</FieldLabel>
          {isEditing ? (
            <Input
              value={addressDraft.indirizzo_residenza_completo}
              onChange={(event) => onAddressChange(event.target.value)}
              onBlur={onAddressBlur}
              disabled={isUpdating}
              placeholder="Inserisci indirizzo"
            />
          ) : (
            <p className="truncate text-sm">{selectedAddress || "-"}</p>
          )}
        </div>

        <div className="space-y-1">
          <FieldLabel>Mobilita</FieldLabel>
          {isEditing ? (
            <Combobox
              multiple
              autoHighlight
              items={mobilityOptions.map((option) => option.label)}
              value={addressDraft.come_ti_sposti}
              onValueChange={(nextValues) => onMobilityChange(nextValues as string[])}
              disabled={isUpdating}
            >
              <ComboboxChips ref={mobilityAnchor} className="w-full">
                <ComboboxValue>
                  {(values) => (
                    <React.Fragment>
                      {values.map((value: string) => (
                        <ComboboxChip key={value}>{value}</ComboboxChip>
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
                      {item}
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
      </div>
    </DetailSectionBlock>
  )
}
