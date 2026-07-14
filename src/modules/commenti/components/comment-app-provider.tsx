import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { CommentAppContext, type CommentRouteRegistration } from "../hooks/comment-app-context"
import { CommentContextProvider, type CommentContextValue } from "./comment-context-provider"

function resolveOperatorName(user: User): string {
  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""
  const base = metadataFullName || user.email?.split("@")[0] || "Operatore"
  return base.split(/\s+/)[0] || base
}

type RegistrationEntry = {
  ownerId: symbol
  value: CommentRouteRegistration
}

export function CommentAppProvider({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  const [registration, setRegistration] =
    React.useState<RegistrationEntry | null>(null)

  const register = React.useCallback(
    (ownerId: symbol, next: CommentRouteRegistration | null) => {
      setRegistration((current) => {
        if (next === null) {
          if (current?.ownerId === ownerId) return null
          return current
        }
        return { ownerId, value: next }
      })
    },
    [],
  )

  const value = React.useMemo((): CommentContextValue => {
    const base = {
      currentUserId: user.id,
      currentUserName: resolveOperatorName(user),
    }
    const route = registration?.value
    if (!route?.pageFocus) {
      return {
        ...base,
        pageFocus: null,
        row: {},
        sourceInterface: null,
      }
    }
    return {
      ...base,
      ...route,
    }
  }, [registration, user])

  const appContext = React.useMemo(
    () => ({
      register,
    }),
    [register],
  )

  return (
    <CommentAppContext.Provider value={appContext}>
      <CommentContextProvider value={value}>{children}</CommentContextProvider>
    </CommentAppContext.Provider>
  )
}
