import * as React from "react"
import {
  ArrowRightIcon,
  BriefcaseBusinessIcon,
  Clock3Icon,
  MapPinIcon,
  UserRoundIcon,
} from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type {
  RelatedActiveSearchItem,
  WorkerPipelineSummaryRelatedSearchesCardProps,
} from "../types/worker-pipeline-summary"
import {
  getRelatedSearchBadgeClassName,
  groupRelatedSearchesByStato,
  hasRelatedSearches,
} from "../lib/worker-pipeline-summary.utils"

export function RelatedActiveSearchCard({
  item,
  onOpenSearch,
}: {
  item: RelatedActiveSearchItem
  onOpenSearch?: (processId: string, selectionId: string) => void
}) {
  const isInteractive = typeof onOpenSearch === "function"
  const Wrapper = isInteractive ? "button" : "div"

  return (
    <Wrapper
      {...(isInteractive
        ? {
            type: "button" as const,
            onClick: () => onOpenSearch(item.processId, item.selectionId),
          }
        : {})}
      className="w-full rounded-xl border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {item.familyName}
          </p>
        </div>
        {isInteractive ? (
          <ArrowRightIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className={getRelatedSearchBadgeClassName(item.statoSelezioneColor)}
        >
          {item.statoSelezione || "-"}
        </Badge>
        <Badge
          variant="outline"
          className={getRelatedSearchBadgeClassName(item.statoRicercaColor)}
        >
          {item.statoRicerca || "-"}
        </Badge>
      </div>

      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {item.recruiterLabel ? (
          <div className="flex items-center gap-2">
            <UserRoundIcon className="size-3.5 shrink-0" />
            <span className="truncate">{item.recruiterLabel}</span>
          </div>
        ) : null}
        {item.orarioDiLavoro ? (
          <div className="flex items-center gap-2">
            <Clock3Icon className="size-3.5 shrink-0" />
            <span className="line-clamp-2">{item.orarioDiLavoro}</span>
          </div>
        ) : null}
        {item.zona ? (
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-3.5 shrink-0" />
            <span className="line-clamp-2">{item.zona}</span>
          </div>
        ) : null}
        {item.appunti ? (
          <p className="line-clamp-3 rounded-md bg-muted/50 px-2 py-1.5 text-2xs leading-5 text-foreground/80">
            {item.appunti}
          </p>
        ) : null}
      </div>
    </Wrapper>
  )
}

function RelatedSearchGroupList({
  groupedItems,
  emptyLabel,
  onOpenSearch,
}: {
  groupedItems: Array<[string, RelatedActiveSearchItem[]]>
  emptyLabel: string
  onOpenSearch?: (processId: string, selectionId: string) => void
}) {
  if (groupedItems.length === 0) {
    return <p className="text-muted-foreground text-sm">{emptyLabel}</p>
  }

  return groupedItems.map(([groupLabel, groupItems]) => (
    <div key={groupLabel} className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-muted/40 text-foreground">
          {groupLabel}
        </Badge>
        <span className="text-muted-foreground text-xs">
          {groupItems.length}{" "}
          {groupItems.length === 1 ? "ricerca" : "ricerche"}
        </span>
      </div>

      <div className="space-y-3">
        {groupItems.map((item) => (
          <RelatedActiveSearchCard
            key={item.selectionId}
            item={item}
            onOpenSearch={onOpenSearch}
          />
        ))}
      </div>
    </div>
  ))
}

export function WorkerPipelineSummaryRelatedSearchesCard({
  groups,
  loading = false,
  onOpenSearch,
}: WorkerPipelineSummaryRelatedSearchesCardProps) {
  const groupedDirectItems = React.useMemo(
    () => groupRelatedSearchesByStato(groups.direct),
    [groups.direct],
  )

  const groupedOtherItems = React.useMemo(
    () => groupRelatedSearchesByStato(groups.other),
    [groups.other],
  )

  return (
    <DetailSectionBlock
      title="Ricerche coinvolte"
      icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
      collapsible
      contentClassName="space-y-3"
    >
      {loading ? (
        <p className="text-muted-foreground text-sm">
          Caricamento ricerche coinvolte...
        </p>
      ) : !hasRelatedSearches(groups) ? (
        <p className="text-muted-foreground text-sm">Nessuna ricerca coinvolta.</p>
      ) : (
        <Tabs defaultValue="direct" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="direct" className="gap-2">
              Coinvolto direttamente
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                {groups.direct.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="other" className="gap-2">
              Tutte le altre ricerche
              <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px]">
                {groups.other.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="direct" className="mt-0 space-y-3">
            <RelatedSearchGroupList
              groupedItems={groupedDirectItems}
              emptyLabel="Nessun coinvolgimento diretto."
              onOpenSearch={onOpenSearch}
            />
          </TabsContent>
          <TabsContent value="other" className="mt-0 space-y-3">
            <RelatedSearchGroupList
              groupedItems={groupedOtherItems}
              emptyLabel="Nessuna altra ricerca."
              onOpenSearch={onOpenSearch}
            />
          </TabsContent>
        </Tabs>
      )}
    </DetailSectionBlock>
  )
}
