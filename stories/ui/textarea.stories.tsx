import type { Meta, StoryObj } from "@storybook/react-vite";

import { Textarea } from "@/components/ui/textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  argTypes: {
    value: { control: "text" },
    placeholder: { control: "text" },
    rows: { control: { type: "number", min: 2, max: 12, step: 1 } },
    disabled: { control: "boolean" },
    "aria-invalid": { control: "boolean" },
    onChange: { action: "changed" },
  },
  args: {
    value: "Testo descrittivo del lavoratore.",
    placeholder: "Scrivi una nota",
    rows: 4,
    disabled: false,
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
