import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatisticsMetricCard } from "@/components/shared/statistics-metric-card";

const meta = {
  title: "Shared/StatisticsMetricCard",
  component: StatisticsMetricCard,
  argTypes: {
    value: { control: "text" },
    title: { control: "text" },
    density: {
      options: ["comfortable", "compact"],
      control: { type: "select" },
    },
  },
  args: {
    value: "24",
    title: "Lavoratori attivi",
    density: "comfortable",
  },
} satisfies Meta<typeof StatisticsMetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
