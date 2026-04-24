import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const meta = {
  title: "UI/Select",
  component: Select,
  argTypes: {
    value: {
      options: ["colf", "tata", "badante"],
      control: { type: "select" },
    },
    disabled: { control: "boolean" },
    onValueChange: { action: "value changed" },
  },
  args: {
    value: "colf",
    disabled: false,
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[220px]">
        <SelectValue placeholder="Seleziona ruolo" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="colf">Colf</SelectItem>
        <SelectItem value="tata">Tata</SelectItem>
        <SelectItem value="badante">Badante</SelectItem>
      </SelectContent>
    </Select>
  ),
};
