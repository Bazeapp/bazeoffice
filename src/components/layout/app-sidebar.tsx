import * as React from "react";
import {
  BellIcon,
  BriefcaseBusinessIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  HeadphonesIcon,
  HomeIcon,
  LayoutGridIcon,
  LogOutIcon,
  type LucideIcon,
  SearchIcon,
  SettingsIcon,
  UserCheckIcon,
  UserCircle2Icon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { buildPathForRoute, type AnagraficheSidebarTab, type MainSection } from "@/routes/app-routes";
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
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type SidebarCategory = {
  name: string;
  href: string;
  icon: LucideIcon;
  children?: Array<{
    name: string;
    href: string;
    anagraficheTab?: AnagraficheSidebarTab;
    mainSection?: MainSection;
  }>;
};

type SidebarCategoryGroup = {
  borderClass: string;
  categories: SidebarCategory[];
};

const sidebarCategoryGroups: SidebarCategoryGroup[] = [
  {
    borderClass: "border-border",
    categories: [
      {
        name: "Anagrafiche",
        href: "#",
        icon: UsersIcon,
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
        ],
      },
      {
        name: "Customer Support",
        href: "#",
        icon: HeadphonesIcon,
        children: [
          { name: "Ticket Customer", href: "#", mainSection: "customer_support_customer_ticket" },
          { name: "Ticket Payroll", href: "#", mainSection: "customer_support_payroll_ticket" },
        ],
      },
    ],
  },
  {
    borderClass: "border-primary",
    categories: [
      {
        name: "CRM famiglie",
        href: "#",
        icon: LayoutGridIcon,
        children: [
          {
            name: "Pipeline Famiglie",
            href: "#",
            mainSection: "crm_pipeline_famiglie",
          },
          { name: "Assegnazione", href: "#", mainSection: "crm_assegnazione" },
        ],
      },
      {
        name: "Ricerche",
        href: "#",
        icon: SearchIcon,
        children: [
          { name: "Ricerche attive", href: "#", mainSection: "ricerca_pipeline" },
        ],
      },
      {
        name: "Lavoratori",
        href: "#",
        icon: UserCheckIcon,
        children: [
          { name: "Cerca Lavoratori", href: "#", mainSection: "lavoratori_cerca" },
          { name: "Gate 1", href: "#", mainSection: "gate_1" },
          { name: "Gate 2", href: "#", mainSection: "gate_2" },
        ],
      },
    ],
  },
  {
    borderClass: "[border-color:var(--state-warm)]",
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
  onOpenHome?: () => void;
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
  child: SidebarCategory["children"][number],
  activeMainSection: MainSection | undefined,
  activeAnagraficheTab: AnagraficheSidebarTab | undefined,
): boolean {
  if (child.mainSection === "anagrafiche" && typeof child.anagraficheTab === "string") {
    return activeMainSection === "anagrafiche" && child.anagraficheTab === activeAnagraficheTab;
  }
  return child.mainSection !== undefined && child.mainSection === activeMainSection;
}

function getChildHref(
  child: SidebarCategory["children"][number],
  activeAnagraficheTab: AnagraficheSidebarTab | undefined,
): string {
  if (child.mainSection === "anagrafiche" && child.anagraficheTab) {
    return buildPathForRoute({
      mainSection: "anagrafiche",
      anagraficheTab: child.anagraficheTab,
      ricercaProcessId: null,
    });
  }
  if (child.mainSection) {
    return buildPathForRoute({
      mainSection: child.mainSection,
      anagraficheTab: activeAnagraficheTab ?? "famiglie",
      ricercaProcessId: null,
    });
  }
  return child.href;
}

export function AppSidebar({
  user,
  onLogout,
  activeMainSection,
  activeAnagraficheTab,
  onOpenHome,
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
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({});

  function toggleSection(name: string) {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const userDisplayName = getUserDisplayName(user);
  const userEmail = user.email ?? user.id;
  const logoSrc = `${import.meta.env.BASE_URL}LOGO_BLUE_TRASPARENTE_BAZE.png`;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <Sidebar>
      <SidebarHeader className="px-2 py-2">
        <div className="flex items-center gap-2">
          <SidebarMenu className="flex-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="#">
                  <img
                    src={logoSrc}
                    alt="Baze logo"
                    className="h-6 w-auto object-contain"
                  />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarSeparator className="max-w-48" />

      <SidebarContent>
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <button
                  onClick={() => onOpenHome?.()}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                    activeMainSection === "home"
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                  }`}
                >
                  <HomeIcon className="size-4 shrink-0" />
                  <span>Home</span>
                </button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3">
            {sidebarCategoryGroups.map((group, groupIndex) => (
                <div
                  key={groupIndex}
                  className={`border-l-2 pl-3 ${group.borderClass}`}
                >
                  <SidebarMenu>
                    {group.categories.map((category) => {
                      const categoryHasActiveChild =
                        category.children?.some((child) =>
                          isChildActive(child, activeMainSection, activeAnagraficheTab)
                        ) ?? false;
                      const isOpen = openSections[category.name] ?? false;

                      return (
                        <SidebarMenuItem key={category.name}>
                          <button
                            onClick={() => toggleSection(category.name)}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors hover:bg-sidebar-accent ${
                              categoryHasActiveChild
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <category.icon
                              className={`size-4 shrink-0 ${categoryHasActiveChild ? "text-primary" : ""}`}
                            />
                            <span className="flex-1 truncate text-left">
                              {category.name}
                            </span>
                            {isOpen ? (
                              <ChevronDownIcon className="size-3.5 shrink-0" />
                            ) : (
                              <ChevronRightIcon className="size-3.5 shrink-0" />
                            )}
                          </button>

                          {isOpen && category.children && category.children.length > 0 && (
                            <SidebarMenuSub className="pb-0 [&_a]:no-underline">
                              {category.children.map((child) => {
                                const active = isChildActive(
                                  child,
                                  activeMainSection,
                                  activeAnagraficheTab,
                                );
                                return (
                                  <SidebarMenuSubItem key={child.name}>
                                    <a
                                      href={getChildHref(child, activeAnagraficheTab)}
                                      onClick={(event) => {
                                        if (!child.mainSection) return;
                                        event.preventDefault();
                                        switch (child.mainSection) {
                                          case "anagrafiche":
                                            if (child.anagraficheTab) onOpenAnagraficheTab?.(child.anagraficheTab);
                                            break;
                                          case "crm_pipeline_famiglie":
                                            onOpenCrmPipelineFamiglie?.();
                                            break;
                                          case "crm_assegnazione":
                                            onOpenCrmAssegnazione?.();
                                            break;
                                          case "ricerca_pipeline":
                                            onOpenRicercaPipeline?.();
                                            break;
                                          case "lavoratori_cerca":
                                            onOpenLavoratoriCerca?.();
                                            break;
                                          case "gate_1":
                                            onOpenGate1?.();
                                            break;
                                          case "gate_2":
                                            onOpenGate2?.();
                                            break;
                                          case "gestione_contrattuale_rapporti":
                                            onOpenGestioneContrattualeRapporti?.();
                                            break;
                                          case "gestione_contrattuale_assunzioni":
                                            onOpenGestioneContrattualeAssunzioni?.();
                                            break;
                                          case "gestione_contrattuale_chiusure":
                                            onOpenGestioneContrattualeChiusure?.();
                                            break;
                                          case "gestione_contrattuale_variazioni":
                                            onOpenGestioneContrattualeVariazioni?.();
                                            break;
                                          case "payroll_cedolini":
                                            onOpenPayrollCedolini?.();
                                            break;
                                          case "payroll_contributi_inps":
                                            onOpenPayrollContributiInps?.();
                                            break;
                                          case "customer_support_customer_ticket":
                                            onOpenCustomerSupportCustomerTicket?.();
                                            break;
                                          case "customer_support_payroll_ticket":
                                            onOpenCustomerSupportPayrollTicket?.();
                                            break;
                                        }
                                      }}
                                      className={`block w-full rounded-md px-2.5 py-1.5 text-xs transition-all ${
                                        active
                                          ? `border-l-2 bg-primary/10 font-semibold text-primary ${group.borderClass}`
                                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
                                      }`}
                                    >
                                      {child.name}
                                    </a>
                                  </SidebarMenuSubItem>
                                );
                              })}
                            </SidebarMenuSub>
                          )}
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => console.log("Notifiche — da implementare")}
            >
              <BellIcon className="size-4 shrink-0" />
              <span>Notifiche</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
                    {(userDisplayName?.[0] ?? userEmail?.[0] ?? "?").toUpperCase()}
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-[13px] font-medium">
                      {userDisplayName}
                    </span>
                    <span className="text-muted-foreground truncate text-[11px]">
                      {userEmail}
                    </span>
                  </div>
                  <ChevronsUpDownIcon className="ml-auto size-4" />
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
                  variant="destructive"
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
      <SidebarRail />
    </Sidebar>
  );
}
