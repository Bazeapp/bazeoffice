import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useRealtimeRows } from "@/hooks/use-realtime-rows"
import { runTracked } from "@/lib/write-tracking"

import {
  appendReplyToRoot,
  makeOptimisticComment,
  scopeRowMatchesPageFocus,
  shouldMarkCommentRead,
} from "../lib/comment-panel-utils"
import {
  COMMENTI_REALTIME_TABLES,
  commentCountQueryKey,
  commentPageQueryPrefix,
  commentSectionQueryKey,
} from "../lib/query-keys"
import { createComment } from "../mutations/create-comment"
import { editComment } from "../mutations/edit-comment"
import { markCommentRead } from "../mutations/mark-comment-read"
import { replyComment } from "../mutations/reply-comment"
import { fetchCommentCountForPage } from "../queries/fetch-comment-count"
import { fetchCommentSectionPage } from "../queries/fetch-section-comments"
import type { Comment, CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { CommentListSectionRpcResponse } from "../types/comment-rpc"
import type { EntityRef } from "../types/entity"

export type UseCommentPanelOptions = {
  pageFocus: EntityRef | null
  expanded: boolean
  activeSectionRef: EntityRef | null
  targetEntityRef: EntityRef | null
  currentUserId: string | null
  currentUserName?: string
  sourceInterface?: SourceInterface | null
  defaultCommentType?: CommentType
  phaseLabel?: PhaseLabel | null
}

type CreateCommentVariables = Parameters<typeof createComment>[0]
type ReplyCommentVariables = Parameters<typeof replyComment>[0]
type EditCommentVariables = Parameters<typeof editComment>[0]

type SectionMutationContext = {
  snapshot: CommentListSectionRpcResponse | undefined
  sectionKey: ReturnType<typeof commentSectionQueryKey>
}

export function useCommentPanel(options: UseCommentPanelOptions) {
  const queryClient = useQueryClient()
  const pageFocus = options.pageFocus
  const activeSectionRef = options.activeSectionRef
  const defaultCommentType = options.defaultCommentType ?? "free"

  const countQuery = useQuery({
    queryKey: pageFocus ? commentCountQueryKey(pageFocus) : ["commenti", "count", "disabled"],
    queryFn: () =>
      fetchCommentCountForPage(pageFocus!.entityType, pageFocus!.entityId),
    enabled: Boolean(pageFocus),
  })

  const sectionQueryKey =
    pageFocus && activeSectionRef
      ? commentSectionQueryKey(pageFocus, activeSectionRef)
      : null

  const sectionQuery = useQuery({
    queryKey: sectionQueryKey ?? ["commenti", "section", "disabled"],
    queryFn: () =>
      fetchCommentSectionPage({
        pageEntityType: pageFocus!.entityType,
        pageEntityId: pageFocus!.entityId,
        sectionEntityType: activeSectionRef!.entityType,
        sectionEntityId: activeSectionRef!.entityId,
      }),
    enabled: Boolean(pageFocus && options.expanded && activeSectionRef),
  })

  const [isLoadingMore, setIsLoadingMore] = React.useState(false)

  const loadMoreSectionComments = React.useCallback(async () => {
    if (!pageFocus || !activeSectionRef || !sectionQueryKey) return
    const nextCursor = sectionQuery.data?.nextCursor
    if (!nextCursor || isLoadingMore) return

    setIsLoadingMore(true)
    try {
      const page = await fetchCommentSectionPage({
        pageEntityType: pageFocus.entityType,
        pageEntityId: pageFocus.entityId,
        sectionEntityType: activeSectionRef.entityType,
        sectionEntityId: activeSectionRef.entityId,
        cursor: nextCursor,
      })
      queryClient.setQueryData<CommentListSectionRpcResponse>(sectionQueryKey, (previous) => ({
        comments: [...page.comments, ...(previous?.comments ?? [])],
        nextCursor: page.nextCursor,
      }))
    } finally {
      setIsLoadingMore(false)
    }
  }, [
    activeSectionRef,
    isLoadingMore,
    pageFocus,
    queryClient,
    sectionQuery.data?.nextCursor,
    sectionQueryKey,
  ])

  const invalidatePageQueries = React.useCallback(() => {
    if (!pageFocus) return
    void queryClient.invalidateQueries({
      queryKey: commentPageQueryPrefix(pageFocus),
    })
  }, [pageFocus, queryClient])

  useRealtimeRows(
    [...COMMENTI_REALTIME_TABLES],
    (event) => {
      if (!pageFocus) return
      const row = event.newRow ?? event.oldRow
      if (!scopeRowMatchesPageFocus(row, pageFocus)) return
      invalidatePageQueries()
    },
    { enabled: Boolean(pageFocus) },
  )

  const createMutation = useMutation({
    mutationFn: (input: CreateCommentVariables) => runTracked(createComment(input)),
    onMutate: async (input) => {
      if (!pageFocus || !options.targetEntityRef || !options.currentUserId) return undefined
      const sectionKey = commentSectionQueryKey(pageFocus, options.targetEntityRef)
      await queryClient.cancelQueries({ queryKey: sectionKey })
      const snapshot = queryClient.getQueryData<CommentListSectionRpcResponse>(sectionKey)
      const optimistic = makeOptimisticComment({
        id: crypto.randomUUID(),
        anchor: options.targetEntityRef,
        authorId: options.currentUserId,
        authorName: options.currentUserName ?? "Tu",
        body: input.body,
        commentType: input.commentType,
        phaseLabel: input.phaseLabel ?? null,
        sourceInterface: input.sourceInterface ?? null,
      })
      queryClient.setQueryData<CommentListSectionRpcResponse>(sectionKey, (previous) => ({
        comments: [...(previous?.comments ?? []), optimistic],
        nextCursor: previous?.nextCursor ?? null,
      }))
      return { snapshot, sectionKey } satisfies SectionMutationContext
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData(context.sectionKey, context.snapshot)
      }
      toast.error("Errore durante l'invio del commento")
    },
    onSettled: () => invalidatePageQueries(),
  })

  const replyMutation = useMutation({
    mutationFn: (input: ReplyCommentVariables) => runTracked(replyComment(input)),
    onMutate: async (input) => {
      if (!pageFocus || !options.targetEntityRef || !options.currentUserId) return undefined
      const sectionKey = commentSectionQueryKey(pageFocus, options.targetEntityRef)
      await queryClient.cancelQueries({ queryKey: sectionKey })
      const snapshot = queryClient.getQueryData<CommentListSectionRpcResponse>(sectionKey)
      const optimistic = makeOptimisticComment({
        id: crypto.randomUUID(),
        anchor: options.targetEntityRef,
        authorId: options.currentUserId,
        authorName: options.currentUserName ?? "Tu",
        body: input.body,
        commentType: defaultCommentType,
        phaseLabel: null,
        sourceInterface: options.sourceInterface ?? null,
        threadRootId: input.threadRootId,
      })
      queryClient.setQueryData<CommentListSectionRpcResponse>(sectionKey, (previous) => ({
        comments: appendReplyToRoot(previous?.comments ?? [], input.threadRootId, optimistic),
        nextCursor: previous?.nextCursor ?? null,
      }))
      return { snapshot, sectionKey } satisfies SectionMutationContext
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.setQueryData(context.sectionKey, context.snapshot)
      }
      toast.error("Errore durante l'invio della risposta")
    },
    onSettled: () => invalidatePageQueries(),
  })

  const editMutation = useMutation({
    mutationFn: (input: EditCommentVariables) => runTracked(editComment(input)),
    onSettled: () => invalidatePageQueries(),
  })

  const markReadMutation = useMutation({
    mutationFn: (commentId: string) => runTracked(markCommentRead(commentId)),
    onSettled: () => invalidatePageQueries(),
  })

  const submitComment = React.useCallback(
    async (body: string) => {
      if (!pageFocus || !options.targetEntityRef) {
        throw new Error("Missing comment target")
      }
      await createMutation.mutateAsync({
        pageEntityType: pageFocus.entityType,
        pageEntityId: pageFocus.entityId,
        anchorEntityType: options.targetEntityRef.entityType,
        anchorEntityId: options.targetEntityRef.entityId,
        body,
        commentType: defaultCommentType,
        phaseLabel: options.phaseLabel ?? null,
        sourceInterface: options.sourceInterface ?? null,
      })
    },
    [
      createMutation,
      defaultCommentType,
      options.phaseLabel,
      options.sourceInterface,
      options.targetEntityRef,
      pageFocus,
    ],
  )

  const submitReply = React.useCallback(
    async (threadRootId: string, body: string) => {
      if (!pageFocus) {
        throw new Error("Missing page focus")
      }
      await replyMutation.mutateAsync({
        pageEntityType: pageFocus.entityType,
        pageEntityId: pageFocus.entityId,
        threadRootId,
        body,
      })
    },
    [pageFocus, replyMutation],
  )

  const markReadIfNeeded = React.useCallback(
    (comment: Comment) => {
      if (!shouldMarkCommentRead(comment, options.currentUserId)) return
      void markReadMutation.mutate(comment.id)
    },
    [markReadMutation, options.currentUserId],
  )

  return {
    count: countQuery.data ?? 0,
    countLoading: countQuery.isLoading,
    sectionComments: sectionQuery.data?.comments ?? [],
    sectionNextCursor: sectionQuery.data?.nextCursor ?? null,
    sectionLoading: sectionQuery.isLoading,
    hasMoreSectionComments: Boolean(sectionQuery.data?.nextCursor),
    loadMoreSectionComments,
    isLoadingMore,
    submitComment,
    submitReply,
    editComment: editMutation.mutateAsync,
    markReadIfNeeded,
    isSubmitting:
      createMutation.isPending || replyMutation.isPending || editMutation.isPending,
  }
}
