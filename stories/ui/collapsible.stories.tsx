import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  argTypes: {
    defaultOpen: { control: "boolean" },
  },
  args: {
    defaultOpen: true,
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Collapsible {...args} className="w-[360px] space-y-2">
      <CollapsibleTrigger asChild>
        <Button variant="outline">Apri sezione</Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="rounded-lg border bg-background p-3 text-sm">
        Contenuto collapsible.
      </CollapsibleContent>
    </Collapsible>
  ),
};
