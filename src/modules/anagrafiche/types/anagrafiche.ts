import type { SortingState } from "@tanstack/react-table"

import type { QueryFilterGroup, TableColumnMeta, TableGroupResult } from "@/lib/table-query"

export type AnagraficaRow = Record<string, unknown>
export type LookupColorMap = Record<string, Record<string, string>>
export type LookupOptionsMap = Record<
  string,
  Array<{
    label: string
    value: string
  }>
>
export type LookupFilterTypeMap = Record<string, TableColumnMeta["filterType"]>
export type AnagraficheTab =
  | "famiglie"
  | "processi"
  | "lavoratori"
  | "mesi_lavorati"
  | "pagamenti"
  | "selezioni_lavoratori"
  | "rapporti_lavorativi"
export type AnagraficheGroupResult = TableGroupResult

export type UseAnagraficheDataParams = {
  activeTab: AnagraficheTab
  pageIndex: number
  pageSize: number
  searchValue?: string
  filters?: QueryFilterGroup
  sorting?: SortingState
  grouping?: string[]
}

export type AnagraficheDataState = {
  workers: AnagraficaRow[]
  families: AnagraficaRow[]
  processes: AnagraficaRow[]
  workedMonths: AnagraficaRow[]
  payments: AnagraficaRow[]
  workerSelections: AnagraficaRow[]
  workRelations: AnagraficaRow[]
  workersTotal: number
  familiesTotal: number
  processesTotal: number
  workedMonthsTotal: number
  paymentsTotal: number
  workerSelectionsTotal: number
  workRelationsTotal: number
  workersColumns: TableColumnMeta[]
  familiesColumns: TableColumnMeta[]
  processesColumns: TableColumnMeta[]
  workedMonthsColumns: TableColumnMeta[]
  paymentsColumns: TableColumnMeta[]
  workerSelectionsColumns: TableColumnMeta[]
  workRelationsColumns: TableColumnMeta[]
  workersGroups: AnagraficheGroupResult[]
  familiesGroups: AnagraficheGroupResult[]
  processesGroups: AnagraficheGroupResult[]
  workedMonthsGroups: AnagraficheGroupResult[]
  paymentsGroups: AnagraficheGroupResult[]
  workerSelectionsGroups: AnagraficheGroupResult[]
  workRelationsGroups: AnagraficheGroupResult[]
  lookupColors: LookupColorMap
  lookupOptions: LookupOptionsMap
  lookupFilterTypes: LookupFilterTypeMap
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  loadGroupRows: (
    group: AnagraficheGroupResult,
    pageIndex: number,
    pageSize: number
  ) => Promise<{ rows: AnagraficaRow[]; total: number }>
}
