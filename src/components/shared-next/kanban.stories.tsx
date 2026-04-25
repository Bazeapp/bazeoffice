import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { ClockIcon, MailIcon, PhoneIcon } from "lucide-react";

import {
  KanbanColumnShell,
  KanbanColumnSkeleton,
  KanbanDeferredColumnAction,
  type KanbanColumnVisual,
} from "@/components/shared-next/kanban";
import { Badge } from "@/components/ui-next/badge";
import { Card, CardContent } from "@/components/ui-next/card";

const warmVisual: KanbanColumnVisual = {
  columnClassName: "border-t-4 border-t-amber-400",
  headerClassName: "",
  iconClassName: "text-amber-400",
};

const hotVisual: KanbanColumnVisual = {
  columnClassName: "border-t-4 border-t-red-500",
  headerClassName: "",
  iconClassName: "text-red-500",
};

const coldVisual: KanbanColumnVisual = {
  columnClassName: "border-t-4 border-t-sky-400",
  headerClassName: "",
  iconClassName: "text-sky-400",
};

const meta = {
  title: "Shared Next/Kanban",
  component: KanbanColumnShell,
  decorators: [
    (Story) => (
      <div className="ui-next h-[520px]">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    title: { control: "text" },
    countLabel: { control: "text" },
    isDropTarget: { control: "boolean" },
    density: { options: ["comfortable", "compact"], control: { type: "inline-radio" } },
    headerLayout: { options: ["inline", "stacked"], control: { type: "inline-radio" } },
    widthClassName: { control: "text" },
  },
  args: {
    columnId: "warm-lead",
    title: "Warm · Lead",
    countLabel: "15",
    visual: warmVisual,
    headerLayout: "inline",
    isDropTarget: false,
    widthClassName: "w-[320px]",
    density: "comfortable",
    onDragEnter: fn(),
    onDragOver: fn(),
    onDragLeave: fn(),
    onDrop: fn(),
  },
} satisfies Meta<typeof KanbanColumnShell>;

export default meta;
type Story = StoryObj<typeof meta>;

function DummyCard({ name, role }: { name: string; role: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  );
}

function FamigliaPreviewCard({
  name,
  badges,
  email,
  phone,
  hours,
}: {
  name: string;
  badges: Array<{ label: string; tone: "violet" | "emerald" | "amber" | "sky" | "rose" }>;
  email: string;
  phone: string;
  hours: string;
}) {
  const toneClass: Record<string, string> = {
    violet: "bg-violet-100 text-violet-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    sky: "bg-sky-100 text-sky-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <Card className="py-0 gap-0 shadow-sm">
      <CardContent className="space-y-3 px-4 py-4">
        <p className="text-sm font-semibold">{name}</p>
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b.label} variant="outline" className={`rounded-md border-0 px-2 py-0.5 text-[11px] font-medium ${toneClass[b.tone]}`}>
              {b.label}
            </Badge>
          ))}
        </div>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MailIcon className="size-3.5" />
            <span className="truncate">{email}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <PhoneIcon className="size-3.5" />
            <span>{phone}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="size-3.5" />
            <span>{hours}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ColumnShell: Story = {
  render: (args) => (
    <KanbanColumnShell {...args}>
      <DummyCard name="Aria Bocelli" role="Senior · Babysitter" />
    </KanbanColumnShell>
  ),
};

export const Compact: Story = {
  args: { density: "compact" },
  render: (args) => (
    <KanbanColumnShell {...args}>
      <DummyCard name="Aria Bocelli" role="Senior" />
      <DummyCard name="Luca Marchetti" role="Mid" />
    </KanbanColumnShell>
  ),
};

export const HeaderLayoutStacked: Story = {
  args: {
    headerLayout: "stacked",
    countLabel: "2 lavoratori",
  },
  render: (args) => (
    <KanbanColumnShell {...args}>
      <DummyCard name="Aria Bocelli" role="Senior · Babysitter" />
      <DummyCard name="Luca Marchetti" role="Mid · Colf" />
    </KanbanColumnShell>
  ),
};

export const DropTarget: Story = {
  args: { isDropTarget: true },
  render: (args) => (
    <KanbanColumnShell {...args}>
      <DummyCard name="Aria Bocelli" role="Senior · Babysitter" />
    </KanbanColumnShell>
  ),
};

export const EmptyWithFallback: Story = {
  args: {
    countLabel: "0",
    emptyState: (
      <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
        Nessun lavoratore in questa colonna.
      </div>
    ),
  },
};

export const Skeleton: StoryObj = {
  render: () => (
    <div className="ui-next flex gap-3">
      <KanbanColumnSkeleton widthClassName="w-[320px]" />
      <KanbanColumnSkeleton widthClassName="w-[320px]" cardCount={3} showBadgeRow />
      <KanbanColumnSkeleton widthClassName="w-[320px]" density="compact" cardCount={2} />
    </div>
  ),
};

export const DeferredAction: StoryObj = {
  render: () => (
    <div className="ui-next flex w-[320px] flex-col gap-2">
      <KanbanDeferredColumnAction label="Carica più lavoratori" onClick={fn()} />
      <KanbanDeferredColumnAction
        label="Carica più lavoratori"
        isLoading
        onClick={fn()}
      />
    </div>
  ),
};

export const ThreeColumnBoard: StoryObj = {
  render: () => (
    <div className="ui-next h-[640px]">
      <div className="flex h-full gap-3">
        <KanbanColumnShell
          columnId="warm-lead"
          title="Warm · Lead"
          countLabel="15"
          visual={warmVisual}
          widthClassName="w-[320px]"
          onDragEnter={fn()}
          onDragOver={fn()}
          onDrop={fn()}
        >
          <FamigliaPreviewCard
            name="Famiglia Timeto Francesca"
            badges={[
              { label: "Badante", tone: "violet" },
              { label: "Part-time", tone: "amber" },
            ]}
            email="lead01@famiglie.baze.it"
            phone="+39 330 920 4520"
            hours="20h | 3gg"
          />
          <FamigliaPreviewCard
            name="Famiglia Cantobelli Chiara"
            badges={[
              { label: "Babysitter", tone: "violet" },
              { label: "Full-time", tone: "emerald" },
            ]}
            email="lead02@famiglie.baze.it"
            phone="+39 331 921 4521"
            hours="21h | 4gg"
          />
        </KanbanColumnShell>
        <KanbanColumnShell
          columnId="hot-ingresso"
          title="Hot · Ingresso"
          countLabel="10"
          visual={hotVisual}
          widthClassName="w-[320px]"
          onDragEnter={fn()}
          onDragOver={fn()}
          onDrop={fn()}
        >
          <FamigliaPreviewCard
            name="Famiglia Grasso Cecilia"
            badges={[
              { label: "Badante", tone: "violet" },
              { label: "Full-time", tone: "emerald" },
            ]}
            email="lead16@famiglie.baze.it"
            phone="+39 334 404 2204"
            hours="12h | 3gg"
          />
          <FamigliaPreviewCard
            name="Famiglia Benedet Eleonora"
            badges={[
              { label: "Babysitter", tone: "violet" },
              { label: "Convivente", tone: "sky" },
            ]}
            email="lead17@famiglie.baze.it"
            phone="+39 335 405 2205"
            hours="13h | 4gg"
          />
        </KanbanColumnShell>
        <KanbanColumnShell
          columnId="hot-attesa"
          title="Hot · In attesa contatto"
          countLabel="10"
          visual={hotVisual}
          widthClassName="w-[320px]"
          onDragEnter={fn()}
          onDragOver={fn()}
          onDrop={fn()}
        >
          <FamigliaPreviewCard
            name="Famiglia Saibene Silvia"
            badges={[
              { label: "Babysitter", tone: "violet" },
              { label: "Part-time", tone: "amber" },
            ]}
            email="lead26@famiglie.baze.it"
            phone="+39 345 435 2235"
            hours="43h | 4gg"
          />
          <FamigliaPreviewCard
            name="Famiglia Bruno Rosa"
            badges={[
              { label: "Colf / Pulizie", tone: "emerald" },
              { label: "Full-time", tone: "emerald" },
            ]}
            email="lead27@famiglie.baze.it"
            phone="+39 346 436 2236"
            hours="44h | 5gg"
          />
        </KanbanColumnShell>
      </div>
    </div>
  ),
};

export const ColdSingle: Story = {
  args: {
    columnId: "da-colloquiare",
    title: "Da colloquiare",
    countLabel: "1",
    visual: coldVisual,
  },
  render: (args) => (
    <KanbanColumnShell {...args}>
      <DummyCard name="Aria Bocelli" role="Senior · Babysitter" />
    </KanbanColumnShell>
  ),
};
