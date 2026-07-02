import { PayrollOverviewView } from "@/modules/payroll"

export function PayrollPage({
  defaultTab = "cedolini",
}: {
  defaultTab?: "cedolini" | "contributi-inps"
}) {
  return <PayrollOverviewView defaultTab={defaultTab} />
}
