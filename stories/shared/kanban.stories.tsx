import type { Meta, StoryObj } from "@storybook/react-vite";

import { KanbanColumnShell } from "@/components/shared/kanban";
import { Card, CardContent } from "@/components/ui/card";

const meta = {
  title: "Shared/Kanban",
  component: KanbanColumnShell,
  args: {
    columnId: "da-colloquiare",
    title: "Da colloquiare",
    countLabel: "2 lavoratori",
    visual: {
      columnClassName: "border-blue-300 bg-blue-50/70",
      headerClassName: "border-b border-blue-200/70",
      iconClassName: "text-blue-500",
    },
    isDropTarget: false,
    widthClassName: "w-[320px]",
    density: "comfortable",
  },
  argTypes: {
    title: { control: "text" },
    countLabel: { control: "text" },
    isDropTarget: { control: "boolean" },
    widthClassName: { control: "text" },
    density: { control: "inline-radio", options: ["comfortable", "compact"] },
  },
  render: (args) => (
    <div className="h-[360px]">
      <KanbanColumnShell {...args}>
        <Card>
          <CardContent className="space-y-1 px-3">
            <p className="font-semibold">Noelia Alfaro</p>
            <p className="text-muted-foreground text-sm">Colf • Part time</p>
          </CardContent>
        </Card>
      </KanbanColumnShell>
    </div>
  ),
} satisfies Meta<typeof KanbanColumnShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

