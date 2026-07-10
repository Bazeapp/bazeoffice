import { splitPersonDisplayName } from "@/lib/format-utils"
import { getUniqueTableRow } from "@/lib/rpc-rows"
import type { FamigliaRecord } from "@/types"

import { fetchFamiglieByName } from "../queries/fetch-famiglie-by-name"

export async function fetchUniqueFamigliaByDisplayName(
  label: string | null | undefined,
) {
  const parts = splitPersonDisplayName(label)
  if (!parts?.first || !parts.rest) return null

  const response = await fetchFamiglieByName(parts.first, parts.rest)
  return getUniqueTableRow(response.rows as FamigliaRecord[])
}
