import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const meta = {
  title: "UI/Field",
  component: Field,
  argTypes: {
    orientation: {
      options: ["vertical", "horizontal", "responsive"],
      control: { type: "select" },
    },
    invalid: { control: "boolean" },
    label: { control: "text" },
    description: { control: "text" },
  },
  args: {
    orientation: "vertical",
    invalid: false,
    label: "Telefono",
    description: "Numero principale del lavoratore.",
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ label, description, invalid, ...args }) => (
    <FieldGroup className="w-[360px]">
      <Field {...args} data-invalid={invalid}>
        <FieldLabel>
          <FieldContent>
            <FieldTitle>{label}</FieldTitle>
            <FieldDescription>{description}</FieldDescription>
          </FieldContent>
        </FieldLabel>
        <Input value="+39 333 123 4567" readOnly />
      </Field>
    </FieldGroup>
  ),
};
