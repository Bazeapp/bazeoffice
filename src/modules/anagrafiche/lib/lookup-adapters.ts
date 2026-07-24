import {
  normalizeLookupColors,
  normalizeLookupOptions,
} from "@/lib/lookup-utils"
import type { LookupValueRecord } from "@/types"
import type { LookupColorMap, LookupOptionsMap } from "../types"

export function buildLookupColorMapFromRows(rows: LookupValueRecord[]): LookupColorMap {
  const flat = normalizeLookupColors(rows)
  const result: LookupColorMap = {}
  for (const [key, color] of flat.entries()) {
    const [domain, token] = key.split(":")
    if (!domain || !token) continue
    if (!result[domain]) result[domain] = {}
    result[domain][token] = color
  }
  return result
}

export function buildLookupOptionsMapFromRows(rows: LookupValueRecord[]): LookupOptionsMap {
  const grouped = normalizeLookupOptions(rows)
  const result: LookupOptionsMap = {}
  for (const [domain, options] of grouped.entries()) {
    result[domain] = options
  }
  return result
}
