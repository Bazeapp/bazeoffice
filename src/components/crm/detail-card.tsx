import type { ReactNode } from "react"

import { DetailSectionBlock } from "@/components/shared/detail-section-card"

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
    <DetailSectionBlock
      title={title}
      action={titleAction}
      className={className}
      contentClassName={contentClassName}
    >
      {children}
    </DetailSectionBlock>
  )
}
