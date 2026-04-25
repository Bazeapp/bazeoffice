import type { Meta, StoryObj } from "@storybook/react-vite";

import { CrmDetailCard } from "@/components/crm/detail-card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Ricerca/DetailCard",
  component: CrmDetailCard,
  argTypes: {
    title: { control: "text" },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    content: { control: "text" },
    showAction: { control: "boolean" },
  },
  args: {
    title: "Famiglia",
    collapsible: true,
    defaultOpen: true,
    content: "Contenuto CRM.",
    showAction: true,
  },
} satisfies Meta<typeof CrmDetailCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ content, showAction, ...args }) => (
    <div className="w-[520px]">
      <CrmDetailCard
        {...args}
        titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      >
        <p className="text-sm">{content}</p>
      </CrmDetailCard>
    </div>
  ),
};
