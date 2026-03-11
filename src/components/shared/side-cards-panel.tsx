import * as React from "react"
import { type LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type SideCardsPanelProps = React.ComponentProps<typeof Card> & {
  title: string
  subtitle?: string
  icon?: LucideIcon
  headerClassName?: string
  contentClassName?: string
}

export function SideCardsPanel({
  title,
  subtitle,
  icon: Icon,
  className,
  headerClassName,
  contentClassName,
  children,
  ...props
}: SideCardsPanelProps) {
  return (
    <Card className={cn("flex h-full flex-col overflow-hidden", className)} {...props}>
      <CardHeader className={cn("pb-3", headerClassName)}>
        <CardTitle className="flex items-center gap-2 text-base">
          {Icon ? <Icon className="size-4" /> : null}
          {title}
        </CardTitle>
        {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
      </CardHeader>
      <CardContent className={cn("flex-1 overflow-y-auto", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

