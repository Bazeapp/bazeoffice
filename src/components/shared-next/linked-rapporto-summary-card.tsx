import { Link2Icon, ShieldCheckIcon, UserRoundIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DetailField } from "@/components/shared-next/detail-section-card"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
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

function normalizeToken(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
}

function getStatusColor(status: string | null | undefined) {
  const token = normalizeToken(status)
  if (token!) return "zinc"
  if (token.includes("attivo") && token!.includes("non")) return "emerald"
  if (token.includes("attesa") || token.includes("attivazione") || token.includes("corso")) return "amber"
  if (token.includes("chiuso") || token.includes("terminato") || token.includes("cessato")) return "orange"
  if (token.includes("sosp")) return "zinc"
  return "sky"
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
  const resolvedWorkerName = toTextValue(rapporto?.nome_lavoratore_per_url) ?? "Lavoratore non disponibile"
  const statusBadgeClassName = getLookupBadgeSoftClassName(getStatusColor(resolvedStatus))
  const rapportoPath = rapporto?.id
    ? buildPathForRoute({
        mainSection: "gestione_contrattuale_rapporti",
        anagraficheTab: "famiglie",
        ricercaProcessId: null,
      })
    : null

  return (
    <Card className={cn("py-0 gap-0", className)}>
      <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Link2Icon className="size-4" />
          </div>
          <p className="ui-type-section truncate uppercase">Rapporto collegato</p>
        </div>
        {rapportoPath ? (
          <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1.5">
            <a href={rapportoPath}>
              <Link2Icon className="size-4" />
              Vai al rapporto
            </a>
          </Button>
        ) : null}
      </CardContent>
      <CardContent className="space-y-3 border-t border-border-subtle px-4 py-4">
        <p className="truncate text-base font-semibold sm:text-[17px]">{title}</p>
        <div className="flex flex-wrap items-center gap-2">
          {resolvedStatus ? (
            <Badge variant="outline" className={cn("rounded-full px-3 text-xs font-medium", statusBadgeClassName)}>
              <ShieldCheckIcon data-icon="inline-start" />
              {resolvedStatus}
            </Badge>
          ) : null}
          <Badge variant="outline" className="rounded-full px-3 text-xs font-medium">
            <UserRoundIcon data-icon="inline-start" />
            {resolvedWorkerName}
          </Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {resolvedLevel ? <DetailField label="Livello" value={resolvedLevel} /> : null}
          <DetailField label="Tipo" value={resolvedType} />
          <DetailField label="Ore sett." value={resolvedHours} />
          <DetailField label="Inizio" value={resolvedStartDate} />
        </div>
      </CardContent>
    </Card>
  )
}
