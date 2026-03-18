import * as React from "react"
import type { User } from "@supabase/supabase-js"

import { AnagraficheTablesView } from "@/components/anagrafiche/anagrafiche-tables-view"
import { CrmAssegnazioneView } from "@/components/crm/crm-assegnazione-view"
import { CrmPipelineFamiglieView } from "@/components/crm/crm-pipeline-famiglie-view"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Gate1View } from "@/components/lavoratori/gate1-view"
import { Gate2View } from "@/components/lavoratori/gate2-view"
import { LavoratoriCercaView } from "@/components/lavoratori/lavoratori-cerca-view"
import { RicercaBoardView } from "@/components/ricerca/ricerca-board-view"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type AppShellProps = {
  user: User
  onLogout: () => Promise<void>
}

type AnagraficheSidebarTab = "famiglie" | "processi" | "lavoratori"
type MainSection =
  | "anagrafiche"
  | "crm_pipeline_famiglie"
  | "crm_assegnazione"
  | "ricerca_pipeline"
  | "lavoratori_cerca"
  | "gate_1"
  | "gate_2"

type RouteState = {
  mainSection: MainSection
  anagraficheTab: AnagraficheSidebarTab
}

const DEFAULT_ROUTE: RouteState = {
  mainSection: "anagrafiche",
  anagraficheTab: "famiglie",
}

function getBasePrefix() {
  const rawBase = import.meta.env.BASE_URL || "/"
  const normalized = rawBase.endsWith("/") ? rawBase.slice(0, -1) : rawBase
  return normalized === "/" ? "" : normalized
}

function toRelativePath(pathname: string) {
  const basePrefix = getBasePrefix()
  if (basePrefix && pathname.startsWith(basePrefix)) {
    const relative = pathname.slice(basePrefix.length)
    return relative || "/"
  }
  return pathname
}

function resolveRouteStateFromPath(pathname: string): RouteState {
  const relativePath = toRelativePath(pathname)
  const slug = relativePath.replace(/^\/+|\/+$/g, "")

  if (slug === "pipeline") {
    return {
      mainSection: "crm_pipeline_famiglie",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "assegnazione") {
    return {
      mainSection: "crm_assegnazione",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "cerca-lavoratori") {
    return {
      mainSection: "lavoratori_cerca",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "ricerca") {
    return {
      mainSection: "ricerca_pipeline",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "gate-1") {
    return {
      mainSection: "gate_1",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "gate-2") {
    return {
      mainSection: "gate_2",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
    }
  }

  if (slug === "famiglie" || slug === "processi" || slug === "lavoratori") {
    return {
      mainSection: "anagrafiche",
      anagraficheTab: slug,
    }
  }

  return DEFAULT_ROUTE
}

function buildPathForRoute(route: RouteState) {
  const basePrefix = getBasePrefix()
  const slug = (() => {
    if (route.mainSection === "crm_pipeline_famiglie") return "pipeline"
    if (route.mainSection === "crm_assegnazione") return "assegnazione"
    if (route.mainSection === "ricerca_pipeline") return "ricerca"
    if (route.mainSection === "lavoratori_cerca") return "cerca-lavoratori"
    if (route.mainSection === "gate_1") return "gate-1"
    if (route.mainSection === "gate_2") return "gate-2"
    return route.anagraficheTab
  })()
  return `${basePrefix}/${slug}`
}

function syncBrowserUrl(route: RouteState, mode: "push" | "replace" = "push") {
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

  const [activeAnagraficheTab, setActiveAnagraficheTab] =
    React.useState<AnagraficheSidebarTab>(initialRoute.anagraficheTab)
  const [activeMainSection, setActiveMainSection] =
    React.useState<MainSection>(initialRoute.mainSection)

  React.useEffect(() => {
    syncBrowserUrl(
      {
        mainSection: activeMainSection,
        anagraficheTab: activeAnagraficheTab,
      },
      "replace"
    )
  }, [])

  React.useEffect(() => {
    const handlePopState = () => {
      const next = resolveRouteStateFromPath(window.location.pathname)
      setActiveMainSection(next.mainSection)
      setActiveAnagraficheTab(next.anagraficheTab)
    }

    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  const handleOpenAnagraficheTab = React.useCallback(
    (tab: AnagraficheSidebarTab) => {
      setActiveAnagraficheTab(tab)
      setActiveMainSection("anagrafiche")
      syncBrowserUrl({
        mainSection: "anagrafiche",
        anagraficheTab: tab,
      })
    },
    []
  )

  const handleOpenCrmPipelineFamiglie = React.useCallback(() => {
    setActiveMainSection("crm_pipeline_famiglie")
    syncBrowserUrl({
      mainSection: "crm_pipeline_famiglie",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  const handleOpenCrmAssegnazione = React.useCallback(() => {
    setActiveMainSection("crm_assegnazione")
    syncBrowserUrl({
      mainSection: "crm_assegnazione",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  const handleOpenLavoratoriCerca = React.useCallback(() => {
    setActiveMainSection("lavoratori_cerca")
    syncBrowserUrl({
      mainSection: "lavoratori_cerca",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  const handleOpenRicercaPipeline = React.useCallback(() => {
    setActiveMainSection("ricerca_pipeline")
    syncBrowserUrl({
      mainSection: "ricerca_pipeline",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  const handleOpenGate1 = React.useCallback(() => {
    setActiveMainSection("gate_1")
    syncBrowserUrl({
      mainSection: "gate_1",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  const handleOpenGate2 = React.useCallback(() => {
    setActiveMainSection("gate_2")
    syncBrowserUrl({
      mainSection: "gate_2",
      anagraficheTab: activeAnagraficheTab,
    })
  }, [activeAnagraficheTab])

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        onLogout={onLogout}
        activeMainSection={activeMainSection}
        activeAnagraficheTab={activeAnagraficheTab}
        onOpenAnagraficheTab={handleOpenAnagraficheTab}
        onOpenCrmPipelineFamiglie={handleOpenCrmPipelineFamiglie}
        onOpenCrmAssegnazione={handleOpenCrmAssegnazione}
        onOpenRicercaPipeline={handleOpenRicercaPipeline}
        onOpenLavoratoriCerca={handleOpenLavoratoriCerca}
        onOpenGate1={handleOpenGate1}
        onOpenGate2={handleOpenGate2}
      />
      <SidebarInset>
        <header className="flex h-14 items-start gap-2 border-b px-4 pt-2">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-9" />
          {activeMainSection === "crm_pipeline_famiglie" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Pipeline CRM</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Gestisci i tuoi contatti con drag & drop
              </p>
            </div>
          ) : activeMainSection === "crm_assegnazione" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Assegnazione</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Assegna le ricerche da pianificare nei giorni del calendario.
              </p>
            </div>
          ) : activeMainSection === "ricerca_pipeline" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Ricerca</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Vista a colonne delle ricerche organizzate per stato RES.
              </p>
            </div>
          ) : activeMainSection === "lavoratori_cerca" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Cerca Lavoratori</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Seleziona un lavoratore dalla lista e apri la sua scheda.
              </p>
            </div>
          ) : activeMainSection === "gate_1" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Gate 1</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Screening iniziale con verifica idoneita e controllo dati essenziali.
              </p>
            </div>
          ) : activeMainSection === "gate_2" ? (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Gate 2</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Revisione dei lavoratori idonei con la stessa scheda operativa del gate 1.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <h1 className="text-base leading-none font-semibold">Anagrafiche</h1>
              <p className="text-muted-foreground text-xs leading-none">
                Vista tabellare completa con tutte le colonne disponibili.
              </p>
            </div>
          )}
        </header>

        <main className="flex-1 min-w-0 p-4">
          {activeMainSection === "crm_pipeline_famiglie" ? (
            <CrmPipelineFamiglieView />
          ) : activeMainSection === "crm_assegnazione" ? (
            <CrmAssegnazioneView />
          ) : activeMainSection === "ricerca_pipeline" ? (
            <RicercaBoardView />
          ) : activeMainSection === "lavoratori_cerca" ? (
            <LavoratoriCercaView />
          ) : activeMainSection === "gate_1" ? (
            <Gate1View showStepper />
          ) : activeMainSection === "gate_2" ? (
            <Gate2View />
          ) : (
            <AnagraficheTablesView
              activeTab={activeAnagraficheTab}
              onActiveTabChange={handleOpenAnagraficheTab}
            />
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
