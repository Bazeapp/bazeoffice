import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/ui/input";

const meta = {
  title: "UI/Input",
  component: Input,
  argTypes: {
    type: {
      options: ["text", "email", "tel", "date", "number", "file"],
      control: { type: "select" },
    },
    value: { control: "text" },
    placeholder: { control: "text" },
    disabled: { control: "boolean" },
    "aria-invalid": { control: "boolean" },
    onChange: { action: "changed" },
  },
  args: {
    type: "text",
    value: "Valore campo",
    placeholder: "Inserisci valore",
    disabled: false,
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
