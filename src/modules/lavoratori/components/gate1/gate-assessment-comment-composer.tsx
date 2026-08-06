import * as React from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { runTracked } from "@/lib/write-tracking"
import { CommentComposer } from "@/modules/commenti/components"
import { useCommentContext } from "@/modules/commenti/hooks"
import { invalidateCommentVisibility } from "@/modules/commenti/lib"
import { createComment } from "@/modules/commenti/mutations"
import { notificheQueryPrefix } from "@/modules/notifiche/lib"

import { asString } from "../../lib/base-utils"
import { useGate1WorkerEditor } from "./gate1-worker-context"

/**
 * Inline Gate assessment composer: posts a `phase_note` on the lavoratore via
 * the unified comments RPCs (not `lavoratori.feedback_recruiter`).
 */
export function GateAssessmentCommentComposer() {
  const { workerRow } = useGate1WorkerEditor()
  const commentContext = useCommentContext()
  const queryClient = useQueryClient()
  const workerId = asString(workerRow?.id)

  const createMutation = useMutation({
    mutationFn: (body: string) => {
      if (!workerId) {
        throw new Error("Missing worker id")
      }
      const pageFocus = commentContext?.pageFocus ?? {
        entityType: "lavoratore" as const,
        entityId: workerId,
      }
      return runTracked(
        createComment({
          pageEntityType: pageFocus.entityType,
          pageEntityId: pageFocus.entityId,
          anchorEntityType: "lavoratore",
          anchorEntityId: workerId,
          body,
          commentType: "phase_note",
          phaseLabel: commentContext?.phaseLabel ?? "gate_1",
          sourceInterface: commentContext?.sourceInterface ?? "gate_1",
        }),
      )
    },
    onError: () => {
      toast.error("Errore durante l'invio del commento")
    },
    onSettled: () => {
      if (!workerId) return
      const pageFocus = commentContext?.pageFocus ?? {
        entityType: "lavoratore" as const,
        entityId: workerId,
      }
      const anchor = { entityType: "lavoratore" as const, entityId: workerId }
      invalidateCommentVisibility(queryClient, pageFocus, anchor)
      void queryClient.invalidateQueries({ queryKey: [...notificheQueryPrefix()] })
    },
  })

  const handleSubmit = React.useCallback(
    async (body: string) => {
      await createMutation.mutateAsync(body)
    },
    [createMutation],
  )

  return (
    <CommentComposer
      placeholder="Scrivi un nuovo appunto…"
      disabled={!workerId || !commentContext?.currentUserId}
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
    />
  )
}
