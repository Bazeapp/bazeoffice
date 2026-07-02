import { AnagraficheTablesView } from "@/modules/anagrafiche"
import type { AnagraficheSidebarTab } from "@/routes/app-routes"

type AnagrafichePageProps = {
  activeTab: AnagraficheSidebarTab
  onActiveTabChange: (tab: AnagraficheSidebarTab) => void
}

export function AnagrafichePage({
  activeTab,
  onActiveTabChange,
}: AnagrafichePageProps) {
  return (
    <AnagraficheTablesView
      activeTab={activeTab}
      onActiveTabChange={onActiveTabChange}
    />
  )
}
