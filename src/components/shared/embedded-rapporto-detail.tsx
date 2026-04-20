import {
  BriefcaseBusinessIcon,
  CalendarDaysIcon,
  Clock3Icon,
  FileTextIcon,
  ShieldCheckIcon,
} from "lucide-react"

import {
  DetailField,
  DetailSectionBlock,
} from "@/components/shared/detail-section-card"
import { Badge } from "@/components/ui/badge"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"
import type { RapportoLavorativoRecord } from "@/types"
import { cn } from "@/lib/utils"

type EmbeddedRapportoDetailProps = {
  rapporto: RapportoLavorativoRecord
}

function toTextValue(value: string | number | boolean | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "boolean") return value ? "Si" : "No"
  if (typeof value === "string") {
    const trimmed = value.trim()
    return trimmed ? trimmed : null
  }
  return null
}

function formatDate(value: string | null | undefined) {
  const raw = toTextValue(value)
  if (!raw) return "-"
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return raw

  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value)
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

export function EmbeddedRapportoDetail({ rapporto }: EmbeddedRapportoDetailProps) {
  const status = toTextValue(rapporto.stato_servizio) ?? toTextValue(rapporto.stato_rapporto)
  const statusBadgeClassName = getLookupBadgeSoftClassName(getStatusColor(status))

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {status ? (
          <Badge variant="outline" className={cn("rounded-full px-3 text-xs font-medium", statusBadgeClassName)}>
            <ShieldCheckIcon data-icon="inline-start" />
            {status}
          </Badge>
        ) : null}
        {rapporto.id_rapporto ? (
          <Badge variant="outline" className="rounded-full px-3 text-xs font-medium">
            ID rapporto: {rapporto.id_rapporto}
          </Badge>
        ) : null}
      </div>

      <DetailSectionBlock
        title="Contratto"
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
        showDefaultAction={false}
        className="space-y-2"
        bannerClassName="py-0"
        cardClassName="px-3 py-3"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Tipo rapporto" value={toTextValue(rapporto.tipo_rapporto) ?? "-"} />
          <DetailField label="Tipo contratto" value={toTextValue(rapporto.tipo_contratto) ?? "-"} />
          <DetailField label="Ore a settimana" value={toTextValue(rapporto.ore_a_settimana) ?? "-"} />
          <DetailField label="Inizio rapporto" value={formatDate(rapporto.data_inizio_rapporto)} />
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Compenso"
        icon={<Clock3Icon className="text-muted-foreground size-4" />}
        showDefaultAction={false}
        className="space-y-2"
        bannerClassName="py-0"
        cardClassName="px-3 py-3"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Paga oraria lorda" value={formatCurrency(rapporto.paga_oraria_lorda)} />
          <DetailField label="Paga mensile lorda" value={formatCurrency(rapporto.paga_mensile_lorda)} />
          <DetailField label="Distribuzione ore" value={toTextValue(rapporto.distribuzione_ore_settimana) ?? "-"} />
          <DetailField label="Webcolf" value={toTextValue(rapporto.webcolf) ?? "-"} />
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Servizio"
        icon={<CalendarDaysIcon className="text-muted-foreground size-4" />}
        showDefaultAction={false}
        className="space-y-2"
        bannerClassName="py-0"
        cardClassName="px-3 py-3"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Datore" value={toTextValue(rapporto.cognome_nome_datore_proper) ?? "-"} />
          <DetailField label="Lavoratore" value={toTextValue(rapporto.nome_lavoratore_per_url) ?? "-"} />
          <DetailField label="Relazione lavorativa" value={toTextValue(rapporto.relazione_lavorativa) ?? "-"} />
          <DetailField label="Stato assunzione" value={toTextValue(rapporto.stato_assunzione) ?? "-"} />
        </div>
      </DetailSectionBlock>

      <DetailSectionBlock
        title="Sistema"
        icon={<FileTextIcon className="text-muted-foreground size-4" />}
        showDefaultAction={false}
        className="space-y-2"
        bannerClassName="py-0"
        cardClassName="px-3 py-3"
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Creato il" value={formatDate(rapporto.creato_il)} />
          <DetailField label="Aggiornato il" value={formatDate(rapporto.aggiornato_il)} />
          <DetailField label="Airtable ID" value={toTextValue(rapporto.airtable_id) ?? "-"} />
          <DetailField label="Ticket collegato" value={toTextValue(rapporto.ticket_id) ?? "-"} />
        </div>
      </DetailSectionBlock>
    </div>
  )
}
