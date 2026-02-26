import * as React from "react";
import type { User } from "@supabase/supabase-js";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AnagraficheTablesView } from "@/components/anagrafiche/anagrafiche-tables-view";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type AppShellProps = {
  user: User;
  onLogout: () => Promise<void>;
};

type AnagraficheSidebarTab = "famiglie" | "processi" | "lavoratori";

export function AppShell({ user, onLogout }: AppShellProps) {
  const [activeAnagraficheTab, setActiveAnagraficheTab] =
    React.useState<AnagraficheSidebarTab>("famiglie");

  return (
    <SidebarProvider>
      <AppSidebar
        user={user}
        onLogout={onLogout}
        activeAnagraficheTab={activeAnagraficheTab}
        onOpenAnagraficheTab={setActiveAnagraficheTab}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4" />
        </header>

        <main className="flex-1 min-w-0 p-4">
          <AnagraficheTablesView
            activeTab={activeAnagraficheTab}
            onActiveTabChange={setActiveAnagraficheTab}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
