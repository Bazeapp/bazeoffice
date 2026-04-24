import type { Meta, StoryObj } from "@storybook/react-vite";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/HoverCard",
  component: HoverCard,
  argTypes: {
    openDelay: { control: { type: "number", min: 0, max: 1000, step: 50 } },
  },
  args: {
    openDelay: 0,
  },
} satisfies Meta<typeof HoverCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <HoverCard {...args}>
      <HoverCardTrigger asChild>
        <Button variant="outline">Hover</Button>
      </HoverCardTrigger>
      <HoverCardContent>Contenuto hover card.</HoverCardContent>
    </HoverCard>
  ),
};
