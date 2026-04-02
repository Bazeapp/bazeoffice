import { PayrollOverviewView } from "@/components/payroll/payroll-overview-view"

export function PayrollPage({
  defaultTab = "cedolini",
}: {
  defaultTab?: "cedolini" | "contributi-inps"
}) {
  return <PayrollOverviewView defaultTab={defaultTab} />
}
