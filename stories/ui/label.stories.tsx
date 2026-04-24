import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/ui/label";

const meta = {
  title: "UI/Label",
  component: Label,
  argTypes: {
    children: { control: "text" },
  },
  args: {
    children: "Nome campo",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
