import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  CalendarIcon,
  Clock3Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui-next/card";
import { Badge } from "@/components/ui-next/badge";
import { CardMetaRow } from "@/components/shared-next/card-meta-row";

const meta = {
  title: "Shared Next/Card Meta Row",
  component: CardMetaRow,
  decorators: [
    (Story) => (
      <div className="ui-next w-[320px]">
        <Story />
      </div>
    ),
  ],
  args: {
    children: "aria.bocelli@bazeapp.it",
  },
} satisfies Meta<typeof CardMetaRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcon: Story = {
  render: () => (
    <CardMetaRow icon={<MailIcon />}>aria.bocelli@bazeapp.it</CardMetaRow>
  ),
};

export const TagsVariant: Story = {
  render: () => (
    <CardMetaRow>
      <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
        Colf
      </Badge>
      <Badge className="border-rose-200 bg-rose-100 text-rose-700">
        Lavoro ad ore
      </Badge>
    </CardMetaRow>
  ),
};

export const Stack: Story = {
  render: () => (
    <div className="space-y-1.5">
      <CardMetaRow>
        <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700">
          Colf
        </Badge>
        <Badge className="border-rose-200 bg-rose-100 text-rose-700">
          Lavoro ad ore
        </Badge>
      </CardMetaRow>
      <CardMetaRow icon={<MailIcon />}>aria.bocelli@bazeapp.it</CardMetaRow>
      <CardMetaRow icon={<PhoneIcon />}>+39 333 1234567</CardMetaRow>
      <CardMetaRow icon={<Clock3Icon />}>40h | 5g</CardMetaRow>
      <CardMetaRow icon={<CalendarIcon />}>Creata il 11/04/2026</CardMetaRow>
      <CardMetaRow icon={<MapPinIcon />}>Padova, San Salvario</CardMetaRow>
    </div>
  ),
};

export const InsideCard: Story = {
  render: () => (
    <Card className="bg-white">
      <CardContent className="space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold leading-snug">Aria Bocelli</p>
          <Badge className="border-sky-200 bg-sky-100 text-sky-700">
            Nuova
          </Badge>
        </div>
        <div className="space-y-1.5 border-t pt-2.5">
          <CardMetaRow icon={<MailIcon />}>aria.bocelli@bazeapp.it</CardMetaRow>
          <CardMetaRow icon={<PhoneIcon />}>+39 333 1234567</CardMetaRow>
          <CardMetaRow icon={<Clock3Icon />}>40h | 5g</CardMetaRow>
          <CardMetaRow icon={<CalendarIcon />}>
            Creata il 11/04/2026
          </CardMetaRow>
          <CardMetaRow icon={<MapPinIcon />}>Padova, San Salvario</CardMetaRow>
        </div>
      </CardContent>
    </Card>
  ),
};

export const Truncation: Story = {
  render: () => (
    <CardMetaRow icon={<MailIcon />}>
      lisandro.enrici+famiglie_28a923fa9f@bazeapp.it
    </CardMetaRow>
  ),
};
