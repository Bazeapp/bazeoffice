import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

type WorkerPipelineOpenFullPageLinkProps = {
  workerId: string | null | undefined
  onOpen: (workerId: string) => void
}

/**
 * BAZ-91 — link from the ricerca worker scheda (right column) to the full
 * Cerca Lavoratori page for that worker.
 */
export function WorkerPipelineOpenFullPageLink({
  workerId,
  onOpen,
}: WorkerPipelineOpenFullPageLinkProps) {
  const resolvedId = workerId?.trim() || null
  if (!resolvedId) return null

  return (
    <div className="flex justify-end">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        data-testid="ricerca-worker-open-full-page"
        onClick={() => onOpen(resolvedId)}
      >
        <ExternalLinkIcon className="size-4" />
        Apri scheda completa
      </Button>
    </div>
  )
}
