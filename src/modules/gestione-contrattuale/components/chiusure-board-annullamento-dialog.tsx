import * as React from "react"
import { CheckIcon } from "lucide-react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { TIPO_ANNULLAMENTO } from "../lib/chiusure-board-constants"
import type { ChiusureRapportoOption } from "../types"

export function ChiusureBoardAnnullamentoDialog({
  open,
  onOpenChange,
  rapportoOptions,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  rapportoOptions: ChiusureRapportoOption[]
  onCreate: (input: { rapportoId: string; dataFineRapporto: string }) => Promise<void>
}) {
  const [query, setQuery] = React.useState("")
  const [selectedRapportoId, setSelectedRapportoId] = React.useState("")
  const [dataFineRapporto, setDataFineRapporto] = React.useState("")
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
      setDataFineRapporto("")
      setError(null)
      setSaving(false)
    }
  }, [open])

  function handleSelectRapporto(option: ChiusureRapportoOption) {
    setSelectedRapportoId(option.id)
    const inizio = option.rapporto.data_inizio_rapporto
    setDataFineRapporto(inizio ? inizio.slice(0, 10) : "")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRapportoId) {
      setError("Seleziona un rapporto di lavoro.")
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onCreate({ rapportoId: selectedRapportoId, dataFineRapporto })
      onOpenChange(false)
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Errore creando annullamento",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="chiusure-annullamento-dialog">
        <DialogHeader>
          <DialogTitle>Apri un annullamento</DialogTitle>
          <DialogDescription>
            Seleziona il rapporto di lavoro da annullare e conferma la data.
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
                  data-testid={`chiusure-annullamento-rapporto-${option.id}`}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                    selectedRapportoId === option.id
                      ? "border-primary bg-primary/10 font-semibold text-foreground"
                      : "border-transparent hover:bg-muted",
                  )}
                  onClick={() => handleSelectRapporto(option)}
                >
                  <span>{option.label}</span>
                  {selectedRapportoId === option.id ? (
                    <CheckIcon className="size-4 shrink-0 text-primary" />
                  ) : null}
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
              Selezionato: <span className="font-medium text-foreground">{selectedRapporto.label}</span>
            </p>
          ) : null}
          <label className="space-y-2 block">
            <span className="ui-type-label">Data chiusura</span>
            <Input
              type="date"
              value={dataFineRapporto}
              onChange={(event) => setDataFineRapporto(event.target.value)}
            />
          </label>
          <label className="space-y-2 block">
            <span className="ui-type-label">Tipo licenziamento/dimissione</span>
            <Select value={TIPO_ANNULLAMENTO} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TIPO_ANNULLAMENTO}>{TIPO_ANNULLAMENTO}</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creazione..." : "Crea annullamento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
