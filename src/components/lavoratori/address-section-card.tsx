import * as React from "react"
import { MapPinIcon, PencilIcon } from "lucide-react"

import { DetailSectionCard } from "@/components/shared/detail-section-card"
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
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { DetailRow } from "@/components/lavoratori/detail-row"

type LookupOption = {
  label: string
  value: string
}

type AddressDraft = {
  provincia: string
  indirizzo_residenza_completo: string
  come_ti_sposti: string[]
}

type AddressSectionCardProps = {
  isEditing: boolean
  isUpdating: boolean
  showEditAction?: boolean
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
  onAddressChange: (value: string) => void
  onAddressBlur: () => void
  onMobilityChange: (values: string[]) => void
}

export function AddressSectionCard({
  isEditing,
  isUpdating,
  showEditAction = true,
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
  onAddressChange,
  onAddressBlur,
  onMobilityChange,
}: AddressSectionCardProps) {
  return (
    <DetailSectionCard
      title="Indirizzo"
      titleIcon={<MapPinIcon className="text-muted-foreground size-4" />}
      titleAction={showEditAction ? (
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
      titleOnBorder
      contentClassName="space-y-2"
    >
      <DetailRow label="Provincia">
        {isEditing ? (
          <div className="w-full max-w-xs">
            <Select
              value={addressDraft.provincia || undefined}
              onValueChange={onProvinciaChange}
              disabled={isUpdating}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue placeholder="Seleziona provincia" />
              </SelectTrigger>
              <SelectContent>
                {provinciaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="truncate">{selectedProvincia || "-"}</span>
        )}
      </DetailRow>

      {showCap ? (
        <DetailRow label="CAP">
          <span className="truncate">{selectedCap || "-"}</span>
        </DetailRow>
      ) : null}

      <DetailRow label="Indirizzo">
        {isEditing ? (
          <div className="w-full max-w-md">
            <Input
              value={addressDraft.indirizzo_residenza_completo}
              onChange={(event) => onAddressChange(event.target.value)}
              onBlur={onAddressBlur}
              disabled={isUpdating}
              placeholder="Inserisci indirizzo"
              className="h-7 text-sm"
            />
          </div>
        ) : (
          <span className="truncate">{selectedAddress || "-"}</span>
        )}
      </DetailRow>

      <DetailRow label="Come si sposta">
        {isEditing ? (
          <div className="w-full max-w-md">
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
          </div>
        ) : selectedMobility.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedMobility.map((value) => (
              <Badge key={value} variant="outline">
                {value}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="truncate">-</span>
        )}
      </DetailRow>
    </DetailSectionCard>
  )
}
