import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const meta = {
  title: "UI/Table",
  component: Table,
  argTypes: {
    caption: { control: "text" },
  },
  args: {
    caption: "Lista lavoratori",
  },
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: ({ caption, ...args }) => (
    <Table {...args} className="w-[520px]">
      <TableCaption>{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Stato</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Noelia Alfaro</TableCell>
          <TableCell>Idoneo</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
