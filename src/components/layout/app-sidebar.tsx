import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";
import {
  BriefcaseBusinessIcon,
  ChevronsUpDownIcon,
  CircleHelpIcon,
  FolderTreeIcon,
  HomeIcon,
  LogOutIcon,
  type LucideIcon,
  SearchIcon,
  SettingsIcon,
  UserCircle2Icon,
  WalletIcon,
} from "lucide-react";

import {
  buildPathForRoute,
  type AnagraficheSidebarTab,
  type MainSection,
} from "@/routes/app-routes";

type SidebarCategoryChild = {
  name: string;
  href: string;
  anagraficheTab?: AnagraficheSidebarTab;
  mainSection?: MainSection;
};

type SidebarCategory = {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: SidebarCategoryChild[];
};

type SidebarCategoryGroup = {
  accentClassName: string;
  activeTextClassName: string;
  activeBgClassName: string;
  categories: SidebarCategory[];
};

const sidebarCategoryGroups: SidebarCategoryGroup[] = [
  {
    accentClassName: "bg-zinc-300",
    activeTextClassName: "text-primary",
    activeBgClassName: "bg-primary/5",
    categories: [
      {
        name: "Anagrafiche",
        href: "#",
        icon: FolderTreeIcon,
        children: [
          {
            name: "Lavoratori",
            href: "#",
            anagraficheTab: "lavoratori",
            mainSection: "anagrafiche",
          },
          {
            name: "Famiglie",
            href: "#",
            anagraficheTab: "famiglie",
            mainSection: "anagrafiche",
          },
          {
            name: "Processi",
            href: "#",
            anagraficheTab: "processi",
            mainSection: "anagrafiche",
          },
          {
            name: "Mesi lavorati",
            href: "#",
            anagraficheTab: "mesi_lavorati",
            mainSection: "anagrafiche",
          },
          {
            name: "Pagamenti",
            href: "#",
            anagraficheTab: "pagamenti",
            mainSection: "anagrafiche",
          },
          {
            name: "Selezioni lavoratori",
            href: "#",
            anagraficheTab: "selezioni_lavoratori",
            mainSection: "anagrafiche",
          },
          {
            name: "Rapporti lavorativi",
            href: "#",
            anagraficheTab: "rapporti_lavorativi",
            mainSection: "anagrafiche",
          },
        ],
      },
      {
        name: "Customer Support",
        href: "#",
        icon: CircleHelpIcon,
        children: [
          {
            name: "Ticket Customer",
            href: "#",
            mainSection: "customer_support_customer_ticket",
          },
          {
            name: "Ticket Payroll",
            href: "#",
            mainSection: "customer_support_payroll_ticket",
          },
        ],
      },
    ],
  },
  {
    accentClassName: "bg-primary",
    activeTextClassName: "text-primary",
    activeBgClassName: "bg-primary/5",
    categories: [
      {
        name: "CRM famiglie",
        href: "#",
        icon: FolderTreeIcon,
        children: [
          {
            name: "Pipeline Famiglie",
            href: "#",
            mainSection: "crm_pipeline_famiglie",
          },
          {
            name: "Assegnazione",
            href: "#",
            mainSection: "crm_assegnazione",
          },
        ],
      },
      {
        name: "Ricerca",
        href: "#",
        icon: SearchIcon,
        children: [
          { name: "Ricerche attive", href: "#", mainSection: "ricerca_pipeline" },
        ],
      },
      {
        name: "Lavoratori",
        href: "#",
        icon: FolderTreeIcon,
        children: [
          { name: "Cerca Lavoratori", href: "#", mainSection: "lavoratori_cerca" },
          { name: "Gate 1", href: "#", mainSection: "gate_1" },
          { name: "Gate 2", href: "#", mainSection: "gate_2" },
        ],
      },
    ],
  },
  {
    accentClassName: "bg-amber-400",
    activeTextClassName: "text-[hsl(var(--state-warm))]",
    activeBgClassName: "bg-[hsl(var(--state-warm)/0.08)]",
    categories: [
      {
        name: "Gestione contrattuale",
        href: "#",
        icon: BriefcaseBusinessIcon,
        children: [
          {
            name: "Rapporti lavorativi",
            href: "#",
            mainSection: "gestione_contrattuale_rapporti",
          },
          {
            name: "Assunzioni",
            href: "#",
            mainSection: "gestione_contrattuale_assunzioni",
          },
          {
            name: "Chiusure",
            href: "#",
            mainSection: "gestione_contrattuale_chiusure",
          },
          {
            name: "Variazioni",
            href: "#",
            mainSection: "gestione_contrattuale_variazioni",
          },
        ],
      },
      {
        name: "Payroll",
        href: "#",
        icon: WalletIcon,
        children: [
          { name: "Cedolini", href: "#", mainSection: "payroll_cedolini" },
          { name: "Contributi INPS", href: "#", mainSection: "payroll_contributi_inps" },
        ],
      },
    ],
  },
];

type AppSidebarProps = {
  user: User;
  onLogout: () => Promise<void>;
  activeMainSection?: MainSection;
  activeAnagraficheTab?: AnagraficheSidebarTab;
  onOpenAnagraficheTab?: (tab: AnagraficheSidebarTab) => void;
  onOpenCrmPipelineFamiglie?: () => void;
  onOpenCrmAssegnazione?: () => void;
  onOpenRicercaPipeline?: () => void;
  onOpenLavoratoriCerca?: () => void;
  onOpenGate1?: () => void;
  onOpenGate2?: () => void;
  onOpenGestioneContrattualeRapporti?: () => void;
  onOpenGestioneContrattualeAssunzioni?: () => void;
  onOpenGestioneContrattualeChiusure?: () => void;
  onOpenGestioneContrattualeVariazioni?: () => void;
  onOpenPayrollCedolini?: () => void;
  onOpenPayrollContributiInps?: () => void;
  onOpenCustomerSupportCustomerTicket?: () => void;
  onOpenCustomerSupportPayrollTicket?: () => void;
};

function getUserDisplayName(user: User) {
  const metadataFullName = user.user_metadata?.full_name;
  if (typeof metadataFullName === "string" && metadataFullName.trim()) {
    return metadataFullName;
  }
  return user.email ?? user.id;
}

function isChildActive(
  child: SidebarCategoryChild,
  activeMainSection?: MainSection,
  activeAnagraficheTab?: AnagraficheSidebarTab,
) {
  if (child.mainSection === "anagrafiche" && child.anagraficheTab) {
    return (
      activeMainSection === "anagrafiche" &&
      child.anagraficheTab === activeAnagraficheTab
    );
  }

  return child.mainSection === activeMainSection;
}

function buildChildHref(
  child: SidebarCategoryChild,
  activeAnagraficheTab?: AnagraficheSidebarTab,
) {
  if (child.mainSection === "anagrafiche" && child.anagraficheTab) {
    return buildPathForRoute({
      mainSection: "anagrafiche",
      anagraficheTab: child.anagraficheTab,
      ricercaProcessId: null,
    });
  }

  if (!child.mainSection) {
    return child.href;
  }

  return buildPathForRoute({
    mainSection: child.mainSection,
    anagraficheTab: activeAnagraficheTab ?? "famiglie",
    ricercaProcessId: null,
  });
}

export function AppSidebar({
  user,
  onLogout,
  activeMainSection,
  activeAnagraficheTab,
  onOpenAnagraficheTab,
  onOpenCrmPipelineFamiglie,
  onOpenCrmAssegnazione,
  onOpenRicercaPipeline,
  onOpenLavoratoriCerca,
  onOpenGate1,
  onOpenGate2,
  onOpenGestioneContrattualeRapporti,
  onOpenGestioneContrattualeAssunzioni,
  onOpenGestioneContrattualeChiusure,
  onOpenGestioneContrattualeVariazioni,
  onOpenPayrollCedolini,
  onOpenPayrollContributiInps,
  onOpenCustomerSupportCustomerTicket,
  onOpenCustomerSupportPayrollTicket,
}: AppSidebarProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const userDisplayName = getUserDisplayName(user);
  const userEmail = user.email ?? user.id;
  const logoSrc = `${import.meta.env.BASE_URL}baze.png`;

  /**
   * Categoria del menu che contiene l'item attualmente attivo. Usata per
   * tenere espansa solo la sezione di interesse: passando da una voce
   * all'altra in gruppi diversi, l'accordion della categoria precedente
   * collassa automaticamente.
   */
  const activeCategoryName = React.useMemo(() => {
    for (const group of sidebarCategoryGroups) {
      for (const category of group.categories) {
        if (
          category.children?.some((child) =>
            isChildActive(child, activeMainSection, activeAnagraficheTab),
          )
        ) {
          return category.name;
        }
      }
    }
    return null;
  }, [activeMainSection, activeAnagraficheTab]);

  const [expandedCategoryName, setExpandedCategoryName] = React.useState<
    string | null
  >(activeCategoryName);

  // Sync controlled accordion state when the active route changes from outside.
  React.useEffect(() => {
    if (activeCategoryName) {
      setExpandedCategoryName(activeCategoryName);
    }
  }, [activeCategoryName]);

  const handleChildClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, child: SidebarCategoryChild) => {
      if (child.mainSection === "anagrafiche" && child.anagraficheTab) {
        event.preventDefault();
        onOpenAnagraficheTab?.(child.anagraficheTab);
        return;
      }

      if (child.mainSection === "crm_pipeline_famiglie") {
        event.preventDefault();
        onOpenCrmPipelineFamiglie?.();
        return;
      }

      if (child.mainSection === "crm_assegnazione") {
        event.preventDefault();
        onOpenCrmAssegnazione?.();
        return;
      }

      if (child.mainSection === "ricerca_pipeline") {
        event.preventDefault();
        onOpenRicercaPipeline?.();
        return;
      }

      if (child.mainSection === "lavoratori_cerca") {
        event.preventDefault();
        onOpenLavoratoriCerca?.();
        return;
      }

      if (child.mainSection === "gate_1") {
        event.preventDefault();
        onOpenGate1?.();
        return;
      }

      if (child.mainSection === "gate_2") {
        event.preventDefault();
        onOpenGate2?.();
        return;
      }

      if (child.mainSection === "gestione_contrattuale_rapporti") {
        event.preventDefault();
        onOpenGestioneContrattualeRapporti?.();
        return;
      }

      if (child.mainSection === "gestione_contrattuale_assunzioni") {
        event.preventDefault();
        onOpenGestioneContrattualeAssunzioni?.();
        return;
      }

      if (child.mainSection === "gestione_contrattuale_chiusure") {
        event.preventDefault();
        onOpenGestioneContrattualeChiusure?.();
        return;
      }

      if (child.mainSection === "gestione_contrattuale_variazioni") {
        event.preventDefault();
        onOpenGestioneContrattualeVariazioni?.();
        return;
      }

      if (child.mainSection === "payroll_cedolini") {
        event.preventDefault();
        onOpenPayrollCedolini?.();
        return;
      }

      if (child.mainSection === "payroll_contributi_inps") {
        event.preventDefault();
        onOpenPayrollContributiInps?.();
        return;
      }

      if (child.mainSection === "customer_support_customer_ticket") {
        event.preventDefault();
        onOpenCustomerSupportCustomerTicket?.();
        return;
      }

      if (child.mainSection === "customer_support_payroll_ticket") {
        event.preventDefault();
        onOpenCustomerSupportPayrollTicket?.();
      }
    },
    [
      onOpenAnagraficheTab,
      onOpenCrmAssegnazione,
      onOpenCrmPipelineFamiglie,
      onOpenCustomerSupportCustomerTicket,
      onOpenCustomerSupportPayrollTicket,
      onOpenGate1,
      onOpenGate2,
      onOpenGestioneContrattualeAssunzioni,
      onOpenGestioneContrattualeChiusure,
      onOpenGestioneContrattualeRapporti,
      onOpenGestioneContrattualeVariazioni,
      onOpenLavoratoriCerca,
      onOpenPayrollCedolini,
      onOpenPayrollContributiInps,
      onOpenRicercaPipeline,
    ],
  );

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Sidebar className="border-r border-border/60 bg-surface">
      <SidebarHeader className="gap-3 border-b border-border/60 bg-surface px-3 py-3 group-data-[state=collapsed]/sidebar:px-2">
        <div className="flex items-center gap-2 group-data-[state=collapsed]/sidebar:flex-col">
          <div className="flex min-w-0 flex-1 items-center gap-2 group-data-[state=collapsed]/sidebar:flex-none">
            <img
              src={logoSrc}
              alt="Baze logo"
              className="h-6 w-auto shrink-0 object-contain"
            />
            <div className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
              <p className="truncate text-sm font-semibold text-foreground">
                BazeOffice
              </p>
            </div>
          </div>
          <SidebarTrigger className="size-8 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground" />
        </div>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={activeMainSection === "anagrafiche"}
              tooltip="Home"
              className="text-foreground hover:bg-surface/60 hover:text-foreground data-[active=true]:bg-transparent data-[active=true]:text-foreground data-[active=true]:shadow-none data-[active=true]:[&_svg]:text-foreground-subtle"
              onClick={() => onOpenAnagraficheTab?.("famiglie")}
            >
              <HomeIcon className="size-4 shrink-0" />
              <span className="text-sm">Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3 pt-2">
            {/*
              Single controlled Accordion across all category groups: only one
              category can be open at a time. Switching to a child of a
              different category collapses the previously open one (the effect
              above syncs `expandedCategoryName` with the route).
            */}
            <AccordionPrimitive.Root
              type="single"
              collapsible
              value={expandedCategoryName ?? ""}
              onValueChange={(value) =>
                setExpandedCategoryName(value || null)
              }
              className="space-y-3"
            >
              {sidebarCategoryGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className="relative ml-2 pl-2 group-data-[state=collapsed]/sidebar:ml-0 group-data-[state=collapsed]/sidebar:pl-1.5"
                >
                  <div
                    className={cn(
                      "absolute top-1 bottom-1 left-0 w-[3px] rounded-full",
                      group.accentClassName,
                    )}
                  />
                  <SidebarMenu>
                    {group.categories.map((category) => (
                      <SidebarMenuItem key={category.name}>
                        {category.children && category.children.length > 0 ? (
                          <AccordionPrimitive.Item
                            value={category.name}
                            className="border-none"
                          >
                            <AccordionPrimitive.Header className="flex">
                              <AccordionPrimitive.Trigger
                                className={cn(
                                  "group/sidebar-cat flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-foreground outline-none transition-colors hover:bg-surface/60 focus-visible:bg-surface/60",
                                  "group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0",
                                )}
                                title={category.name}
                              >
                                <category.icon className="size-4 shrink-0" />
                                <span className="flex-1 truncate text-left text-sm group-data-[state=collapsed]/sidebar:hidden">
                                  {category.name}
                                </span>
                                <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-(--duration-fast) group-data-[state=open]/sidebar-cat:rotate-180 group-data-[state=collapsed]/sidebar:hidden" />
                              </AccordionPrimitive.Trigger>
                            </AccordionPrimitive.Header>
                            <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                              <SidebarMenuSub className="ml-4 mt-1 space-y-0.5 border-l-0 px-0 py-0">
                                {category.children.map((child) => {
                                  const isActive = isChildActive(
                                    child,
                                    activeMainSection,
                                    activeAnagraficheTab,
                                  );

                                  return (
                                    <SidebarMenuSubItem key={child.name}>
                                      <SidebarMenuSubButton
                                        asChild
                                        isActive={isActive}
                                        className={
                                          isActive
                                            ? cn(
                                                group.activeTextClassName,
                                                group.activeBgClassName,
                                                "border-l-2 border-current font-semibold",
                                              )
                                            : "text-muted-foreground hover:bg-surface/60 hover:text-foreground"
                                        }
                                      >
                                        <a
                                          href={buildChildHref(
                                            child,
                                            activeAnagraficheTab,
                                          )}
                                          onClick={(event) =>
                                            handleChildClick(event, child)
                                          }
                                        >
                                          <span>{child.name}</span>
                                        </a>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            </AccordionPrimitive.Content>
                          </AccordionPrimitive.Item>
                        ) : (
                          <SidebarMenuButton asChild className="text-sm">
                            <a href={category.href}>
                              <category.icon className="size-4 shrink-0" />
                              <span>{category.name}</span>
                            </a>
                          </SidebarMenuButton>
                        )}
                      </SidebarMenuItem>
                    ))}
                </SidebarMenu>
              </div>
              ))}
            </AccordionPrimitive.Root>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 bg-surface p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-11 rounded-lg bg-surface/70 px-2.5 hover:bg-surface"
                  tooltip={userDisplayName}
                >
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
                    <UserCircle2Icon className="size-4 text-primary" />
                  </div>
                  <div className="grid flex-1 text-left leading-tight group-data-[state=collapsed]/sidebar:hidden">
                    <span className="truncate text-sm font-medium text-foreground">
                      {userDisplayName}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4 group-data-[state=collapsed]/sidebar:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-64">
                <DropdownMenuLabel>Il mio account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <SettingsIcon />
                  Impostazioni
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  disabled={isLoggingOut}
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleLogout();
                  }}
                >
                  <LogOutIcon />
                  {isLoggingOut ? "Logout..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
