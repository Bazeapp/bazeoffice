import { XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export type RapportiListPanelFilterSummaryProps = {
  visibleCount: number
  totalCount: number
  onClear: () => void
}

export function RapportiListPanelFilterSummary({
  visibleCount,
  totalCount,
  onClear,
}: RapportiListPanelFilterSummaryProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">
        {visibleCount} di {totalCount} rapporti
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="rapporti-reset-filtri"
        onClick={onClear}
      >
        <XIcon className="size-3" />
        Reset filtri
      </Button>
    </div>
  )
}
