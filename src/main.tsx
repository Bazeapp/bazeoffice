import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"

const tree = (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <App />
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
    {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
  </QueryClientProvider>
)

// StrictMode raddoppia gli effect in dev per scovare bug di cleanup/effect
// (utile per la classe realtime/draft). Resta ATTIVO di default. Per ispezionare
// il Network tab senza chiamate doppiate, in dev: VITE_DISABLE_STRICT_MODE=true
// nel .env.local. In produzione StrictMode non raddoppia comunque.
const disableStrictMode =
  import.meta.env.DEV && import.meta.env.VITE_DISABLE_STRICT_MODE === "true"

createRoot(document.getElementById("root")!).render(
  disableStrictMode ? tree : <StrictMode>{tree}</StrictMode>
)
