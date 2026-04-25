import * as React from "react"

import { UiNextGallery } from "@/components/ui-next-gallery"

function isUiNextRoute() {
  if (typeof window === "undefined") return false
  return /(?:^|\/)ui-next(?:\/|$)/.test(window.location.pathname)
}

const MainApp = React.lazy(() => import("@/main-app"))

export function App() {
  if (isUiNextRoute()) {
    return <UiNextGallery />
  }

  return (
    <React.Suspense
      fallback={
        <div className="text-muted-foreground flex min-h-svh items-center justify-center text-sm">
          Caricamento...
        </div>
      }
    >
      <MainApp />
    </React.Suspense>
  )
}

export default App
