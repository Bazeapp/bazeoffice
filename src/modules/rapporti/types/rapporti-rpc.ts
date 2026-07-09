import type { RapportoLavorativoRecord } from "./rapporto-lavorativo"

export type RapportiLavorativiBoardRpcResponse = {
  rows?: RapportoLavorativoRecord[]
  total?: number
}
