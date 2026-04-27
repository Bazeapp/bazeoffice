import type { Meta, StoryObj } from "@storybook/react-vite";

import { LavoratoreCard } from "@/components/lavoratori/lavoratore-card";
import { mockWorker } from "../mocks";

const meta = {
  title: "Lavoratori/LavoratoreCard",
  component: LavoratoreCard,
  argTypes: {
    isActive: { control: "boolean" },
    variant: {
      options: ["default", "gate1"],
      control: { type: "select" },
    },
    worker: { control: "object" },
    gate1Summary: { control: "object" },
    onClick: { action: "clicked" },
  },
  args: {
    worker: mockWorker,
    isActive: true,
    variant: "default",
    gate1Summary: {
      provincia: "Milano",
      createdAt: "2026-04-24",
      followup: "Da richiamare",
    },
  },
} satisfies Meta<typeof LavoratoreCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-85">
      <LavoratoreCard {...args} />
    </div>
  ),
};
