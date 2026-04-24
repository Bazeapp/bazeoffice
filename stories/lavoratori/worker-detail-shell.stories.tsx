import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, UserIcon } from "lucide-react";

import { WorkerDetailShell } from "@/components/lavoratori/worker-detail-shell";
import { Button } from "@/components/ui/button";

const tabs = [
  { id: "profilo", label: "Profilo", icon: UserIcon },
  { id: "documenti", label: "Documenti", icon: FileTextIcon },
];

const meta = {
  title: "Lavoratori/WorkerDetailShell",
  component: WorkerDetailShell,
  argTypes: {
    tabs: { control: "object" },
    activeSection: { options: ["profilo", "documenti"], control: { type: "radio" } },
    onSectionChange: { action: "section changed" },
  },
  args: {
    tabs,
    activeSection: "profilo",
  },
} satisfies Meta<typeof WorkerDetailShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <WorkerDetailShell
      {...args}
      className="h-[520px] w-[760px]"
      topBar={<Button variant="ghost">Chiudi</Button>}
      header={<h2 className="text-2xl font-semibold">Noelia Alfaro</h2>}
    >
      <div className="rounded-xl border p-4">Contenuto dettaglio lavoratore.</div>
    </WorkerDetailShell>
  ),
};
