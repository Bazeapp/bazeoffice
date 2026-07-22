import * as React from "react"

import { Input } from "@/components/ui/input"
import { formatItalianCurrency } from "@/lib/format-utils"
import { toast } from "sonner"

import { PAYROLL_CURRENCY_OPTIONS } from "../lib"

// Campo "Importo sconto": controllato e con clamp sul commit (blur/Enter).
// Non usa DebouncedInput perché, dopo il primo input, quel hook tiene il
// draft "sticky" e non rifletterebbe il valore limitato al cap. Qui invece
// se si digita un valore oltre il massimo viene riportato al massimo, sia
// nel valore salvato sia in quello mostrato.
export function PayrollOverviewImportoScontoField({
  value,
  max,
  onCommit,
}: {
  value: number | null
  max: number
  onCommit: (value: number | null) => Promise<void>
}) {
  const [draft, setDraft] = React.useState(value === null ? "" : String(value))
  const isEditingRef = React.useRef(false)

  React.useEffect(() => {
    if (isEditingRef.current) return
    setDraft(value === null ? "" : String(value))
  }, [value])

  const commit = React.useCallback(
    async (raw: string) => {
      isEditingRef.current = false
      const trimmed = raw.trim()

      if (trimmed === "") {
        setDraft("")
        if (value !== null) await onCommit(null)
        return
      }

      const parsed = Number(trimmed)
      if (!Number.isFinite(parsed) || parsed < 0) {
        setDraft(value === null ? "" : String(value))
        return
      }

      let next = parsed
      if (next > max) {
        next = max
        toast.info(
          `Importo sconto limitato al massimo di ${formatItalianCurrency(max, PAYROLL_CURRENCY_OPTIONS)}`,
        )
      }

      setDraft(String(next))
      if (next !== value) await onCommit(next)
    },
    [max, value, onCommit],
  )

  return (
    <Input
      type="number"
      step="0.01"
      min="0"
      value={draft}
      onChange={(event) => {
        isEditingRef.current = true
        setDraft(event.target.value)
      }}
      onBlur={(event) => void commit(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur()
      }}
    />
  )
}
