import type { ReactNode } from "react"

import { DetailSectionCard } from "@/components/shared/detail-section-card"

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
    <DetailSectionCard
      title={title}
      titleOnBorder
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </DetailSectionCard>
  )
}
