import type {
  VariazioniBoardCardData,
  VariazioniBoardColumnData,
  VariazioniBoardDragHandlers,
} from "../types"
import { VariazioniBoardColumns } from "./variazioni-board-columns"

export function VariazioniBoardContent({
  error,
  loading,
  columns,
  drag,
  onCardClick,
}: {
  error: string | null
  loading: boolean
  columns: VariazioniBoardColumnData[]
  drag: VariazioniBoardDragHandlers
  onCardClick: (card: VariazioniBoardCardData) => void
}) {
  return (
    <>
      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento variazioni: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          <VariazioniBoardColumns
            loading={loading}
            columns={columns}
            drag={drag}
            onCardClick={onCardClick}
          />
        </div>
      </div>
    </>
  )
}
