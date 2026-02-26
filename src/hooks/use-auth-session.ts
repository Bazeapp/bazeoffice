import * as React from "react"
import type { Session } from "@supabase/supabase-js"

import { supabase } from "@/lib/supabase-client"

type UseAuthSessionState = {
  loading: boolean
  session: Session | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export function useAuthSession(): UseAuthSessionState {
  const [session, setSession] = React.useState<Session | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let isMounted = true

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setSession(null)
        setLoading(false)
        return
      }

      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = React.useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }
  }, [])

  const signOut = React.useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }, [])

  return {
    loading,
    session,
    signIn,
    signOut,
  }
}
