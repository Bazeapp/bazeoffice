import * as React from "react"
import { MessageSquareTextIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { DetailSectionBlock } from "@/components/shared-next/detail-section-card"
import {
  appendRecruiterFeedback,
  parseRecruiterFeedback,
} from "@/features/lavoratori/lib/feedback-utils"

type RecruiterFeedbackPanelProps = {
  value: string
  operatorName: string
  onSave: (nextValue: string) => Promise<void> | void
  title?: string
  disabled?: boolean
  /** Render the inner content only, without the card wrapper (for nesting). */
  embedded?: boolean
  /** Show the existing feedback history above/around the input. */
  showHistory?: boolean
}

/**
 * Recruiter feedback as an append-only comment thread. The operator writes
 * ONLY the comment text; the entry is auto-stamped with their name and today's
 * date. Existing history is shown read-only below the input.
 *
 * NOTE: the host should mount this with `key={workerId}` so the in-progress
 * draft is discarded when switching worker (prevents posting onto the wrong
 * profile — same class of bug fixed in useDebouncedSave's `identity`).
 */
export function RecruiterFeedbackPanel({
  value,
  operatorName,
  onSave,
  title = "Feedback recruiter",
  disabled = false,
  embedded = false,
  showHistory = true,
}: RecruiterFeedbackPanelProps) {
  const [draft, setDraft] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const entries = React.useMemo(() => parseRecruiterFeedback(value), [value])

  const handleAdd = React.useCallback(async () => {
    const text = draft.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      await onSave(appendRecruiterFeedback(value, operatorName, text))
      setDraft("")
    } finally {
      setSaving(false)
    }
  }, [draft, onSave, operatorName, saving, value])

  const historyBlock =
    entries.length > 0 ? (
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${entry.name}-${entry.date}-${index}`}
            className="space-y-1.5"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{entry.name}</p>
              {entry.date ? <Badge variant="outline">{entry.date}</Badge> : null}
            </div>
            {entry.text ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {entry.text}
              </p>
            ) : null}
            {index < entries.length - 1 ? <Separator /> : null}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-muted-foreground text-sm">Nessun appunto ancora.</p>
    )

  const inputBlock = (
    <div className={`space-y-2 ${showHistory ? "border-t pt-4" : ""}`}>
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        disabled={disabled || saving}
        placeholder="Scrivi un nuovo appunto… (verrà firmato in automatico)"
        className="min-h-20 w-full text-sm"
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault()
            void handleAdd()
          }
        }}
      />
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={() => void handleAdd()}
          disabled={disabled || saving || !draft.trim()}
        >
          {saving ? "Salvataggio…" : "Aggiungi commento"}
        </Button>
      </div>
    </div>
  )

  // Embedded (sheet): fill the available height so the input stays pinned to
  // the bottom and the history scrolls above it — even with no history yet.
  if (embedded) {
    if (!showHistory) {
      return inputBlock
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <div className="min-h-0 flex-1 overflow-y-auto">{historyBlock}</div>
        {inputBlock}
      </div>
    )
  }

  return (
    <DetailSectionBlock
      title={title}
      icon={<MessageSquareTextIcon className="text-muted-foreground size-4" />}
      showDefaultAction={false}
      contentClassName="space-y-4"
    >
      {showHistory ? historyBlock : null}
      {inputBlock}
    </DetailSectionBlock>
  )
}
