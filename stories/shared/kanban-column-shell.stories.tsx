import type { Meta, StoryObj } from "@storybook/react-vite";

import { KanbanColumnShell } from "@/components/shared/kanban";
import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { mockWorker } from "../mocks";

const visual = {
  columnClassName: "border-blue-200 bg-blue-50",
  headerClassName: "border-b border-blue-200 bg-blue-100/60",
  iconClassName: "text-blue-600",
};

const meta = {
  title: "Shared/KanbanColumnShell",
  component: KanbanColumnShell,
  argTypes: {
    columnId: { control: "text" },
    title: { control: "text" },
    countLabel: { control: "text" },
    visual: { control: "object" },
    isDropTarget: { control: "boolean" },
    widthClassName: { control: "text" },
    density: { options: ["comfortable", "compact"], control: { type: "select" } },
  },
  args: {
    columnId: "da-colloquiare",
    title: "Da colloquiare",
    countLabel: "1 lavoratore",
    visual,
    isDropTarget: false,
    widthClassName: "w-[340px]",
    density: "comfortable",
  },
} satisfies Meta<typeof KanbanColumnShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <KanbanColumnShell {...args}>
      <LavoratoreCard worker={mockWorker} isActive={false} onClick={() => undefined} />
    </KanbanColumnShell>
  ),
};
