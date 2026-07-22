import { ContributiInpsView } from "./contributi-inps-view"
import { PayrollOverviewCedoliniView } from "./payroll-overview-cedolini-view"
import type { PayrollOverviewViewProps } from "../types"

export { CedolinoDetailSheet } from "./payroll-overview-cedolino-detail-sheet"

export function PayrollOverviewView({ defaultTab = "cedolini" }: PayrollOverviewViewProps) {
  if (defaultTab === "contributi-inps") {
    return <ContributiInpsView />
  }

  return <PayrollOverviewCedoliniView />
}
