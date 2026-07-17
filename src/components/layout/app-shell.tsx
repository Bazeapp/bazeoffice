import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppPageContent } from "@/pages/app-pages"
import {
  DEFAULT_ROUTE,
  buildPathForRoute,
  resolveRouteStateFromPath,
  type AnagraficheSidebarTab,
  type AppRoute,
  type OpenRicercaDetailOptions,
} from "@/routes/app-routes"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { CommentAppProvider, CommentPanelHost } from "@/modules/commenti/components"
import { fetchCommentNavigation } from "@/modules/notifiche/queries"
import {
  applyRoutePatch,
  buildUrlWithComment,
  notifyCommentDeepLink,
  routePatchFromCommentNavigation,
} from "@/modules/notifiche/lib/entity-route-map"
import type { Notifica } from "@/modules/notifiche/types"

type AppShellProps = {
  user: User
  onLogout: () => Promise<void>
}

function syncBrowserUrl(
  route: AppRoute,
  mode: "push" | "replace" = "push",
  search: string = "",
) {
  if (typeof window === "undefined") return
  const targetPath = buildPathForRoute(route)
  const targetUrl = `${targetPath}${search}`
  const currentUrl = `${window.location.pathname}${window.location.search}`

  if (currentUrl === targetUrl) return

  if (mode === "replace") {
    window.history.replaceState({}, "", targetUrl)
    return
  }

  window.history.pushState({}, "", targetUrl)
}

type AppShellMainProps = React.ComponentProps<typeof AppPageContent>

function AppShellMain(props: AppShellMainProps) {
  return (
    <main className="scrollbar-hidden flex min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <React.Suspense
          fallback={
            <div className="flex min-h-60 flex-1 items-center justify-center rounded-2xl border border-border/60 bg-background/80 px-6 py-10 text-sm text-muted-foreground shadow-sm">
              Caricamento pagina...
            </div>
          }
        >
          <AppPageContent {...props} />
        </React.Suspense>
      </div>
    </main>
  )
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const initialRoute = React.useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_ROUTE
    return resolveRouteStateFromPath(window.location.pathname)
  }, [])

  const [route, setRoute] = React.useState<AppRoute>(initialRoute)
  const ricercaDetailReturnRouteRef = React.useRef<AppRoute | null>(null)

  React.useEffect(() => {
    // Preserve ?comment= (and any other search) across pathname-only route sync.
    syncBrowserUrl(route, "replace", window.location.search)
  }, [route])

  React.useEffect(() => {
    const handlePopState = () => {
      setRoute(resolveRouteStateFromPath(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  const handleOpenAnagraficheTab = React.useCallback(
    (tab: AnagraficheSidebarTab) => {
      const nextRoute: AppRoute = {
        mainSection: "anagrafiche",
        anagraficheTab: tab,
        ricercaProcessId: null,
      }

      setRoute(nextRoute)
      syncBrowserUrl(nextRoute)
    },
    []
  )

  const handleOpenCrmPipelineFamiglie = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "crm_pipeline_famiglie",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenCrmAssegnazione = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "crm_assegnazione",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenLavoratoriCerca = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "lavoratori_cerca",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenRicercaPipeline = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "ricerca_pipeline",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenRicercaDetail = React.useCallback(
    (processId: string, options?: OpenRicercaDetailOptions) => {
      if (route.mainSection === "lavoratori_cerca" || options?.returnToWorkerId) {
        ricercaDetailReturnRouteRef.current = {
          mainSection: "lavoratori_cerca",
          anagraficheTab: route.anagraficheTab,
          ricercaProcessId: null,
          selectedWorkerId: options?.returnToWorkerId ?? route.selectedWorkerId ?? null,
        }
      } else {
        ricercaDetailReturnRouteRef.current = null
      }

      const nextRoute: AppRoute = {
        mainSection: "ricerca_pipeline",
        anagraficheTab: route.anagraficheTab,
        ricercaProcessId: processId,
      }

      setRoute(nextRoute)
      syncBrowserUrl(nextRoute)
    },
    [route.anagraficheTab, route.mainSection, route.selectedWorkerId]
  )

  const handleBackFromRicercaDetail = React.useCallback(() => {
    const returnRoute = ricercaDetailReturnRouteRef.current
    ricercaDetailReturnRouteRef.current = null

    if (returnRoute) {
      setRoute(returnRoute)
      syncBrowserUrl(returnRoute)
      return
    }

    handleOpenRicercaPipeline()
  }, [handleOpenRicercaPipeline])

  const handleOpenRelatedRicerca = React.useCallback(
    (nextProcessId: string, nextSelectionId: string) => {
      // BAZ-19: la navigazione verso una ricerca correlata passa dallo shell e
      // fa un push ESPLICITO (come handleOpenRicercaDetail), così il Back del
      // browser torna alla ricerca precedente con la selezione focalizzata,
      // invece che alla pipeline. NON tocca ricercaDetailReturnRouteRef.
      const nextRoute: AppRoute = {
        mainSection: "ricerca_pipeline",
        anagraficheTab: route.anagraficheTab,
        ricercaProcessId: nextProcessId,
        ricercaSelectionId: nextSelectionId,
      }

      setRoute(nextRoute)
      syncBrowserUrl(nextRoute, "push")
    },
    [route.anagraficheTab]
  )

  const handleFocusRicercaSelection = React.useCallback(
    (selectionId: string | null) => {
      // BAZ-19: annota la URL corrente con la selezione (lavoratore) focalizzata
      // così il Back la può ripristinare. Solo setRoute: l'effect globale
      // [route] sincronizza in "replace" (nessuna nuova entry di history).
      setRoute((prev) => {
        if (prev.mainSection !== "ricerca_pipeline") return prev
        if ((prev.ricercaSelectionId ?? null) === (selectionId ?? null)) return prev
        return { ...prev, ricercaSelectionId: selectionId }
      })
    },
    []
  )

  const handleSelectRapporto = React.useCallback(
    (rapportoId: string | null) => {
      // Annota la URL del board rapporti con il rapporto aperto (replace, nessuna
      // nuova entry di history) così il Back del browser — es. dopo il deep-link
      // "Datore" verso Assunzioni — ripristina il rapporto che era aperto invece
      // del board vuoto. Stesso pattern di handleFocusRicercaSelection.
      setRoute((prev) => {
        if (prev.mainSection !== "gestione_contrattuale_rapporti") return prev
        if ((prev.selectedRapportoId ?? null) === (rapportoId ?? null)) return prev
        return { ...prev, selectedRapportoId: rapportoId }
      })
    },
    []
  )

  const handleOpenGate1 = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gate_1",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenGate2 = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gate_2",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenGestioneContrattualeRapporti = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gestione_contrattuale_rapporti",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenGestioneContrattualeAssunzioni = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gestione_contrattuale_assunzioni",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenGestioneContrattualeChiusure = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gestione_contrattuale_chiusure",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenGestioneContrattualeVariazioni = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "gestione_contrattuale_variazioni",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenPayrollCedolini = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "payroll_cedolini",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenPayrollContributiInps = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "payroll_contributi_inps",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenCustomerSupportCustomerTicket = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "customer_support_customer_ticket",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenProveColloqui = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "prove_colloqui",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenCustomerSupportPayrollTicket = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "customer_support_payroll_ticket",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenCustomerSupportRiattivazioni = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "customer_support_riattivazioni",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  const handleOpenNotifica = React.useCallback(
    (notifica: Notifica) => {
      void (async () => {
        const navigation = await fetchCommentNavigation(notifica.commentId)
        if (!navigation) return
        const patch = routePatchFromCommentNavigation(navigation)
        const nextRoute = applyRoutePatch(route, patch)
        setRoute(nextRoute)
        const path = buildPathForRoute(nextRoute)
        const withComment = buildUrlWithComment(path, notifica.commentId)
        const search = withComment.includes("?")
          ? withComment.slice(withComment.indexOf("?"))
          : ""
        syncBrowserUrl(nextRoute, "push", search)
        notifyCommentDeepLink(notifica.commentId)
      })()
    },
    [route],
  )

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar
        user={user}
        onLogout={onLogout}
        activeMainSection={route.mainSection}
        activeAnagraficheTab={route.anagraficheTab}
        onOpenAnagraficheTab={handleOpenAnagraficheTab}
        onOpenCrmPipelineFamiglie={handleOpenCrmPipelineFamiglie}
        onOpenCrmAssegnazione={handleOpenCrmAssegnazione}
        onOpenRicercaPipeline={handleOpenRicercaPipeline}
        onOpenLavoratoriCerca={handleOpenLavoratoriCerca}
        onOpenGate1={handleOpenGate1}
        onOpenGate2={handleOpenGate2}
        onOpenGestioneContrattualeRapporti={handleOpenGestioneContrattualeRapporti}
        onOpenGestioneContrattualeAssunzioni={handleOpenGestioneContrattualeAssunzioni}
        onOpenGestioneContrattualeChiusure={handleOpenGestioneContrattualeChiusure}
        onOpenGestioneContrattualeVariazioni={handleOpenGestioneContrattualeVariazioni}
        onOpenPayrollCedolini={handleOpenPayrollCedolini}
        onOpenPayrollContributiInps={handleOpenPayrollContributiInps}
        onOpenProveColloqui={handleOpenProveColloqui}
        onOpenCustomerSupportCustomerTicket={handleOpenCustomerSupportCustomerTicket}
        onOpenCustomerSupportPayrollTicket={handleOpenCustomerSupportPayrollTicket}
        onOpenCustomerSupportRiattivazioni={handleOpenCustomerSupportRiattivazioni}
        onOpenNotifica={handleOpenNotifica}
      />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <CommentAppProvider user={user}>
          <AppShellMain
            route={route}
            onOpenAnagraficheTab={handleOpenAnagraficheTab}
            onOpenRicercaDetail={handleOpenRicercaDetail}
            onBackFromRicercaDetail={handleBackFromRicercaDetail}
            onOpenRelatedRicerca={handleOpenRelatedRicerca}
            onFocusRicercaSelection={handleFocusRicercaSelection}
            onSelectRapporto={handleSelectRapporto}
          />
          <CommentPanelHost />
        </CommentAppProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}
