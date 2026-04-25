import { LoginView } from "@/components/auth/login-view"
import { AppShell } from "@/components/layout/app-shell"
import { DevKanbanPlayground } from "@/pages/dev-kanban-playground"
import { useAuthSession } from "@/hooks/use-auth-session"

function isDevKanbanRoute() {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("dev") === "kanban"
}

export function App() {
  const { loading, session, signIn, signOut } = useAuthSession()
  const devRoute = isDevKanbanRoute()

  if (loading) {
    return (
      <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
        Verifica sessione...
      </div>
    )
  }

  if (!session?.user) {
    return <LoginView onSignIn={signIn} />
  }

  // === DEV ROUTES — post-auth, rimovibile dopo test. ===
  if (devRoute) return <DevKanbanPlayground />
  // ======================================================

  return <AppShell user={session.user} onLogout={signOut} />
}

export default App
