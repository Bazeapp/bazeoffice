import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { UsersIcon } from "lucide-react";

import { SideCardsPanel } from "@/components/shared-next/side-cards-panel";

function WorkerRow({ name, role }: { name: string; role: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  );
}

const meta = {
  title: "Shared Next/Side Cards Panel",
  component: SideCardsPanel,
  decorators: [
    (Story) => (
      <div className="ui-next h-[560px] w-[360px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
    empty: { control: "boolean" },
  },
  args: {
    title: "Lavoratori",
    subtitle: "12 disponibili",
    icon: UsersIcon,
    onSearchValueChange: fn(),
  },
} satisfies Meta<typeof SideCardsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlainChildren: Story = {
  render: (args) => (
    <SideCardsPanel {...args}>
      <div className="space-y-2">
        <WorkerRow name="Aria Bocelli" role="Senior · Babysitter" />
        <WorkerRow name="Luca Marchetti" role="Mid · Colf" />
        <WorkerRow name="Sara D'Angelo" role="Specialista" />
      </div>
    </SideCardsPanel>
  ),
};

export const WithGroups: Story = {
  render: (args) => (
    <SideCardsPanel
      {...args}
      subtitle="6 totali"
      groups={[
        {
          id: "senior",
          title: "Senior",
          count: 2,
          children: (
            <>
              <WorkerRow name="Aria Bocelli" role="Babysitter" />
              <WorkerRow name="Marco Rossi" role="Colf" />
            </>
          ),
        },
        {
          id: "mid",
          title: "Mid",
          count: 2,
          children: (
            <>
              <WorkerRow name="Luca Marchetti" role="Colf" />
              <WorkerRow name="Giulia Romano" role="Babysitter" />
            </>
          ),
        },
        {
          id: "junior",
          title: "Junior",
          count: 2,
          children: (
            <>
              <WorkerRow name="Elena Conti" role="Pulizie" />
              <WorkerRow name="Davide Russo" role="Pulizie" />
            </>
          ),
        },
      ]}
    />
  ),
};

export const WithSearch: Story = {
  render: function WithSearchRender(args) {
    const [search, setSearch] = useState("");
    return (
      <SideCardsPanel
        {...args}
        searchValue={search}
        onSearchValueChange={setSearch}
        searchPlaceholder="Cerca lavoratore..."
      >
        <div className="space-y-2">
          <WorkerRow name="Aria Bocelli" role="Senior" />
          <WorkerRow name="Luca Marchetti" role="Mid" />
          <WorkerRow name="Sara D'Angelo" role="Specialista" />
        </div>
      </SideCardsPanel>
    );
  },
};

export const Empty: Story = {
  args: {
    empty: true,
    emptyMessage: "Nessun lavoratore disponibile in questa categoria.",
  },
};

export const WithToolbarActions: Story = {
  render: function WithToolbarRender(args) {
    const [search, setSearch] = useState("");
    return (
      <SideCardsPanel
        {...args}
        searchValue={search}
        onSearchValueChange={setSearch}
        toolbarActions={
          <>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium">
              Tutti
            </span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Senior
            </span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Mid
            </span>
          </>
        }
      >
        <div className="space-y-2">
          <WorkerRow name="Aria Bocelli" role="Senior" />
          <WorkerRow name="Luca Marchetti" role="Mid" />
        </div>
      </SideCardsPanel>
    );
  },
};
