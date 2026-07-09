type TableRow = Record<string, unknown>

export type CrmPipelineBoardRpcRow = {
  process: TableRow
  family: TableRow | null
  address: TableRow | null
  richiesta_attivazione?: TableRow | null
}

export type CrmPipelineBoardRpcResponse = {
  rows?: CrmPipelineBoardRpcRow[]
  stage_counts?: Array<{ value: string; count: number }>
}
