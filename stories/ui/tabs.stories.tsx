import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta = {
  title: "UI/Tabs",
  component: Tabs,
  argTypes: {
    defaultValue: {
      options: ["profilo", "documenti"],
      control: { type: "radio" },
    },
  },
  args: {
    defaultValue: "profilo",
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Tabs {...args} className="w-[420px]">
      <TabsList>
        <TabsTrigger value="profilo">Profilo</TabsTrigger>
        <TabsTrigger value="documenti">Documenti</TabsTrigger>
      </TabsList>
      <TabsContent value="profilo">Contenuto profilo</TabsContent>
      <TabsContent value="documenti">Contenuto documenti</TabsContent>
    </Tabs>
  ),
};
