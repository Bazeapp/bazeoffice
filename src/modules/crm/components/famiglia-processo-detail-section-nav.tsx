import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { FamigliaProcessoSectionId } from "../lib/famiglia-processo-sections"
import { useFamigliaProcessoDetail } from "./famiglia-processo-detail-context"

export function FamigliaProcessoDetailSectionNav() {
  const { state, actions } = useFamigliaProcessoDetail()
  const { visibleTabs, activeSection } = state
  const { scrollToSection } = actions

  return (
    <Tabs
      value={activeSection}
      onValueChange={(value) => scrollToSection(value as FamigliaProcessoSectionId)}
      className="w-full"
    >
      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-x-1 overflow-x-auto overflow-y-hidden whitespace-nowrap p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {visibleTabs.map((tab) => {
          const TabIcon = tab.icon
          return (
            <TabsTrigger key={tab.id} value={tab.id} className="flex-none">
              <TabIcon className="size-4" />
              {tab.label}
            </TabsTrigger>
          )
        })}
      </TabsList>
    </Tabs>
  )
}
