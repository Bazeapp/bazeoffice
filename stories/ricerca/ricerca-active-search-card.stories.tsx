import type { Meta, StoryObj } from "@storybook/react-vite";

import { RicercaActiveSearchCard } from "@/components/ricerca/ricerca-active-search-card";
import { mockRicercaCard } from "../mocks";

const meta = {
  title: "Ricerca/RicercaActiveSearchCard",
  component: RicercaActiveSearchCard,
  argTypes: {
    data: { control: "object" },
    onClick: { action: "clicked" },
  },
  args: {
    data: mockRicercaCard,
  },
} satisfies Meta<typeof RicercaActiveSearchCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <RicercaActiveSearchCard {...args} />
    </div>
  ),
};
