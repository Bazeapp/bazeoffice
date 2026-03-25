import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-130">
        <SheetHeader>
          <SheetTitle>Feedback recruiter</SheetTitle>
          <SheetDescription>Storico note su questo lavoratore</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-4 pt-0">
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
      </SheetContent>
    </Sheet>
  )
}
