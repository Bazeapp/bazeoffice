import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type CedoliniMode = "board" | "controlli" | "pagamenti"

export function CedoliniModeTabs({
  value,
  onChange,
}: {
  value: CedoliniMode
  onChange: (next: CedoliniMode) => void
}) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as CedoliniMode)}>
      <TabsList variant="segmented">
        <TabsTrigger value="board" data-testid="cedolini-mode-tab-board">
          Board
        </TabsTrigger>
        <TabsTrigger value="controlli" data-testid="cedolini-mode-tab-controlli">
          Controlli
        </TabsTrigger>
        <TabsTrigger value="pagamenti" data-testid="cedolini-mode-tab-pagamenti">
          Pagamenti
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
}
