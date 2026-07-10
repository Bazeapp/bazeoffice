/**
 * Builds the "Disponibilità colloquio" row for the ricerca cards: joins the
 * giorni and orari texts captured during the colloquio
 * (`selezioni_lavoratori.intervista_giorni_lavoro` / `intervista_orario_e_giorni`),
 * skipping empty or whitespace-only values. Returns "" when there is nothing to
 * show, so the card can hide the row.
 *
 * The guard is on the *trimmed* text, not on null: those columns are TEXT and
 * can hold empty/whitespace strings, not just NULL.
 */
export function formatColloquioAvailability(
  value: { giorni: string; orario: string } | null | undefined,
): string {
  if (!value) return ""
  return [value.giorni, value.orario]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" · ")
}
