import { RecruiterFeedbackPanel } from "@/components/lavoratori/recruiter-feedback-panel"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

type RecruiterFeedbackSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  operatorName: string
  onSave: (nextValue: string) => Promise<void> | void
  disabled?: boolean
}

export function RecruiterFeedbackSheet({
  open,
  onOpenChange,
  value,
  operatorName,
  onSave,
  disabled = false,
}: RecruiterFeedbackSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-130">
        <SheetHeader>
          <SheetTitle>Feedback recruiter</SheetTitle>
          <SheetDescription>Storico note su questo lavoratore</SheetDescription>
        </SheetHeader>
        <div className="p-4 pt-0">
          <RecruiterFeedbackPanel
            embedded
            value={value}
            operatorName={operatorName}
            onSave={onSave}
            disabled={disabled}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
