import type { Meta, StoryObj } from "@storybook/react-vite";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Button",
  component: Button,
  argTypes: {
    variant: {
      options: ["default", "outline", "secondary", "ghost", "destructive", "link"],
      control: { type: "select" },
    },
    size: {
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
      control: { type: "select" },
    },
    disabled: { control: "boolean" },
    children: { control: "text" },
    asChild: { table: { disable: true } },
    onClick: { action: "clicked" },
  },
  args: {
    children: "Aggiungi",
    variant: "default",
    size: "default",
    disabled: false,
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <PlusIcon />
      {args.children}
    </Button>
  ),
};
