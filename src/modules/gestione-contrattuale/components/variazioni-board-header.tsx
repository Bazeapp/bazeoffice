import { PlusIcon } from "lucide-react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"

export function VariazioniBoardHeader({
  totalVariazioni,
  searchValue,
  onSearchChange,
  onSearchClear,
  onOpenCreate,
}: {
  totalVariazioni: number
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  onOpenCreate: () => void
}) {
  return (
    <SectionHeader>
      <SectionHeader.Title
        subtitle={`${totalVariazioni} ${
          totalVariazioni === 1 ? "variazione" : "variazioni"
        }`}
      >
        Variazioni
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <Button onClick={onOpenCreate} data-testid="variazioni-open-create">
          <PlusIcon className="size-4" />
          Apri una variazione
        </Button>
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <SearchInput
          className="md:max-w-sm"
          data-testid="variazioni-search-input"
          placeholder="Cerca per famiglia, lavoratore, tipo rapporto..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onSearchClear}
        />
      </SectionHeader.Toolbar>
    </SectionHeader>
  )
}
