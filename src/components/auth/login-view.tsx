import * as React from "react"
import { LogInIcon } from "lucide-react"

import { Button } from "@/components/ui-next/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui-next/card"
import { Input } from "@/components/ui-next/input"
import { Label } from "@/components/ui-next/label"

type LoginViewProps = {
  onSignIn: (email: string, password: string) => Promise<void>
}

export function LoginView({ onSignIn }: LoginViewProps) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!email.trim() || !password.trim()) {
      setError("Inserisci email e password")
      return
    }

    setSubmitting(true)
    try {
      await onSignIn(email.trim(), password)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "Errore login non gestito"
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accedi al backoffice</CardTitle>
          <CardDescription>
            Usa le tue credenziali Supabase Auth.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@azienda.it"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              <LogInIcon />
              {submitting ? "Accesso in corso..." : "Accedi"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
