import type { Meta, StoryObj } from "@storybook/react-vite";
import { BadgeCheckIcon } from "lucide-react";

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  argTypes: {
    size: {
      options: ["default", "sm", "lg"],
      control: { type: "select" },
    },
    imageUrl: { control: "text" },
    fallback: { control: "text" },
    showBadge: { control: "boolean" },
  },
  args: {
    size: "default",
    imageUrl: "/worker_placeholder_1.png",
    fallback: "NA",
    showBadge: true,
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta & { args: { imageUrl: string; fallback: string; showBadge: boolean } }>;

export const Playground: Story = {
  render: ({ imageUrl, fallback, showBadge, ...args }) => (
    <Avatar {...args}>
      <AvatarImage src={imageUrl} alt={fallback} />
      <AvatarFallback>{fallback}</AvatarFallback>
      {showBadge ? (
        <AvatarBadge>
          <BadgeCheckIcon />
        </AvatarBadge>
      ) : null}
    </Avatar>
  ),
};
