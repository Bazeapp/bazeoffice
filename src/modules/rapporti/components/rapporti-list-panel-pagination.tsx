import { Pagination } from "@/components/ui/pagination"

export type RapportiListPanelPaginationProps = {
  currentPage: number
  pageCount: number
  totalCount: number
  loading: boolean
  onPageChange: (pageIndex: number) => void
}

export function RapportiListPanelPagination({
  currentPage,
  pageCount,
  totalCount,
  loading,
  onPageChange,
}: RapportiListPanelPaginationProps) {
  return (
    <Pagination className="px-1">
      <Pagination.Pages
        page={currentPage}
        pageCount={pageCount}
        onChange={(nextPage) => {
          if (loading) return
          onPageChange(Math.max(nextPage - 1, 0))
        }}
      />
      <span className="text-muted-foreground tabular-nums">
        {totalCount} {totalCount === 1 ? "rapporto" : "rapporti"}
      </span>
    </Pagination>
  )
}
