import * as React from "react"

import { useVariazioniBoardView } from "../hooks/use-variazioni-board-view"
import { useCommentRouteContext } from "@/modules/commenti/hooks"
import {
  variazioneCommentRow,
  variazioneDisplayNames,
} from "@/modules/commenti/lib/comment-route-helpers"
import { VariazioniBoardContent } from "./variazioni-board-content"
import { VariazioniBoardHeader } from "./variazioni-board-header"
import { VariazioniCreateDialog } from "./variazioni-create-dialog"
import { VariazioniDetailSheet } from "./variazioni-detail-sheet"

export function VariazioniBoardView() {
  const board = useVariazioniBoardView()
  const commentAnchorRef = React.useRef<HTMLDivElement>(null)
  const selectedCard = board.sheetProps.card

  useCommentRouteContext({
    enabled: board.sheetProps.open && Boolean(selectedCard),
    pageFocus: selectedCard
      ? { entityType: "variazione", entityId: selectedCard.id }
      : null,
    row: selectedCard ? variazioneCommentRow(selectedCard) : {},
    sourceInterface: "variazioni",
    anchorRef: commentAnchorRef,
    displayNames: selectedCard ? variazioneDisplayNames(selectedCard) : undefined,
  })

  return (
    <>
      <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <VariazioniBoardHeader
          totalVariazioni={board.totalVariazioni}
          searchValue={board.searchValue}
          onSearchChange={board.setSearchValue}
          onSearchClear={() => board.setSearchValue("")}
          onOpenCreate={board.openCreateDialog}
        />

        <VariazioniBoardContent
          error={board.error}
          loading={board.loading}
          columns={board.filteredColumns}
          drag={board.drag}
          onCardClick={(card) => {
            void board.selectCard(card)
          }}
        />
      </section>

      <VariazioniDetailSheet {...board.sheetProps} commentAnchorRef={commentAnchorRef} />
      <VariazioniCreateDialog {...board.createDialogProps} />
    </>
  )
}
