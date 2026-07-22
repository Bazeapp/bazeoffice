import type * as React from "react"

import { Field, FieldLabel } from "@/components/ui/field"

export function RicercaDetailReadOnlyField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <Field>
      <FieldLabel variant="eyebrow">{label}</FieldLabel>
      <p className="text-sm text-foreground">{value || "—"}</p>
    </Field>
  )
}

export function RicercaDetailViewError({ error }: { error: string }) {
  return (
    <div className="m-6 shrink-0 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
      Errore caricamento dettaglio ricerca: {error}
    </div>
  )
}

export function RicercaDetailViewLoading() {
  return (
    <div className="text-muted-foreground m-6 shrink-0 rounded-lg border p-4 text-sm">
      Caricamento dettaglio ricerca...
    </div>
  )
}

export function RicercaDetailViewNotFound() {
  return (
    <div className="m-6 shrink-0 rounded-lg border p-4 text-sm">
      Ricerca non trovata o non disponibile.
    </div>
  )
}
