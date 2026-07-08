import type { LavoratoreRecord } from "../types/lavoratore"
import type { PatchLoadingKey } from "./worker-editor-draft-builders"

export type PatchWorkerField = (
  field: keyof LavoratoreRecord,
  value: unknown,
  options: {
    loadingKey?: PatchLoadingKey
    errorMessage: string
  }
) => Promise<void>
