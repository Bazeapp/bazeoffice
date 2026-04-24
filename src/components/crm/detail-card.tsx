import type { ReactNode } from "react"

import { DetailSectionBlock } from "@/components/shared/detail-section-card"

type CrmDetailCardProps = {
  title: string
  titleAction?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  collapsible?: boolean
  defaultOpen?: boolean
}

export function CrmDetailCard({
  title,
  titleAction,
  children,
  className,
  contentClassName,
  collapsible = false,
  defaultOpen = true,
}: CrmDetailCardProps) {
  return (
    <DetailSectionBlock
      title={title}
      action={titleAction}
      className={className}
      contentClassName={contentClassName}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
    >
      {children}
    </DetailSectionBlock>
  )
}
