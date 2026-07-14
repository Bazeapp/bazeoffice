import * as React from "react"

import type { CommentType, PhaseLabel, SourceInterface } from "../types/comment"
import type { EntityRef } from "../types/entity"
import { CommentAppContext } from "./comment-app-context"

export type UseCommentRouteContextOptions = {
  enabled: boolean
  pageFocus: EntityRef | null
  row: Record<string, unknown>
  sourceInterface: SourceInterface | null
  displayNames?: Record<string, string>
  defaultCommentType?: CommentType
  phaseLabel?: PhaseLabel | null
}

export function useCommentRouteContext(options: UseCommentRouteContextOptions) {
  const appContext = React.use(CommentAppContext)
  const optionsRef = React.useRef(options)
  const ownerIdRef = React.useRef<symbol | null>(null)
  if (!ownerIdRef.current) {
    ownerIdRef.current = Symbol("comment-route-context")
  }

  React.useEffect(() => {
    optionsRef.current = options
  })

  const focusKey = options.pageFocus
    ? `${options.pageFocus.entityType}:${options.pageFocus.entityId}`
    : null
  const displayNamesKey = options.displayNames
    ? JSON.stringify(options.displayNames)
    : ""

  React.useEffect(() => {
    if (!appContext) return

    const { register } = appContext
    const ownerId = ownerIdRef.current!
    const current = optionsRef.current
    if (!current.enabled || !current.pageFocus) {
      return
    }

    register(ownerId, {
      pageFocus: current.pageFocus,
      row: current.row,
      sourceInterface: current.sourceInterface,
      displayNames: current.displayNames,
      defaultCommentType: current.defaultCommentType,
      phaseLabel: current.phaseLabel,
    })

    return () => {
      register(ownerId, null)
    }
  }, [
    appContext,
    displayNamesKey,
    focusKey,
    options.defaultCommentType,
    options.enabled,
    options.phaseLabel,
    options.sourceInterface,
  ])
}
