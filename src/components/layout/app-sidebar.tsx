import * as React from "react";
import {
  ChevronsUpDownIcon,
  CircleHelpIcon,
  FolderTreeIcon,
  LogOutIcon,
  type LucideIcon,
  SettingsIcon,
  SearchIcon,
  UserCircle2Icon,
  WalletIcon,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  SidebarSeparator,
} from "@/components/ui/sidebar";

type AnagraficheSidebarTab = "famiglie" | "processi" | "lavoratori";
type MainSection =
  | "anagrafiche"
  | "crm_pipeline_famiglie"
  | "crm_assegnazione";

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

const sidebarCategories: SidebarCategory[] = [
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
    children: [{ name: "Pipeline Lavoratori", href: "#" }],
  },
  {
    name: "Lavoratori",
    href: "#",
    icon: FolderTreeIcon,
    children: [
      { name: "Gate 1", href: "#" },
      { name: "Gate 2", href: "#" },
    ],
  },
  { name: "Payroll", href: "#", icon: WalletIcon },
  { name: "Customer Support", href: "#", icon: CircleHelpIcon },
];

type AppSidebarProps = {
  user: User;
  onLogout: () => Promise<void>;
  activeMainSection?: MainSection;
  activeAnagraficheTab?: AnagraficheSidebarTab;
  onOpenAnagraficheTab?: (tab: AnagraficheSidebarTab) => void;
  onOpenCrmPipelineFamiglie?: () => void;
  onOpenCrmAssegnazione?: () => void;
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
      <SidebarHeader className="px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild isActive>
              <a href="#">
                <img
                  src={logoSrc}
                  alt="Baze logo"
                  className="size-5 rounded-sm object-contain"
                />
                <span>BazeOffice</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarSeparator className="max-w-48" />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarCategories.map((category) => (
                <SidebarMenuItem key={category.name}>
                  {category.children && category.children.length > 0 ? (
                    <Accordion type="single" collapsible>
                      <AccordionItem
                        value={category.name}
                        className="border-none"
                      >
                        <AccordionTrigger className="hover:no-underline py-0">
                          <span className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm">
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
                                        activeMainSection === "crm_assegnazione")
                                    }
                                  >
                                    <a
                                      href={child.href}
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
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <UserCircle2Icon />
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">
                      {userDisplayName}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
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
    </Sidebar>
  );
}
