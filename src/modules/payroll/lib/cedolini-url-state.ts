import { getCurrentMonthValue } from "./payroll-display-utils"

export type CedoliniMode = "board" | "controlli" | "pagamenti"

export const CEDOLINI_MODE_PARAM = "mode"
export const CEDOLINI_MONTH_PARAM = "month"

const CEDOLINI_MODES = new Set<CedoliniMode>(["board", "controlli", "pagamenti"])
const MONTH_VALUE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

export function parseCedoliniMode(value: string | null | undefined): CedoliniMode | null {
  if (value == null || value === "") return null
  if (!CEDOLINI_MODES.has(value as CedoliniMode)) return null
  return value as CedoliniMode
}

export function parseCedoliniMonth(value: string | null | undefined): string | null {
  if (value == null || value === "") return null
  if (!MONTH_VALUE_PATTERN.test(value)) return null
  return value
}

export type CedoliniUrlState = {
  mode: CedoliniMode
  month: string
}

export function readCedoliniUrlState(
  search: string,
  defaults: CedoliniUrlState = {
    mode: "board",
    month: getCurrentMonthValue(),
  },
): CedoliniUrlState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
  return {
    mode: parseCedoliniMode(params.get(CEDOLINI_MODE_PARAM)) ?? defaults.mode,
    month: parseCedoliniMonth(params.get(CEDOLINI_MONTH_PARAM)) ?? defaults.month,
  }
}

/**
 * Writes both Cedolini params. Caller decides when to write (only after the
 * user changes mode/month — never on first paint of an empty URL).
 */
export function buildCedoliniSearchParams(state: CedoliniUrlState): string {
  const params = new URLSearchParams()
  params.set(CEDOLINI_MODE_PARAM, state.mode)
  params.set(CEDOLINI_MONTH_PARAM, state.month)
  const serialized = params.toString()
  return serialized ? `?${serialized}` : ""
}

export function replaceCedoliniUrlState(state: CedoliniUrlState) {
  if (typeof window === "undefined") return
  const next = `${window.location.pathname}${buildCedoliniSearchParams(state)}${window.location.hash}`
  window.history.replaceState(window.history.state, "", next)
}
