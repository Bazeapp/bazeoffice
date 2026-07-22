import { asString } from "@/modules/lavoratori/lib"
import type { LavoratoreRecord } from "@/modules/lavoratori/types"
import { getLookupBadgeSoftClassName } from "@/lib/lookup-color-styles"

import type {
  RelatedActiveSearchItem,
  RelatedSearchGroups,
  SkillCompetenzeValues,
  WorkerPipelineSummaryTone,
} from "../types/worker-pipeline-summary"

export function getRelatedSearchBadgeClassName(color: string | null | undefined) {
  return `h-5 px-2 text-[10px] ${getLookupBadgeSoftClassName(color)}`
}

export function buildSkillCompetenzeValues(
  workerRow: LavoratoreRecord,
): SkillCompetenzeValues {
  return {
    livello_pulizie: asString(workerRow.livello_pulizie),
    check_accetta_salire_scale_o_soffitti_alti: asString(
      workerRow.check_accetta_salire_scale_o_soffitti_alti,
    ),
    compatibilita_famiglie_numerose: asString(
      workerRow.compatibilita_famiglie_numerose,
    ),
    compatibilita_famiglie_molto_esigenti: asString(
      workerRow.compatibilita_famiglie_molto_esigenti,
    ),
    compatibilita_lavoro_con_datore_presente_in_casa: asString(
      workerRow.compatibilita_lavoro_con_datore_presente_in_casa,
    ),
    compatibilita_con_case_di_grandi_dimensioni: asString(
      workerRow.compatibilita_con_case_di_grandi_dimensioni,
    ),
    compatibilita_con_elevata_autonomia_richiesta: asString(
      workerRow.compatibilita_con_elevata_autonomia_richiesta,
    ),
    compatibilita_con_contesti_pacati: asString(
      workerRow.compatibilita_con_contesti_pacati,
    ),
    livello_stiro: asString(workerRow.livello_stiro),
    compatibilita_con_stiro_esigente: asString(
      workerRow.compatibilita_con_stiro_esigente,
    ),
    livello_cucina: asString(workerRow.livello_cucina),
    compatibilita_con_cucina_strutturata: asString(
      workerRow.compatibilita_con_cucina_strutturata,
    ),
    livello_babysitting: asString(workerRow.livello_babysitting),
    check_accetta_babysitting_multipli_bambini: asString(
      workerRow.check_accetta_babysitting_multipli_bambini,
    ),
    check_accetta_babysitting_neonati: asString(
      workerRow.check_accetta_babysitting_neonati,
    ),
    compatibilita_babysitting_neonati: asString(
      workerRow.compatibilita_babysitting_neonati,
    ),
    livello_dogsitting: asString(workerRow.livello_dogsitting),
    check_accetta_case_con_cani: asString(workerRow.check_accetta_case_con_cani),
    check_accetta_case_con_cani_grandi: asString(
      workerRow.check_accetta_case_con_cani_grandi,
    ),
    check_accetta_case_con_gatti: asString(workerRow.check_accetta_case_con_gatti),
    compatibilita_con_animali_in_casa: asString(
      workerRow.compatibilita_con_animali_in_casa,
    ),
    livello_giardinaggio: asString(workerRow.livello_giardinaggio),
    livello_italiano: asString(workerRow.livello_italiano),
    livello_inglese: asString(workerRow.livello_inglese),
  }
}

export function toneBadgeClassName(tone: WorkerPipelineSummaryTone) {
  if (tone === "high")
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  if (tone === "medium") return "border-amber-200 bg-amber-50 text-amber-700"
  if (tone === "low") return "border-rose-200 bg-rose-50 text-rose-700"
  return "border-zinc-200 bg-zinc-50 text-zinc-700"
}

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function getTravelTimeTone(minutes: number | null) {
  if (minutes == null) return { label: "N/D", tone: "neutral" as const }
  if (minutes <= 30) return { label: "Basso", tone: "high" as const }
  if (minutes <= 60) return { label: "Medio", tone: "medium" as const }
  return { label: "Alto", tone: "low" as const }
}

export function groupRelatedSearchesByStato(
  items: RelatedActiveSearchItem[],
): Array<[string, RelatedActiveSearchItem[]]> {
  const grouped = new Map<string, RelatedActiveSearchItem[]>()

  for (const item of items) {
    const groupKey = item.statoRicerca || "Senza stato"
    const currentItems = grouped.get(groupKey) ?? []
    currentItems.push(item)
    grouped.set(groupKey, currentItems)
  }

  return Array.from(grouped.entries())
}

export function hasRelatedSearches(groups: RelatedSearchGroups) {
  return groups.direct.length > 0 || groups.other.length > 0
}
