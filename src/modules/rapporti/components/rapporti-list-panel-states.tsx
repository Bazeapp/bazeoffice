import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"

export type RapportiListPanelStatesProps = {
  loading: boolean
  error: string | null
  onRetry: () => void
  isEmpty: boolean
  children: ReactNode
}

export function RapportiListPanelStates({
  loading,
  error,
  onRetry,
  isEmpty,
  children,
}: RapportiListPanelStatesProps) {
  if (loading) {
    return <p className="text-muted-foreground py-6 text-sm">Caricamento rapporti lavorativi...</p>
  }

  if (error) {
    return (
      <div className="space-y-3 py-6">
        <p className="text-sm text-red-600">{error}</p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Riprova
        </Button>
      </div>
    )
  }

  if (isEmpty) {
    return <p className="text-muted-foreground py-6 text-sm">Nessun rapporto lavorativo trovato.</p>
  }

  return <div className="space-y-4">{children}</div>
}
