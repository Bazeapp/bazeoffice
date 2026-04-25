import type { Meta, StoryObj } from "@storybook/react-vite";
import type * as React from "react";
import { FilterIcon, PlusIcon, UsersIcon } from "lucide-react";

import { SideCardsPanel } from "@/components/shared/side-cards-panel";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { Button } from "@/components/ui/button";
import { mockWorker } from "../mocks";

type SideCardsPanelStoryArgs = React.ComponentProps<typeof SideCardsPanel> & {
  showSearch: boolean;
  showFilterActions: boolean;
  filterButtonCount: number;
  showGroups: boolean;
  groupCount: number;
  cardCount: number;
  cardsPerGroup: number;
};

const meta = {
  title: "Shared/SideCardsPanel",
  component: SideCardsPanel,
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    empty: { control: "boolean" },
    emptyMessage: { control: "text" },
    showSearch: { control: "boolean" },
    searchValue: { control: "text" },
    searchPlaceholder: { control: "text" },
    showFilterActions: { control: "boolean" },
    filterButtonCount: { control: { type: "number", min: 0, max: 4, step: 1 } },
    showGroups: { control: "boolean" },
    groupCount: { control: { type: "number", min: 1, max: 6, step: 1 } },
    cardCount: { control: { type: "number", min: 0, max: 20, step: 1 } },
    cardsPerGroup: { control: { type: "number", min: 0, max: 10, step: 1 } },
  },
  args: {
    title: "Gate 2",
    subtitle: "12 lavoratori idonei o qualificati",
    empty: false,
    emptyMessage: "Nessun lavoratore trovato.",
    showSearch: true,
    searchValue: "",
    searchPlaceholder: "Cerca lavoratori...",
    showFilterActions: true,
    filterButtonCount: 2,
    showGroups: false,
    groupCount: 3,
    cardCount: 4,
    cardsPerGroup: 2,
  },
} satisfies Meta<SideCardsPanelStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const GROUP_LABELS = [
  "Da chiamare",
  "Colloquio schedulato",
  "Idonei",
  "Da richiamare",
  "Non risponde",
  "Archiviati",
];

function renderCards(count: number, keyPrefix = "card") {
  return Array.from({ length: count }, (_, index) => (
    <LavoratoreCard
      key={`${keyPrefix}-${index}`}
      worker={{
        ...mockWorker,
        id: `${mockWorker.id}-${index}`,
        nomeCompleto:
          index === 0 ? mockWorker.nomeCompleto : `${mockWorker.nomeCompleto} ${index + 1}`,
      }}
      isActive={index === 0}
      onClick={() => undefined}
      variant="gate1"
      gate1Summary={{
        provincia: "Milano",
        createdAt: "2026-04-24",
        followup: index % 2 === 0 ? "Da richiamare" : "Colloquio schedulato",
      }}
    />
  ));
}

export const Default: Story = {
  render: ({
    showGroups,
    groupCount,
    cardCount,
    cardsPerGroup,
    showSearch,
    showFilterActions,
    filterButtonCount,
    ...args
  }) => {
    const groups = showGroups
      ? GROUP_LABELS.slice(0, groupCount).map((label, index) => ({
          id: label,
          title: label,
          count: cardsPerGroup,
          children: renderCards(cardsPerGroup, label),
        }))
      : undefined;
    const filterActions = showFilterActions ? (
      <>
        {Array.from({ length: filterButtonCount }, (_, index) => (
          <Button key={index} type="button" variant="outline" size="sm">
            <FilterIcon className="size-4" />
            Filtro {index + 1}
          </Button>
        ))}
        <Button type="button" variant="outline" size="sm">
          <PlusIcon className="size-4" />
          Vista
        </Button>
      </>
    ) : null;

    return (
      <SideCardsPanel
        {...args}
        icon={UsersIcon}
        groups={groups}
        searchValue={showSearch ? args.searchValue : undefined}
        toolbarActions={filterActions}
        className="h-[520px] w-[340px]"
        contentClassName="space-y-2 px-5 py-3"
      >
        {renderCards(cardCount)}
      </SideCardsPanel>
    );
  },
};
