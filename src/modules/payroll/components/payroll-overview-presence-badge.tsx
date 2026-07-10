import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function PayrollOverviewPresenceBadge({ isRegular }: { isRegular: boolean }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "rounded-full px-3",
        isRegular
          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
          : "bg-red-100 text-red-700 hover:bg-red-100",
      )}
    >
      {isRegular ? "Presenze regolari" : "Presenze irregolari"}
    </Badge>
  )
}
