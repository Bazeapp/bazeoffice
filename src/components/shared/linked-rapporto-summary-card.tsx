import { Link2Icon } from "lucide-react"

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
    <div className={cn("rounded-lg border border-border bg-muted/30 p-3", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{title}</p>
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
            {resolvedLevel ? <MetaItem label="Livello" value={resolvedLevel} /> : null}
            <MetaItem label="Tipo" value={resolvedType} />
            <MetaItem label="Ore/sett" value={resolvedHours} />
            <MetaItem label="Inizio" value={resolvedStartDate} />
          </div>
        </div>

        {rapportoPath ? (
          <a
            href={rapportoPath}
            className="shrink-0 flex items-center gap-1 text-[10px] text-primary hover:underline"
          >
            <Link2Icon className="size-3" />
            Vai al rapporto
          </a>
        ) : null}
      </div>

      {resolvedStatus ? (
        <div className="mt-2">
          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            {resolvedStatus}
          </span>
        </div>
      ) : null}
    </div>
  )
}
