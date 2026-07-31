import { ExternalLinkIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildPathForRoute } from "@/routes/app-routes"

type WorkerPipelineOpenFullPageLinkProps = {
  workerId: string | null | undefined
  onOpen: (workerId: string) => void
}

/**
 * BAZ-91 — link from the ricerca worker scheda header to the full
 * Cerca Lavoratori page for that worker.
 */
export function WorkerPipelineOpenFullPageLink({
  workerId,
  onOpen,
}: WorkerPipelineOpenFullPageLinkProps) {
  const resolvedId = workerId?.trim() || null
  if (!resolvedId) return null

  const href = buildPathForRoute({
    mainSection: "lavoratori_cerca",
    anagraficheTab: "famiglie",
    ricercaProcessId: null,
    selectedWorkerId: resolvedId,
  })

  return (
    <Button asChild variant="ghost" size="sm">
      <a
        href={href}
        data-testid="ricerca-worker-open-full-page"
        onClick={(event) => {
          if (
            event.metaKey ||
            event.ctrlKey ||
            event.shiftKey ||
            event.altKey ||
            event.button !== 0
          ) {
            return
          }
          event.preventDefault()
          onOpen(resolvedId)
        }}
      >
        <ExternalLinkIcon className="size-4" aria-hidden />
        Apri scheda completa
      </a>
    </Button>
  )
}
