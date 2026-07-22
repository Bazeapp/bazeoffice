export function renderFamigliaProcessoValue(value: string | null | undefined) {
  if (!value) return "-"
  const normalized = value.trim()
  return normalized ? normalized : "-"
}

export function editableFamigliaProcessoValue(value: string | null | undefined) {
  const normalized = renderFamigliaProcessoValue(value)
  return normalized === "-" ? "" : normalized
}
