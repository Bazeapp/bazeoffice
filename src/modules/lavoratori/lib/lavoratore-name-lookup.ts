import { splitPersonDisplayName } from "@/lib/format-utils"
import { getUniqueTableRow } from "@/lib/rpc-rows"
import type { LavoratoreRecord } from "@/types"

import { fetchLavoratoriByName } from "../queries/fetch-lavoratori-by-name"

export async function fetchUniqueLavoratoreByDisplayName(
  label: string | null | undefined,
) {
  const parts = splitPersonDisplayName(label)
  if (!parts) return null

  const response = await fetchLavoratoriByName(parts.first, parts.rest, parts.full)
  return getUniqueTableRow(response.rows as LavoratoreRecord[])
}
