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

type AppPageContentProps = {
  route: AppRoute
  onOpenAnagraficheTab: (tab: AppRoute["anagraficheTab"]) => void
  onOpenRicercaDetail: (processId: string) => void
  onOpenRicercaPipeline: () => void
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
    return <LavoratoriCercaPage onOpenRicercaDetail={onOpenRicercaDetail} />
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
