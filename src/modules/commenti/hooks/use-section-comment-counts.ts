import { useQueries } from "@tanstack/react-query"
import * as React from "react"

import {
  commentDescendantsCountQueryKey,
  commentSectionCountQueryKey,
} from "../lib/query-keys"
import { sectionListScopePage } from "../lib/section-list-scope"
import { collectStackAnchorExclusions } from "../lib/stack-anchor-exclusions"
import { fetchDescendantsCommentCount } from "../queries/fetch-descendants-comment-count"
import { fetchCommentSectionCount } from "../queries/fetch-section-comment-count"
import type { CommentSection, ResolveCommentStackResult } from "../types/section"
import type { EntityRef } from "../types/entity"

export function useSectionCommentCounts(
  pageFocus: EntityRef,
  stack: ResolveCommentStackResult,
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
    queries: countableSections.map((section) => ({
      queryKey: commentSectionCountQueryKey(pageFocus, section.entityRef),
      queryFn: () => {
        const listPage = sectionListScopePage(section.entityRef)
        return fetchCommentSectionCount({
          pageEntityType: listPage.entityType,
          pageEntityId: listPage.entityId,
          sectionEntityType: section.entityRef.entityType,
          sectionEntityId: section.entityRef.entityId,
        })
      },
    })),
  })

  const descendantsQuery = useQueries({
    queries: [
      {
        queryKey: commentDescendantsCountQueryKey(pageFocus, excludeAnchors),
        queryFn: () =>
          fetchDescendantsCommentCount({
            pageEntityType: pageFocus.entityType,
            pageEntityId: pageFocus.entityId,
            excludeAnchors,
          }),
        enabled: Boolean(descendantsSection),
      },
    ],
  })

  return React.useMemo(() => {
    const counts: Record<string, number> = {}
    const loading: Record<string, boolean> = {}

    countableSections.forEach((section, index) => {
      const query = sectionQueries[index]
      counts[section.id] = query?.data ?? 0
      loading[section.id] = query?.isLoading ?? true
    })

    if (descendantsSection) {
      const query = descendantsQuery[0]
      counts[descendantsSection.id] = query?.data ?? 0
      loading[descendantsSection.id] = query?.isLoading ?? true
    }

    return { counts, loading }
  }, [countableSections, descendantsQuery, descendantsSection, sectionQueries])
}
