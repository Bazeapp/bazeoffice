import { PlusIcon } from "lucide-react"

import { SectionHeader } from "@/components/shared-next/section-header"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/ui/search-input"
import { CHIUSURA_FORM_URLS } from "../lib/chiusure-board-constants"

export function ChiusureBoardHeader({
  totalChiusure,
  searchValue,
  onSearchChange,
  onSearchClear,
  onOpenAnnullamento,
}: {
  totalChiusure: number
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  onOpenAnnullamento: () => void
}) {
  return (
    <SectionHeader>
      <SectionHeader.Title
        subtitle={`${totalChiusure} ${totalChiusure === 1 ? "chiusura" : "chiusure"}`}
      >
        Chiusure
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <Button variant="outline" asChild>
          <a href={CHIUSURA_FORM_URLS.licenziamento} target="_blank" rel="noreferrer">
            Apri un licenziamento
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href={CHIUSURA_FORM_URLS.dimissione} target="_blank" rel="noreferrer">
            Apri una dimissione
          </a>
        </Button>
        <Button onClick={onOpenAnnullamento} data-testid="chiusure-open-annullamento">
          <PlusIcon className="size-4" />
          Apri un annullamento
        </Button>
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <SearchInput
          className="md:max-w-sm"
          data-testid="chiusure-search-input"
          placeholder="Cerca per famiglia, lavoratore, email, motivazione..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onSearchClear}
        />
      </SectionHeader.Toolbar>
    </SectionHeader>
  )
}
