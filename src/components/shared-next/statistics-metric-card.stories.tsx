import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatisticsMetricCard } from "@/components/shared-next/statistics-metric-card";

const meta = {
  title: "Shared Next/Statistics Metric Card",
  component: StatisticsMetricCard,
  decorators: [
    (Story) => (
      <div className="ui-next w-[260px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    value: { control: "text" },
    title: { control: "text" },
    className: { control: "text" },
    density: { options: ["comfortable", "compact"], control: { type: "inline-radio" } },
  },
  args: {
    value: "1.234",
    title: "Famiglie attive",
    density: "comfortable",
  },
} satisfies Meta<typeof StatisticsMetricCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Comfortable: Story = {};

export const Compact: Story = {
  args: {
    value: "42",
    title: "Lavoratori",
    density: "compact",
  },
};

export const LargeValue: Story = {
  args: {
    value: "12.450",
    title: "Ore mensili",
  },
};

export const LongTitle: Story = {
  args: {
    value: "87",
    title: "Selezioni in attesa di colloquio",
  },
};

export const Grid: Story = {
  decorators: [
    (Story) => (
      <div className="ui-next">
        <div className="grid grid-cols-3 gap-3 w-[820px]">
          <Story />
        </div>
      </div>
    ),
  ],
  render: () => (
    <>
      <StatisticsMetricCard value="1.234" title="Famiglie attive" />
      <StatisticsMetricCard value="87" title="Lavoratori" />
      <StatisticsMetricCard value="42" title="Ricerche aperte" />
    </>
  ),
};
