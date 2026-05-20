import { invokeEdgeFunction } from "@/lib/supabase-edge"

const SELECTION_AVAILABILITY_FIELDS = new Set([
  "stato_selezione",
  "stato_situazione_lavorativa",
  "processo_matching_id",
  "lavoratore_id",
])

const HARD_BLOCKING_SELECTION_STATUS_TOKENS = new Set([
  "selezionato",
  "inviato al cliente",
  "colloquio schedulato",
  "colloquio rimandato",
  "colloquio fatto",
  "prova schedulata",
  "prova rimandata",
])

function toId(value: unknown) {
  if (typeof value !== "string") return null
  const normalized = value.trim()
  return normalized && normalized !== "-" ? normalized : null
}

function normalizeSelectionStatus(value: unknown) {
  return String(value ?? "")
    .trim()
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

export function isHardBlockingSelection(selection: Record<string, unknown> | null | undefined) {
  return HARD_BLOCKING_SELECTION_STATUS_TOKENS.has(
    normalizeSelectionStatus(selection?.stato_selezione)
  )
}

export async function invokeWorkerAvailability(workerId: string | null | undefined) {
  const normalizedWorkerId = toId(workerId)
  if (!normalizedWorkerId) return null

  return invokeEdgeFunction("worker-availability", {
    worker_id: normalizedWorkerId,
  })
}

export async function invokeWorkerAvailabilityForIds(
  workerIds: Array<string | null | undefined>
) {
  const uniqueWorkerIds = Array.from(
    new Set(workerIds.map(toId).filter((workerId): workerId is string => Boolean(workerId)))
  )

  for (const workerId of uniqueWorkerIds) {
    await invokeWorkerAvailability(workerId)
  }
}

export function getSelectionAvailabilityWorkerIds(
  previousSelection: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
) {
  const touchesAvailabilityField = Object.keys(patch).some((field) =>
    SELECTION_AVAILABILITY_FIELDS.has(field)
  )
  if (!touchesAvailabilityField) return []

  const nextSelection = {
    ...(previousSelection ?? {}),
    ...patch,
  }
  const wasHardBlocking = isHardBlockingSelection(previousSelection)
  const isNowHardBlocking = isHardBlockingSelection(nextSelection)
  if (!wasHardBlocking && !isNowHardBlocking) return []

  const previousWorkerId = toId(previousSelection?.lavoratore_id)
  const nextWorkerId = toId(
    Object.prototype.hasOwnProperty.call(patch, "lavoratore_id")
      ? patch.lavoratore_id
      : previousSelection?.lavoratore_id
  )

  return Array.from(
    new Set([previousWorkerId, nextWorkerId].filter((workerId): workerId is string => Boolean(workerId)))
  )
}
