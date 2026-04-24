import * as React from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type WorkerDetailSectionTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type WorkerDetailShellProps = {
  tabs: WorkerDetailSectionTab[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  topBar?: React.ReactNode;
  header: React.ReactNode;
  children: React.ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
  headerRef?: React.Ref<HTMLDivElement>;
  className?: string;
};

export function WorkerDetailShell({
  tabs,
  activeSection,
  onSectionChange,
  topBar,
  header,
  children,
  sectionRef,
  headerRef,
  className,
}: WorkerDetailShellProps) {
  return (
    <section
      ref={sectionRef}
      className={[
        "bg-background relative min-h-0 overflow-y-auto rounded-xl border px-4 pt-0 pb-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-6">
        <div className="sticky top-0 z-40 -mx-4 -mt-4 -mr-4 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur">
          <Tabs
            value={activeSection}
            onValueChange={onSectionChange}
            className="min-w-0 flex-1"
          >
            <TabsList
              variant="line"
              className="h-auto w-full justify-start gap-x-1 overflow-x-auto overflow-y-hidden whitespace-nowrap p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="text-muted-foreground/50 h-10 flex-none rounded-full px-3 text-sm shadow-none"
                  >
                    <TabIcon className="size-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          {topBar ? (
            <div className="ml-auto flex shrink-0 items-center gap-2">{topBar}</div>
          ) : null}
        </div>

        <div className="space-y-6 text-sm">
          <div
            ref={headerRef}
            className="sticky top-14 z-50 -mx-1 isolate space-y-3 border-b bg-background px-1 pb-4 shadow-[0_8px_16px_-18px_rgba(15,23,42,0.45)]"
          >
            {header}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
