import type * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  BriefcaseBusinessIcon,
  CalendarIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from "lucide-react";

import {
  DetailField,
  DetailSectionBlock,
} from "@/components/shared-next/detail-section-card";

type DetailSectionBlockStoryArgs = React.ComponentProps<
  typeof DetailSectionBlock
> & {
  iconName: "briefcase" | "calendar" | "file" | "shield" | "none";
  fieldCount: number;
  content: string;
};

const icons = {
  briefcase: BriefcaseBusinessIcon,
  calendar: CalendarIcon,
  file: FileTextIcon,
  shield: ShieldCheckIcon,
  none: null,
};

const meta = {
  title: "Shared/DetailSectionBlock",
  component: DetailSectionBlock,
  argTypes: {
    title: { control: "text" },
    iconName: {
      control: "inline-radio",
      options: ["briefcase", "calendar", "file", "shield", "none"],
    },
    tone: {
      control: "inline-radio",
      options: ["primary", "muted", "neutral", "transparent"],
    },
    collapsible: { control: "boolean" },
    defaultOpen: { control: "boolean" },
    showDefaultAction: { control: "boolean" },
    fieldCount: { control: { type: "number", min: 0, max: 8, step: 1 } },
    content: { control: "text" },
    onActionClick: { action: "action clicked" },
  },
  args: {
    title: "Contratto",
    iconName: "briefcase",
    tone: "primary",
    collapsible: false,
    defaultOpen: true,
    showDefaultAction: false,
    fieldCount: 4,
    className: "space-y-2",
    bannerClassName: "py-0",
    cardClassName: "px-3 py-3",
    content: "Layout sezione dettaglio",
  },
} satisfies Meta<DetailSectionBlockStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

const fields = [
  ["Tipo rapporto", "Part time"],
  ["Tipo contratto", "Indeterminato"],
  ["Ore a settimana", "20"],
  ["Inizio rapporto", "24/04/2026"],
  ["Datore", "Famiglia Lorenza Giannobi"],
  ["Lavoratore", "Noelia Alfaro"],
  ["Stato", "Attivo"],
  ["Città", "Milano"],
];

export const Default: Story = {
  render: ({ iconName, fieldCount, content, ...args }) => {
    const Icon = icons[iconName];

    return (
      <div className="max-w-4xl rounded-2xl border border-border/70 bg-background p-3">
        <DetailSectionBlock
          {...args}
          icon={Icon ? <Icon className="size-4" /> : undefined}
        >
          {fieldCount > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {fields.slice(0, fieldCount).map(([label, value]) => (
                <DetailField key={label} label={label} value={value} />
              ))}
            </div>
          ) : null}
          {content ? (
            <p className="ui-type-body text-muted-foreground">{content}</p>
          ) : null}
        </DetailSectionBlock>
      </div>
    );
  },
};
