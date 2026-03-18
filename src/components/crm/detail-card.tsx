import type { ReactNode } from "react"

import { DetailSectionCard } from "@/components/shared/detail-section-card"

type CrmDetailCardProps = {
  title: string
  titleAction?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
}

export function CrmDetailCard({
  title,
  titleAction,
  children,
  className,
  contentClassName,
}: CrmDetailCardProps) {
  return (
    <DetailSectionCard
      title={title}
      titleAction={titleAction}
      titleOnBorder
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </DetailSectionCard>
  )
}
