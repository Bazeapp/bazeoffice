import type { Meta, StoryObj } from "@storybook/react-vite";

import { DatePicker } from "@/components/ui/date-picker";

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
  argTypes: {
    value: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    onValueChange: { action: "date changed" },
  },
  args: {
    value: "24/04/2026",
    placeholder: "Seleziona data",
    disabled: false,
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
