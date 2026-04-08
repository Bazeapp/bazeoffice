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
} from "@/routes/app-routes"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

type AppShellProps = {
  user: User
  onLogout: () => Promise<void>
}

function syncBrowserUrl(route: AppRoute, mode: "push" | "replace" = "push") {
  if (typeof window === "undefined") return
  const targetPath = buildPathForRoute(route)
  const currentPath = window.location.pathname

  if (currentPath === targetPath) return

  if (mode === "replace") {
    window.history.replaceState({}, "", targetPath)
    return
  }

  window.history.pushState({}, "", targetPath)
}

export function AppShell({ user, onLogout }: AppShellProps) {
  const initialRoute = React.useMemo(() => {
    if (typeof window === "undefined") return DEFAULT_ROUTE
    return resolveRouteStateFromPath(window.location.pathname)
  }, [])

  const [route, setRoute] = React.useState<AppRoute>(initialRoute)

  React.useEffect(() => {
    syncBrowserUrl(route, "replace")
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
    (processId: string) => {
      const nextRoute: AppRoute = {
        mainSection: "ricerca_pipeline",
        anagraficheTab: route.anagraficheTab,
        ricercaProcessId: processId,
      }

      setRoute(nextRoute)
      syncBrowserUrl(nextRoute)
    },
    [route.anagraficheTab]
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

  const handleOpenCustomerSupportPayrollTicket = React.useCallback(() => {
    const nextRoute: AppRoute = {
      mainSection: "customer_support_payroll_ticket",
      anagraficheTab: route.anagraficheTab,
      ricercaProcessId: null,
    }

    setRoute(nextRoute)
    syncBrowserUrl(nextRoute)
  }, [route.anagraficheTab])

  return (
    <SidebarProvider>
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
        onOpenCustomerSupportCustomerTicket={handleOpenCustomerSupportCustomerTicket}
        onOpenCustomerSupportPayrollTicket={handleOpenCustomerSupportPayrollTicket}
      />
      <SidebarInset>
        <main className="flex min-h-0 flex-1 min-w-0 p-3">
          <AppPageContent
            route={route}
            onOpenAnagraficheTab={handleOpenAnagraficheTab}
            onOpenRicercaDetail={handleOpenRicercaDetail}
            onOpenRicercaPipeline={handleOpenRicercaPipeline}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
