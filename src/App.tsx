import { LoginView } from "@/components/auth/login-view"
import { AppShell } from "@/components/layout/app-shell"
import { useAuthSession } from "@/hooks/use-auth-session"

export function App() {
  const { loading, session, signIn, signOut } = useAuthSession()

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

  return <AppShell user={session.user} onLogout={signOut} />
}

export default App
