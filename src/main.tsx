import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { TooltipProvider } from "@/components/ui-next/tooltip"
import { Toaster } from "@/components/ui-next/sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <App />
      <Toaster richColors closeButton position="top-right" />
    </TooltipProvider>
  </StrictMode>
)
