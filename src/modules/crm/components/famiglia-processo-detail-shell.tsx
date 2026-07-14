import * as React from "react"
import { XIcon } from "lucide-react"

import {
  FamigliaProcessoDetailContent,
  type FamigliaProcessoDetailContentProps,
} from "./famiglia-processo-detail-content"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet"

type FamigliaProcessoDetailShellProps = FamigliaProcessoDetailContentProps & {
  mode?: "inline" | "sheet"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  commentAnchorRef?: React.RefObject<HTMLDivElement | null>
}

export function FamigliaProcessoDetailShell({
  mode = "inline",
  open = true,
  onOpenChange,
  commentAnchorRef,
  headerAction,
  ...contentProps
}: FamigliaProcessoDetailShellProps) {
  const content = (
    <FamigliaProcessoDetailContent
      {...contentProps}
      headerAction={
        headerAction ??
        (mode === "sheet" ? (
          <SheetClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Chiudi dettaglio"
              title="Chiudi dettaglio"
            >
              <XIcon />
            </Button>
          </SheetClose>
        ) : undefined)
      }
    />
  )

  if (mode === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          ref={commentAnchorRef}
          side="right"
          className="!w-[min(96vw,760px)] !max-w-none overflow-hidden p-0 sm:!max-w-none"
        >
          {content}
        </SheetContent>
      </Sheet>
    )
  }

  return content
}
