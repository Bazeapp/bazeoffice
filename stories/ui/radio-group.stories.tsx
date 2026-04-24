import type { Meta, StoryObj } from "@storybook/react-vite";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const meta = {
  title: "UI/RadioGroup",
  component: RadioGroup,
  argTypes: {
    value: { options: ["accetta", "non_accetta"], control: { type: "radio" } },
    disabled: { control: "boolean" },
    onValueChange: { action: "value changed" },
  },
  args: {
    value: "accetta",
    disabled: false,
  },
} satisfies Meta<typeof RadioGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <RadioGroup {...args}>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="accetta" />
        Accetta
      </label>
      <label className="flex items-center gap-2 text-sm">
        <RadioGroupItem value="non_accetta" />
        Non accetta
      </label>
    </RadioGroup>
  ),
};
