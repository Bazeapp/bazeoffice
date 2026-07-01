import * as React from "react"
import type { AppRoute, OpenRicercaDetailOptions } from "@/routes/app-routes"

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

const ProveColloquiPage = React.lazy(async () => {
  const module = await import("@/pages/prove-colloqui-page")
  return { default: module.ProveColloquiPage }
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

const RiattivazioniPage = React.lazy(async () => {
  const module = await import("@/pages/riattivazioni-page")
  return { default: module.RiattivazioniPage }
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
  onOpenRicercaDetail: (processId: string, options?: OpenRicercaDetailOptions) => void
  onBackFromRicercaDetail: () => void
  onOpenRelatedRicerca: (processId: string, selectionId: string) => void
  onFocusRicercaSelection: (selectionId: string | null) => void
  onSelectRapporto: (rapportoId: string | null) => void
}

export function AppPageContent({
  route,
  onOpenAnagraficheTab,
  onOpenRicercaDetail,
  onBackFromRicercaDetail,
  onOpenRelatedRicerca,
  onFocusRicercaSelection,
  onSelectRapporto,
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
        selectionId={route.ricercaSelectionId ?? null}
        onBack={onBackFromRicercaDetail}
        onOpenRelatedRicerca={onOpenRelatedRicerca}
        onFocusSelection={onFocusRicercaSelection}
      />
    ) : (
      <RicercaBoardPage onOpenDetail={onOpenRicercaDetail} />
    )
  }

  if (route.mainSection === "lavoratori_cerca") {
    return (
      <LavoratoriCercaPage
        initialSelectedWorkerId={route.selectedWorkerId ?? null}
        onOpenRicercaDetail={onOpenRicercaDetail}
      />
    )
  }

  if (route.mainSection === "gate_1") {
    return <Gate1Page />
  }

  if (route.mainSection === "gate_2") {
    return <Gate2Page />
  }

  if (route.mainSection === "gestione_contrattuale_rapporti") {
    return (
      <RapportiLavorativiPage
        initialSelectedRapportoId={route.selectedRapportoId ?? null}
        onSelectRapporto={onSelectRapporto}
      />
    )
  }

  if (route.mainSection === "gestione_contrattuale_assunzioni") {
    return (
      <AssunzioniPage
        initialSelectedRapportoId={route.selectedAssunzioneRapportoId ?? null}
      />
    )
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

  if (route.mainSection === "prove_colloqui") {
    return <ProveColloquiPage onOpenRicercaDetail={onOpenRicercaDetail} />
  }

  if (route.mainSection === "customer_support_customer_ticket") {
    return <SupportTicketsPage ticketType="Customer" />
  }

  if (route.mainSection === "customer_support_payroll_ticket") {
    return <SupportTicketsPage ticketType="Payroll" />
  }

  if (route.mainSection === "customer_support_riattivazioni") {
    return <RiattivazioniPage />
  }

  return (
    <AnagrafichePage
      activeTab={route.anagraficheTab}
      onActiveTabChange={onOpenAnagraficheTab}
    />
  )
}
