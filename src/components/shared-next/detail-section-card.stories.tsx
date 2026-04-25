import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  CalendarIcon,
  HomeIcon,
  PencilIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import {
  DetailField,
  DetailFieldControl,
  DetailSectionBlock,
  DetailSectionCard,
} from "@/components/shared-next/detail-section-card";
import { Badge } from "@/components/ui-next/badge";
import { Button } from "@/components/ui-next/button";
import { Input } from "@/components/ui-next/input";

/* ============================================================
   DetailSectionCard
   ============================================================ */

const cardMeta = {
  title: "Shared Next/Detail Section Card",
  component: DetailSectionCard,
  decorators: [
    (Story) => (
      <div className="ui-next w-[640px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: "text" },
    titleOnBorder: { control: "boolean" },
  },
  args: {
    title: "Orari e frequenza",
  },
} satisfies Meta<typeof DetailSectionCard>;

export default cardMeta;
type CardStory = StoryObj<typeof cardMeta>;

export const Default: CardStory = {
  render: (args) => (
    <DetailSectionCard {...args}>
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Orario" value="Lun–Ven, 8–19" />
        <DetailField label="Ore settimanali" value="40" />
      </div>
    </DetailSectionCard>
  ),
};

export const WithTitleIcon: CardStory = {
  render: (args) => (
    <DetailSectionCard
      {...args}
      titleIcon={<CalendarIcon className="size-4" />}
    >
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Orario" value="Lun–Ven, 8–19" />
        <DetailField label="Ore settimanali" value="40" />
      </div>
    </DetailSectionCard>
  ),
};

export const WithTitleAction: CardStory = {
  render: (args) => (
    <DetailSectionCard
      {...args}
      titleIcon={<CalendarIcon className="size-4" />}
      titleAction={
        <Button variant="ghost" size="icon-sm" aria-label="Modifica">
          <PencilIcon className="size-4" />
        </Button>
      }
    >
      <DetailField label="Orario" value="Lun–Ven, 8–19" />
    </DetailSectionCard>
  ),
};

export const TitleOnBorder: CardStory = {
  args: {
    title: "Luogo di lavoro",
    titleOnBorder: true,
  },
  render: (args) => (
    <DetailSectionCard
      {...args}
      titleIcon={<HomeIcon className="size-3.5" />}
      titleAction={
        <Button variant="ghost" size="icon-sm" aria-label="Modifica">
          <PencilIcon className="size-3.5" />
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Provincia" value="Milano" />
        <DetailField label="CAP" value="20121" />
        <DetailField label="Indirizzo" value="Via Torino 81" />
        <DetailField label="Quartiere" value="Crocetta" />
      </div>
    </DetailSectionCard>
  ),
};

/* ============================================================
   DetailSectionBlock
   ============================================================ */

export const SectionBlockPrimary: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        title="Orari e frequenza"
        icon={<CalendarIcon className="size-4" />}
        showDefaultAction
        onActionClick={fn()}
      >
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Orario" value="Lun–Ven, 8–19" />
          <DetailField label="Ore settimanali" value="40" />
          <DetailField label="Giorni" value="5" />
          <DetailFieldControl label="Giornate preferite">
            <div className="flex flex-wrap gap-1.5">
              {["Lun", "Mar", "Mer", "Gio", "Ven"].map((d) => (
                <Badge key={d} variant="info" shape="square">
                  {d}
                </Badge>
              ))}
            </div>
          </DetailFieldControl>
        </div>
      </DetailSectionBlock>
    </div>
  ),
};

export const SectionBlockMuted: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        tone="muted"
        title="Famiglia"
        icon={<UserIcon className="size-4" />}
      >
        <DetailField label="Componenti" value="4 (2 adulti, 2 bambini)" />
      </DetailSectionBlock>
    </div>
  ),
};

export const SectionBlockNeutral: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        tone="neutral"
        title="Mansioni"
        icon={<SettingsIcon className="size-4" />}
      >
        <DetailField
          label="Descrizione"
          value="Pulizie ordinarie, lavaggio biancheria, supporto bambini al rientro da scuola."
          multiline
        />
      </DetailSectionBlock>
    </div>
  ),
};

export const SectionBlockTransparent: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        tone="transparent"
        title="Note operatore"
        icon={<PencilIcon className="size-4" />}
      >
        <DetailField label="Note" value="Disponibile dal 15 maggio." multiline />
      </DetailSectionBlock>
    </div>
  ),
};

export const SectionBlockCollapsible: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        title="Luogo di lavoro"
        icon={<HomeIcon className="size-4" />}
        collapsible
        defaultOpen
        showDefaultAction
        onActionClick={fn()}
      >
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Provincia" value="Milano" />
          <DetailField label="CAP" value="20121" />
        </div>
      </DetailSectionBlock>
    </div>
  ),
};

export const SectionBlockCollapsedByDefault: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px]">
      <DetailSectionBlock
        title="Animali domestici"
        icon={<HomeIcon className="size-4" />}
        collapsible
        defaultOpen={false}
      >
        <DetailField label="Tipologia" value="Cane (taglia media)" />
      </DetailSectionBlock>
    </div>
  ),
};

/* ============================================================
   DetailField / DetailFieldControl
   ============================================================ */

export const FieldStates: StoryObj = {
  render: () => (
    <div className="ui-next w-[640px] grid grid-cols-2 gap-4">
      <DetailField label="Stringa" value="Aria Bocelli" />
      <DetailField label="Numero" value={42} />
      <DetailField
        label="Multiline"
        value="Riga 1\nRiga 2\nRiga 3"
        multiline
      />
      <DetailField label="Vuoto" value="" />
      <DetailFieldControl label="Field control · custom input">
        <Input placeholder="Inserisci nome..." />
      </DetailFieldControl>
      <DetailFieldControl label="Field control · chip set">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="info" shape="square">Lun</Badge>
          <Badge variant="info" shape="square">Mer</Badge>
          <Badge variant="info" shape="square">Ven</Badge>
        </div>
      </DetailFieldControl>
    </div>
  ),
};
