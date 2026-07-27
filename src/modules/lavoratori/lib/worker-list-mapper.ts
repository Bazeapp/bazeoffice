import type { LavoratoreListItem } from "../components/lavoratore-card"
import {
  asInputValue,
  asString,
  formatWorkerLocationLabel,
  getAgeFromBirthDate,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  toListItem,
} from "./base-utils"
import {
  isBlacklistValue,
  resolveLookupColor,
} from "@/lib/lookup-utils"
import { toWorkerStatusFlags } from "./status-utils"
import { fetchIndirizziByEntity } from "@/lib/indirizzi-api"
import type { GenericRow } from "../types/lavoratori-data"
import type { LavoratoreRecord } from "../types/lavoratore"

import { ADDRESS_BATCH_SIZE } from "./list-constants"

export function buildWorkerListItem(
  row: LavoratoreRecord,
  lookupColorsByDomain: Map<string, string>,
  addressesByWorkerId: Map<string, Record<string, unknown>[]> = new Map()
): LavoratoreListItem {
  const statusFlags = toWorkerStatusFlags(row.stato_lavoratore)
  const baseItem = toListItem(row, {
    isBlacklisted: isBlacklistValue(row.check_blacklist),
    statusFlags,
    useThumbnailAvatar: true,
  })
  const workerAddress = resolveWorkerAddress(row.id, addressesByWorkerId)
  const statoLavoratore = asString(row.stato_lavoratore) || null
  const disponibilita = asString(row.disponibilita) || null
  const disponibilitaToken = (disponibilita ?? "").toLowerCase().replaceAll("_", " ")
  const isDisponibile =
    disponibilitaToken.length === 0
      ? null
      : disponibilitaToken.includes("non disponibile") ||
          disponibilitaToken.includes("non idone")
        ? false
        : disponibilitaToken.includes("disponib")
          ? true
          : null
  const ruoliDomesticiRaw = Array.isArray(row.tipo_lavoro_domestico)
    ? row.tipo_lavoro_domestico
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
    : []
  const ruoliDomestici = normalizeDomesticRoleLabels(ruoliDomesticiRaw)
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavori = readArrayStrings(row.tipo_rapporto_lavorativo)
  const tipoLavoro = tipoLavori[0] ?? null
  const eta = getAgeFromBirthDate(row.data_di_nascita)
  const anniEsperienzaColf =
    typeof row.anni_esperienza_colf === "number" && Number.isFinite(row.anni_esperienza_colf)
      ? row.anni_esperienza_colf
      : null
  const anniEsperienzaBabysitter =
    typeof row.anni_esperienza_babysitter === "number" &&
    Number.isFinite(row.anni_esperienza_babysitter)
      ? row.anni_esperienza_babysitter
      : null

  return {
    ...baseItem,
    locationLabel: formatWorkerLocationLabel(row, workerAddress),
    statoLavoratore,
    statoLavoratoreColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.stato_lavoratore",
      statoLavoratore
    ),
    disponibilita,
    disponibilitaColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.disponibilita",
      disponibilita
    ),
    isDisponibile,
    tipoRuolo,
    tipoRuoloColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_lavoro_domestico",
      tipoRuolo
    ),
    tipoLavori,
    tipoLavoriColors: Object.fromEntries(
      tipoLavori.map((tipo) => [
        tipo,
        resolveLookupColor(
          lookupColorsByDomain,
          "lavoratori.tipo_rapporto_lavorativo",
          tipo
        ),
      ])
    ),
    tipoLavoro,
    tipoLavoroColor: resolveLookupColor(
      lookupColorsByDomain,
      "lavoratori.tipo_rapporto_lavorativo",
      tipoLavoro
    ),
    ruoliDomestici,
    eta,
    anniEsperienzaColf,
    anniEsperienzaBabysitter,
  }
}

function normalizeAddressType(value: unknown) {
  return asString(value).toLowerCase().replaceAll("_", " ").trim()
}

function normalizeStatusToken(value: unknown) {
  return asString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replaceAll(",", " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function formatRelatedFamilyName(row: GenericRow | null | undefined) {
  const familyName = [asString(row?.nome), asString(row?.cognome)]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .trim()

  return familyName || "Famiglia senza nome"
}

function formatRelatedSearchLabel(processRow: GenericRow) {
  const searchNumber = asInputValue(processRow.numero_ricerca_attivata)
  if (searchNumber) return `Ricerca #${searchNumber}`

  const processId = asString(processRow.id)
  return processId ? `Ricerca ${processId.slice(0, 8)}` : "Ricerca"
}

function formatRelatedZona(processRow: GenericRow) {
  const parts = [
    asString(processRow.indirizzo_prova_via),
    asString(processRow.indirizzo_prova_comune),
    asString(processRow.indirizzo_prova_provincia),
    asString(processRow.indirizzo_prova_cap),
    asString(processRow.indirizzo_prova_note),
  ].filter(
    (value, index, values): value is string =>
      Boolean(value) && values.indexOf(value) === index
  )

  return parts.join(" • ")
}

function resolveLookupColorByStatusToken(
  lookupColors: Map<string, string>,
  domain: string,
  value: string | null | undefined
) {
  const direct = resolveLookupColor(lookupColors, domain, value ?? null)
  if (direct) return direct

  const normalizedValue = normalizeStatusToken(value)
  if (!normalizedValue) return null

  for (const [key, color] of lookupColors.entries()) {
    if (!key.startsWith(`${domain}:`)) continue
    const rawValue = key.slice(domain.length + 1)
    if (normalizeStatusToken(rawValue) === normalizedValue) {
      return color
    }
  }

  return null
}

function getDotColorClassName(color: string | null | undefined) {
  switch ((color ?? "").toLowerCase()) {
    case "red":
      return "bg-red-500"
    case "rose":
      return "bg-rose-500"
    case "orange":
      return "bg-orange-500"
    case "amber":
      return "bg-amber-500"
    case "yellow":
      return "bg-yellow-500"
    case "lime":
      return "bg-lime-500"
    case "green":
      return "bg-green-500"
    case "emerald":
      return "bg-emerald-500"
    case "teal":
      return "bg-teal-500"
    case "cyan":
      return "bg-cyan-500"
    case "sky":
      return "bg-sky-500"
    case "blue":
      return "bg-blue-500"
    case "indigo":
      return "bg-indigo-500"
    case "violet":
      return "bg-violet-500"
    case "purple":
      return "bg-purple-500"
    case "fuchsia":
      return "bg-fuchsia-500"
    case "pink":
      return "bg-pink-500"
    case "slate":
    case "gray":
    case "zinc":
    case "neutral":
    case "stone":
      return "bg-zinc-500"
    default:
      return "bg-sky-500"
  }
}

export function resolveWorkerAddress(
  workerId: string,
  addressesByWorkerId: Map<string, Record<string, unknown>[]>
) {
  const addresses = addressesByWorkerId.get(workerId) ?? []
  if (addresses.length === 0) return null

  return (
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "residenza") ??
    addresses.find((address) => normalizeAddressType(address.tipo_indirizzo) === "domicilio") ??
    addresses[0] ??
    null
  )
}

// Pure: raggruppa righe indirizzi (da indirizzi_by_entity o da lavoratori_board)
// per entita_id (worker id). Riusato sia dal fetch standalone sia dal board RPC.
export function groupAddressesByWorker(
  rows: Record<string, unknown>[]
): Map<string, Record<string, unknown>[]> {
  const addressesByWorkerId = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const workerId = asString(row.entita_id)
    if (!workerId) continue
    const current = addressesByWorkerId.get(workerId) ?? []
    current.push(row)
    addressesByWorkerId.set(workerId, current)
  }
  return addressesByWorkerId
}

export async function fetchWorkerAddressesByIds(workerIds: string[]) {
  if (workerIds.length === 0) return new Map<string, Record<string, unknown>[]>()

  const allRows: Record<string, unknown>[] = []
  for (let index = 0; index < workerIds.length; index += ADDRESS_BATCH_SIZE) {
    const batch = workerIds.slice(index, index + ADDRESS_BATCH_SIZE)
    // La RPC ritorna TUTTI gli indirizzi del batch in un colpo, quindi non
    // serve più il loop di paginazione che table-query richiedeva.
    const result = await fetchIndirizziByEntity("lavoratori", batch)
    allRows.push(...result.rows)
  }

  return groupAddressesByWorker(allRows)
}

// Pure: dalle righe grezze di lavoratori_selezioni_correlate (annidate nel
// board RPC lavoratori_board) costruisce la mappa otherActiveSelections per
// worker, risolvendo colori/label client-side.
export function buildRelatedSelectionsMap(
  rows: GenericRow[],
  lookupColorsByDomain: Map<string, string>,
  recruiterLabelsById: Map<string, string>
): Map<string, NonNullable<LavoratoreListItem["otherActiveSelections"]>> {
  const relatedSelectionsByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()
  const rowsByWorker = new Map<string, GenericRow[]>()
  for (const row of rows) {
    const workerId = asString(row.lavoratore_id)
    if (!workerId) continue
    const bucket = rowsByWorker.get(workerId)
    if (bucket) bucket.push(row)
    else rowsByWorker.set(workerId, [row])
  }

  for (const [workerId, workerRows] of rowsByWorker) {
    const details: NonNullable<LavoratoreListItem["otherActiveSelections"]>["details"] = []
    const dots: NonNullable<LavoratoreListItem["otherActiveSelections"]>["dots"] = []
    const seenProcesses = new Set<string>()

    for (const row of workerRows) {
      const processId = asString(row.processo_matching_id)
      if (!processId || seenProcesses.has(processId)) continue

      const statoSelezione = asString(row.stato_selezione) ?? "-"
      const statoRicerca = asString(row.stato_res) ?? "-"
      const selectionColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "selezioni_lavoratori.stato_selezione",
        statoSelezione
      )
      const processColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "processi_matching.stato_res",
        statoRicerca
      )
      const recruiterId = asString(row.recruiter_ricerca_e_selezione_id)

      details.push({
        id: processId,
        familyName: formatRelatedFamilyName({
          nome: row.famiglia_nome,
          cognome: row.famiglia_cognome,
        }),
        ricercaLabel: formatRelatedSearchLabel({
          numero_ricerca_attivata: row.numero_ricerca_attivata,
          id: processId,
        }),
        recruiterLabel: recruiterId ? recruiterLabelsById.get(recruiterId) ?? "" : "",
        statoSelezione,
        statoSelezioneColor: selectionColor,
        statoRicerca,
        statoRicercaColor: processColor,
        orarioDiLavoro: asString(row.orario_di_lavoro) ?? "",
        zona: formatRelatedZona(row),
        appunti: asString(row.note_selezione) ?? "",
        // BAZ-25: `workerColloquio` is intentionally omitted here. This is the
        // lista/mappa lavoratori popover preview; the "Disponibilità colloquio"
        // row shows in the scheda lavoratore and the workers-pipeline, not in
        // this minimal preview.
      })
      if (dots.length < 4) {
        dots.push({
          key: `${processId}-${statoSelezione}`,
          colorClassName: getDotColorClassName(selectionColor),
          label: statoSelezione,
        })
      }
      seenProcesses.add(processId)
    }

    if (details.length > 0) {
      relatedSelectionsByWorkerId.set(workerId, {
        count: details.length,
        dots,
        details,
      })
    }
  }

  return relatedSelectionsByWorkerId
}
