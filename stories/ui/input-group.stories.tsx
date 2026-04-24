import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchIcon } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";

const meta = {
  title: "UI/InputGroup",
  component: InputGroup,
  argTypes: {
    value: { control: "text" },
    placeholder: { control: "text" },
  },
  args: {
    value: "Milano",
    placeholder: "Cerca",
  },
} satisfies Meta<typeof InputGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ value, placeholder, ...args }) => (
    <InputGroup {...args} className="w-[320px]">
      <InputGroupAddon>
        <InputGroupText>
          <SearchIcon />
        </InputGroupText>
      </InputGroupAddon>
      <InputGroupInput value={value} placeholder={placeholder} readOnly />
    </InputGroup>
  ),
};
