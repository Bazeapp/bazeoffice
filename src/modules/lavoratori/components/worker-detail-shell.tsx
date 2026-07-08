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
  header?: React.ReactNode;
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
        "bg-surface-muted relative min-h-0 overflow-y-auto rounded-xl border pb-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sticky top-0 z-40 flex h-12 items-end gap-3 bg-surface px-4">
        <Tabs
          value={activeSection}
          onValueChange={onSectionChange}
          className="min-w-0 flex-1"
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start gap-x-0.5 overflow-x-auto overflow-y-hidden whitespace-nowrap border-b-0 p-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-10 flex-none px-3 shadow-none"
                >
                  <TabIcon className="size-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        {topBar ? (
          <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">{topBar}</div>
        ) : null}
      </div>

      {header ? (
        <div
          ref={headerRef}
          className="sticky top-12 z-30 isolate border-b bg-surface px-4 py-4 shadow-[0_8px_16px_-18px_rgba(15,23,42,0.45)]"
        >
          {header}
        </div>
      ) : null}

      <div className="space-y-4 px-4 pt-4 text-sm">{children}</div>
    </section>
  );
}
