import { updateRecord } from "@/lib/record-crud"

type UpdateProcessoStatoSalesResponse = {
  id: string
  stato_sales: string
}

export async function updateProcessoMatchingStatoSales(
  processId: string,
  statoSales: string,
) {
  const response = await updateRecord("processi_matching", processId, {
    stato_sales: statoSales,
  })

return {
    id: processId,
    stato_sales:
      (typeof response.row.stato_sales === "string"
        ? response.row.stato_sales
        : statoSales) as UpdateProcessoStatoSalesResponse["stato_sales"],
  }
}
