import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon } from "lucide-react";

import { DetailSectionCard } from "@/components/shared/detail-section-card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "Shared/DetailSectionCard",
  component: DetailSectionCard,
  argTypes: {
    title: { control: "text" },
    titleOnBorder: { control: "boolean" },
    childrenText: { control: "text" },
    showAction: { control: "boolean" },
  },
  args: {
    title: "Documenti",
    titleOnBorder: false,
    childrenText: "Contenuto della sezione.",
    showAction: true,
  },
} satisfies Meta<typeof DetailSectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ childrenText, showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="w-[420px]"
    >
      <p className="text-sm">{childrenText}</p>
    </DetailSectionCard>
  ),
};
