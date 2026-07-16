/**
 * Mapping coverage for `useCrmAssegnazione` (BAZ-32).
 *
 * The assegnazione board is fed by the `processi_matching_by_stato_res`
 * RPC, which `RETURNS SETOF processi_matching` — the whole row, read off an
 * untyped `Record<string, unknown>`. So the column name
 * `disponibilita_colloqui_in_presenza` is NOT type-checked: a typo would
 * silently map to "-" and `tsc` would stay green. These tests pin that key
 * (real value, null, and column-absent) so the "Disponibilità colloqui"
 * field in the assignment detail can never regress to a silent blank.
 */
import { waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { renderHookWithQueryClient } from "@/test/test-utils"

vi.mock("../queries/fetch-processi-matching-by-stato-res", () => ({
  fetchProcessiMatchingByStatoRes: vi.fn(),
}))
vi.mock("../queries/fetch-famiglie-by-ids", () => ({
  fetchFamiglieByIds: vi.fn(),
}))
vi.mock("@/lib/lookup-values", () => ({
  fetchLookupValues: vi.fn(),
}))
vi.mock("@/hooks/use-realtime-board-sync", () => ({
  useRealtimeBoardSync: vi.fn(),
}))

import { fetchProcessiMatchingByStatoRes } from "../queries/fetch-processi-matching-by-stato-res"
import { fetchFamiglieByIds } from "../queries/fetch-famiglie-by-ids"
import { fetchLookupValues } from "@/lib/lookup-values"
import { useCrmAssegnazione } from "./use-crm-assegnazione"

const family = { id: "f1", nome: "Rossi", cognome: "Mario" }
const baseProcess = { id: "p1", famiglia_id: "f1", stato_res: "da assegnare" }

function seedRows(process: Record<string, unknown>) {
  vi.mocked(fetchProcessiMatchingByStatoRes).mockResolvedValue({
    rows: [process],
  } as never)
  vi.mocked(fetchFamiglieByIds).mockResolvedValue({ rows: [family] } as never)
  vi.mocked(fetchLookupValues).mockResolvedValue({ rows: [] } as never)
}

describe("useCrmAssegnazione — disponibilità colloqui mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("maps disponibilita_colloqui_in_presenza onto the card", async () => {
    seedRows({ ...baseProcess, disponibilita_colloqui_in_presenza: "lun al ven 7-11" })

    const { result } = renderHookWithQueryClient(() => useCrmAssegnazione())

    await waitFor(() => expect(result.current.cards).toHaveLength(1))
    expect(result.current.cards[0].disponibilitaColloquiInPresenza).toBe(
      "lun al ven 7-11",
    )
  })

  it('falls back to "-" when the column is null', async () => {
    seedRows({ ...baseProcess, disponibilita_colloqui_in_presenza: null })

    const { result } = renderHookWithQueryClient(() => useCrmAssegnazione())

    await waitFor(() => expect(result.current.cards).toHaveLength(1))
    expect(result.current.cards[0].disponibilitaColloquiInPresenza).toBe("-")
  })

  it('falls back to "-" when the column is absent (mistyped column name)', async () => {
    // A typo in the untyped RPC key yields a missing property (undefined),
    // not null — this pins that exact failure mode to "-", never a blank.
    seedRows(baseProcess)

    const { result } = renderHookWithQueryClient(() => useCrmAssegnazione())

    await waitFor(() => expect(result.current.cards).toHaveLength(1))
    expect(result.current.cards[0].disponibilitaColloquiInPresenza).toBe("-")
  })
})
