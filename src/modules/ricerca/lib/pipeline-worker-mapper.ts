import type { LavoratoreListItem } from "@/modules/lavoratori/components/lavoratore-card"
import {
  asString,
  getAgeFromBirthDate,
  getDefaultWorkerAvatar,
  isBlacklistValue,
  normalizeDomesticRoleLabels,
  readArrayStrings,
  resolveLookupColor,
  toAvatarImage,
  toWorkerStatusFlags,
} from "@/modules/lavoratori/lib"
import { fetchRicercaWorkerRelatedSelectionSummaries } from "../queries/fetch-ricerca-worker-related-selection-summaries"
import type { GenericRow } from "../types/workers-pipeline"
import { getDotColorClassName } from "./pipeline-column-utils"
import { resolveLookupColorByStatusToken } from "./pipeline-stage-metadata"
import { normalizeLookupToken, toNumberValue, toStringValue } from "./pipeline-value-utils"

export function parseAddressCoordinates(address: GenericRow | undefined) {
  if (!address) return null
  const lat = toNumberValue(address.latitudine)
  const lng = toNumberValue(address.longitudine)
  if (lat === null || lng === null) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null
  return { lat, lng }
}

export function formatAddressLabel(address: GenericRow | undefined) {
  if (!address) return null

  const formatted = toStringValue(address.indirizzo_formattato)
  if (formatted) return formatted

  const street = [toStringValue(address.via), toStringValue(address.civico)]
    .filter(Boolean)
    .join(" ")
    .trim()
  const note = toStringValue(address.note)
  const citta = toStringValue(address.citta)
  const cap = toStringValue(address.cap)
  const shortNote = note?.split("-")[0]?.trim() || null

  return (
    [street || shortNote, citta, cap]
      .filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
      .join(" • ") || null
  )
}

export function resolveWorkerAddress(
  workerId: string,
  addressesByWorkerId: Map<string, GenericRow[]>
) {
  const addresses = addressesByWorkerId.get(workerId) ?? []
  if (addresses.length === 0) return undefined

  return (
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "residenza"
    ) ??
    addresses.find(
      (address) => normalizeLookupToken(toStringValue(address.tipo_indirizzo)) === "domicilio"
    ) ??
    addresses[0]
  )
}
export async function fetchRelatedSelectionSummariesByWorkerIds({
  workerIds,
  currentProcessId,
  lookupColorsByDomain,
}: {
  workerIds: string[]
  currentProcessId: string
  lookupColorsByDomain: Map<string, string>
}) {
  const summariesByWorkerId = new Map<
    string,
    NonNullable<LavoratoreListItem["otherActiveSelections"]>
  >()

  const rpcRows = await fetchRicercaWorkerRelatedSelectionSummaries({
    workerIds,
    currentProcessId,
  })

  for (const row of rpcRows) {
    const workerId = toStringValue(row.worker_id)
    if (!workerId) continue

    const dots = row.dots.slice(0, 4).map((dot) => {
      const statoSelezione = toStringValue(dot.stato_selezione) ?? "-"
      const selectionColor = resolveLookupColorByStatusToken(
        lookupColorsByDomain,
        "selezioni_lavoratori.stato_selezione",
        statoSelezione
      )

      return {
        key: `${dot.process_id}-${statoSelezione}`,
        colorClassName: getDotColorClassName(selectionColor),
        label: statoSelezione,
      }
    })

    summariesByWorkerId.set(workerId, {
      count: row.count,
      dots,
      details: [],
    })
  }

  return summariesByWorkerId
}

export function buildWorkerListItem(
  worker: GenericRow,
  lookupColorsByDomain: Map<string, string>,
  addressesByWorkerId: Map<string, GenericRow[]>
): LavoratoreListItem {
  const workerId = toStringValue(worker.id) ?? "unknown-worker"
  const nome = toStringValue(worker.nome) ?? ""
  const cognome = toStringValue(worker.cognome) ?? ""
  const statoLavoratore = toStringValue(worker.stato_lavoratore)
  const disponibilita = toStringValue(worker.disponibilita)
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
  const ruoliDomestici = normalizeDomesticRoleLabels(readArrayStrings(worker.tipo_lavoro_domestico))
  const tipoRuolo = ruoliDomestici[0] ?? null
  const tipoLavori = readArrayStrings(worker.tipo_rapporto_lavorativo)
  const tipoLavoro = tipoLavori[0] ?? null
  const statusFlags = toWorkerStatusFlags(statoLavoratore)
  const workerAddress = resolveWorkerAddress(workerId, addressesByWorkerId)

  const anniEsperienzaColf = toNumberValue(worker.anni_esperienza_colf)
  const anniEsperienzaBabysitter = toNumberValue(worker.anni_esperienza_babysitter)
  const avatarImage = toAvatarImage(worker)

  return {
    id: workerId,
    nomeCompleto: `${nome} ${cognome}`.trim() || workerId,
    immagineUrl: avatarImage?.url ?? getDefaultWorkerAvatar(workerId),
    immagineType: avatarImage?.type ?? null,
    travelTimeMinutes: null,
    locationLabel: formatAddressLabel(workerAddress) ?? asString(worker.cap) ?? null,
    telefono: asString(worker.telefono) || null,
    isBlacklisted: isBlacklistValue(worker.check_blacklist),
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
    eta: getAgeFromBirthDate(worker.data_di_nascita),
    anniEsperienzaColf,
    anniEsperienzaBabysitter,
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
    coordinates: parseAddressCoordinates(workerAddress),
    isDisponibile,
    isQualified: statusFlags.isQualified,
    isIdoneo: statusFlags.isIdoneo,
    isCertificato: statusFlags.isCertificato,
    otherActiveSelections: null,
  }
}
