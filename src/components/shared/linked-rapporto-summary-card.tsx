import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  Clock3Icon,
  Link2Icon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  if (!token) return "zinc"
  if (token.includes("attivo") && !token.includes("non")) return "emerald"
  if (token.includes("attesa") || token.includes("attivazione") || token.includes("corso")) return "amber"
  if (token.includes("chiuso") || token.includes("terminato") || token.includes("cessato")) return "orange"
  if (token.includes("sosp")) return "zinc"
  return "sky"
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
      <div className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em]">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
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
    <div className={cn("rounded-2xl border bg-background px-5 py-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.12em]">
            Rapporto collegato
          </p>
          <p className="mt-2 truncate text-base font-semibold sm:text-[17px]">{title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
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
        </div>

        {rapportoPath ? (
          <Button variant="outline" size="sm" asChild className="shrink-0 gap-1.5">
            <a href={rapportoPath}>
              <Link2Icon className="size-4" />
              Vai al rapporto
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {resolvedLevel ? (
          <MetaItem
            icon={<BriefcaseBusinessIcon className="size-3.5" />}
            label="Livello"
            value={resolvedLevel}
          />
        ) : null}
        <MetaItem
          icon={<BriefcaseBusinessIcon className="size-3.5" />}
          label="Tipo"
          value={resolvedType}
        />
        <MetaItem
          icon={<Clock3Icon className="size-3.5" />}
          label="Ore sett."
          value={resolvedHours}
        />
        <MetaItem
          icon={<CalendarDaysIcon className="size-3.5" />}
          label="Inizio"
          value={resolvedStartDate}
        />
      </div>
    </div>
  )
}
