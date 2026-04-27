import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  ArrowUpDownIcon,
  ChevronRightIcon,
  PlusIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";

import { SectionHeader } from "./section-header";

const meta = {
  title: "Shared Next/Section Header",
  component: SectionHeader,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="ui bg-background min-h-50 w-full">
        <div className="mx-auto w-full max-w-300 px-6 pt-6">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof SectionHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Title>Titolo sezione</SectionHeader.Title>
    </SectionHeader>
  ),
};

export const WithBadge: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Title badge={<Badge>Badge</Badge>}>
        Titolo sezione
      </SectionHeader.Title>
    </SectionHeader>
  ),
};

export const WithActions: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Title>Titolo sezione</SectionHeader.Title>
      <SectionHeader.Actions>
        <Button variant="outline" onClick={fn()}>
          Azione secondaria
        </Button>
        <Button onClick={fn()}>
          <PlusIcon />
          Azione primaria
        </Button>
      </SectionHeader.Actions>
    </SectionHeader>
  ),
};

export const WithBreadcrumb: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Breadcrumb>
        <span>Livello 1</span>
        <ChevronRightIcon className="size-3.5" />
        <span>Livello 2</span>
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">Pagina corrente</span>
      </SectionHeader.Breadcrumb>
      <SectionHeader.Title>Titolo sezione</SectionHeader.Title>
    </SectionHeader>
  ),
};

export const WithToolbar: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Title>Titolo sezione</SectionHeader.Title>
      <SectionHeader.Toolbar>
        <div className="min-w-0 flex-1 max-w-105">
          <SearchInput placeholder="Cerca..." />
        </div>
        <Button variant="outline" onClick={fn()}>
          <SlidersHorizontalIcon />
          Filtro
        </Button>
        <Button variant="ghost" className="ml-auto" onClick={fn()}>
          <ArrowUpDownIcon />
          Ordina
        </Button>
      </SectionHeader.Toolbar>
    </SectionHeader>
  ),
};

export const NestedSize: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Title size="nested" badge={<Badge>Badge</Badge>}>
        Titolo annidato
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <Button onClick={fn()}>
          <PlusIcon />
          Azione
        </Button>
      </SectionHeader.Actions>
    </SectionHeader>
  ),
};

export const AllSlots: Story = {
  render: () => (
    <SectionHeader>
      <SectionHeader.Breadcrumb>
        <span>Livello 1</span>
        <ChevronRightIcon className="size-3.5" />
        <span className="text-foreground">Pagina corrente</span>
      </SectionHeader.Breadcrumb>
      <SectionHeader.Title badge={<Badge>Badge</Badge>}>
        Titolo sezione
      </SectionHeader.Title>
      <SectionHeader.Actions>
        <Button variant="outline" onClick={fn()}>
          Azione secondaria
        </Button>
        <Button onClick={fn()}>
          <PlusIcon />
          Azione primaria
        </Button>
      </SectionHeader.Actions>
      <SectionHeader.Toolbar>
        <div className="min-w-0 flex-1 max-w-105">
          <SearchInput placeholder="Cerca..." />
        </div>
        <Button variant="outline" onClick={fn()}>
          <SlidersHorizontalIcon />
          Filtro
        </Button>
        <Button variant="ghost" className="ml-auto" onClick={fn()}>
          <ArrowUpDownIcon />
          Ordina
        </Button>
      </SectionHeader.Toolbar>
    </SectionHeader>
  ),
};
