import * as React from "react"
import { MessageSquareTextIcon } from "lucide-react"

import { RecruiterFeedbackPanel } from "@/components/lavoratori/recruiter-feedback-panel"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
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
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-130">
        <SheetHeader>
          <SheetTitle>Feedback recruiter</SheetTitle>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col p-4 pt-0">
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

type RecruiterFeedbackButtonProps = {
  value: string
  operatorName: string
  onSave: (nextValue: string) => Promise<void> | void
  disabled?: boolean
}

/**
 * Floating icon (bottom-right of the detail scroll area) that opens the
 * editable recruiter-feedback sheet. Drop into any worker detail panel.
 */
export function RecruiterFeedbackButton({
  value,
  operatorName,
  onSave,
  disabled = false,
}: RecruiterFeedbackButtonProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <div className="sticky right-0 bottom-1 z-20 mt-4 flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full border-2 border-black bg-background/95"
          title="Apri feedback recruiter"
          aria-label="Apri feedback recruiter"
          onClick={() => setOpen(true)}
        >
          <MessageSquareTextIcon className="size-5" />
        </Button>
      </div>
      <RecruiterFeedbackSheet
        open={open}
        onOpenChange={setOpen}
        value={value}
        operatorName={operatorName}
        onSave={onSave}
        disabled={disabled}
      />
    </>
  )
}
