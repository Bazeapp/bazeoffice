import * as React from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { useRealtimeRows } from "@/hooks/use-realtime-rows"
import { runTracked } from "@/lib/write-tracking"
import { notificheQueryPrefix } from "@/modules/notifiche/lib/query-keys"

import {
  appendReplyToRoot,
  makeOptimisticComment,
  scopeRowMatchesEntityRefs,
  shouldMarkCommentRead,
} from "../lib/comment-panel-utils"
import { invalidateCommentVisibility } from "../lib/invalidate-comment-visibility"
import {
  COMMENTI_REALTIME_TABLES,
  commentCountQueryKey,
  commentDescendantsQueryKey,
  commentSectionQueryKey,
} from "../lib/query-keys"
import { createComment } from "../mutations/create-comment"
import { editComment } from "../mutations/edit-comment"
import { markCommentRead } from "../mutations/mark-comment-read"
import { replyComment } from "../mutations/reply-comment"
import { fetchCommentCountForPage } from "../queries/fetch-comment-count"
import { fetchDescendantsCommentPage } from "../queries/fetch-descendants-comments"
import { fetchCommentSectionPage } from "../queries/fetch-section-comments"
import type { Comment, CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { CommentListSectionRpcResponse } from "../types/comment-rpc"
import type { EntityRef } from "../types/entity"
import type { CommentSectionKind } from "../types/section"

export type UseCommentPanelOptions = {
  pageFocus: EntityRef | null
  watchedEntityRefs: EntityRef[]
  expanded: boolean
  activeSectionKind: CommentSectionKind | null
  activeSectionRef: EntityRef | null
  excludeAnchors: EntityRef[]
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
  const activeSectionKind = options.activeSectionKind
  const excludeAnchors = options.excludeAnchors
  const defaultCommentType = options.defaultCommentType ?? "free"

  const countQuery = useQuery({
    queryKey: pageFocus ? commentCountQueryKey(pageFocus) : ["commenti", "count", "disabled"],
    queryFn: () =>
      fetchCommentCountForPage(pageFocus!.entityType, pageFocus!.entityId),
    enabled: Boolean(pageFocus),
  })

  const isDescendantsSection = activeSectionKind === "descendants"

  const sectionQueryKey =
    pageFocus && activeSectionRef && !isDescendantsSection
      ? commentSectionQueryKey(pageFocus, activeSectionRef)
      : null

  const descendantsQueryKey =
    pageFocus && isDescendantsSection
      ? commentDescendantsQueryKey(pageFocus, excludeAnchors)
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
    enabled: Boolean(
      pageFocus && options.expanded && activeSectionRef && !isDescendantsSection,
    ),
  })

  const descendantsQuery = useQuery({
    queryKey: descendantsQueryKey ?? ["commenti", "descendants", "disabled"],
    queryFn: () =>
      fetchDescendantsCommentPage({
        pageEntityType: pageFocus!.entityType,
        pageEntityId: pageFocus!.entityId,
        excludeAnchors,
      }),
    enabled: Boolean(pageFocus && options.expanded && isDescendantsSection),
  })

  const activeListQuery = isDescendantsSection ? descendantsQuery : sectionQuery

  const [isLoadingMore, setIsLoadingMore] = React.useState(false)

  const loadMoreSectionComments = React.useCallback(async () => {
    if (!pageFocus || isLoadingMore) return
    const nextCursor = activeListQuery.data?.nextCursor
    if (!nextCursor) return

    if (isDescendantsSection) {
      if (!descendantsQueryKey) return
      setIsLoadingMore(true)
      try {
        const page = await fetchDescendantsCommentPage({
          pageEntityType: pageFocus.entityType,
          pageEntityId: pageFocus.entityId,
          excludeAnchors,
          cursor: nextCursor,
        })
        queryClient.setQueryData<CommentListSectionRpcResponse>(descendantsQueryKey, (previous) => ({
          comments: [...page.comments, ...(previous?.comments ?? [])],
          nextCursor: page.nextCursor,
        }))
      } finally {
        setIsLoadingMore(false)
      }
      return
    }

    if (!activeSectionRef || !sectionQueryKey) return

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
    activeListQuery.data?.nextCursor,
    activeSectionRef,
    descendantsQueryKey,
    excludeAnchors,
    isDescendantsSection,
    isLoadingMore,
    pageFocus,
    queryClient,
    sectionQueryKey,
  ])

  const watchedEntityRefs = options.watchedEntityRefs

  const invalidatePageQueries = React.useCallback(
    (anchor?: EntityRef | null) => {
      if (!pageFocus) return
      if (anchor) {
        invalidateCommentVisibility(queryClient, pageFocus, anchor)
        return
      }
      invalidateCommentVisibility(queryClient, pageFocus, pageFocus)
    },
    [pageFocus, queryClient],
  )

  const invalidateNotificheQueries = React.useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [...notificheQueryPrefix()] })
  }, [queryClient])

  useRealtimeRows(
    [...COMMENTI_REALTIME_TABLES],
    (event) => {
      if (!pageFocus) return
      const row = event.newRow ?? event.oldRow
      if (!scopeRowMatchesEntityRefs(row, watchedEntityRefs)) return
      invalidatePageQueries()
    },
    { enabled: Boolean(pageFocus) && watchedEntityRefs.length > 0 },
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
    onSettled: (_data, _error, input) => {
      invalidatePageQueries({
        entityType: input.anchorEntityType,
        entityId: input.anchorEntityId,
      })
      invalidateNotificheQueries()
    },
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
        sourceInterface: input.sourceInterface ?? options.sourceInterface ?? null,
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
    onSettled: () => {
      invalidatePageQueries(options.targetEntityRef)
      invalidateNotificheQueries()
    },
  })

  const editMutation = useMutation({
    mutationFn: (input: EditCommentVariables) => runTracked(editComment(input)),
    onSettled: () => invalidatePageQueries(options.targetEntityRef),
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
        sourceInterface: options.sourceInterface ?? null,
      })
    },
    [options.sourceInterface, pageFocus, replyMutation],
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
    sectionComments: activeListQuery.data?.comments ?? [],
    sectionNextCursor: activeListQuery.data?.nextCursor ?? null,
    sectionLoading: activeListQuery.isLoading,
    hasMoreSectionComments: Boolean(activeListQuery.data?.nextCursor),
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
