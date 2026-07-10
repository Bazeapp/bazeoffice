import { ChevronLeftIcon, KanbanSquareIcon, MapIcon } from "lucide-react"

import {
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type Props = {
  title: string
  onBack: () => void
}

export function RicercaDetailViewHeader({ title, onBack }: Props) {
  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border-subtle bg-surface px-6 py-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <ChevronLeftIcon className="size-3.5" />
            Torna alle ricerche
          </button>
          <h1 className="mt-1 max-w-full truncate text-2xl font-semibold tracking-tight">
            {title}
          </h1>
        </div>
        <TabsList variant="segmented">
          <TabsTrigger value="mappa">
            <MapIcon />
            Mappa
          </TabsTrigger>
          <TabsTrigger value="pipeline">
            <KanbanSquareIcon />
            Pipeline
          </TabsTrigger>
        </TabsList>
      </div>
    </header>
  )
}
