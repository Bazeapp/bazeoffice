import * as React from "react"

import { UiGallery } from "@/components/ui-gallery"

function isUiRoute() {
  if (typeof window === "undefined") return false
  return /(?:^|\/)ui(?:\/|$)/.test(window.location.pathname)
}

const MainApp = React.lazy(() => import("@/main-app"))

export function App() {
  if (isUiRoute()) {
    return <UiGallery />
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
