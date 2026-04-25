import { Card, CardContent } from "@/components/ui-next/card"
import { cn } from "@/lib/utils"

type StatisticsMetricCardProps = {
  value: string
  title: string
  className?: string
  density?: "comfortable" | "compact"
}

export function StatisticsMetricCard({
  value,
  title,
  className,
  density = "comfortable",
}: StatisticsMetricCardProps) {
  const isCompact = density === "compact"

  return (
    <Card className={cn("border border-border/70 bg-background py-0", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center text-center",
          isCompact ? "h-[72px] gap-0.5 px-3 py-2" : "h-[92px] gap-1 px-3 py-3"
        )}
      >
        <p className={cn("font-semibold tracking-tight text-foreground", isCompact ? "text-2xl" : "text-3xl")}>
          {value}
        </p>
        <p className={cn("text-muted-foreground leading-5", isCompact ? "text-xs" : "text-sm")}>{title}</p>
      </CardContent>
    </Card>
  )
}
