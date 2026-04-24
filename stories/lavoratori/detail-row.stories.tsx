import type { Meta, StoryObj } from "@storybook/react-vite";

import { DetailRow } from "@/components/lavoratori/detail-row";

const meta = {
  title: "Lavoratori/DetailRow",
  component: DetailRow,
  argTypes: {
    label: { control: "text" },
    align: {
      options: ["start", "center"],
      control: { type: "select" },
    },
    value: { control: "text" },
  },
  args: {
    label: "Telefono",
    align: "center",
    value: "+39 333 123 4567",
  },
} satisfies Meta<typeof DetailRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ value, ...args }) => <DetailRow {...args}>{value}</DetailRow>,
};
