import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const CRM_DETAIL_CARD_TITLE_CLASS = "text-lg font-semibold"

type CrmDetailCardProps = {
  title: string
  children?: ReactNode
  className?: string
  contentClassName?: string
}

export function CrmDetailCard({
  title,
  children,
  className,
  contentClassName,
}: CrmDetailCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className={CRM_DETAIL_CARD_TITLE_CLASS}>{title}</CardTitle>
      </CardHeader>
      {children ? <CardContent className={cn(contentClassName)}>{children}</CardContent> : null}
    </Card>
  )
}
