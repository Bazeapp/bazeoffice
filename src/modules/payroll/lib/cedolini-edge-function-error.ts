/**
 * `invokeEdgeFunction` (see `src/lib/supabase-edge.ts`) throws a plain
 * `Error` on any non-2xx response, embedding the raw response body text in
 * its message: `Edge function 'name' failed (503): {"error":"..."}`. Some
 * Cedolini endpoints — notably `cedolini-recover-url` (KTD/A-S4: 503
 * `drive_not_configured`) — return a structured JSON body even on failure
 * so the FE can render a distinct state instead of a generic error string.
 *
 * This pure helper recovers that structured body without needing to change
 * the shared `invokeEdgeFunction` contract (which many other, unrelated
 * modules rely on).
 */
export function parseEdgeFunctionErrorBody(error: unknown): Record<string, unknown> | null {
  if (!(error instanceof Error)) return null

  const marker = "): "
  const markerIndex = error.message.indexOf(marker)
  if (markerIndex === -1) return null

  const body = error.message.slice(markerIndex + marker.length)
  try {
    const parsed = JSON.parse(body) as unknown
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}
