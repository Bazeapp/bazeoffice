import { useQueries } from "@tanstack/react-query"
import * as React from "react"

import {
  commentDescendantsQueryKey,
  commentSectionQueryKey,
} from "../lib/query-keys"
import { collectStackAnchorExclusions } from "../lib/stack-anchor-exclusions"
import { sectionHasUnreadComments } from "../lib/section-unread"
import { fetchDescendantsCommentPage } from "../queries/fetch-descendants-comments"
import { fetchCommentSectionPage } from "../queries/fetch-section-comments"
import type { CommentSection, ResolveCommentStackResult } from "../types/section"
import type { EntityRef } from "../types/entity"

export function useSectionUnreadFlags(
  pageFocus: EntityRef,
  stack: ResolveCommentStackResult,
  sectionCounts: Record<string, number>,
  sectionCountsLoading: Record<string, boolean>,
) {
  const excludeAnchors = React.useMemo(
    () => collectStackAnchorExclusions(stack),
    [stack],
  )

  const countableSections = React.useMemo(
    () =>
      stack.sections.filter(
        (section): section is CommentSection & { entityRef: EntityRef } =>
          section.entityRef !== null,
      ),
    [stack.sections],
  )

  const descendantsSection = React.useMemo(
    () => stack.sections.find((section) => section.kind === "descendants"),
    [stack.sections],
  )

  const sectionQueries = useQueries({
    queries: countableSections.map((section) => {
      const count = sectionCounts[section.id] ?? 0
      const countLoading = sectionCountsLoading[section.id] ?? true

      return {
        queryKey: commentSectionQueryKey(pageFocus, section.entityRef),
        queryFn: () =>
          fetchCommentSectionPage({
            pageEntityType: pageFocus.entityType,
            pageEntityId: pageFocus.entityId,
            sectionEntityType: section.entityRef.entityType,
            sectionEntityId: section.entityRef.entityId,
          }),
        enabled: !countLoading && count > 0,
        select: (data: Awaited<ReturnType<typeof fetchCommentSectionPage>>) =>
          sectionHasUnreadComments(data.comments),
      }
    }),
  })

  const descendantsQuery = useQueries({
    queries: [
      {
        queryKey: commentDescendantsQueryKey(pageFocus, excludeAnchors),
        queryFn: () =>
          fetchDescendantsCommentPage({
            pageEntityType: pageFocus.entityType,
            pageEntityId: pageFocus.entityId,
            excludeAnchors,
          }),
        enabled: Boolean(
          descendantsSection &&
            !(sectionCountsLoading[descendantsSection.id] ?? true) &&
            (sectionCounts[descendantsSection.id] ?? 0) > 0,
        ),
        select: (data: Awaited<ReturnType<typeof fetchDescendantsCommentPage>>) =>
          sectionHasUnreadComments(data.comments),
      },
    ],
  })

  return React.useMemo(() => {
    const flags: Record<string, boolean> = {}
    const loading: Record<string, boolean> = {}

    countableSections.forEach((section, index) => {
      const count = sectionCounts[section.id] ?? 0
      const countLoading = sectionCountsLoading[section.id] ?? true
      const query = sectionQueries[index]

      if (countLoading || count === 0) {
        flags[section.id] = false
        loading[section.id] = countLoading
        return
      }

      flags[section.id] = query?.data ?? false
      loading[section.id] = query?.isLoading ?? true
    })

    if (descendantsSection) {
      const count = sectionCounts[descendantsSection.id] ?? 0
      const countLoading = sectionCountsLoading[descendantsSection.id] ?? true
      const query = descendantsQuery[0]

      if (countLoading || count === 0) {
        flags[descendantsSection.id] = false
        loading[descendantsSection.id] = countLoading
      } else {
        flags[descendantsSection.id] = query?.data ?? false
        loading[descendantsSection.id] = query?.isLoading ?? true
      }
    }

    return { flags, loading }
  }, [
    countableSections,
    descendantsQuery,
    descendantsSection,
    sectionCounts,
    sectionCountsLoading,
    sectionQueries,
  ])
}
