import { BriefcaseBusinessIcon } from "lucide-react"

import { DetailSectionCard } from "@/components/shared-next/detail-section-card"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

import {
  ATTACHMENT_SKELETON_KEYS,
  LINKED_ROW_SKELETON_KEYS,
} from "../lib/rapporto-detail-panel.constants"
function RelatedPersonCardSkeleton() {
  return (
    <Card className="py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <CardContent className="px-4 py-3">
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-40 max-w-full" />
          </div>
        </div>
        <div className="mt-3 space-y-2 pl-11">
          <Skeleton className="h-4 w-56 max-w-full" />
          <Skeleton className="h-4 w-36 max-w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function AttachmentSkeletonGrid() {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {ATTACHMENT_SKELETON_KEYS.map((key) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-dashed p-4">
            <Skeleton className="size-11 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32 max-w-full" />
              <Skeleton className="h-3 w-24 max-w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function RapportoDetailPanelRelatedRecordsSkeleton() {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        <RelatedPersonCardSkeleton />
        <RelatedPersonCardSkeleton />
      </div>
      <Separator className="bg-border/60" />
      <AttachmentSkeletonGrid />
    </>
  )
}

export function RapportoDetailPanelLinkedRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {LINKED_ROW_SKELETON_KEYS.slice(0, rows).map((key) => (
        <Card key={key} className="bg-surface py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function RapportoDetailPanelSkeleton() {
  return (
    <DetailSectionCard
      title="Dettaglio rapporto"
      titleIcon={<BriefcaseBusinessIcon className="size-5" />}
      className="h-full"
      contentClassName="space-y-6"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-14 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </DetailSectionCard>
  )
}

export function RapportoDetailPanelEmptySelection() {
  return (
    <DetailSectionCard
      title="Dettaglio rapporto"
      titleIcon={<BriefcaseBusinessIcon className="size-5" />}
      className="h-full"
      contentClassName="flex h-full items-center justify-center"
    >
      <p className="text-muted-foreground text-sm">
        Seleziona un rapporto lavorativo dalla lista per vedere il dettaglio.
      </p>
    </DetailSectionCard>
  )
}
