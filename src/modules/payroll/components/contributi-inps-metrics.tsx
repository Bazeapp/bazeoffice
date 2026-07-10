import * as React from "react"

import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import type { ContributiMetric } from "../types"

type ContributiInpsMetricsProps = {
  metricGroups: ContributiMetric[][]
}

export function ContributiInpsMetrics({ metricGroups }: ContributiInpsMetricsProps) {
  return (
    <div className="px-4 pt-4">
      <div className="flex w-full items-stretch gap-3">
        {metricGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            <div
              className={cn(
                "grid flex-1 items-stretch gap-3",
                group.length > 0 && "grid-cols-1",
              )}
              style={{ gridTemplateColumns: `repeat(${Math.max(group.length, 1)}, minmax(0, 1fr))` }}
            >
              {group.map((metric) => (
                <div key={metric.title} className="min-w-0">
                  <StatisticsMetricCard
                    value={metric.value}
                    title={metric.title}
                    density="compact"
                    className={metric.className}
                  />
                </div>
              ))}
            </div>
            {groupIndex < metricGroups.length - 1 ? (
              <Separator orientation="vertical" className="mx-1 h-auto self-stretch" />
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
