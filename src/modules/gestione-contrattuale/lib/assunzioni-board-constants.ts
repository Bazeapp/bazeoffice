export const ASSUNZIONI_FORM_URLS = {
  datore: "https://airtable.com/appevZURCPFkSG3CJ/pag5YgoOJ0v7SF8Md/form",
  lavoratore: "https://airtable.com/appevZURCPFkSG3CJ/pagyXYipcEfKXSUVj/form",
} as const

export function assunzioniStageTestId(stageId: string) {
  return `kanban-column-${stageId.replace(/\s+/g, "_")}`
}
