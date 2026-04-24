import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const meta = {
  title: "UI/Accordion",
  component: Accordion,
  argTypes: {
    type: { options: ["single", "multiple"], control: { type: "radio" } },
    collapsible: { control: "boolean" },
    defaultValue: { control: "text" },
  },
  args: {
    type: "single",
    collapsible: true,
    defaultValue: "item-1",
  },
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Accordion {...args} className="w-[420px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Orari e frequenza</AccordionTrigger>
        <AccordionContent>lun-ven, 8:30-13:30</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Luogo di lavoro</AccordionTrigger>
        <AccordionContent>Milano • 20141</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
