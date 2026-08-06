import { runTrackedEdgeFunction } from "@/lib/write-tracking"

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

export type WorkerAvailabilityInvokeResponse = {
  count?: number
  results?: Array<{
    worker_id?: string
    result?: {
      availability_final_json?: unknown
    }
    error?: string
  }>
}

/**
 * Pulls the recomputed `availability_final_json` out of a `worker-availability`
 * response. Realtime echoes from that write are suppressed (tracked write), so
 * callers must apply this into local state themselves.
 */
export function readComputedAvailabilityFinalJson(
  response: unknown,
  workerId: string
): string | null {
  if (!response || typeof response !== "object") return null
  const results = (response as WorkerAvailabilityInvokeResponse).results
  if (!Array.isArray(results) || results.length === 0) return null

  const entry =
    results.find((item) => item?.worker_id === workerId) ?? results[0]
  if (!entry || typeof entry.error === "string") return null

  const finalJson = entry.result?.availability_final_json
  if (finalJson == null) return null
  return typeof finalJson === "string" ? finalJson : JSON.stringify(finalJson)
}

export async function invokeWorkerAvailability(workerId: string | null | undefined) {
  const normalizedWorkerId = toId(workerId)
  if (!normalizedWorkerId) return null

  // Tracked so the resulting realtime echo on `lavoratori` (or any other
  // table written by `worker-availability`) is recognised as ours by the
  // echo-window suppression in `useRealtimeBoardSync` and does not trigger
  // a self-induced refetch cascade.
  return runTrackedEdgeFunction<WorkerAvailabilityInvokeResponse>("worker-availability", {
    worker_id: normalizedWorkerId,
  })
}

/** Recompute calendar server-side and return the new final JSON string. */
export async function invokeAndReadWorkerAvailabilityFinalJson(
  workerId: string | null | undefined
): Promise<string | null> {
  const normalizedWorkerId = toId(workerId)
  if (!normalizedWorkerId) return null
  const response = await invokeWorkerAvailability(normalizedWorkerId)
  return readComputedAvailabilityFinalJson(response, normalizedWorkerId)
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
