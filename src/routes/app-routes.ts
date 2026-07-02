export type AnagraficheSidebarTab =
  | "famiglie"
  | "processi"
  | "lavoratori"
  | "mesi_lavorati"
  | "pagamenti"
  | "selezioni_lavoratori"
  | "rapporti_lavorativi"

export type MainSection =
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
  | "prove_colloqui"
  | "customer_support_customer_ticket"
  | "customer_support_payroll_ticket"
  | "customer_support_riattivazioni"

export type AppRoute = {
  mainSection: MainSection
  anagraficheTab: AnagraficheSidebarTab
  ricercaProcessId: string | null
  selectedRapportoId?: string | null
  selectedWorkerId?: string | null
  // BAZ-20: id del rapporto_lavorativo selezionato nel board Assunzioni.
  // Il board Assunzioni è indicizzato per `rapporti_lavorativi.id` (la card ha
  // `id === rapporto.id`), quindi questo campo trasporta un id di rapporto, non
  // un id della tabella `assunzioni`.
  selectedAssunzioneRapportoId?: string | null
  // BAZ-19: id della selezione (selezioni_lavoratori) focalizzata nel dettaglio
  // ricerca, codificato nella URL per ripristinare la riga al Back del browser.
  ricercaSelectionId?: string | null
}

export type OpenRicercaDetailOptions = {
  returnToWorkerId?: string | null
}

export const DEFAULT_ROUTE: AppRoute = {
  mainSection: "anagrafiche",
  anagraficheTab: "famiglie",
  ricercaProcessId: null,
  selectedRapportoId: null,
  selectedWorkerId: null,
  selectedAssunzioneRapportoId: null,
  ricercaSelectionId: null,
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

  if (section === "cerca-lavoratori") {
    return {
      mainSection: "lavoratori_cerca",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
      selectedWorkerId: detailId,
    }
  }

  if (section === "ricerca") {
    return {
      mainSection: "ricerca_pipeline",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: detailId,
      // BAZ-19: 3° segmento opzionale = id della selezione focalizzata.
      ricercaSelectionId: parts[2] ? decodeURIComponent(parts[2]) : null,
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

  if (section === "gestione-contrattuale" && parts[1] === "rapporti-lavorativi") {
    return {
      mainSection: "gestione_contrattuale_rapporti",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
      selectedRapportoId: parts[2] ? decodeURIComponent(parts[2]) : null,
    }
  }

  if (section === "gestione-contrattuale" && parts[1] === "assunzioni") {
    return {
      mainSection: "gestione_contrattuale_assunzioni",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
      // BAZ-20: parts[2] è un id di rapporti_lavorativi (board indicizzato per rapporto id).
      selectedAssunzioneRapportoId: parts[2] ? decodeURIComponent(parts[2]) : null,
    }
  }

  if (slug === "gestione-contrattuale/chiusure") {
    return {
      mainSection: "gestione_contrattuale_chiusure",
      anagraficheTab: DEFAULT_ROUTE.anagraficheTab,
      ricercaProcessId: null,
    }
  }

  if (slug === "customer-support/riattivazioni" || slug === "gestione-contrattuale/riattivazioni") {
    return {
      mainSection: "customer_support_riattivazioni",
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

  if (slug === "customer-support/prove-e-colloqui") {
    return {
      mainSection: "prove_colloqui",
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

  if (
    slug === "famiglie" ||
    slug === "processi" ||
    slug === "lavoratori" ||
    slug === "mesi_lavorati" ||
    slug === "pagamenti" ||
    slug === "selezioni_lavoratori" ||
    slug === "rapporti_lavorativi"
  ) {
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
    if (route.mainSection === "crm_pipeline_famiglie") return "pipeline"
    if (route.mainSection === "crm_assegnazione") return "assegnazione"
    if (route.mainSection === "ricerca_pipeline") {
      if (!route.ricercaProcessId) return "ricerca"
      // BAZ-19: codifica la selezione focalizzata come 3° segmento.
      return route.ricercaSelectionId
        ? `ricerca/${encodeURIComponent(route.ricercaProcessId)}/${encodeURIComponent(route.ricercaSelectionId)}`
        : `ricerca/${encodeURIComponent(route.ricercaProcessId)}`
    }
    if (route.mainSection === "lavoratori_cerca") {
      return route.selectedWorkerId
        ? `cerca-lavoratori/${encodeURIComponent(route.selectedWorkerId)}`
        : "cerca-lavoratori"
    }
    if (route.mainSection === "gate_1") return "gate-1"
    if (route.mainSection === "gate_2") return "gate-2"
    if (route.mainSection === "gestione_contrattuale_rapporti") {
      return route.selectedRapportoId
        ? `gestione-contrattuale/rapporti-lavorativi/${encodeURIComponent(route.selectedRapportoId)}`
        : "gestione-contrattuale/rapporti-lavorativi"
    }
    if (route.mainSection === "gestione_contrattuale_assunzioni") {
      // BAZ-20: il segmento id è un id di rapporti_lavorativi (board indicizzato per rapporto id).
      return route.selectedAssunzioneRapportoId
        ? `gestione-contrattuale/assunzioni/${encodeURIComponent(route.selectedAssunzioneRapportoId)}`
        : "gestione-contrattuale/assunzioni"
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
    if (route.mainSection === "prove_colloqui") {
      return "customer-support/prove-e-colloqui"
    }
    if (route.mainSection === "customer_support_payroll_ticket") {
      return "customer-support/ticket-payroll"
    }
    if (route.mainSection === "customer_support_riattivazioni") {
      return "customer-support/riattivazioni"
    }
    return route.anagraficheTab
  })()

  return `${basePrefix}/${slug}`
}
