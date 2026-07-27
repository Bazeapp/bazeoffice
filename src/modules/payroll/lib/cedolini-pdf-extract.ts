/**
 * Pure regex heuristics to pull payroll figures out of Italian cedolino PDF text.
 *
 * Runtime: `baze-supabase/.../_shared/cedolini-pdf-extract.ts` (Edge worker). Keep
 * algorithms in sync. Vitest suite of record: `cedolini-pdf-extract.test.ts` in this folder.
 *
 * No I/O: the worker downloads the PDF bytes and runs `unpdf` text extraction, then hands
 * the resulting plain string to `extractCedolinoFieldsFromText` here.
 *
 * Ported to match the previous Controlli mini-tool parser (`extractPdfNumbers`
 * / `extractFirstNumberAfter` / `normalizeNumber`) so product outcomes stay aligned: same
 * labels, same lookahead, and — critically — `totale_ore` is the SUM of ore ordinarie +
 * straordinari + permessi retribuiti when those components are present (else fallback
 * "H. Lavorate" / "Ore lavorate").
 */

export interface CedolinoPdfFields {
  paga_oraria: number | null
  ore_ordinarie: number | null
  ore_straordinarie: number | null
  permessi_retribuiti: number | null
  totale_ore: number | null
}

/** Italian payroll number normalization (9,50 / 1.234,56 → JS number). */
export function normalizeNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null

  const cleaned = String(value)
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(".", "")
    .replace(",", ".")

  const number = Number(cleaned)
  return Number.isFinite(number) ? number : null
}

function escapeRegExp(label: string): string {
  return label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Finds the first number within `lookahead` chars after any of the labels
 * (case-insensitive). Matches the previous mini-tool's `extractFirstNumberAfter`.
 */
export function extractFirstNumberAfter(
  text: string,
  labels: string[],
  lookahead = 160,
): number | null {
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const re = new RegExp(
      `${escaped}[\\s\\S]{0,${lookahead}}?([0-9]+(?:[.,][0-9]{1,2})?)`,
      "i",
    )
    const match = text.match(re)
    if (match?.[1]) {
      const value = normalizeNumber(match[1])
      if (value !== null) return value
    }
  }
  return null
}

function extractHourComponent(text: string, labels: string[]): number | null {
  return extractFirstNumberAfter(text, labels, 90)
}

/**
 * Extracts payroll figures from raw cedolino PDF text. Never throws.
 * Parity target: previous Controlli `extractPdfNumbers`.
 */
export function extractCedolinoFieldsFromText(text: string): CedolinoPdfFields {
  const compact = String(text ?? "").replace(/\s+/g, " ")

  const paga_oraria = extractFirstNumberAfter(compact, [
    "Base Oraria",
    "rapp.domesticoBase Oraria",
    "Retribuzione Totale",
    "Paga oraria lorda",
    "Paga oraria",
    "Retribuzione oraria",
  ])

  const ore_ordinarie = extractHourComponent(compact, [
    "Ore ordinarie",
    "Ore Ordinarie",
  ])

  const ore_straordinarie = extractHourComponent(compact, [
    "Straordinari",
    "Ore straordinarie",
    "Lavoro straordinario",
  ])

  const permessi_retribuiti = extractHourComponent(compact, [
    "Permessi retribuiti",
    "Permesso retribuito",
  ])

  const hourComponents: { label: string; value: number }[] = []
  if (ore_ordinarie !== null) {
    hourComponents.push({ label: "Ore ordinarie", value: ore_ordinarie })
  }
  if (ore_straordinarie !== null) {
    hourComponents.push({ label: "Straordinari", value: ore_straordinarie })
  }
  if (permessi_retribuiti !== null) {
    hourComponents.push({ label: "Permessi retribuiti", value: permessi_retribuiti })
  }

  const fallbackWorkedHours = extractFirstNumberAfter(compact, [
    "H. Lavorate",
    "Ore lavorate",
  ])

  // Same rule as the previous tool: prefer sum of components, else fallback.
  const totale_ore = hourComponents.length
    ? Number(hourComponents.reduce((sum, item) => sum + item.value, 0).toFixed(2))
    : fallbackWorkedHours

  // Keep a richer ordinary-hours probe (also used by the previous tool's
  // `ordinaryHours` field) without overriding the component used in the sum.
  const ordinaryHoursEnriched = extractFirstNumberAfter(compact, [
    "Ore ordinarie",
    "Ore Ordinarie",
    "Totale ore ordinarie",
    "H. Lavorate",
    "Ore lavorate",
  ])

  return {
    paga_oraria,
    ore_ordinarie: ore_ordinarie ?? ordinaryHoursEnriched,
    ore_straordinarie,
    permessi_retribuiti,
    totale_ore,
  }
}
