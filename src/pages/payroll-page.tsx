import { PayrollOverviewView } from "@/modules/payroll/components"

export function PayrollPage({
  defaultTab = "cedolini",
}: {
  defaultTab?: "cedolini" | "contributi-inps"
}) {
  return <PayrollOverviewView defaultTab={defaultTab} />
}
