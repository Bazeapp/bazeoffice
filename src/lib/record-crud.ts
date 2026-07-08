import { invokeEdgeFunction } from "@/lib/supabase-edge"
import { clearReadCaches, runTrackedWrite } from "@/lib/write-tracking"

type TableRow = Record<string, unknown>

export type UpdateTableName =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "contributi_inps"
  | "lavoratori"
  | "indirizzi"
  | "mesi_lavorati"
  | "presenze_mensili"
  | "rapporti_lavorativi"
  | "richieste_attivazione"
  | "ticket"
  | "variazioni_contrattuali"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"

export type CreateTableName =
  | "assunzioni"
  | "famiglie"
  | "chiusure_contratti"
  | "lavoratori"
  | "indirizzi"
  | "selezioni_lavoratori"
  | "documenti_lavoratori"
  | "esperienze_lavoratori"
  | "referenze_lavoratori"
  | "processi_matching"
  | "ticket"
  | "variazioni_contrattuali"

type UpdateRecordResponse = {
  table: UpdateTableName
  id: string
  row: TableRow
}

type CreateRecordResponse = {
  table: CreateTableName
  row: TableRow
}

type DeleteRecordResponse = {
  table: UpdateTableName
  id: string
  deleted: boolean
}

export async function updateRecord(
  table: UpdateTableName,
  id: string,
  patch: Record<string, unknown>
) {
  const response = await runTrackedWrite(
    invokeEdgeFunction<UpdateRecordResponse>("update-record", {
      table,
      id,
      patch,
    })
  )
  clearReadCaches()
  return response
}

export async function createRecord(table: CreateTableName, values: Record<string, unknown>) {
  const response = await runTrackedWrite(
    invokeEdgeFunction<CreateRecordResponse>("create-record", {
      table,
      values,
    })
  )
  clearReadCaches()
  return response
}

export async function deleteRecord(table: UpdateTableName, id: string) {
  const response = await runTrackedWrite(
    invokeEdgeFunction<DeleteRecordResponse>("delete-record", {
      table,
      id,
    })
  )
  clearReadCaches()
  return response
}
