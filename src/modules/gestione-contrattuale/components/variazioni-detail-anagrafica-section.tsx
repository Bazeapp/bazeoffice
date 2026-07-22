import * as React from "react"
import { PencilIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { FieldInput } from "@/components/forms/field-components"
import { Form } from "@/components/ui/form"
import { useAutoSaveForm } from "@/hooks/use-auto-save-form"
import { updateRecord } from "@/lib/record-crud"
import {
  toVariazioneDisplayValue,
  type VariazioneAnagraficaField,
} from "../lib/variazioni-detail-constants"

export function VariazioniDetailAnagraficaSection({
  title,
  table,
  row,
  fields,
  onRowChange,
}: {
  title: string
  table: "lavoratori" | "famiglie"
  row: Record<string, unknown> | null
  fields: VariazioneAnagraficaField[]
  onRowChange: (row: Record<string, unknown>) => void
}) {
  const rowId = toVariazioneDisplayValue(row?.id)
  const [isEditing, setIsEditing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const previousRowIdRef = React.useRef(rowId)
  const latestRowRef = React.useRef(row)

  React.useEffect(() => {
    latestRowRef.current = row
  }, [row])

  React.useEffect(() => {
    const isDifferentRow = previousRowIdRef.current !== rowId
    previousRowIdRef.current = rowId
    if (isDifferentRow) {
      setIsEditing(false)
      setError(null)
    }
  }, [rowId])

  const form = useAutoSaveForm({
    defaults: Object.fromEntries(
      fields
        .filter((field) => !field.readOnly)
        .map((field) => [field.key, toVariazioneDisplayValue(row?.[field.key])]),
    ) as Record<string, string>,
    onSave: async (patch) => {
      if (!rowId) return
      const out: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(patch)) {
        out[key] = (value as string).trim() || null
      }
      if (Object.keys(out).length === 0) return
      setError(null)
      try {
        const response = await updateRecord(table, rowId, out)
        onRowChange({
          ...(latestRowRef.current ?? row ?? {}),
          ...response.row,
        })
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : `Errore salvando ${title}`,
        )
      }
    },
  })

  return (
    <Form {...form}>
      <DetailSectionBlock
        title={title}
        icon={<PencilIcon className="size-4" />}
        action={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsEditing((current) => !current)}
            aria-label={`Modifica ${title.toLowerCase()}`}
            disabled={!rowId}
          >
            <PencilIcon className="size-4" />
          </button>
        }
        contentClassName="space-y-4"
      >
        {rowId ? (
          <div className="grid gap-4 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.key} className="space-y-2">
                <span className="ui-type-label">{field.label}</span>
                {isEditing && !field.readOnly ? (
                  <FieldInput name={field.key} placeholder={field.placeholder} />
                ) : (
                  <p className="min-h-9 rounded-md bg-muted/50 px-3 py-2 text-sm">
                    {toVariazioneDisplayValue(row?.[field.key]) || "-"}
                  </p>
                )}
              </label>
            ))}
            {error ? (
              <p className="text-xs font-medium text-red-600 md:col-span-2">{error}</p>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Anagrafica non collegata.</p>
        )}
      </DetailSectionBlock>
    </Form>
  )
}
