import * as React from "react";
import {
  ChevronsUpDownIcon,
  CircleHelpIcon,
  FolderTreeIcon,
  LogOutIcon,
  type LucideIcon,
  SettingsIcon,
  SearchIcon,
  BriefcaseBusinessIcon,
  UserCircle2Icon,
  WalletIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { buildPathForRoute, type AnagraficheSidebarTab, type MainSection } from "@/routes/app-routes";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  accentClassName: string;
  categories: SidebarCategory[];
};

const sidebarCategoryGroups: SidebarCategoryGroup[] = [
  {
    accentClassName: "bg-zinc-300",
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
        ],
      },
      {
        name: "Customer Support",
        href: "#",
        icon: CircleHelpIcon,
        children: [
          { name: "Ticket Customer", href: "#", mainSection: "customer_support_customer_ticket" },
          { name: "Ticket Payroll", href: "#", mainSection: "customer_support_payroll_ticket" },
        ],
      },
    ],
  },
  {
    accentClassName: "bg-primary",
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
          { name: "Assegnazione", href: "#", mainSection: "crm_assegnazione" },
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
              <SidebarMenuButton asChild isActive>
                <a href="#">
                  <img
                    src={logoSrc}
                    alt="Baze logo"
                    className="size-[18px] rounded-sm object-contain"
                  />
                  <span>BazeOffice</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarSeparator className="max-w-48" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-3">
            {sidebarCategoryGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="relative pl-3">
                <div
                  className={`absolute top-1 bottom-1 left-0 w-0.5 rounded-full ${group.accentClassName}`}
                />
                <SidebarMenu>
                  {group.categories.map((category) => (
                    <SidebarMenuItem key={category.name}>
                  {category.children && category.children.length > 0 ? (
                    <Accordion type="single" collapsible>
                      <AccordionItem
                        value={category.name}
                        className="border-none"
                      >
                        <AccordionTrigger className="hover:no-underline py-0">
                          <span className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-7 w-full items-center gap-2 rounded-md px-2 text-[13px]">
                            <category.icon className="size-4 shrink-0" />
                            <span className="truncate">{category.name}</span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-0 [&_a]:no-underline">
                          <SidebarMenuSub className="pb-0">
                            {category.children.map((child) => {
                              const isAnagraficheChild =
                                child.mainSection === "anagrafiche" &&
                                typeof child.anagraficheTab === "string";
                              const isCrmPipelineChild =
                                child.mainSection === "crm_pipeline_famiglie";
                              const isCrmAssegnazioneChild =
                                child.mainSection === "crm_assegnazione";
                              const isRicercaPipelineChild =
                                child.mainSection === "ricerca_pipeline";
                              const isLavoratoriCercaChild =
                                child.mainSection === "lavoratori_cerca";
                              const isGate1Child =
                                child.mainSection === "gate_1";
                              const isGate2Child =
                                child.mainSection === "gate_2";
                              const isGestioneContrattualeRapportiChild =
                                child.mainSection ===
                                "gestione_contrattuale_rapporti";
                              const isGestioneContrattualeAssunzioniChild =
                                child.mainSection ===
                                "gestione_contrattuale_assunzioni";
                              const isGestioneContrattualeChiusureChild =
                                child.mainSection ===
                                "gestione_contrattuale_chiusure";
                              const isGestioneContrattualeVariazioniChild =
                                child.mainSection ===
                                "gestione_contrattuale_variazioni";
                              const isPayrollCedoliniChild =
                                child.mainSection === "payroll_cedolini";
                              const isPayrollContributiInpsChild =
                                child.mainSection === "payroll_contributi_inps";
                              const isCustomerSupportCustomerChild =
                                child.mainSection === "customer_support_customer_ticket";
                              const isCustomerSupportPayrollChild =
                                child.mainSection === "customer_support_payroll_ticket";

                              return (
                                <SidebarMenuSubItem key={child.name}>
                                  <SidebarMenuSubButton
                                    asChild
                                    isActive={
                                      (Boolean(isAnagraficheChild) &&
                                        activeMainSection === "anagrafiche" &&
                                        child.anagraficheTab ===
                                          activeAnagraficheTab) ||
                                      (isCrmPipelineChild &&
                                        activeMainSection ===
                                          "crm_pipeline_famiglie") ||
                                      (isCrmAssegnazioneChild &&
                                        activeMainSection ===
                                          "crm_assegnazione") ||
                                      (isRicercaPipelineChild &&
                                        activeMainSection ===
                                          "ricerca_pipeline") ||
                                      (isLavoratoriCercaChild &&
                                        activeMainSection ===
                                          "lavoratori_cerca") ||
                                      (isGate1Child &&
                                        activeMainSection === "gate_1") ||
                                      (isGate2Child &&
                                        activeMainSection === "gate_2") ||
                                      (isGestioneContrattualeRapportiChild &&
                                        activeMainSection ===
                                          "gestione_contrattuale_rapporti") ||
                                      (isGestioneContrattualeAssunzioniChild &&
                                        activeMainSection ===
                                          "gestione_contrattuale_assunzioni") ||
                                      (isGestioneContrattualeChiusureChild &&
                                        activeMainSection ===
                                          "gestione_contrattuale_chiusure") ||
                                      (isGestioneContrattualeVariazioniChild &&
                                        activeMainSection ===
                                          "gestione_contrattuale_variazioni") ||
                                      (isPayrollCedoliniChild &&
                                        activeMainSection === "payroll_cedolini") ||
                                      (isPayrollContributiInpsChild &&
                                        activeMainSection === "payroll_contributi_inps") ||
                                      (isCustomerSupportCustomerChild &&
                                        activeMainSection === "customer_support_customer_ticket") ||
                                      (isCustomerSupportPayrollChild &&
                                        activeMainSection === "customer_support_payroll_ticket")
                                    }
                                  >
                                    <a
                                      href={
                                        isAnagraficheChild &&
                                        child.anagraficheTab
                                          ? buildPathForRoute({
                                              mainSection: "anagrafiche",
                                              anagraficheTab: child.anagraficheTab,
                                              ricercaProcessId: null,
                                            })
                                          : isCrmPipelineChild
                                            ? buildPathForRoute({
                                                mainSection: "crm_pipeline_famiglie",
                                                anagraficheTab:
                                                  activeAnagraficheTab ?? "famiglie",
                                                ricercaProcessId: null,
                                              })
                                            : isCrmAssegnazioneChild
                                              ? buildPathForRoute({
                                                  mainSection: "crm_assegnazione",
                                                  anagraficheTab:
                                                    activeAnagraficheTab ?? "famiglie",
                                                  ricercaProcessId: null,
                                                })
                                              : isRicercaPipelineChild
                                                ? buildPathForRoute({
                                                    mainSection: "ricerca_pipeline",
                                                    anagraficheTab:
                                                      activeAnagraficheTab ?? "famiglie",
                                                    ricercaProcessId: null,
                                                  })
                                                : isLavoratoriCercaChild
                                                  ? buildPathForRoute({
                                                      mainSection: "lavoratori_cerca",
                                                      anagraficheTab:
                                                        activeAnagraficheTab ?? "famiglie",
                                                      ricercaProcessId: null,
                                                    })
                                                  : isGate1Child
                                                    ? buildPathForRoute({
                                                        mainSection: "gate_1",
                                                        anagraficheTab:
                                                          activeAnagraficheTab ?? "famiglie",
                                                        ricercaProcessId: null,
                                                      })
                                                    : isGate2Child
                                                      ? buildPathForRoute({
                                                          mainSection: "gate_2",
                                                          anagraficheTab:
                                                            activeAnagraficheTab ?? "famiglie",
                                                          ricercaProcessId: null,
                                                        })
                                                      : isGestioneContrattualeRapportiChild
                                                        ? buildPathForRoute({
                                                            mainSection:
                                                              "gestione_contrattuale_rapporti",
                                                            anagraficheTab:
                                                              activeAnagraficheTab ?? "famiglie",
                                                            ricercaProcessId: null,
                                                          })
                                                        : isGestioneContrattualeAssunzioniChild
                                                          ? buildPathForRoute({
                                                              mainSection:
                                                                "gestione_contrattuale_assunzioni",
                                                              anagraficheTab:
                                                                activeAnagraficheTab ?? "famiglie",
                                                              ricercaProcessId: null,
                                                            })
                                                          : isGestioneContrattualeChiusureChild
                                                            ? buildPathForRoute({
                                                                mainSection:
                                                                  "gestione_contrattuale_chiusure",
                                                                anagraficheTab:
                                                                  activeAnagraficheTab ?? "famiglie",
                                                                ricercaProcessId: null,
                                                              })
                                                            : isGestioneContrattualeVariazioniChild
                                                              ? buildPathForRoute({
                                                                  mainSection:
                                                                    "gestione_contrattuale_variazioni",
                                                                  anagraficheTab:
                                                                    activeAnagraficheTab ?? "famiglie",
                                                                  ricercaProcessId: null,
                                                                })
                                                              : isPayrollCedoliniChild
                                                                ? buildPathForRoute({
                                                                    mainSection: "payroll_cedolini",
                                                                    anagraficheTab:
                                                                      activeAnagraficheTab ?? "famiglie",
                                                                    ricercaProcessId: null,
                                                                  })
                                                                : isPayrollContributiInpsChild
                                                                  ? buildPathForRoute({
                                                                      mainSection:
                                                                        "payroll_contributi_inps",
                                                                      anagraficheTab:
                                                                        activeAnagraficheTab ?? "famiglie",
                                                                      ricercaProcessId: null,
                                                                    })
                                                                  : isCustomerSupportCustomerChild
                                                                    ? buildPathForRoute({
                                                                        mainSection:
                                                                          "customer_support_customer_ticket",
                                                                        anagraficheTab:
                                                                          activeAnagraficheTab ?? "famiglie",
                                                                        ricercaProcessId: null,
                                                                      })
                                                                    : isCustomerSupportPayrollChild
                                                                      ? buildPathForRoute({
                                                                          mainSection:
                                                                            "customer_support_payroll_ticket",
                                                                          anagraficheTab:
                                                                            activeAnagraficheTab ?? "famiglie",
                                                                          ricercaProcessId: null,
                                                                        })
                                                      : child.href
                                      }
                                      onClick={(event) => {
                                        if (
                                          isAnagraficheChild &&
                                          child.anagraficheTab
                                        ) {
                                          event.preventDefault();
                                          onOpenAnagraficheTab?.(
                                            child.anagraficheTab,
                                          );
                                          return;
                                        }

                                        if (isCrmPipelineChild) {
                                          event.preventDefault();
                                          onOpenCrmPipelineFamiglie?.();
                                          return;
                                        }

                                        if (isCrmAssegnazioneChild) {
                                          event.preventDefault();
                                          onOpenCrmAssegnazione?.();
                                          return;
                                        }

                                        if (isRicercaPipelineChild) {
                                          event.preventDefault();
                                          onOpenRicercaPipeline?.();
                                          return;
                                        }

                                        if (isLavoratoriCercaChild) {
                                          event.preventDefault();
                                          onOpenLavoratoriCerca?.();
                                          return;
                                        }

                                        if (isGate1Child) {
                                          event.preventDefault();
                                          onOpenGate1?.();
                                          return;
                                        }

                                        if (isGate2Child) {
                                          event.preventDefault();
                                          onOpenGate2?.();
                                          return;
                                        }

                                        if (isGestioneContrattualeRapportiChild) {
                                          event.preventDefault();
                                          onOpenGestioneContrattualeRapporti?.();
                                          return;
                                        }

                                        if (isGestioneContrattualeAssunzioniChild) {
                                          event.preventDefault();
                                          onOpenGestioneContrattualeAssunzioni?.();
                                          return;
                                        }

                                        if (isGestioneContrattualeChiusureChild) {
                                          event.preventDefault();
                                          onOpenGestioneContrattualeChiusure?.();
                                          return;
                                        }

                                        if (isGestioneContrattualeVariazioniChild) {
                                          event.preventDefault();
                                          onOpenGestioneContrattualeVariazioni?.();
                                          return;
                                        }

                                        if (isPayrollCedoliniChild) {
                                          event.preventDefault();
                                          onOpenPayrollCedolini?.();
                                          return;
                                        }

                                        if (isPayrollContributiInpsChild) {
                                          event.preventDefault();
                                          onOpenPayrollContributiInps?.();
                                          return;
                                        }

                                        if (isCustomerSupportCustomerChild) {
                                          event.preventDefault();
                                          onOpenCustomerSupportCustomerTicket?.();
                                          return;
                                        }

                                        if (isCustomerSupportPayrollChild) {
                                          event.preventDefault();
                                          onOpenCustomerSupportPayrollTicket?.();
                                        }
                                      }}
                                    >
                                      <span>{child.name}</span>
                                    </a>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ) : (
                    <SidebarMenuButton asChild>
                      <a href={category.href}>
                        <category.icon />
                        <span>{category.name}</span>
                      </a>
                    </SidebarMenuButton>
                  )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton>
                  <UserCircle2Icon />
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
