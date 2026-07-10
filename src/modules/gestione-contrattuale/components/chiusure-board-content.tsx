import type { ChiusureBoardCardData, ChiusureBoardColumnData, ChiusureBoardDragHandlers } from "../types"
import { ChiusureBoardColumns } from "./chiusure-board-columns"

export function ChiusureBoardContent({
  error,
  loading,
  columns,
  drag,
  onCardClick,
}: {
  error: string | null
  loading: boolean
  columns: ChiusureBoardColumnData[]
  drag: ChiusureBoardDragHandlers
  onCardClick: (card: ChiusureBoardCardData) => void
}) {
  return (
    <>
      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento chiusure: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          <ChiusureBoardColumns
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
