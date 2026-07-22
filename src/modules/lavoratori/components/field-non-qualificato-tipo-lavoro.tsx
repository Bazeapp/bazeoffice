import { useController } from "react-hook-form"

import { NonQualificatoTipoLavoroField } from "./non-qualificato-tipo-lavoro-field"

// Combobox multi "tipo_lavoro_domestico" agganciato al form. Riusa
// NonQualificatoTipoLavoroField preservando normalizeDomesticRole* (la
// normalizzazione DB-label la fa già il componente interno).
export function FieldNonQualificatoTipoLavoro({
  name,
  options,
  disabled,
}: {
  name: string
  options: Array<{ label: string; value: string }>
  disabled: boolean
}) {
  const { field } = useController({ name })
  const value = Array.isArray(field.value) ? (field.value as string[]) : []
  return (
    <NonQualificatoTipoLavoroField
      value={value}
      options={options}
      disabled={disabled}
      onChange={(values) => field.onChange(values)}
    />
  )
}
