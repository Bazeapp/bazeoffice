import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  AlertTriangleIcon,
  BellIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  FileTextIcon,
  HomeIcon,
  MailIcon,
  MoreHorizontalIcon,
  SearchIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
} from "@/components/ui/combobox";
import { DatePicker } from "@/components/ui/date-picker";
import { DayCountSelector } from "@/components/ui/day-count-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExperienceCardTitle } from "@/components/ui/experience-card-title";
import { ExperienceLevel } from "@/components/ui/experience-level";
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldGroup,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field";
import {
  HoverCard,
  HoverCardContent,
  HoverCardFooter,
  HoverCardHeader,
  HoverCardTags,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { InputGroup } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SearchInput } from "@/components/ui/search-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarItem,
  SidebarLabel,
  SidebarSection,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableNumeric,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const meta = {
  title: "UI/Primitives",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <div className="ui w-190 rounded-lg bg-background p-6 text-foreground-strong">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function FormControlsDemo() {
  const [days, setDays] = React.useState(["Lun", "Mer", "Ven"]);

  return (
    <div className="grid grid-cols-2 gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel>Email</FieldLabel>
          <FieldControl>
            <Input placeholder="nome@bazeapp.it" />
          </FieldControl>
          <FieldHint>Campo standard con hint.</FieldHint>
        </Field>

        <Field>
          <FieldLabel>Ricerca</FieldLabel>
          <FieldControl>
            <SearchInput placeholder="Cerca lavoratore..." />
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Compenso</FieldLabel>
          <FieldControl>
            <InputGroup>
              <InputGroup.Prefix>€</InputGroup.Prefix>
              <InputGroup.Input insetLeft insetRight defaultValue="9,80" />
              <InputGroup.Suffix>netti</InputGroup.Suffix>
            </InputGroup>
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Note</FieldLabel>
          <FieldControl>
            <Textarea placeholder="Scrivi una nota..." />
          </FieldControl>
          <FieldDescription>Textarea con stile ui.</FieldDescription>
        </Field>
      </FieldGroup>

      <FieldGroup>
        <Field>
          <FieldLabel>Disponibilità</FieldLabel>
          <FieldControl>
            <DayCountSelector value={days} onChange={setDays} />
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Priorità</FieldLabel>
          <FieldControl>
            <RadioGroup defaultValue="medium" variant="segmented">
              <RadioGroupItem value="low">Bassa</RadioGroupItem>
              <RadioGroupItem value="medium">Media</RadioGroupItem>
              <RadioGroupItem value="high">Alta</RadioGroupItem>
            </RadioGroup>
          </FieldControl>
        </Field>

        <Field orientation="horizontal">
          <FieldLabel>Notifiche</FieldLabel>
          <FieldControl>
            <Switch defaultChecked />
          </FieldControl>
        </Field>

        <Field orientation="horizontal">
          <FieldLabel>Conferma</FieldLabel>
          <FieldControl>
            <Checkbox defaultChecked />
          </FieldControl>
        </Field>

        <Field>
          <FieldLabel>Data</FieldLabel>
          <FieldControl>
            <DatePicker value="2026-04-27" onChange={() => undefined} />
          </FieldControl>
        </Field>
      </FieldGroup>
    </div>
  );
}

export const ButtonsBadges: Story = {
  render: () => (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Button</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="link">Link</Button>
          <Button size="icon-sm" variant="outline" aria-label="Impostazioni">
            <SettingsIcon />
          </Button>
          <Button size="icon-sm" variant="outline" aria-label="Confermato">
            <CheckIcon />
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Badge</h3>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>
    </div>
  ),
};

export const FormControls: Story = {
  render: () => <FormControlsDemo />,
};

export const Selects: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Select base</h3>
        <Select defaultValue="colf">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Tipo lavoro" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Ruolo</SelectLabel>
              <SelectItem value="colf">Colf / Pulizie</SelectItem>
              <SelectItem value="tata">Tata</SelectItem>
              <SelectItem value="badante">Badante</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Select con dot</h3>
        <Select defaultValue="hot-attesa">
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Stato sales" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Stato</SelectLabel>
              <SelectItem value="hot-ingresso">
                <span className="size-2 rounded-full border border-red-200 bg-red-50" />
                Hot · ingresso
              </SelectItem>
              <SelectItem value="hot-attesa">
                <span className="size-2 rounded-full border border-red-200 bg-red-50" />
                Hot · in attesa
              </SelectItem>
              <SelectItem value="cold-futura">
                <span className="size-2 rounded-full border border-blue-200 bg-blue-50" />
                Cold · ricerca futura
              </SelectItem>
              <SelectSeparator />
              <SelectItem value="won">
                <span className="size-2 rounded-full border border-green-200 bg-green-50" />
                Won · ricerca attivata
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};

export const Comboboxes: Story = {
  render: () => (
    <div className="w-90 space-y-3">
      <Combobox defaultValue="milano">
        <ComboboxInput placeholder="Provincia" showClear />
        <ComboboxContent>
          <ComboboxLabel>Province</ComboboxLabel>
          <ComboboxList>
            <ComboboxItem value="milano">Milano</ComboboxItem>
            <ComboboxItem value="roma">Roma</ComboboxItem>
            <ComboboxItem value="torino">Torino</ComboboxItem>
            <ComboboxItem value="bologna">Bologna</ComboboxItem>
            <ComboboxEmpty>Nessun risultato</ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  ),
};

export const CardsAndDisclosure: Story = {
  render: () => (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Famiglia Lorenza Giannobi</CardTitle>
          <CardDescription>Card ui con header e footer.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-foreground-faint">Tipo</div>
              <div className="font-medium">Colf / Pulizie</div>
            </div>
            <div>
              <div className="text-foreground-faint">Ore</div>
              <div className="font-medium">Part time</div>
            </div>
            <div>
              <div className="text-foreground-faint">Città</div>
              <div className="font-medium">Milano</div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline">Apri dettaglio</Button>
        </CardFooter>
      </Card>

      <Accordion type="single" collapsible defaultValue="one">
        <AccordionItem value="one">
          <AccordionTrigger icon={<BriefcaseIcon />}>Orari e frequenza</AccordionTrigger>
          <AccordionContent>
            Lunedì-venerdì, 8:30-13:30 oppure 9-14.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="two">
          <AccordionTrigger icon={<HomeIcon />}>Luogo di lavoro</AccordionTrigger>
          <AccordionContent>Milano · MI · 20141 · Piano 14.</AccordionContent>
        </AccordionItem>
      </Accordion>

      <Collapsible>
        <CollapsibleTrigger>Mostra dettagli</CollapsibleTrigger>
        <CollapsibleContent className="mt-2 rounded-md bg-surface p-3 shadow-[inset_0_0_0_1px_var(--border)]">
          Contenuto collassabile.
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      <div className="space-y-2">
        <Label>Label standalone</Label>
        <div className="text-sm text-foreground-muted">
          Separatore e label usati come primitive isolate.
        </div>
      </div>
    </div>
  ),
};

export const NavigationAndOverlays: Story = {
  render: () => (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbItem href="#">Ricerche</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem href="#">Famiglie</BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbEllipsis />
        <BreadcrumbSeparator />
        <BreadcrumbItem current>Lorenza Giannobi</BreadcrumbItem>
      </Breadcrumb>

      <Tabs defaultValue="profilo">
        <TabsList>
          <TabsTrigger value="profilo" icon={<UserIcon />}>
            Profilo
          </TabsTrigger>
          <TabsTrigger value="documenti" icon={<FileTextIcon />} count={3}>
            Documenti
          </TabsTrigger>
          <TabsTrigger value="notifiche" icon={<BellIcon />}>
            Notifiche
          </TabsTrigger>
        </TabsList>
        <TabsContent value="profilo" className="mt-4 rounded-md bg-surface p-4 shadow-[inset_0_0_0_1px_var(--border)]">
          Contenuto tab profilo.
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              <div className="font-semibold">Filtro rapido</div>
              <Input placeholder="Cerca..." />
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              Azioni <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Azioni</DropdownMenuLabel>
            <DropdownMenuItem>
              Apri <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem>Duplica</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Elimina</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica record</DialogTitle>
              <DialogDescription>Dialog ui.</DialogDescription>
            </DialogHeader>
            <Input placeholder="Nome" />
            <DialogFooter>
              <Button>Salva</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <div>
                <SheetTitle>Dettaglio</SheetTitle>
                <SheetDescription>Sheet laterale ui.</SheetDescription>
              </div>
            </SheetHeader>
            <SheetBody>Contenuto sheet.</SheetBody>
            <SheetFooter>
              <Button>Conferma</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Alert</Button>
          </AlertDialogTrigger>
          <AlertDialogContent icon={<AlertTriangleIcon />} tone="danger">
            <AlertDialogTitle>Eliminare il record?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogAction requireConfirmation>Elimina</AlertDialogAction>
              <AlertDialogActions>
                <AlertDialogCancel>Annulla</AlertDialogCancel>
              </AlertDialogActions>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon">
              <MailIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Invia email</TooltipContent>
        </Tooltip>

        <HoverCard>
          <HoverCardTrigger asChild>
            <Button variant="outline">Hover card</Button>
          </HoverCardTrigger>
          <HoverCardContent>
            <HoverCardHeader>
              <Avatar name="Noelia Alfaro" size="sm" />
              <div>
                <div className="font-semibold">Noelia Alfaro</div>
                <div className="text-xs text-foreground-muted">
                  48 anni · Milano
                </div>
              </div>
            </HoverCardHeader>
            <HoverCardTags>
              <Badge variant="info">Colf</Badge>
              <Badge variant="info">Tata</Badge>
            </HoverCardTags>
            <HoverCardFooter>
              <span className="text-xs text-foreground-muted">
                Profilo rapido
              </span>
              <Badge variant="success">Attiva</Badge>
            </HoverCardFooter>
          </HoverCardContent>
        </HoverCard>
      </div>
    </div>
  ),
};

export const DataDisplay: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Avatar name="Noelia Alfaro" status="online" />
        <Avatar name="Erika Patricia" size="lg" status="busy" />
        <ExperienceLevel level="high" />
        <ExperienceCardTitle role="Colf / Pulizie" family="Famiglia Rossi" />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campo</TableHead>
            <TableHead>Stato</TableHead>
            <TableHead className="text-right">Totale</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Documenti</TableCell>
            <TableCell>
              <Badge variant="success">Completi</Badge>
            </TableCell>
            <TableNumeric>4</TableNumeric>
          </TableRow>
          <TableRow>
            <TableCell>Referenze</TableCell>
            <TableCell>
              <Badge variant="warning">Da verificare</Badge>
            </TableCell>
            <TableNumeric>2</TableNumeric>
          </TableRow>
        </TableBody>
      </Table>

      <Pagination>
        <Pagination.Range from={1} to={10} total={42} unit="record" />
        <Pagination.Pages page={2} pageCount={5} onChange={() => undefined} />
        <Pagination.PerPage value={20} options={[10, 20, 50]} onChange={() => undefined} />
      </Pagination>

      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-16" />
        <Skeleton variant="pulse" className="h-16" />
        <Skeleton variant="solid" className="h-16" />
      </div>
    </div>
  ),
};

export const SidebarPreview: Story = {
  render: () => (
    <div className="h-90 overflow-hidden rounded-lg bg-surface shadow-[0_0_0_1px_var(--border)]">
      <Sidebar className="h-full">
        <SidebarSection>
          <SidebarLabel>Menu</SidebarLabel>
          <SidebarItem active icon={<HomeIcon />}>
            Dashboard
          </SidebarItem>
          <SidebarItem icon={<SearchIcon />} count={12}>
            Ricerche
          </SidebarItem>
          <SidebarItem icon={<CalendarIcon />}>Calendario</SidebarItem>
          <SidebarItem icon={<ChevronRightIcon />}>Impostazioni</SidebarItem>
        </SidebarSection>
      </Sidebar>
    </div>
  ),
};
