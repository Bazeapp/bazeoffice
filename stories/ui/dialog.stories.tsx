import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const meta = {
  title: "UI/Dialog",
  component: Dialog,
  argTypes: {
    defaultOpen: { control: "boolean" },
  },
  args: {
    defaultOpen: true,
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Dialog {...args}>
      <DialogTrigger asChild>
        <Button>Apri dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Titolo dialog</DialogTitle>
          <DialogDescription>Descrizione del contenuto.</DialogDescription>
        </DialogHeader>
        <p className="text-sm">Contenuto dialog.</p>
        <DialogFooter>
          <Button>Conferma</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
