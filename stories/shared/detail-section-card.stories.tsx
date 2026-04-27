import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileTextIcon, ShieldCheckIcon } from "lucide-react";

import {
  DetailField,
  DetailFieldControl,
  DetailSectionCard,
} from "@/components/shared-next/detail-section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const meta = {
  title: "Shared/DetailSectionCard",
  component: DetailSectionCard,
  argTypes: {
    title: { control: "text" },
    titleOnBorder: { control: "boolean" },
    childrenText: { control: "text" },
    showAction: { control: "boolean" },
  },
  args: {
    title: "Documenti",
    titleOnBorder: false,
    childrenText: "Card base con titolo e contenuto.",
    showAction: true,
  },
} satisfies Meta<typeof DetailSectionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showAction: false,
  },
  render: ({ childrenText, showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-xl"
    >
      <p className="text-sm">{childrenText}</p>
    </DetailSectionCard>
  ),
};

export const WithAction: Story = {
  args: {
    title: "Documenti",
    showAction: true,
    childrenText: "Variante con action esplicita nel titolo.",
  },
  render: ({ childrenText, showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-xl"
    >
      <p className="text-sm">{childrenText}</p>
    </DetailSectionCard>
  ),
};

export const WithFields: Story = {
  args: {
    title: "Contratto",
    showAction: false,
  },
  render: ({ showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<ShieldCheckIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-3xl"
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailField label="Tipo rapporto" value="Part time" />
        <DetailField label="Tipo contratto" value="Indeterminato" />
        <DetailField label="Ore a settimana" value="20" />
        <DetailField label="Stato" value={<Badge variant="outline">Attivo</Badge>} />
      </div>
    </DetailSectionCard>
  ),
};

export const WithControls: Story = {
  args: {
    title: "Modifica rapporto",
    showAction: false,
  },
  render: ({ showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-2xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailFieldControl label="Ore settimanali">
          <Input defaultValue="20" />
        </DetailFieldControl>
        <DetailFieldControl label="Paga oraria">
          <Input defaultValue="10,00" />
        </DetailFieldControl>
      </div>
    </DetailSectionCard>
  ),
};

export const TitleOnBorder: Story = {
  args: {
    title: "Sottosezione",
    titleOnBorder: true,
    showAction: true,
    childrenText: "Variante usata per sottocard interne.",
  },
  render: ({ childrenText, showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline" size="sm">Azione</Button> : undefined}
      className="max-w-xl"
    >
      <p className="text-sm">{childrenText}</p>
    </DetailSectionCard>
  ),
};

export const NestedCards: Story = {
  args: {
    title: "Sezione con sottocard",
    showAction: false,
  },
  render: ({ showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-3xl"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <DetailSectionCard title="Anagrafica" titleOnBorder>
          <DetailField label="Nome" value="Noelia Alfaro" />
        </DetailSectionCard>
        <DetailSectionCard title="Contratto" titleOnBorder>
          <DetailField label="Ore" value="20" />
        </DetailSectionCard>
      </div>
    </DetailSectionCard>
  ),
};

export const Empty: Story = {
  args: {
    title: "Solo titolo",
    showAction: true,
  },
  render: ({ showAction, ...args }) => (
    <DetailSectionCard
      {...args}
      titleIcon={<FileTextIcon className="size-4" />}
      titleAction={showAction ? <Button variant="outline">Azione</Button> : undefined}
      className="max-w-xl"
    />
  ),
};
