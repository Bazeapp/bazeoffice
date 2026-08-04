import type { MainSection } from "@/routes/app-routes"

import type { SourceInterface } from "../types/comment"

export function mapMainSectionToSourceInterface(
  mainSection: MainSection,
): SourceInterface | null {
  switch (mainSection) {
    case "crm_pipeline_famiglie":
      return "kanban_famiglie"
    case "crm_assegnazione":
      return "assegnazione_famiglie"
    case "ricerca_pipeline":
      return "dettaglio_ricerca"
    case "lavoratori_cerca":
      return "cerca_lavoratore"
    case "gate_1":
      return "gate_1"
    case "gate_2":
      return "gate_2"
    case "gestione_contrattuale_rapporti":
      return "rapporti_lavorativi"
    case "gestione_contrattuale_assunzioni":
      return "assunzioni"
    case "gestione_contrattuale_chiusure":
      return "chiusure"
    case "gestione_contrattuale_variazioni":
      return "variazioni"
    case "payroll_cedolini":
      return "cedolini"
    case "payroll_contributi_inps":
      return "contributi_inps"
    case "customer_support_customer_ticket":
      return "ticket_customer"
    case "customer_support_payroll_ticket":
      return "ticket_payroll"
    default:
      return null
  }
}
