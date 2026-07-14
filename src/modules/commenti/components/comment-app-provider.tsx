import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { CommentAppContext, type CommentRouteRegistration } from "../hooks/comment-app-context"
import { CommentContextProvider, type CommentContextValue } from "./comment-context-provider"

const EMPTY_ANCHOR_REF = { current: null } as React.RefObject<HTMLDivElement | null>

function resolveOperatorName(user: User): string {
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""
  const base = metadataFullName || user.email?.split("@")[0] || "Operatore"
  return base.split(/\s+/)[0] || base
}

export function CommentAppProvider({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  const [registration, setRegistration] =
    React.useState<CommentRouteRegistration | null>(null)

  const value = React.useMemo((): CommentContextValue => {
    const base = {
      currentUserId: user.id,
      currentUserName: resolveOperatorName(user),
    }
    if (!registration?.pageFocus) {
      return {
        ...base,
        pageFocus: null,
        row: {},
        sourceInterface: null,
        anchorRef: EMPTY_ANCHOR_REF,
      }
    }
    return {
      ...base,
      ...registration,
    }
  }, [registration, user])

  const appContext = React.useMemo(
    () => ({
      register: setRegistration,
    }),
    [],
  )

  return (
    <CommentAppContext.Provider value={appContext}>
      <CommentContextProvider value={value}>{children}</CommentContextProvider>
    </CommentAppContext.Provider>
  )
}
