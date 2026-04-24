import type { Meta, StoryObj } from "@storybook/react-vite";
import { BriefcaseBusinessIcon } from "lucide-react";

import {
  DetailField,
  DetailSectionBlock,
} from "@/components/shared/detail-section-card";

const meta = {
  title: "Shared/DetailSectionBlock",
  component: DetailSectionBlock,
  argTypes: {
    title: { control: "text" },
    tone: {
      control: "inline-radio",
      options: ["primary", "muted", "neutral", "transparent"],
    },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    showDefaultAction: { control: "boolean" },
    content: { control: "text" },
    onActionClick: { action: "action clicked" },
  },
  args: {
    title: "Contratto",
    tone: "primary",
    collapsible: false,
    defaultOpen: true,
    showDefaultAction: false,
    className: "space-y-2",
    bannerClassName: "py-0",
    cardClassName: "px-3 py-3",
    content: "embedded-rapporto-detail layout",
  },
} satisfies Meta<typeof DetailSectionBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ content, ...args }) => (
    <div className="max-w-4xl rounded-2xl border border-border/70 bg-muted/20 p-3">
      <DetailSectionBlock
        {...args}
        icon={<BriefcaseBusinessIcon className="text-muted-foreground size-4" />}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailField label="Tipo rapporto" value="Part time" />
          <DetailField label="Tipo contratto" value="Indeterminato" />
          <DetailField label="Ore a settimana" value="20" />
          <DetailField label="Inizio rapporto" value="24/04/2026" />
        </div>
      </DetailSectionBlock>
    </div>
  ),
};
