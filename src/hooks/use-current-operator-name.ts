import { useAuthSession } from "@/hooks/use-auth-session"

/**
 * Display name of the currently logged-in operator, used to stamp recruiter
 * feedback entries (`[Nome - gg/mm/aaaa]`). Mirrors the source the sidebar
 * uses (`user_metadata.full_name`), falling back to the email local-part.
 */
export function useCurrentOperatorName(): string {
  const { session } = useAuthSession()
  const user = session?.user

  const metadataFullName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""

  const base = metadataFullName || user?.email?.split("@")[0] || "Operatore"

  // Operators historically sign with the first name only ("[Francesca - ...]").
  return base.split(/\s+/)[0] || base
}
