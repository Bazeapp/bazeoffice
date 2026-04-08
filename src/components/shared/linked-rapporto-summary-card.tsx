import { Link2Icon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { buildPathForRoute } from "@/routes/app-routes"
import type { RapportoLavorativoRecord } from "@/types"

type LinkedRapportoSummaryCardProps = {
  title: string
  rapporto: RapportoLavorativoRecord | null
  level?: string | null
  status?: string | null
  type?: string | null
  hoursPerWeek?: number | string | null
  startDate?: string | null
  className?: string
}

function toTextValue(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  return null
}

function formatStartDate(value: string | null | undefined) {
  const raw = toTextValue(value)
  if (!raw) return "-"
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}:</span>
      <strong className="text-foreground font-semibold">{value}</strong>
    </span>
  )
}

export function LinkedRapportoSummaryCard({
  title,
  rapporto,
  level,
  status,
  type,
  hoursPerWeek,
  startDate,
  className,
}: LinkedRapportoSummaryCardProps) {
  const resolvedLevel = toTextValue(level)
  const resolvedStatus = toTextValue(status) ?? toTextValue(rapporto?.stato_servizio) ?? toTextValue(rapporto?.stato_rapporto)
  const resolvedType = toTextValue(type) ?? toTextValue(rapporto?.tipo_rapporto) ?? "-"
  const resolvedHours = toTextValue(hoursPerWeek) ?? toTextValue(rapporto?.ore_a_settimana) ?? "-"
  const resolvedStartDate = formatStartDate(startDate ?? rapporto?.data_inizio_rapporto)
  const rapportoPath = rapporto?.id
    ? buildPathForRoute({
        mainSection: "gestione_contrattuale_rapporti",
        anagraficheTab: "famiglie",
        ricercaProcessId: null,
      })
    : null

  return (
    <div className={cn("rounded-2xl border bg-background px-5 py-4", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold sm:text-[17px]">{title}</p>
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {resolvedLevel ? <MetaItem label="Livello" value={resolvedLevel} /> : null}
            <MetaItem label="Tipo" value={resolvedType} />
            <MetaItem label="Ore/sett" value={resolvedHours} />
            <MetaItem label="Inizio" value={resolvedStartDate} />
          </div>
        </div>

        {rapportoPath ? (
          <Button variant="ghost" size="sm" asChild className="h-auto shrink-0 gap-1.5 px-0 text-primary">
            <a href={rapportoPath}>
              <Link2Icon className="size-4" />
              Vai al rapporto
            </a>
          </Button>
        ) : null}
      </div>

      {resolvedStatus ? (
        <div className="mt-4">
          <Badge variant="outline" className="rounded-full px-3 text-xs font-medium">
            {resolvedStatus}
          </Badge>
        </div>
      ) : null}
    </div>
  )
}
