import * as React from "react"
import { MessageSquareTextIcon } from "lucide-react"

import { RecruiterFeedbackPanel } from "../components/recruiter-feedback-panel"
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
  /**
   * `floating` (default): round icon in a sticky bottom-right wrapper.
   * `fab`: the round icon alone (host positions it, e.g. absolute in an
   * overlay). `inline`: a bare ghost icon for a header/toolbar row.
   */
  variant?: "floating" | "fab" | "inline"
}

/**
 * Icon that opens the editable recruiter-feedback sheet. Drop into any worker
 * detail panel (floating) or into a header/toolbar (inline).
 */
export function RecruiterFeedbackButton({
  value,
  operatorName,
  onSave,
  disabled = false,
  variant = "floating",
}: RecruiterFeedbackButtonProps) {
  const [open, setOpen] = React.useState(false)

  const roundTrigger = (
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
  )

  return (
    <>
      {variant === "inline" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          title="Apri feedback recruiter"
          aria-label="Apri feedback recruiter"
          onClick={() => setOpen(true)}
        >
          <MessageSquareTextIcon className="size-4" />
        </Button>
      ) : variant === "fab" ? (
        roundTrigger
      ) : (
        <div className="sticky right-0 bottom-1 z-20 mt-4 flex justify-end">
          {roundTrigger}
        </div>
      )}
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
