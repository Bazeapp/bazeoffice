"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  HomeIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui-next/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogActions,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-next/alert-dialog";
import { Avatar } from "@/components/ui-next/avatar";
import { Badge } from "@/components/ui-next/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui-next/breadcrumb";
import { Button } from "@/components/ui-next/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui-next/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui-next/carousel";
import { Checkbox } from "@/components/ui-next/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui-next/collapsible";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsTrigger,
  ComboboxContent,
  ComboboxFooter,
  ComboboxGroup,
  ComboboxItem,
  ComboboxItemCount,
  ComboboxLabel,
  ComboboxList,
  ComboboxSearch,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui-next/combobox";
import { DatePicker } from "@/components/ui-next/date-picker";
import { DayCountSelector } from "@/components/ui-next/day-count-selector";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui-next/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui-next/dropdown-menu";
import { ExperienceCardTitle } from "@/components/ui-next/experience-card-title";
import { ExperienceLevel } from "@/components/ui-next/experience-level";
import { Field, FieldControl, FieldError, FieldHint, FieldLabel } from "@/components/ui-next/field";
import { HoverCard, HoverCardContent, HoverCardHeader, HoverCardTrigger } from "@/components/ui-next/hover-card";
import { Input } from "@/components/ui-next/input";
import { InputGroup } from "@/components/ui-next/input-group";
import { Label } from "@/components/ui-next/label";
import { Pagination } from "@/components/ui-next/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui-next/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui-next/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-next/select";
import { Separator } from "@/components/ui-next/separator";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui-next/sheet";
import { SearchInput } from "@/components/ui-next/search-input";
import { Sidebar, SidebarItem, SidebarLabel, SidebarSection } from "@/components/ui-next/sidebar";
import { Skeleton } from "@/components/ui-next/skeleton";
import { Toaster } from "@/components/ui-next/sonner";
import { Switch } from "@/components/ui-next/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableNumeric, TableRow } from "@/components/ui-next/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui-next/tabs";
import { Textarea } from "@/components/ui-next/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui-next/tooltip";

const SECTIONS: { id: string; title: string }[] = [
  { id: "button", title: "Button" },
  { id: "badge", title: "Badge" },
  { id: "input", title: "Input" },
  { id: "search-input", title: "Search Input" },
  { id: "textarea", title: "Textarea" },
  { id: "label", title: "Label" },
  { id: "field", title: "Field" },
  { id: "checkbox", title: "Checkbox" },
  { id: "radio", title: "Radio Group" },
  { id: "switch", title: "Switch" },
  { id: "select", title: "Select" },
  { id: "combobox", title: "Combobox" },
  { id: "date-picker", title: "Date Picker" },
  { id: "input-group", title: "Input Group" },
  { id: "day-count", title: "Day Count Selector" },
  { id: "experience-level", title: "Experience Level" },
  { id: "experience-card", title: "Experience Card Title" },
  { id: "card", title: "Card" },
  { id: "separator", title: "Separator" },
  { id: "avatar", title: "Avatar" },
  { id: "skeleton", title: "Skeleton" },
  { id: "tooltip", title: "Tooltip" },
  { id: "popover", title: "Popover" },
  { id: "hover-card", title: "Hover Card" },
  { id: "dropdown", title: "Dropdown Menu" },
  { id: "dialog", title: "Dialog" },
  { id: "alert-dialog", title: "Alert Dialog" },
  { id: "sheet", title: "Sheet" },
  { id: "tabs", title: "Tabs" },
  { id: "accordion", title: "Accordion" },
  { id: "collapsible", title: "Collapsible" },
  { id: "breadcrumb", title: "Breadcrumb" },
  { id: "pagination", title: "Pagination" },
  { id: "table", title: "Table" },
  { id: "carousel", title: "Carousel" },
  { id: "sidebar", title: "Sidebar" },
  { id: "toast", title: "Toast (Sonner)" },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[var(--radius-lg)] bg-[var(--surface)] p-6 shadow-[0_0_0_1px_var(--border)]"
    >
      <header className="mb-5 flex items-center justify-between">
        <h2 className="text-[var(--text-xl)] font-semibold tracking-[var(--tracking-snug)] text-[var(--foreground-strong)]">
          {title}
        </h2>
        <a
          href={`#${id}`}
          className="text-[var(--text-xs)] text-[var(--foreground-faint)] hover:text-[var(--accent)]"
        >
          #{id}
        </a>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function StateRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr] sm:items-center">
      <span className="text-[var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-wide)] text-[var(--foreground-faint)]">
        {label}
      </span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function UiNextGallery() {
  return (
    <div className="ui-next h-svh overflow-y-auto">
      <TooltipProvider delayDuration={200}>
        <div className="mx-auto flex max-w-[1200px] gap-6 px-6 py-10">
          <NavSidebar />
          <main className="flex-1 space-y-6">
            <PageHeader />
            <ButtonSection />
            <BadgeSection />
            <InputSection />
            <SearchInputSection />
            <TextareaSection />
            <LabelSection />
            <FieldSection />
            <CheckboxSection />
            <RadioSection />
            <SwitchSection />
            <SelectSection />
            <ComboboxSection />
            <DatePickerSection />
            <InputGroupSection />
            <DayCountSection />
            <ExperienceLevelSection />
            <ExperienceCardSection />
            <CardSection />
            <SeparatorSection />
            <AvatarSection />
            <SkeletonSection />
            <TooltipSection />
            <PopoverSection />
            <HoverCardSection />
            <DropdownSection />
            <DialogSection />
            <AlertDialogSection />
            <SheetSection />
            <TabsSection />
            <AccordionSection />
            <CollapsibleSection />
            <BreadcrumbSection />
            <PaginationSection />
            <TableSection />
            <CarouselSection />
            <SidebarSection2 />
            <ToastSection />
          </main>
        </div>
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="rounded-[var(--radius-lg)] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface)] p-8 shadow-[0_0_0_1px_var(--border)]">
      <div className="text-[var(--text-2xs)] font-medium uppercase tracking-[var(--tracking-wider)] text-[var(--accent-ink)]">
        ui-next · Phase 1 preview
      </div>
      <h1 className="mt-2 text-[var(--text-3xl)] font-semibold tracking-[var(--tracking-tight)] text-[var(--foreground-strong)]">
        Baze Design System refresh
      </h1>
      <p className="mt-2 max-w-[640px] text-[var(--text-sm)] text-[var(--foreground-muted)]">
        Anteprima isolata dei nuovi primitives: warm neutrals oklch, semantic
        layer, density 32px, focus halo unificato. La pagina vive sotto{" "}
        <code className="rounded-[var(--radius-xs)] bg-[var(--surface-muted)] px-1.5 py-0.5 font-[var(--font-mono)] text-[var(--text-xs)]">
          /ui-next
        </code>{" "}
        e non tocca nulla del resto dell'app.
      </p>
    </div>
  );
}

function NavSidebar() {
  return (
    <aside className="sticky top-10 hidden h-[calc(100vh-80px)] w-[200px] shrink-0 overflow-y-auto rounded-[var(--radius-lg)] bg-[var(--surface)] p-3 shadow-[0_0_0_1px_var(--border)] lg:block">
      <div className="px-2 pb-2 text-[var(--text-2xs)] font-semibold uppercase tracking-[var(--tracking-wider)] text-[var(--foreground-faint)]">
        Primitives
      </div>
      <nav className="flex flex-col gap-0.5">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-[var(--radius-sm)] px-2 py-1 text-[var(--text-xs)] text-[var(--foreground-muted)] hover:bg-[var(--neutral-100)] hover:text-[var(--foreground-strong)]"
          >
            {s.title}
          </a>
        ))}
      </nav>
    </aside>
  );
}

/* ========================================================== */
/*                         Sections                           */
/* ========================================================== */

function ButtonSection() {
  return (
    <Section id="button" title="Button">
      <StateRow label="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="destructive-strong">Destructive strong</Button>
      </StateRow>
      <StateRow label="Sizes">
        <Button size="xs">xs</Button>
        <Button size="sm">sm</Button>
        <Button size="default">default</Button>
        <Button size="lg">Get started</Button>
        <Button size="icon" aria-label="Add">
          <PlusIcon />
        </Button>
        <Button size="icon" variant="outline" aria-label="Close">
          <TrashIcon />
        </Button>
      </StateRow>
      <StateRow label="Icon sizes">
        <Button size="icon-sm" variant="outline" aria-label="search">
          <SearchIcon />
        </Button>
        <Button size="icon" variant="outline" aria-label="search">
          <SearchIcon />
        </Button>
        <Button size="icon-lg" variant="outline" aria-label="search">
          <SearchIcon />
        </Button>
      </StateRow>
      <StateRow label="With icon">
        <Button>
          <PlusIcon /> Aggiungi
        </Button>
        <Button variant="outline">
          <CopyIcon /> Copia
        </Button>
        <Button variant="destructive">
          <TrashIcon /> Elimina
        </Button>
      </StateRow>
      <StateRow label="Disabled">
        <Button disabled>Default</Button>
        <Button variant="secondary" disabled>
          Secondary
        </Button>
        <Button variant="outline" disabled>
          Outline
        </Button>
      </StateRow>
      <StateRow label="Focus (Tab to)">
        <Button>Tab to me</Button>
        <span className="text-[var(--text-xs)] text-[var(--foreground-faint)]">
          → focus ring uses var(--shadow-ring)
        </span>
      </StateRow>
    </Section>
  );
}

function BadgeSection() {
  return (
    <Section id="badge" title="Badge">
      <StateRow label="Variants">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="danger">Danger</Badge>
      </StateRow>
      <StateRow label="Shape">
        <Badge>Pill</Badge>
        <Badge shape="square">Square</Badge>
      </StateRow>
      <StateRow label="Size">
        <Badge size="sm">Small</Badge>
        <Badge size="md">Medium</Badge>
      </StateRow>
      <StateRow label="With icon">
        <Badge variant="success">
          <CheckIcon /> Pubblicato
        </Badge>
        <Badge variant="warning">
          <AlertCircleIcon /> In sospeso
        </Badge>
      </StateRow>
    </Section>
  );
}

function InputSection() {
  const [val, setVal] = React.useState("Aria Bocelli");
  return (
    <Section id="input" title="Input">
      <StateRow label="Default">
        <Input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Nome e cognome"
          className="max-w-[280px]"
        />
      </StateRow>
      <StateRow label="Empty">
        <Input placeholder="Cerca lavoratori..." className="max-w-[280px]" />
      </StateRow>
      <StateRow label="Disabled">
        <Input
          disabled
          defaultValue="Read only"
          className="max-w-[280px]"
        />
      </StateRow>
      <StateRow label="Invalid">
        <Input
          invalid
          defaultValue="codice fiscale invalido"
          className="max-w-[280px]"
        />
      </StateRow>
      <StateRow label="Type=email">
        <Input
          type="email"
          placeholder="email@bazeapp.it"
          className="max-w-[280px]"
        />
      </StateRow>
    </Section>
  );
}

function SearchInputSection() {
  const [q, setQ] = React.useState("");
  const [filled, setFilled] = React.useState("Mario");
  return (
    <Section id="search-input" title="Search Input">
      <StateRow label="Default">
        <SearchInput
          placeholder="Cerca famiglia, email, telefono..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-[420px]"
        />
      </StateRow>
      <StateRow label="With value (clearable)">
        <SearchInput
          placeholder="Cerca..."
          value={filled}
          onChange={(e) => setFilled(e.target.value)}
          onClear={() => setFilled("")}
          className="max-w-[420px]"
        />
      </StateRow>
      <StateRow label="Disabled">
        <SearchInput
          placeholder="Cerca famiglia, email, telefono..."
          disabled
          className="max-w-[420px]"
        />
      </StateRow>
    </Section>
  );
}

function TextareaSection() {
  return (
    <Section id="textarea" title="Textarea">
      <StateRow label="Default">
        <Textarea
          placeholder="Note operatore..."
          rows={3}
          className="max-w-[480px]"
        />
      </StateRow>
      <StateRow label="Disabled">
        <Textarea
          disabled
          defaultValue="Read only"
          rows={3}
          className="max-w-[480px]"
        />
      </StateRow>
      <StateRow label="Invalid">
        <Textarea
          invalid
          defaultValue="testo non valido"
          rows={3}
          className="max-w-[480px]"
        />
      </StateRow>
    </Section>
  );
}

function LabelSection() {
  return (
    <Section id="label" title="Label">
      <StateRow label="Default">
        <Label htmlFor="lbl-demo">Codice fiscale</Label>
      </StateRow>
      <StateRow label="With input">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lbl-demo-2">Email</Label>
          <Input id="lbl-demo-2" type="email" placeholder="@bazeapp.it" />
        </div>
      </StateRow>
    </Section>
  );
}

function FieldSection() {
  return (
    <Section id="field" title="Field">
      <StateRow label="Default">
        <Field>
          <FieldLabel>Nome</FieldLabel>
          <FieldControl>
            <Input placeholder="Aria" />
          </FieldControl>
          <FieldHint>Visibile solo agli operatori</FieldHint>
        </Field>
      </StateRow>
      <StateRow label="With error">
        <Field invalid>
          <FieldLabel>Codice fiscale</FieldLabel>
          <FieldControl>
            <Input invalid defaultValue="ABC" />
          </FieldControl>
          <FieldError>Lunghezza non valida (16 caratteri richiesti)</FieldError>
        </Field>
      </StateRow>
    </Section>
  );
}

function CheckboxSection() {
  const [checked, setChecked] = React.useState(true);
  return (
    <Section id="checkbox" title="Checkbox">
      <StateRow label="Unchecked">
        <Checkbox />
      </StateRow>
      <StateRow label="Checked">
        <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
      </StateRow>
      <StateRow label="Indeterminate">
        <Checkbox checked="indeterminate" />
      </StateRow>
      <StateRow label="Disabled">
        <Checkbox disabled />
        <Checkbox checked disabled />
      </StateRow>
      <StateRow label="With label">
        <label className="inline-flex items-center gap-2 text-[var(--text-sm)]">
          <Checkbox /> Includi lavoratori cessati
        </label>
      </StateRow>
    </Section>
  );
}

function RadioSection() {
  return (
    <Section id="radio" title="Radio Group">
      <StateRow label="Default">
        <RadioGroup defaultValue="weekly" className="flex flex-col gap-2">
          {[
            ["daily", "Giornaliero"],
            ["weekly", "Settimanale"],
            ["monthly", "Mensile"],
          ].map(([value, label]) => (
            <label
              key={value}
              className="inline-flex items-center gap-2 text-[var(--text-sm)]"
            >
              <RadioGroupItem value={value} /> {label}
            </label>
          ))}
        </RadioGroup>
      </StateRow>
      <StateRow label="Disabled">
        <RadioGroup defaultValue="a" disabled className="flex gap-3">
          <label className="inline-flex items-center gap-2 text-[var(--text-sm)]">
            <RadioGroupItem value="a" /> A
          </label>
          <label className="inline-flex items-center gap-2 text-[var(--text-sm)]">
            <RadioGroupItem value="b" /> B
          </label>
        </RadioGroup>
      </StateRow>
    </Section>
  );
}

function SwitchSection() {
  const [on, setOn] = React.useState(true);
  return (
    <Section id="switch" title="Switch">
      <StateRow label="Sizes">
        <Switch size="sm" defaultChecked />
        <Switch size="md" defaultChecked />
        <Switch size="lg" defaultChecked />
      </StateRow>
      <StateRow label="Off / On">
        <Switch />
        <Switch checked={on} onCheckedChange={setOn} />
      </StateRow>
      <StateRow label="Disabled">
        <Switch disabled />
        <Switch checked disabled />
      </StateRow>
    </Section>
  );
}

function SelectSection() {
  return (
    <Section id="select" title="Select">
      <StateRow label="Default">
        <Select defaultValue="senior">
          <SelectTrigger className="max-w-[240px]">
            <SelectValue placeholder="Seleziona livello" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="junior">Junior</SelectItem>
            <SelectItem value="mid">Mid</SelectItem>
            <SelectItem value="senior">Senior</SelectItem>
            <SelectItem value="specialist">Specialista</SelectItem>
          </SelectContent>
        </Select>
      </StateRow>
      <StateRow label="Disabled">
        <Select disabled>
          <SelectTrigger className="max-w-[240px]">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="x">X</SelectItem>
          </SelectContent>
        </Select>
      </StateRow>
    </Section>
  );
}

type CittaItem = { value: string; label: string; count: number };

const COMBOBOX_DEMO_ITEMS: CittaItem[] = [
  { value: "milano", label: "Milano", count: 42 },
  { value: "roma", label: "Roma", count: 28 },
  { value: "torino", label: "Torino", count: 19 },
  { value: "bologna", label: "Bologna", count: 11 },
  { value: "firenze", label: "Firenze", count: 9 },
  { value: "napoli", label: "Napoli", count: 7 },
];

function ComboboxSection() {
  const anchor = useComboboxAnchor();
  const [selected, setSelected] = React.useState<string[]>(["milano", "roma"]);

  const itemsByValue = React.useMemo(() => {
    const map = new Map<string, CittaItem>();
    COMBOBOX_DEMO_ITEMS.forEach((item) => map.set(item.value, item));
    return map;
  }, []);

  const selectedItems = React.useMemo(
    () =>
      selected
        .map((v) => itemsByValue.get(v))
        .filter((item): item is CittaItem => Boolean(item)),
    [selected, itemsByValue],
  );

  const suggestedItems = React.useMemo(
    () => COMBOBOX_DEMO_ITEMS.filter((item) => !selected.includes(item.value)),
    [selected],
  );

  const allValues = React.useMemo(
    () => COMBOBOX_DEMO_ITEMS.map((item) => item.value),
    [],
  );

  const visibleChips = selectedItems.slice(0, 2);
  const overflowChips = selectedItems.length - visibleChips.length;

  return (
    <Section id="combobox" title="Combobox">
      <StateRow label="Multi-select">
        <div className="w-[320px]">
          <Combobox
            multiple
            autoHighlight
            items={allValues}
            value={selected}
            onValueChange={(next) => setSelected(next as string[])}
          >
            <ComboboxChips ref={anchor}>
              <ComboboxValue>
                {() => (
                  <>
                    {visibleChips.map((item) => (
                      <ComboboxChip key={item.value}>{item.label}</ComboboxChip>
                    ))}
                  </>
                )}
              </ComboboxValue>
              <ComboboxChipsTrigger
                count={overflowChips > 0 ? overflowChips : undefined}
              />
            </ComboboxChips>
            <ComboboxContent
              anchor={anchor}
              className="w-[320px] max-h-[400px]"
            >
              <ComboboxSearch placeholder="Cerca città..." />
              <ComboboxList>
                {selectedItems.length > 0 ? (
                  <ComboboxGroup>
                    <ComboboxLabel>Selezionate</ComboboxLabel>
                    {selectedItems.map((item) => (
                      <ComboboxItem key={item.value} value={item.value}>
                        {item.label}
                        <ComboboxItemCount>{item.count}</ComboboxItemCount>
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                ) : null}
                {suggestedItems.length > 0 ? (
                  <ComboboxGroup>
                    <ComboboxLabel>Suggerite</ComboboxLabel>
                    {suggestedItems.map((item) => (
                      <ComboboxItem key={item.value} value={item.value}>
                        {item.label}
                        <ComboboxItemCount>{item.count}</ComboboxItemCount>
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                ) : null}
              </ComboboxList>
              <ComboboxFooter>
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-[var(--text-sm)] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                  disabled={selected.length === 0}
                >
                  Pulisci
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] px-3 text-[var(--text-sm)] font-medium text-[var(--foreground-on-accent)] shadow-[var(--shadow-sm)] transition-colors hover:bg-[var(--accent-hover)]"
                >
                  Applica ({selected.length})
                </button>
              </ComboboxFooter>
            </ComboboxContent>
          </Combobox>
        </div>
      </StateRow>
    </Section>
  );
}

function DatePickerSection() {
  const [d, setD] = React.useState("15/04/2026");
  return (
    <Section id="date-picker" title="Date Picker">
      <StateRow label="Default">
        <DatePicker
          value={d}
          onValueChange={setD}
          className="max-w-[200px]"
        />
        <span className="text-[var(--text-xs)] text-[var(--foreground-muted)]">
          → {d || "—"}
        </span>
      </StateRow>
      <StateRow label="Disabled">
        <DatePicker disabled className="max-w-[200px]" />
      </StateRow>
      <StateRow label="Invalid">
        <DatePicker invalid className="max-w-[200px]" />
      </StateRow>
    </Section>
  );
}

function InputGroupSection() {
  const [count, setCount] = React.useState(40);
  return (
    <Section id="input-group" title="Input Group">
      <StateRow label="Prefix">
        <InputGroup className="max-w-[200px]">
          <InputGroup.Prefix>€</InputGroup.Prefix>
          <InputGroup.Input insetLeft defaultValue="9,80" />
        </InputGroup>
      </StateRow>
      <StateRow label="Suffix">
        <InputGroup className="max-w-[200px]">
          <InputGroup.Input insetRight defaultValue="120" />
          <InputGroup.Suffix>€/MESE</InputGroup.Suffix>
        </InputGroup>
      </StateRow>
      <StateRow label="Joined + Addon">
        <InputGroup variant="joined" className="max-w-[280px]">
          <InputGroup.Input defaultValue="40" />
          <InputGroup.Addon>ore / settimana</InputGroup.Addon>
        </InputGroup>
      </StateRow>
      <StateRow label="Stepper">
        <InputGroup.Stepper value={count} onChange={setCount} min={0} max={168} />
      </StateRow>
    </Section>
  );
}

function DayCountSection() {
  const [days, setDays] = React.useState<string[]>(["Lun", "Mer", "Ven"]);
  return (
    <Section id="day-count" title="Day Count Selector">
      <StateRow label="Default">
        <DayCountSelector value={days} onChange={setDays} />
      </StateRow>
    </Section>
  );
}

function ExperienceLevelSection() {
  return (
    <Section id="experience-level" title="Experience Level">
      <StateRow label="Junior">
        <ExperienceLevel level="junior" />
      </StateRow>
      <StateRow label="Mid">
        <ExperienceLevel level="mid" />
      </StateRow>
      <StateRow label="Senior">
        <ExperienceLevel level="senior" />
      </StateRow>
      <StateRow label="Specialist">
        <ExperienceLevel level="specialist" />
      </StateRow>
      <StateRow label="Compact">
        <ExperienceLevel level={1} compact />
        <ExperienceLevel level={2} compact />
        <ExperienceLevel level={3} compact />
        <ExperienceLevel level={4} compact />
      </StateRow>
    </Section>
  );
}

function ExperienceCardSection() {
  return (
    <Section id="experience-card" title="Experience Card Title">
      <StateRow label="Default">
        <ExperienceCardTitle
          role="Babysitter weekend"
          duration="2 anni"
          verified
          employer="Famiglia Rossi"
          city="Milano"
          meta="2022 — 2024"
        />
      </StateRow>
    </Section>
  );
}

function CardSection() {
  return (
    <Section id="card" title="Card">
      <StateRow label="Default">
        <Card className="max-w-[360px]">
          <CardHeader>
            <CardTitle>Aria Bocelli</CardTitle>
            <CardDescription>5–10 anni · Senior</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-[var(--text-sm)] text-[var(--foreground-muted)]">
              Disponibile da maggio. Esperienza con 2 famiglie da 4+ anni.
            </p>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button variant="outline" size="sm">
              Salta
            </Button>
            <Button size="sm">Assegna</Button>
          </CardFooter>
        </Card>
      </StateRow>
    </Section>
  );
}

function SeparatorSection() {
  return (
    <Section id="separator" title="Separator">
      <StateRow label="Horizontal">
        <div className="w-[280px]">
          <Separator />
        </div>
      </StateRow>
      <StateRow label="Vertical">
        <div className="flex h-8 items-center gap-3 text-[var(--text-sm)]">
          <span>A</span>
          <Separator orientation="vertical" />
          <span>B</span>
          <Separator orientation="vertical" />
          <span>C</span>
        </div>
      </StateRow>
    </Section>
  );
}

function AvatarSection() {
  return (
    <Section id="avatar" title="Avatar">
      <StateRow label="Initials">
        <Avatar fallback="AB" />
        <Avatar fallback="LM" />
        <Avatar fallback="SR" />
      </StateRow>
      <StateRow label="Sizes">
        <Avatar fallback="XS" size="xs" />
        <Avatar fallback="SM" size="sm" />
        <Avatar fallback="MD" size="md" />
        <Avatar fallback="LG" size="lg" />
      </StateRow>
    </Section>
  );
}

function SkeletonSection() {
  return (
    <Section id="skeleton" title="Skeleton">
      <StateRow label="Shimmer">
        <div className="w-[320px] space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </StateRow>
      <StateRow label="Pulse">
        <div className="w-[320px] space-y-2">
          <Skeleton variant="pulse" className="h-4 w-2/3" />
          <Skeleton variant="pulse" className="h-4 w-full" />
        </div>
      </StateRow>
    </Section>
  );
}

function TooltipSection() {
  return (
    <Section id="tooltip" title="Tooltip">
      <StateRow label="Default">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>Crea un'attività</TooltipContent>
        </Tooltip>
      </StateRow>
      <StateRow label="With shortcut">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">New activity</Button>
          </TooltipTrigger>
          <TooltipContent shortcut="N">Crea un'attività</TooltipContent>
        </Tooltip>
      </StateRow>
      <StateRow label="Long text (max 240px)">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">Hover me</Button>
          </TooltipTrigger>
          <TooltipContent>
            Sposta nella colonna Won — la ricerca verrà attivata automaticamente.
          </TooltipContent>
        </Tooltip>
      </StateRow>
      <StateRow label="On icon">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Info">
              <AlertCircleIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Disponibilità verificata oggi</TooltipContent>
        </Tooltip>
      </StateRow>
    </Section>
  );
}

function PopoverSection() {
  return (
    <Section id="popover" title="Popover">
      <StateRow label="Default">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Apri popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <div className="text-[var(--text-sm)] font-medium">Filtri rapidi</div>
              <div className="text-[var(--text-xs)] text-[var(--foreground-muted)]">
                Contenuto del popover.
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </StateRow>
    </Section>
  );
}

function HoverCardSection() {
  return (
    <Section id="hover-card" title="Hover Card">
      <StateRow label="Default">
        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="link">@aria.bocelli</Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <HoverCardHeader>
              <Avatar fallback="AB" size="md" />
              <div>
                <div className="text-[var(--text-sm)] font-medium">Aria Bocelli</div>
                <div className="text-[var(--text-xs)] text-[var(--foreground-muted)]">
                  Senior · 5–10 anni
                </div>
              </div>
            </HoverCardHeader>
          </HoverCardContent>
        </HoverCard>
      </StateRow>
    </Section>
  );
}

function DropdownSection() {
  return (
    <Section id="dropdown" title="Dropdown Menu">
      <StateRow label="Default">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <SettingsIcon /> Azioni
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Lavoratore</DropdownMenuLabel>
            <DropdownMenuItem icon={<UserIcon />} shortcut="⌘O">
              Vai alla scheda
            </DropdownMenuItem>
            <DropdownMenuItem icon={<CopyIcon />} shortcut="⌘D">
              Duplica
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem icon={<TrashIcon />} destructive>
              Elimina
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </StateRow>
    </Section>
  );
}

function DialogSection() {
  return (
    <Section id="dialog" title="Dialog">
      <StateRow label="Default">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Apri dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica disponibilità</DialogTitle>
              <DialogDescription>
                Aggiorna i giorni in cui la lavoratrice è disponibile.
              </DialogDescription>
            </DialogHeader>
            <div className="py-2 text-[var(--text-sm)] text-[var(--foreground-muted)]">
              Body del dialog.
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Annulla</Button>
              </DialogClose>
              <Button>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </StateRow>
    </Section>
  );
}

function AlertDialogSection() {
  return (
    <Section id="alert-dialog" title="Alert Dialog">
      <StateRow label="Default">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Elimina record</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>Confermare eliminazione?</AlertDialogTitle>
            <AlertDialogDescription>
              L'azione è irreversibile. Tutti i dati associati al lavoratore
              verranno persi.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogActions>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
                <AlertDialogAction>Elimina</AlertDialogAction>
              </AlertDialogActions>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </StateRow>
    </Section>
  );
}

function SheetSection() {
  const sizes: Array<{
    label: string;
    size: "sm" | "md" | "lg" | "xl" | "full";
    note: string;
  }> = [
    { label: "sm (anagrafiche)", size: "sm", note: "max-w-md · 448px" },
    { label: "md", size: "md", note: "max-w-2xl · 672px" },
    { label: "lg", size: "lg", note: "max-w-4xl · 896px" },
    { label: "xl", size: "xl", note: "max-w-6xl · 1152px" },
    { label: "full", size: "full", note: "≈95vw" },
  ];
  return (
    <Section id="sheet" title="Sheet">
      {sizes.map(({ label, size, note }) => (
        <StateRow key={size} label={label}>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Apri sheet</Button>
            </SheetTrigger>
            <SheetContent size={size}>
              <SheetHeader>
                <SheetTitle>Dettaglio · {label}</SheetTitle>
                <SheetDescription>{note}</SheetDescription>
              </SheetHeader>
              <SheetBody>
                <div className="text-[var(--text-sm)] text-[var(--foreground-muted)]">
                  Contenuto del pannello — usa{" "}
                  <code className="rounded-[var(--radius-xs)] bg-[var(--surface-muted)] px-1 font-[var(--font-mono)] text-[var(--text-xs)]">
                    size="{size}"
                  </code>{" "}
                  sullo SheetContent.
                </div>
              </SheetBody>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="outline">Chiudi</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <span className="text-[var(--text-xs)] text-[var(--foreground-faint)]">
            {note}
          </span>
        </StateRow>
      ))}
      <StateRow label="From left">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Apri da sinistra</Button>
          </SheetTrigger>
          <SheetContent side="left" size="md">
            <SheetHeader>
              <SheetTitle>Sinistra · md</SheetTitle>
              <SheetDescription>side="left" size="md"</SheetDescription>
            </SheetHeader>
            <SheetBody>
              <div className="text-[var(--text-sm)] text-[var(--foreground-muted)]">
                Contenuto.
              </div>
            </SheetBody>
            <SheetFooter>
              <SheetClose asChild>
                <Button variant="outline">Chiudi</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </StateRow>
    </Section>
  );
}

function TabsSection() {
  return (
    <Section id="tabs" title="Tabs">
      <StateRow label="Boxed (default)">
        <Tabs defaultValue="anagrafica" className="w-full max-w-[520px]">
          <TabsList variant="boxed">
            <TabsTrigger value="anagrafica" count={12}>
              Anagrafica
            </TabsTrigger>
            <TabsTrigger value="contratto">Contratto</TabsTrigger>
            <TabsTrigger value="note" count={3}>
              Note
            </TabsTrigger>
            <TabsTrigger value="storico">Storico</TabsTrigger>
          </TabsList>
          <TabsContent value="anagrafica">
            <div className="pt-2 text-[var(--text-sm)] text-[var(--foreground-muted)]">
              Contenuto Anagrafica
            </div>
          </TabsContent>
        </Tabs>
      </StateRow>
      <StateRow label="Underline">
        <Tabs defaultValue="tutte" className="w-full max-w-[480px]">
          <TabsList variant="underline">
            <TabsTrigger value="tutte">Tutte</TabsTrigger>
            <TabsTrigger value="aperte">Aperte</TabsTrigger>
            <TabsTrigger value="chiuse">Chiuse</TabsTrigger>
            <TabsTrigger value="cessati" disabled>
              Cessati
            </TabsTrigger>
          </TabsList>
          <TabsContent value="tutte">
            <div className="pt-3 text-[var(--text-sm)] text-[var(--foreground-muted)]">
              Contenuto Tutte
            </div>
          </TabsContent>
        </Tabs>
      </StateRow>
      <StateRow label="Pills">
        <Tabs defaultValue="active" className="w-full max-w-[480px]">
          <TabsList variant="pills">
            <TabsTrigger value="active">Attivi</TabsTrigger>
            <TabsTrigger value="inactive">Sospesi</TabsTrigger>
            <TabsTrigger value="archived" count={42}>
              Archiviati
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </StateRow>
      <StateRow label="Segmented">
        <Tabs defaultValue="month" className="w-full max-w-[280px]">
          <TabsList variant="segmented">
            <TabsTrigger value="day">Giorno</TabsTrigger>
            <TabsTrigger value="week">Settimana</TabsTrigger>
            <TabsTrigger value="month">Mese</TabsTrigger>
          </TabsList>
        </Tabs>
      </StateRow>
    </Section>
  );
}

function AccordionSection() {
  return (
    <Section id="accordion" title="Accordion">
      <StateRow label="Card · with icons">
        <Accordion
          type="single"
          collapsible
          defaultValue="orari"
          className="w-full max-w-[520px]"
        >
          <AccordionItem value="orari">
            <AccordionTrigger icon={<CalendarIcon />}>
              Orari e frequenza
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-faint)]">
                    Orario di lavoro
                  </div>
                  <div className="mt-1 text-[var(--text-sm)] text-[var(--foreground-strong)]">
                    Venerdì e martedì o mercoledì
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-faint)]">
                    Ore settimanali
                  </div>
                  <div className="mt-1 text-[var(--text-sm)] text-[var(--foreground-strong)] tabular-nums">
                    8
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--foreground-faint)]">
                    Giornate preferite
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {["Venerdì", "Martedì", "Mercoledì"].map((d) => (
                      <Badge key={d} variant="info" shape="square">
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="luogo">
            <AccordionTrigger icon={<HomeIcon />}>
              Luogo di lavoro
            </AccordionTrigger>
            <AccordionContent>
              Via Torino 81, Milano · Quartiere Crocetta
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="famiglia">
            <AccordionTrigger icon={<UserIcon />}>Famiglia</AccordionTrigger>
            <AccordionContent>
              4 componenti — 2 adulti, 2 bambini (3 e 6 anni).
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="mansioni">
            <AccordionTrigger icon={<SettingsIcon />}>Mansioni</AccordionTrigger>
            <AccordionContent>
              Pulizie ordinarie, lavaggio biancheria, supporto bambini al
              rientro da scuola.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StateRow>
      <StateRow label="Flush · plain (FAQ)">
        <Accordion
          tone="flush"
          type="single"
          collapsible
          className="w-full max-w-[480px]"
        >
          <AccordionItem value="a">
            <AccordionTrigger plain>Quali documenti servono?</AccordionTrigger>
            <AccordionContent>
              Carta d'identità, codice fiscale, permesso di soggiorno (se UE
              extra).
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="b">
            <AccordionTrigger plain>Tempistiche?</AccordionTrigger>
            <AccordionContent>
              Tipicamente 5–7 giorni lavorativi dal Gate 2.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="c">
            <AccordionTrigger plain>Posso cambiare lavoratore?</AccordionTrigger>
            <AccordionContent>
              Sì, entro 30 giorni dal rapporto attivato senza costi aggiuntivi.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </StateRow>
    </Section>
  );
}

function CollapsibleSection() {
  return (
    <Section id="collapsible" title="Collapsible">
      <StateRow label="Default">
        <Collapsible className="w-full max-w-[420px]">
          <CollapsibleTrigger variant="ghost" size="sm">
            Mostra dettagli
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 text-[var(--text-sm)] text-[var(--foreground-muted)]">
              Contenuto rivelato. Mostra/nasconde con animazione.
            </div>
          </CollapsibleContent>
        </Collapsible>
      </StateRow>
    </Section>
  );
}

function BreadcrumbSection() {
  return (
    <Section id="breadcrumb" title="Breadcrumb">
      <StateRow label="Default">
        <Breadcrumb>
          <BreadcrumbItem href="#">
            <HomeIcon className="size-3.5" /> Home
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem href="#">Anagrafiche</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem current>Aria Bocelli</BreadcrumbItem>
        </Breadcrumb>
      </StateRow>
      <StateRow label="With ellipsis">
        <Breadcrumb>
          <BreadcrumbItem href="#">Home</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbEllipsis />
          <BreadcrumbSeparator />
          <BreadcrumbItem href="#">Lavoratori</BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem current>Aria</BreadcrumbItem>
        </Breadcrumb>
      </StateRow>
    </Section>
  );
}

function PaginationSection() {
  const [page, setPage] = React.useState(2);
  const [perPage, setPerPage] = React.useState(20);
  return (
    <Section id="pagination" title="Pagination">
      <StateRow label="Compound">
        <Pagination className="w-full">
          <Pagination.Range from={21} to={40} total={412} unit="lavoratori" />
          <Pagination.Pages page={page} pageCount={21} onChange={setPage} />
          <Pagination.PerPage value={perPage} onChange={setPerPage} />
        </Pagination>
      </StateRow>
    </Section>
  );
}

function TableSection() {
  return (
    <Section id="table" title="Table">
      <StateRow label="Default">
        <div className="w-full overflow-hidden rounded-[var(--radius-md)] shadow-[0_0_0_1px_var(--border)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lavoratore</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Ore</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Aria Bocelli</TableCell>
                <TableCell>
                  <Badge variant="success">Attivo</Badge>
                </TableCell>
                <TableNumeric>40</TableNumeric>
              </TableRow>
              <TableRow>
                <TableCell>Luca Marchetti</TableCell>
                <TableCell>
                  <Badge variant="warning">In sospeso</Badge>
                </TableCell>
                <TableNumeric>—</TableNumeric>
              </TableRow>
              <TableRow>
                <TableCell>Sara D'Angelo</TableCell>
                <TableCell>
                  <Badge variant="danger">Cessato</Badge>
                </TableCell>
                <TableNumeric>0</TableNumeric>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </StateRow>
    </Section>
  );
}

function CarouselSection() {
  return (
    <Section id="carousel" title="Carousel">
      <StateRow label="Default">
        <div className="w-full max-w-[480px] px-12">
          <Carousel>
            <CarouselContent>
              {Array.from({ length: 5 }).map((_, i) => (
                <CarouselItem key={i}>
                  <div className="flex h-32 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--accent-soft)] text-[var(--text-2xl)] font-semibold text-[var(--accent-ink)]">
                    Slide {i + 1}
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </StateRow>
    </Section>
  );
}

function SidebarSection2() {
  return (
    <Section id="sidebar" title="Sidebar">
      <StateRow label="Default">
        <div className="overflow-hidden rounded-[var(--radius-md)] shadow-[0_0_0_1px_var(--border)]">
          <Sidebar className="border-0">
            <SidebarSection>
              <SidebarLabel>Anagrafiche</SidebarLabel>
              <SidebarItem icon={<UserIcon />} active>
                Famiglie
              </SidebarItem>
              <SidebarItem icon={<HomeIcon />} count={42}>
                Lavoratori
              </SidebarItem>
              <SidebarItem icon={<CalendarIcon />}>Pagamenti</SidebarItem>
            </SidebarSection>
            <SidebarSection>
              <SidebarLabel>CRM</SidebarLabel>
              <SidebarItem>Pipeline</SidebarItem>
              <SidebarItem>Assegnazione</SidebarItem>
            </SidebarSection>
          </Sidebar>
        </div>
      </StateRow>
    </Section>
  );
}

function ToastSection() {
  return (
    <Section id="toast" title="Toast (Sonner)">
      <StateRow label="Variants">
        <Button onClick={() => toast("Messaggio neutro")}>Default</Button>
        <Button
          variant="outline"
          onClick={() => toast.success("Lavoratore salvato")}
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.info("Disponibilità aggiornata")}
        >
          Info
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.warning("Verifica i dati")}
        >
          Warning
        </Button>
        <Button
          variant="outline"
          onClick={() => toast.error("Errore di rete")}
        >
          Error
        </Button>
      </StateRow>
    </Section>
  );
}

export default UiNextGallery;
