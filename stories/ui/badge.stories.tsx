import type { Meta, StoryObj } from "@storybook/react-vite";

import { Badge } from "@/components/ui/badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  argTypes: {
    variant: {
      options: ["default", "secondary", "destructive", "outline", "ghost", "link"],
      control: { type: "select" },
    },
    children: { control: "text" },
    asChild: { table: { disable: true } },
  },
  args: {
    children: "Badante",
    variant: "default",
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
