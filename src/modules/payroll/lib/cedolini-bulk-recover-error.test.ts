import { describe, expect, it } from "vitest"

import { formatCedoliniBulkRecoverError } from "./cedolini-bulk-recover-error"
import type { CedolinoBulkJobItemRecord } from "../types/cedolino-bulk-job"

function makeItem(
  overrides: Partial<CedolinoBulkJobItemRecord> = {},
): CedolinoBulkJobItemRecord {
  return {
    id: "item-1",
    job_id: "job-1",
    mese_lavorativo_id: "m-1",
    status: "error",
    error: "drive_not_configured",
    details: {
      message:
        "Google Drive non configurato: imposta il secret DRIVE_SERVICE_ACCOUNT_JSON.",
    },
    processed_at: null,
    ...overrides,
  }
}

describe("formatCedoliniBulkRecoverError", () => {
  it("usa details.message del primo item in errore", () => {
    expect(
      formatCedoliniBulkRecoverError({ error_count: 1, total_count: 1 }, [makeItem()]),
    ).toBe("Google Drive non configurato: imposta il secret DRIVE_SERVICE_ACCOUNT_JSON.")
  })

  it("appende il conteggio quando ci sono più errori", () => {
    expect(
      formatCedoliniBulkRecoverError({ error_count: 3, total_count: 5 }, [
        makeItem(),
        makeItem({ id: "item-2", mese_lavorativo_id: "m-2" }),
      ]),
    ).toBe(
      "Google Drive non configurato: imposta il secret DRIVE_SERVICE_ACCOUNT_JSON. (3 errori su 5)",
    )
  })

  it("EDGE: senza details.message usa il codice error", () => {
    expect(
      formatCedoliniBulkRecoverError({ error_count: 1, total_count: 1 }, [
        makeItem({ details: null, error: "upload_failed" }),
      ]),
    ).toBe("Errore recupero URL: upload_failed")
  })

  it("EDGE: senza items falliti → messaggio generico", () => {
    expect(formatCedoliniBulkRecoverError({ error_count: 2, total_count: 2 }, [])).toBe(
      "Recupero URL non riuscito. (2 errori su 2)",
    )
  })
})
