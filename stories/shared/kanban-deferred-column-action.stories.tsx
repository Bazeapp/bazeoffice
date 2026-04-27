import type { Meta, StoryObj } from "@storybook/react-vite";

import { KanbanDeferredColumnAction } from "@/components/shared-next/kanban";

const meta = {
  title: "Shared/Kanban",
  component: KanbanDeferredColumnAction,
  argTypes: {
    label: { control: "text" },
    loadingLabel: { control: "text" },
    isLoading: { control: "boolean" },
    onClick: { action: "clicked" },
  },
  args: {
    label: "Carica colonna",
    loadingLabel: "Caricamento...",
    isLoading: false,
  },
} satisfies Meta<typeof KanbanDeferredColumnAction>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeferredColumnAction: Story = {};
