import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DetailSheetWrapper } from "@/components/shared/detail-sheet-wrapper"

type RecruiterFeedbackEntry = {
  name: string
  date?: string | null
  text?: string | null
}

type RecruiterFeedbackSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: RecruiterFeedbackEntry[]
}

export function RecruiterFeedbackSheet({
  open,
  onOpenChange,
  entries,
}: RecruiterFeedbackSheetProps) {
  return (
    <DetailSheetWrapper
      open={open}
      onOpenChange={onOpenChange}
      title="Feedback recruiter"
      subtitle="Storico note su questo lavoratore"
    >
      <div className="space-y-4">
        {entries.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nessun feedback disponibile.
          </p>
        ) : (
          entries.map((entry, index) => (
            <div key={`${entry.name}-${entry.date}-${index}`} className="space-y-2">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{entry.name}</p>
                {entry.date ? <Badge variant="outline">{entry.date}</Badge> : null}
              </div>
              {entry.text ? <p className="text-sm leading-relaxed">{entry.text}</p> : null}
              {index < entries.length - 1 ? <Separator /> : null}
            </div>
          ))
        )}
      </div>
    </DetailSheetWrapper>
  )
}
