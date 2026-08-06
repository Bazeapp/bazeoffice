import { MessageSquareTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { requestOpenCommentPanel } from "@/modules/commenti/lib"

type RecruiterFeedbackButtonProps = {
  disabled?: boolean
  /**
   * `floating` (default): round icon in a sticky bottom-right wrapper.
   * `fab`: the round icon alone (host positions it, e.g. absolute in an
   * overlay). `inline`: a bare ghost icon for a header/toolbar row.
   */
  variant?: "floating" | "fab" | "inline"
}

/**
 * Opens the unified comments panel for the current worker. Legacy
 * `feedback_recruiter` sheet/composer is retired — history and writes live in
 * `commenti`.
 */
export function RecruiterFeedbackButton({
  disabled = false,
  variant = "floating",
}: RecruiterFeedbackButtonProps) {
  const openPanel = () => {
    if (disabled) return
    requestOpenCommentPanel()
  }

  const roundTrigger = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="rounded-full border-2 border-black bg-background/95"
      title="Apri commenti"
      aria-label="Apri commenti"
      disabled={disabled}
      data-testid="recruiter-feedback-open-comments"
      onClick={openPanel}
    >
      <MessageSquareTextIcon className="size-5" />
    </Button>
  )

  if (variant === "inline") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Apri commenti"
        aria-label="Apri commenti"
        disabled={disabled}
        data-testid="recruiter-feedback-open-comments"
        onClick={openPanel}
      >
        <MessageSquareTextIcon className="size-4" />
      </Button>
    )
  }

  if (variant === "fab") {
    return roundTrigger
  }

  return (
    <div className="sticky right-0 bottom-1 z-20 mt-4 flex justify-end">
      {roundTrigger}
    </div>
  )
}
