import type { Meta, StoryObj } from "@storybook/react-vite";

import { DayCountSelector } from "@/components/ui/day-count-selector";

const options = [
  { label: "Lavori di 3 giorni", value: "3" },
  { label: "Lavori di 4 giorni", value: "4" },
  { label: "Lavori di 5 giorni", value: "5" },
];

const meta = {
  title: "UI/DayCountSelector",
  component: DayCountSelector,
  argTypes: {
    options: { control: "object" },
    value: { control: "object" },
    disabled: { control: "boolean" },
    readOnly: { control: "boolean" },
    onChange: { action: "values changed" },
  },
  args: {
    options,
    value: ["Lavori di 3 giorni", "Lavori di 5 giorni"],
    disabled: false,
    readOnly: false,
  },
} satisfies Meta<typeof DayCountSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
