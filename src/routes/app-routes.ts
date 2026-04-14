export type AnagraficheSidebarTab = "famiglie" | "processi" | "lavoratori"

export type MainSection =
  | "home"
  | "anagrafiche"
  | "crm_pipeline_famiglie"
  | "crm_assegnazione"
  | "ricerca_pipeline"
  | "lavoratori_cerca"
  | "gate_1"
  | "gate_2"
  | "gestione_contrattuale_rapporti"
  | "gestione_contrattuale_assunzioni"
  | "gestione_contrattuale_chiusure"
  | "gestione_contrattuale_variazioni"
  | "payroll_cedolini"
  | "payroll_contributi_inps"
  | "customer_support_customer_ticket"
  | "customer_support_payroll_ticket"

export type AppRoute = {
  mainSection: MainSection
  anagraficheTab: AnagraficheSidebarTab
  ricercaProcessId: string | null
}

export const DEFAULT_ROUTE: AppRoute = {
  mainSection: "home",
  anagraficheTab: "famiglie",
  ricercaProcessId: null,
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

export function resolveRouteStateFromPath(pathname: string): AppRoute {
  const relativePath = toRelativePath(pathname)
  const slug = relativePath.replace(/^\/+|\/+$/g, "")
  const parts = slug.split("/").filter(Boolean)
  const section = parts[0] ?? ""
  const detailId = parts[1] ? decodeURIComponent(parts[1]) : null

  if (slug === "home" || slug === "") {
    return {
      mainSection: "home",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "pipeline") {
    return {
      mainSection: "crm_pipeline_famiglie",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "assegnazione") {
    return {
      mainSection: "crm_assegnazione",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "cerca-lavoratori") {
    return {
      mainSection: "lavoratori_cerca",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (section === "ricerca") {
    return {
      mainSection: "ricerca_pipeline",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: detailId,
    }
  }

  if (slug === "gate-1") {
    return {
      mainSection: "gate_1",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "gate-2") {
    return {
      mainSection: "gate_2",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "gestione-contrattuale/rapporti-lavorativi") {
    return {
      mainSection: "gestione_contrattuale_rapporti",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "gestione-contrattuale/assunzioni") {
    return {
      mainSection: "gestione_contrattuale_assunzioni",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "gestione-contrattuale/chiusure") {
    return {
      mainSection: "gestione_contrattuale_chiusure",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "gestione-contrattuale/variazioni") {
    return {
      mainSection: "gestione_contrattuale_variazioni",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "payroll/cedolini") {
    return {
      mainSection: "payroll_cedolini",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "payroll/contributi-inps") {
    return {
      mainSection: "payroll_contributi_inps",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "customer-support/ticket-customer") {
    return {
      mainSection: "customer_support_customer_ticket",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "customer-support/ticket-payroll") {
    return {
      mainSection: "customer_support_payroll_ticket",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "famiglie" || slug === "processi" || slug === "lavoratori") {
    return {
      mainSection: "anagrafiche",
      anagraficheTab: slug,
      ricercaProcessId: null,
    }
  }

  return DEFAULT_ROUTE
}

export function buildPathForRoute(route: AppRoute) {
  const basePrefix = getBasePrefix()
  const slug = (() => {
    if (route.mainSection === "home") return "home"
    if (route.mainSection === "crm_pipeline_famiglie") return "pipeline"
    if (route.mainSection === "crm_assegnazione") return "assegnazione"
    if (route.mainSection === "ricerca_pipeline") {
      return route.ricercaProcessId
        ? `ricerca/${encodeURIComponent(route.ricercaProcessId)}`
        : "ricerca"
    }
    if (route.mainSection === "lavoratori_cerca") return "cerca-lavoratori"
    if (route.mainSection === "gate_1") return "gate-1"
    if (route.mainSection === "gate_2") return "gate-2"
    if (route.mainSection === "gestione_contrattuale_rapporti") {
      return "gestione-contrattuale/rapporti-lavorativi"
    }
    if (route.mainSection === "gestione_contrattuale_assunzioni") {
      return "gestione-contrattuale/assunzioni"
    }
    if (route.mainSection === "gestione_contrattuale_chiusure") {
      return "gestione-contrattuale/chiusure"
    }
    if (route.mainSection === "gestione_contrattuale_variazioni") {
      return "gestione-contrattuale/variazioni"
    }
    if (route.mainSection === "payroll_cedolini") return "payroll/cedolini"
    if (route.mainSection === "payroll_contributi_inps") return "payroll/contributi-inps"
    if (route.mainSection === "customer_support_customer_ticket") {
      return "customer-support/ticket-customer"
    }
    if (route.mainSection === "customer_support_payroll_ticket") {
      return "customer-support/ticket-payroll"
    }
    return route.anagraficheTab
  })()

  return `${basePrefix}/${slug}`
}
