import { SectionHeader } from "@/components/shared-next/section-header"
import { SearchInput } from "@/components/ui/search-input"
import { ASSUNZIONI_FORM_URLS } from "../lib/assunzioni-board-constants"
import { AssunzioniBoardFormButton } from "./assunzioni-board-form-button"

export function AssunzioniBoardHeader({
  totalProcesses,
  searchValue,
  onSearchChange,
  onSearchClear,
}: {
  totalProcesses: number
  searchValue: string
  onSearchChange: (value: string) => void
  onSearchClear: () => void
}) {
  return (
    <SectionHeader>
      <SectionHeader.Title
        subtitle={`${totalProcesses} ${totalProcesses === 1 ? "processo" : "processi"}`}
      >
        Assunzioni
      </SectionHeader.Title>
      <SectionHeader.Actions className="flex-wrap justify-end">
        <AssunzioniBoardFormButton href={ASSUNZIONI_FORM_URLS.datore}>
          Form assunzione famiglia
        </AssunzioniBoardFormButton>
        <AssunzioniBoardFormButton href={ASSUNZIONI_FORM_URLS.lavoratore}>
          Form assunzione lavoratore
        </AssunzioniBoardFormButton>
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <SearchInput
          className="md:max-w-sm"
          data-testid="assunzioni-search-input"
          placeholder="Cerca per famiglia, lavoratore, email..."
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          onClear={onSearchClear}
        />
      </SectionHeader.Toolbar>
    </SectionHeader>
  )
}
