import { Gate1View } from "@/components/lavoratori/gate1-view"

export function Gate1Page() {
  return (
    <Gate1View
      showStepper
      showInPersonBookingLinks
      splitBazeChecksStep
      stepLayout="gate1_reordered"
    />
  )
}
