import * as React from "react"
import type { AppRoute } from "@/routes/app-routes"

const AnagrafichePage = React.lazy(async () => {
  const module = await import("@/pages/anagrafiche-page")
  return { default: module.AnagrafichePage }
})

const AssunzioniPage = React.lazy(async () => {
  const module = await import("@/pages/assunzioni-page")
  return { default: module.AssunzioniPage }
})

const ChiusurePage = React.lazy(async () => {
  const module = await import("@/pages/chiusure-page")
  return { default: module.ChiusurePage }
})

const CrmAssegnazionePage = React.lazy(async () => {
  const module = await import("@/pages/crm-assegnazione-page")
  return { default: module.CrmAssegnazionePage }
})

const CrmPipelineFamigliePage = React.lazy(async () => {
  const module = await import("@/pages/crm-pipeline-famiglie-page")
  return { default: module.CrmPipelineFamigliePage }
})

const Gate1Page = React.lazy(async () => {
  const module = await import("@/pages/gate1-page")
  return { default: module.Gate1Page }
})

const Gate2Page = React.lazy(async () => {
  const module = await import("@/pages/gate2-page")
  return { default: module.Gate2Page }
})

const LavoratoriCercaPage = React.lazy(async () => {
  const module = await import("@/pages/lavoratori-cerca-page")
  return { default: module.LavoratoriCercaPage }
})

const PayrollPage = React.lazy(async () => {
  const module = await import("@/pages/payroll-page")
  return { default: module.PayrollPage }
})

const RapportiLavorativiPage = React.lazy(async () => {
  const module = await import("@/pages/rapporti-lavorativi-page")
  return { default: module.RapportiLavorativiPage }
})

const RicercaBoardPage = React.lazy(async () => {
  const module = await import("@/pages/ricerca-board-page")
  return { default: module.RicercaBoardPage }
})

const RicercaDetailPage = React.lazy(async () => {
  const module = await import("@/pages/ricerca-detail-page")
  return { default: module.RicercaDetailPage }
})

const SupportTicketsPage = React.lazy(async () => {
  const module = await import("@/pages/support-tickets-page")
  return { default: module.SupportTicketsPage }
})

const VariazioniPage = React.lazy(async () => {
  const module = await import("@/pages/variazioni-page")
  return { default: module.VariazioniPage }
})

type PageMeta = {
  title: string
  description: string
}

type AppPageContentProps = {
  route: AppRoute
  onOpenAnagraficheTab: (tab: AppRoute["anagraficheTab"]) => void
  onOpenRicercaDetail: (processId: string) => void
  onOpenRicercaPipeline: () => void
}

export function getPageMeta(route: AppRoute): PageMeta {
  if (route.mainSection === "crm_pipeline_famiglie") {
    return {
      title: "Pipeline CRM",
      description: "Gestisci i tuoi contatti con drag & drop",
    }
  }

  if (route.mainSection === "crm_assegnazione") {
    return {
      title: "Assegnazione",
      description: "Assegna le ricerche da pianificare nei giorni del calendario.",
    }
  }

  if (route.mainSection === "ricerca_pipeline") {
    return {
      title: route.ricercaProcessId ? "Dettaglio Ricerca" : "Ricerca",
      description: route.ricercaProcessId
        ? "Scheda operativa completa della ricerca selezionata."
        : "Vista a colonne delle ricerche organizzate per stato RES.",
    }
  }

  if (route.mainSection === "lavoratori_cerca") {
    return {
      title: "Cerca Lavoratori",
      description: "Seleziona un lavoratore dalla lista e apri la sua scheda.",
    }
  }

  if (route.mainSection === "gate_1") {
    return {
      title: "Gate 1",
      description:
        "Screening iniziale con verifica idoneita e controllo dati essenziali.",
    }
  }

  if (route.mainSection === "gate_2") {
    return {
      title: "Gate 2",
      description:
        "Revisione dei lavoratori idonei con la stessa scheda operativa del gate 1.",
    }
  }

  if (route.mainSection === "gestione_contrattuale_rapporti") {
    return {
      title: "Rapporti lavorativi",
      description: "Lista e dettaglio dei rapporti lavorativi attivi, in attivazione e non attivi.",
    }
  }

  if (route.mainSection === "gestione_contrattuale_assunzioni") {
    return {
      title: "Assunzioni",
      description: "Area dedicata alla gestione delle pratiche di assunzione.",
    }
  }

  if (route.mainSection === "gestione_contrattuale_chiusure") {
    return {
      title: "Chiusure",
      description: "Area dedicata alle chiusure contrattuali e alla cessazione dei rapporti.",
    }
  }

  if (route.mainSection === "gestione_contrattuale_variazioni") {
    return {
      title: "Variazioni",
      description: "Area dedicata alle variazioni contrattuali dei rapporti di lavoro.",
    }
  }

  if (route.mainSection === "payroll_cedolini") {
    return {
      title: "Payroll",
      description: "Area cedolini con metriche operative e kanban mensile.",
    }
  }

  if (route.mainSection === "payroll_contributi_inps") {
    return {
      title: "Payroll",
      description: "Area contributi INPS con flussi e controlli del mese.",
    }
  }

  if (route.mainSection === "customer_support_customer_ticket") {
    return {
      title: "Customer Support",
      description: "Board ticket customer con flussi operativi e gestione delle richieste.",
    }
  }

  if (route.mainSection === "customer_support_payroll_ticket") {
    return {
      title: "Customer Support",
      description: "Board ticket payroll per presenze, cedolini, contributi e pagamenti.",
    }
  }

  return {
    title: "Anagrafiche",
    description: "Vista tabellare completa con tutte le colonne disponibili.",
  }
}

export function AppPageContent({
  route,
  onOpenAnagraficheTab,
  onOpenRicercaDetail,
  onOpenRicercaPipeline,
}: AppPageContentProps) {
  if (route.mainSection === "crm_pipeline_famiglie") {
    return <CrmPipelineFamigliePage />
  }

  if (route.mainSection === "crm_assegnazione") {
    return <CrmAssegnazionePage onOpenRicercaDetail={onOpenRicercaDetail} />
  }

  if (route.mainSection === "ricerca_pipeline") {
    return route.ricercaProcessId ? (
      <RicercaDetailPage
        processId={route.ricercaProcessId}
        onBack={onOpenRicercaPipeline}
      />
    ) : (
      <RicercaBoardPage onOpenDetail={onOpenRicercaDetail} />
    )
  }

  if (route.mainSection === "lavoratori_cerca") {
    return <LavoratoriCercaPage />
  }

  if (route.mainSection === "gate_1") {
    return <Gate1Page />
  }

  if (route.mainSection === "gate_2") {
    return <Gate2Page />
  }

  if (route.mainSection === "gestione_contrattuale_rapporti") {
    return <RapportiLavorativiPage />
  }

  if (route.mainSection === "gestione_contrattuale_assunzioni") {
    return <AssunzioniPage />
  }

  if (route.mainSection === "gestione_contrattuale_chiusure") {
    return <ChiusurePage />
  }

  if (route.mainSection === "gestione_contrattuale_variazioni") {
    return <VariazioniPage />
  }

  if (route.mainSection === "payroll_cedolini") {
    return <PayrollPage defaultTab="cedolini" />
  }

  if (route.mainSection === "payroll_contributi_inps") {
    return <PayrollPage defaultTab="contributi-inps" />
  }

  if (route.mainSection === "customer_support_customer_ticket") {
    return <SupportTicketsPage ticketType="Customer" />
  }

  if (route.mainSection === "customer_support_payroll_ticket") {
    return <SupportTicketsPage ticketType="Payroll" />
  }

  return (
    <AnagrafichePage
      activeTab={route.anagraficheTab}
      onActiveTabChange={onOpenAnagraficheTab}
    />
  )
}
