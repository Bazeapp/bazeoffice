import { Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { cn } from "@/lib/utils"

export type AssociationSearchOption = {
  id: string
  primaryLabel: string
  secondaryLabel?: string | null
}

type AssociationSearchFieldProps = {
  query: string
  onQueryChange: (value: string) => void
  options: AssociationSearchOption[]
  selectedId: string | null
  onSelect: (id: string) => void
  onUnlink?: () => void
  canUnlink?: boolean
  disabled?: boolean
  loading?: boolean
  placeholder?: string
  minChars?: number
  minCharsMessage?: string
  loadingMessage?: string
  emptyMessage?: string
  listClassName?: string
}

export function AssociationSearchField({
  query,
  onQueryChange,
  options,
  selectedId,
  onSelect,
  onUnlink,
  canUnlink,
  disabled = false,
  loading = false,
  placeholder = "Nome, cognome o email",
  minChars = 2,
  minCharsMessage,
  loadingMessage = "Caricamento risultati...",
  emptyMessage = "Nessun risultato trovato.",
  listClassName,
}: AssociationSearchFieldProps) {
  const trimmedLength = query.trim().length
  const belowMinChars = trimmedLength >= 1 && trimmedLength < minChars

  return (
    <div className="space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        <SearchInput
          className="min-w-0 flex-1"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange("")}
          disabled={disabled || loading}
          placeholder={loading ? "Caricamento..." : placeholder}
        />
        {onUnlink ? (
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={!canUnlink || disabled}
            title="Scollega"
            aria-label="Scollega"
            onClick={onUnlink}
          >
            <Trash2Icon className="size-4" />
          </Button>
        ) : null}
      </div>

      {belowMinChars ? (
        <p className="text-muted-foreground text-xs">
          {minCharsMessage ?? `Inserisci almeno ${minChars} caratteri.`}
        </p>
      ) : loading ? (
        <p className="text-muted-foreground text-xs">{loadingMessage}</p>
      ) : options.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyMessage}</p>
      ) : (
        <div className={cn("max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2", listClassName)}>
          {options.map((option) => {
            const isSelected = selectedId === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={disabled}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-left text-sm transition",
                  isSelected ? "border-emerald-400 bg-emerald-50" : "border-border hover:bg-muted/50"
                )}
              >
                <div className="font-medium">{option.primaryLabel}</div>
                {option.secondaryLabel ? (
                  <div className="text-muted-foreground text-xs">{option.secondaryLabel}</div>
                ) : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
