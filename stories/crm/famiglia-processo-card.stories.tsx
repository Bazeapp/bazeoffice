import type { Meta, StoryObj } from "@storybook/react-vite";

import { FamigliaProcessoCard } from "@/components/crm/famiglia-processo-card";
import { mockCrmCard } from "../mocks";

const meta = {
  title: "Ricerca/FamigliaProcessoCard",
  component: FamigliaProcessoCard,
  args: {
    data: mockCrmCard,
  },
  argTypes: {
    data: { control: "object" },
  },
} satisfies Meta<typeof FamigliaProcessoCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

