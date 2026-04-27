import type { LucideIcon } from "lucide-react"

import { DetailSectionCard } from "@/components/shared-next/detail-section-card"

type GestioneContrattualePlaceholderViewProps = {
  title: string
  description: string
  icon: LucideIcon
}

export function GestioneContrattualePlaceholderView({
  title,
  description,
  icon: Icon,
}: GestioneContrattualePlaceholderViewProps) {
  return (
    <DetailSectionCard
      title={title}
      titleIcon={<Icon className="size-5" />}
      className="h-full"
      contentClassName="flex h-full items-center justify-center"
    >
      <div className="max-w-xl text-center">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      </div>
    </DetailSectionCard>
  )
}
