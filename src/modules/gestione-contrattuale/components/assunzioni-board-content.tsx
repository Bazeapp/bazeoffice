import type { AssunzioniBoardCardData, AssunzioniBoardColumnData, AssunzioniBoardDragHandlers } from "../types"
import { AssunzioniBoardColumns } from "./assunzioni-board-columns"

export function AssunzioniBoardContent({
  error,
  loading,
  columns,
  drag,
  onCardClick,
  onLoadDeferredColumn,
}: {
  error: string | null
  loading: boolean
  columns: AssunzioniBoardColumnData[]
  drag: AssunzioniBoardDragHandlers
  onCardClick: (card: AssunzioniBoardCardData) => void
  onLoadDeferredColumn: (columnId: string) => void
}) {
  return (
    <>
      {error ? (
        <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Errore caricamento assunzioni: {error}
        </div>
      ) : null}

      <div className="scrollbar-visible min-h-0 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-2 pt-4 [scrollbar-gutter:stable]">
        <div className="flex h-full min-h-0 min-w-max gap-4">
          <AssunzioniBoardColumns
            loading={loading}
            columns={columns}
            drag={drag}
            onCardClick={onCardClick}
            onLoadDeferredColumn={onLoadDeferredColumn}
          />
        </div>
      </div>
    </>
  )
}
