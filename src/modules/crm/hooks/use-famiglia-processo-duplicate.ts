import * as React from "react"
import { toast } from "sonner"

import { invokeEdgeFunction } from "@/lib/supabase-edge"

type DuplicaProcessoResponse =
  | {
      status: "success"
      data: {
        processo_matching_id: string
        indirizzi_ids: string[]
        source_processo_matching_id: string
      }
    }
  | { status: "error"; message: string }

export function useFamigliaProcessoDuplicate(processId: string | null | undefined) {
  const [isDuplicating, setIsDuplicating] = React.useState(false)

  const duplicateProcesso = React.useCallback(async () => {
    if (!processId || isDuplicating) return
    setIsDuplicating(true)
    try {
      const response = await invokeEdgeFunction<DuplicaProcessoResponse>(
        "duplica-processo-matching",
        { processo_matching_id: processId }
      )
      if (response.status !== "success") {
        toast.error(
          response.message ?? "Errore durante la duplicazione della ricerca"
        )
        return
      }
      toast.success("Ricerca duplicata")
    } catch {
      toast.error("Errore durante la duplicazione della ricerca")
    } finally {
      setIsDuplicating(false)
    }
  }, [isDuplicating, processId])

  return { isDuplicating, duplicateProcesso }
}
