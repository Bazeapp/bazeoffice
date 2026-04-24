import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeIcon, SearchIcon, SettingsIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";

const meta = {
  title: "UI/Sidebar",
  component: Sidebar,
  args: {
    side: "left",
    variant: "sidebar",
    collapsible: "offcanvas",
  },
  argTypes: {
    side: { control: "inline-radio", options: ["left", "right"] },
    variant: { control: "inline-radio", options: ["sidebar", "floating", "inset"] },
    collapsible: { control: "inline-radio", options: ["offcanvas", "icon", "none"] },
  },
  render: (args) => (
    <SidebarProvider>
      <div className="flex h-[360px] w-full overflow-hidden rounded-lg border bg-sidebar">
        <Sidebar {...args} className="relative">
          <SidebarHeader className="font-semibold">Baze Office</SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {[
                    { label: "Home", icon: HomeIcon },
                    { label: "Ricerche", icon: SearchIcon },
                    { label: "Impostazioni", icon: SettingsIcon },
                  ].map((item) => (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton isActive={item.label === "Ricerche"}>
                        <item.icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
      </div>
    </SidebarProvider>
  ),
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

