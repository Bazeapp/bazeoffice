import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const meta = {
  title: "UI/Sheet",
  component: Sheet,
  argTypes: {
    defaultOpen: { control: "boolean" },
    side: {
      options: ["top", "right", "bottom", "left"],
      control: { type: "select" },
    },
  },
  args: {
    defaultOpen: true,
    side: "right",
  },
} satisfies Meta<typeof Sheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button>Apri sheet</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Dettaglio</SheetTitle>
          <SheetDescription>Descrizione sheet.</SheetDescription>
        </SheetHeader>
        <div className="px-3 text-sm">Contenuto sheet.</div>
        <SheetFooter>
          <Button>Salva</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
