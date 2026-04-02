import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DetailSectionCardProps = {
  title: ReactNode
  titleIcon?: ReactNode
  titleAction?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  titleOnBorder?: boolean
}

export function DetailSectionCard({
  title,
  titleIcon,
  titleAction,
  children,
  className,
  contentClassName,
  titleOnBorder = false,
}: DetailSectionCardProps) {
  return (
    <Card className={cn(titleOnBorder && "relative overflow-visible pt-5", className)}>
      {titleOnBorder ? (
        <CardTitle className="text-foreground pointer-events-none absolute top-0 right-3 left-3 flex -translate-y-1/2 items-center justify-between gap-2 px-2 text-sm font-semibold">
          <span className="flex items-center gap-2">
            {titleIcon ? titleIcon : null}
            <span>{title}</span>
          </span>
          {titleAction ? <span className="pointer-events-auto shrink-0">{titleAction}</span> : null}
        </CardTitle>
      ) : (
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
            <span className="flex items-center gap-2">
              {titleIcon ? titleIcon : null}
              <span>{title}</span>
            </span>
            {titleAction ? <span className="shrink-0">{titleAction}</span> : null}
          </CardTitle>
        </CardHeader>
      )}
      {children ? <CardContent className={cn(contentClassName)}>{children}</CardContent> : null}
    </Card>
  )
}
