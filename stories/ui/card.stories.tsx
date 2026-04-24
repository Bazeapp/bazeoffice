import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "UI/Card",
  component: Card,
  argTypes: {
    size: {
      options: ["default", "sm"],
      control: { type: "select" },
    },
  },
  args: {
    size: "default",
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => (
    <Card {...args} className="w-80">
      <CardHeader>
        <CardTitle>Titolo card</CardTitle>
        <CardDescription>Descrizione breve della card.</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm">Azione</Button>
        </CardAction>
      </CardHeader>
      <CardContent>Contenuto della card.</CardContent>
      <CardFooter>Footer</CardFooter>
    </Card>
  ),
};
