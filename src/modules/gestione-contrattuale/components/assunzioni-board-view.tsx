import { useAssunzioniBoardView } from "../hooks/use-assunzioni-board-view"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  assunzioneCommentRow,
  assunzioneDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { AssunzioniBoardContent } from "./assunzioni-board-content"
import { AssunzioniBoardHeader } from "./assunzioni-board-header"
import { AssunzioniDetailSheet } from "./assunzioni-detail-sheet"

type AssunzioniBoardViewProps = {
  /**
   * BAZ-20: deep-link dalla card "Datore" del rapporto. È un id di
   * `rapporti_lavorativi` — il board Assunzioni è indicizzato per rapporto id
   * (`card.id === rapporto.id`), quindi combacia direttamente senza lookup.
   */
  initialSelectedRapportoId?: string | null
}

export function AssunzioniBoardView({
  initialSelectedRapportoId = null,
}: AssunzioniBoardViewProps) {
  const board = useAssunzioniBoardView({ initialSelectedRapportoId })
  const selectedCard = board.sheetProps.card
  const assunzioneId = selectedCard?.assunzione?.id ?? null

  useCommentRouteContext({
    enabled: board.sheetProps.open && Boolean(assunzioneId),
    pageFocus: assunzioneId
      ? { entityType: "assunzione", entityId: assunzioneId }
      : null,
    row: selectedCard ? assunzioneCommentRow(selectedCard) : {},
    sourceInterface: "assunzioni",
    displayNames: selectedCard ? assunzioneDisplayNames(selectedCard) : undefined,
  })

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <AssunzioniBoardHeader
        totalProcesses={board.totalProcesses}
        searchValue={board.searchValue}
        onSearchChange={board.setSearchValue}
        onSearchClear={() => board.setSearchValue("")}
      />

      <AssunzioniBoardContent
        error={board.error}
        loading={board.loading}
        columns={board.filteredColumns}
        drag={board.drag}
        onCardClick={(card) => {
          void board.selectCard(card)
        }}
        onLoadDeferredColumn={(columnId) => {
          void board.loadDeferredColumn(columnId)
        }}
      />

      <AssunzioniDetailSheet {...board.sheetProps} />
    </section>
  )
}
