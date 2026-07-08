export type RecruiterFeedbackEntry = {
  name: string
  date: string
  text: string
}

function formatTodayItalian(): string {
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())
}

/** Builds a single stamped entry: `[Nome - gg/mm/aaaa]\n<testo>`. */
export function buildRecruiterFeedbackEntry(
  operatorName: string,
  text: string,
): string {
  const name = operatorName.trim() || "Operatore"
  return `[${name} - ${formatTodayItalian()}]\n${text.trim()}`
}

/**
 * Prepends a new stamped comment to the existing raw `feedback_recruiter`
 * value (newest first, blank-line separated). Backward-compatible with the
 * format read by `parseRecruiterFeedback`.
 */
export function appendRecruiterFeedback(
  current: string,
  operatorName: string,
  text: string,
): string {
  const entry = buildRecruiterFeedbackEntry(operatorName, text)
  const existing = current.trim()
  return existing ? `${entry}\n\n${existing}` : entry
}

export function parseRecruiterFeedback(raw: string): RecruiterFeedbackEntry[] {
  if (!raw.trim()) return []
  return raw
    .split(/\n\s*\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      // Bracket format: "[Nome - gg/mm/aaaa] testo" (text may span lines).
      const bracket = entry.match(
        /^\[\s*([^\]]+?)\s*-\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s*\]\s*([\s\S]*)$/,
      )
      if (bracket) {
        return {
          name: bracket[1]?.trim() || "Recruiter",
          date: bracket[2]?.trim() || "",
          text: bracket[3]?.trim() || "",
        }
      }

      // Legacy format: "Nome gg/mm/aa: testo" (single line).
      const normalized = entry.replace(/\s+/g, " ").trim()
      const match = normalized.match(/^([A-Za-zÀ-ÖØ-öø-ÿ' ]+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s*:?\s*(.*)$/)
      if (!match) {
        return {
          name: "Recruiter",
          date: "",
          text: entry,
        }
      }
      return {
        name: match[1]?.trim() || "Recruiter",
        date: match[2]?.trim() || "",
        text: match[3]?.trim() || "",
      }
    })
}
