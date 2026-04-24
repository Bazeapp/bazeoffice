import type { Meta, StoryObj } from "@storybook/react-vite";
import { UsersIcon } from "lucide-react";

import { SideCardsPanel } from "@/components/shared/side-cards-panel";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { mockWorker } from "../mocks";

const meta = {
  title: "Shared/SideCardsPanel",
  component: SideCardsPanel,
  argTypes: {
    title: { control: "text" },
    subtitle: { control: "text" },
  },
  args: {
    title: "Gate 2",
    subtitle: "12 lavoratori idonei o qualificati",
  },
} satisfies Meta<typeof SideCardsPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <SideCardsPanel {...args} icon={UsersIcon} className="h-[520px] w-[340px]" contentClassName="space-y-2">
      <LavoratoreCard worker={mockWorker} isActive onClick={() => undefined} variant="gate1" gate1Summary={{ provincia: "Milano", createdAt: "2026-04-24", followup: "Da richiamare" }} />
    </SideCardsPanel>
  ),
};
