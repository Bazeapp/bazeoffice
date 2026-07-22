import { MessageSquareTextIcon } from "lucide-react"

import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import { Textarea } from "@/components/ui/textarea"

import type { CedolinoDetailFeedbackProps } from "../types"
import { PayrollOverviewEditableStars } from "./payroll-overview-editable-stars"

export function PayrollOverviewCedolinoDetailFeedback({ card }: CedolinoDetailFeedbackProps) {
  return (
    <DetailSectionBlock
      title="Feedback"
      icon={<MessageSquareTextIcon className="text-muted-foreground size-5" />}
      contentClassName="space-y-5"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="ui-type-label">Feedback rating</p>
          <PayrollOverviewEditableStars value={card.record.rating_feedback_famiglia} readOnly />
        </div>
        <div className="space-y-2">
          <p className="ui-type-label">Feedback scritto</p>
          <Textarea
            value={card.record.testo_feedback_famiglia ?? ""}
            className="min-h-24"
            readOnly
          />
        </div>
      </div>
    </DetailSectionBlock>
  )
}
