import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function WorkerProfileOverviewDetailRow({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title?: string
  children: ReactNode
}) {
  return (
    <div className="text-muted-foreground flex items-center gap-2" title={title}>
      <Icon className="size-4 shrink-0" />
      {children}
    </div>
  )
}
