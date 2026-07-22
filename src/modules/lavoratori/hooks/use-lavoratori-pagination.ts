import * as React from "react"

import { DEFAULT_PAGE_SIZE } from "../lib/list-constants"

type UseLavoratoriPaginationOptions = {
  workersTotal: number
  resetPageDeps: React.DependencyList
}

export function useLavoratoriPagination({
  workersTotal,
  resetPageDeps,
}: UseLavoratoriPaginationOptions) {
  const [pageIndex, setPageIndex] = React.useState(0)
  const [pageSize] = React.useState(DEFAULT_PAGE_SIZE)

  React.useEffect(() => {
    setPageIndex(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies explicit reset triggers
  }, resetPageDeps)

  const pageCount = Math.max(1, Math.ceil(workersTotal / pageSize))
  const currentPage = pageIndex + 1

  return {
    pageIndex,
    setPageIndex,
    pageSize,
    pageCount,
    currentPage,
  }
}
