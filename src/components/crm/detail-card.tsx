import type { ReactNode } from "react"

import { DetailSectionBlock } from "@/components/shared/detail-section-card"

type CrmDetailCardProps = {
  title: string
  icon?: ReactNode
  titleAction?: ReactNode
  onActionClick?: () => void
  actionLabel?: string
  showDefaultAction?: boolean
  tone?: "primary" | "muted" | "neutral" | "transparent"
  children?: ReactNode
  className?: string
  bannerClassName?: string
  cardClassName?: string
  contentClassName?: string
  collapsible?: boolean
  defaultOpen?: boolean
}

export function CrmDetailCard({
  title,
  icon,
  titleAction,
  onActionClick,
  actionLabel,
  showDefaultAction = false,
  tone = "primary",
  children,
  className,
  bannerClassName,
  cardClassName,
  contentClassName,
  collapsible = true,
  defaultOpen = true,
}: CrmDetailCardProps) {
  return (
    <DetailSectionBlock
      title={title}
      icon={icon}
      action={titleAction}
      onActionClick={onActionClick}
      actionLabel={actionLabel}
      showDefaultAction={showDefaultAction}
      tone={tone}
      className={className}
      bannerClassName={bannerClassName}
      cardClassName={cardClassName}
      contentClassName={contentClassName}
      collapsible={collapsible}
      defaultOpen={defaultOpen}
    >
      {children}
    </DetailSectionBlock>
  )
}
