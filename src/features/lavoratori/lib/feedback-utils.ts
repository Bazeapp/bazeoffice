export type RecruiterFeedbackEntry = {
  name: string
  date: string
  text: string
}

export function parseRecruiterFeedback(raw: string): RecruiterFeedbackEntry[] {
  if (!raw.trim()) return []
  return raw
    .split(/\n\s*\n+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
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
