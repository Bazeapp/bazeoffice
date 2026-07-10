import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { SearchInput } from "@/components/ui/search-input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { VariazioniRapportoOption } from "../types"

export function VariazioniCreateDialog({
  open,
  onOpenChange,
  rapportoOptions,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rapportoOptions: VariazioniRapportoOption[]
  onCreate: (input: {
    rapportoId: string
    variazioneDaApplicare: string
    dataVariazione: string
  }) => Promise<void>
}) {
  const [query, setQuery] = React.useState("")
  const [selectedRapportoId, setSelectedRapportoId] = React.useState("")
  const [variazioneDaApplicare, setVariazioneDaApplicare] = React.useState("")
  const [dataVariazione, setDataVariazione] = React.useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const filteredOptions = React.useMemo(() => {
    const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return rapportoOptions.slice(0, 20)
    return rapportoOptions
      .filter((option) => {
        const haystack = option.label.toLowerCase()
        return tokens.every((token) => haystack.includes(token))
      })
      .slice(0, 20)
  }, [query, rapportoOptions])

  const selectedRapporto = rapportoOptions.find((option) => option.id === selectedRapportoId)

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setSelectedRapportoId("")
      setVariazioneDaApplicare("")
      setDataVariazione(new Date().toISOString().slice(0, 10))
      setError(null)
      setSaving(false)
    }
  }, [open])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRapportoId || !variazioneDaApplicare.trim()) {
      setError("Seleziona un rapporto e inserisci la descrizione della variazione.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onCreate({
        rapportoId: selectedRapportoId,
        variazioneDaApplicare: variazioneDaApplicare.trim(),
        dataVariazione,
      })
      onOpenChange(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Errore creando variazione",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="variazioni-create-dialog">
        <DialogHeader>
          <DialogTitle>Apri una variazione</DialogTitle>
          <DialogDescription>
            Seleziona il rapporto e descrivi la variazione contrattuale da gestire.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="space-y-2 block">
            <span className="ui-type-label">Rapporto di lavoro</span>
            <SearchInput
              placeholder="Cerca per famiglia o lavoratore..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
            />
          </label>
          <div className="max-h-60 space-y-2 overflow-y-auto rounded-xl border bg-surface p-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    selectedRapportoId === option.id && "bg-primary/10 text-primary",
                  )}
                  onClick={() => setSelectedRapportoId(option.id)}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <p className="text-muted-foreground px-3 py-4 text-sm">
                Nessun rapporto trovato.
              </p>
            )}
          </div>
          {selectedRapporto ? (
            <p className="text-muted-foreground text-xs">
              Selezionato:{" "}
              <span className="font-medium text-foreground">{selectedRapporto.label}</span>
            </p>
          ) : null}
          <label className="space-y-2 block">
            <span className="ui-type-label">Data variazione</span>
            <Input
              type="date"
              value={dataVariazione}
              onChange={(event) => setDataVariazione(event.target.value)}
            />
          </label>
          <label className="space-y-2 block">
            <span className="ui-type-label">Descrizione variazione</span>
            <Textarea
              value={variazioneDaApplicare}
              onChange={(event) => setVariazioneDaApplicare(event.target.value)}
              placeholder="Es. aumento ore, cambio paga, modifica luogo di lavoro..."
              className="min-h-28"
            />
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creazione..." : "Crea variazione"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
