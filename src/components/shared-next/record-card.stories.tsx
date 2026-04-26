import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import {
  CalendarIcon,
  CheckSquareIcon,
  Clock3Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { Avatar } from "@/components/ui-next/avatar";
import { Badge } from "@/components/ui-next/badge";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";
import { RecordCard } from "@/components/shared-next/record-card";

const meta = {
  title: "Shared Next/Record Card",
  component: RecordCard,
  decorators: [
    (Story) => (
      <div className="ui-next w-[340px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecordCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <RecordCard onClick={fn()}>
      <RecordCard.Header title="Aria Bocelli" />
      <RecordCard.Body>
        <CardMetaRow icon={<MailIcon />}>aria.bocelli@bazeapp.it</CardMetaRow>
        <CardMetaRow icon={<PhoneIcon />}>+39 333 1234567</CardMetaRow>
      </RecordCard.Body>
    </RecordCard>
  ),
};

export const WithRightSlotInHeader: Story = {
  render: () => (
    <RecordCard onClick={fn()}>
      <RecordCard.Header
        title="Aria Bocelli"
        rightSlot={
          <Badge className="border-sky-200 bg-sky-100 text-sky-700">
            Nuova
          </Badge>
        }
      />
      <RecordCard.Body>
        <CardMetaRow icon={<CalendarIcon />}>14/04/2026</CardMetaRow>
        <CardMetaRow icon={<Clock3Icon />}>40h | 5g</CardMetaRow>
      </RecordCard.Body>
    </RecordCard>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <RecordCard onClick={fn()}>
      <RecordCard.Header title="Aria Bocelli" />
      <RecordCard.Body>
        <CardMetaRow icon={<MailIcon />}>aria.bocelli@bazeapp.it</CardMetaRow>
        <CardMetaRow icon={<MapPinIcon />}>Padova, San Salvario</CardMetaRow>
      </RecordCard.Body>
      <RecordCard.Footer
        leftSlot={
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#76756f]">
            <CheckSquareIcon className="size-3 text-emerald-600" />
            Preventivo accettato
          </span>
        }
      />
    </RecordCard>
  ),
};

export const WithAccent: Story = {
  render: () => (
    <RecordCard accent="rose" onClick={fn()}>
      <RecordCard.Header title="Aria Bocelli" />
      <RecordCard.Body>
        <CardMetaRow icon={<CalendarIcon />}>14/04/2026</CardMetaRow>
      </RecordCard.Body>
    </RecordCard>
  ),
};

export const PipelineStyle: Story = {
  name: "Esempio · Pipeline Famiglie",
  render: () => (
    <RecordCard onClick={fn()}>
      <RecordCard.Header title="Famiglia Manganotti" />
      <RecordCard.Body>
        <CardMetaRow>
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
            Colf
          </Badge>
          <Badge className="border-rose-200 bg-rose-100 text-rose-700">
            Lavoro ad ore
          </Badge>
        </CardMetaRow>
        <CardMetaRow icon={<MailIcon />}>famiglia.manganotti@example.it</CardMetaRow>
        <CardMetaRow icon={<PhoneIcon />}>+39 333 1234567</CardMetaRow>
        <CardMetaRow icon={<Clock3Icon />}>20h | 5g</CardMetaRow>
        <CardMetaRow icon={<CalendarIcon />}>Creata il 11/04/2026</CardMetaRow>
      </RecordCard.Body>
      <RecordCard.Footer
        leftSlot={
          <span className="flex items-center gap-1.5 text-[12.5px] text-[#76756f]">
            <CheckSquareIcon className="size-3 text-emerald-600" />
            Preventivo accettato
          </span>
        }
      />
    </RecordCard>
  ),
};

export const AssegnazioneStyle: Story = {
  name: "Esempio · Assegnazione",
  render: () => (
    <RecordCard accent="rose" onClick={fn()}>
      <RecordCard.Header
        title="Silvia Pantaleo"
        rightSlot={
          <Badge className="border-sky-200 bg-sky-100 text-sky-700">
            Nuova
          </Badge>
        }
      />
      <RecordCard.Body>
        <CardMetaRow>
          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
            Colf
          </Badge>
          <Badge className="border-rose-200 bg-rose-100 text-rose-700">
            Lavoro ad ore
          </Badge>
        </CardMetaRow>
        <CardMetaRow icon={<CalendarIcon />}>21/04/2026</CardMetaRow>
        <CardMetaRow icon={<Clock3Icon />}>8h | 2g</CardMetaRow>
        <CardMetaRow icon={<MapPinIcon />}>—</CardMetaRow>
      </RecordCard.Body>
      <RecordCard.Footer
        rightSlot={
          <Avatar
            size="sm"
            fallback="GS"
            className="ring-2 ring-emerald-500"
          />
        }
      />
    </RecordCard>
  ),
};
