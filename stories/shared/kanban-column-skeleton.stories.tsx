import type { Meta, StoryObj } from "@storybook/react-vite";

import { KanbanColumnSkeleton } from "@/components/shared/kanban";

const meta = {
  title: "Shared/KanbanColumnSkeleton",
  component: KanbanColumnSkeleton,
  argTypes: {
    widthClassName: { control: "text" },
    density: { options: ["comfortable", "compact"], control: { type: "select" } },
    cardCount: { control: { type: "number", min: 1, max: 8, step: 1 } },
    showBadgeRow: { control: "boolean" },
  },
  args: {
    widthClassName: "w-[340px]",
    density: "comfortable",
    cardCount: 2,
    showBadgeRow: true,
  },
} satisfies Meta<typeof KanbanColumnSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
