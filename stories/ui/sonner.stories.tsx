import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";

const meta = {
  title: "UI/Sonner",
  component: Toaster,
  args: {
    position: "bottom-right",
    richColors: false,
  },
  argTypes: {
    position: {
      control: "select",
      options: ["top-left", "top-right", "bottom-left", "bottom-right", "top-center", "bottom-center"],
    },
    richColors: { control: "boolean" },
  },
  render: (args) => (
    <div className="flex gap-2">
      <Button onClick={() => toast.success("Modifica salvata")}>Success</Button>
      <Button variant="outline" onClick={() => toast.error("Errore salvando")}>
        Error
      </Button>
      <Toaster {...args} />
    </div>
  ),
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

