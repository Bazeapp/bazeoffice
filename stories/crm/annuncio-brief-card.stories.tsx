import type { Meta, StoryObj } from "@storybook/react-vite";

import { AnnuncioBriefCard } from "@/components/crm/cards/annuncio-brief-card";

const meta = {
  title: "CRM/AnnuncioBriefCard",
  component: AnnuncioBriefCard,
  argTypes: {
    brief: { control: "text" },
    containerProps: { table: { disable: true } },
  },
  args: {
    brief: "Cerchiamo una colf part-time a Milano, dal lunedi al venerdi.",
  },
} satisfies Meta<typeof AnnuncioBriefCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[560px]">
      <AnnuncioBriefCard {...args} />
    </div>
  ),
};
