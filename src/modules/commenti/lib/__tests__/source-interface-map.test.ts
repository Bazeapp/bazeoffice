import { describe, expect, it } from "vitest"

import type { MainSection } from "@/routes/app-routes"

import { mapMainSectionToSourceInterface } from "../source-interface-map"

const MAPPED_SECTIONS: Array<{
  mainSection: MainSection
  sourceInterface: NonNullable<ReturnType<typeof mapMainSectionToSourceInterface>>
}> = [
  { mainSection: "crm_pipeline_famiglie", sourceInterface: "kanban_famiglie" },
  { mainSection: "crm_assegnazione", sourceInterface: "assegnazione_famiglie" },
  { mainSection: "ricerca_pipeline", sourceInterface: "dettaglio_ricerca" },
  { mainSection: "lavoratori_cerca", sourceInterface: "cerca_lavoratore" },
  { mainSection: "gate_1", sourceInterface: "gate_1" },
  { mainSection: "gate_2", sourceInterface: "gate_2" },
  {
    mainSection: "gestione_contrattuale_rapporti",
    sourceInterface: "rapporti_lavorativi",
  },
  {
    mainSection: "gestione_contrattuale_assunzioni",
    sourceInterface: "assunzioni",
  },
  {
    mainSection: "gestione_contrattuale_chiusure",
    sourceInterface: "chiusure",
  },
  {
    mainSection: "gestione_contrattuale_variazioni",
    sourceInterface: "variazioni",
  },
  { mainSection: "payroll_cedolini", sourceInterface: "cedolini" },
  { mainSection: "payroll_contributi_inps", sourceInterface: "contributi_inps" },
  {
    mainSection: "customer_support_customer_ticket",
    sourceInterface: "ticket_customer",
  },
  {
    mainSection: "customer_support_payroll_ticket",
    sourceInterface: "ticket_payroll",
  },
]

const UNMAPPED_SECTIONS: MainSection[] = [
  "anagrafiche",
  "prove_colloqui",
  "customer_support_riattivazioni",
]

describe("mapMainSectionToSourceInterface", () => {
  it.each(MAPPED_SECTIONS)(
    "maps $mainSection to $sourceInterface",
    ({ mainSection, sourceInterface }) => {
      expect(mapMainSectionToSourceInterface(mainSection)).toBe(sourceInterface)
    },
  )

  it.each(UNMAPPED_SECTIONS)("returns null for $mainSection", (mainSection) => {
    expect(mapMainSectionToSourceInterface(mainSection)).toBeNull()
  })
})
