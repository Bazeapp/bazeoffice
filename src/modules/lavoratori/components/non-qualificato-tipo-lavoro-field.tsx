import * as React from "react"

import {
  normalizeDomesticRoleDbLabels,
  normalizeDomesticRoleLookupValues,
} from "../lib/base-utils"
import { getLookupOptionLabel } from "@/lib/lookup-utils"
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

export type NonQualificatoTipoLavoroFieldProps = {
  value: string[]
  options: Array<{ label: string; value: string }>
  disabled: boolean
  onChange: (values: string[]) => void
}

export function NonQualificatoTipoLavoroField({
  value,
  options,
  disabled,
  onChange,
}: NonQualificatoTipoLavoroFieldProps) {
  const anchor = useComboboxAnchor()
  const normalizedValue = React.useMemo(
    () => normalizeDomesticRoleLookupValues(value, options),
    [options, value],
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={options.map((option) => option.value)}
      value={normalizedValue}
      onValueChange={(nextValues) =>
        onChange(normalizeDomesticRoleDbLabels(nextValues as string[]))
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
              <ComboboxChipsInput />
            </React.Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor} className="max-h-80">
        <ComboboxEmpty>Nessun valore trovato.</ComboboxEmpty>
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
