import * as React from "react";

import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  children?: React.ReactNode;
  className?: string;
}

interface SectionHeaderBreadcrumbProps {
  children?: React.ReactNode;
  className?: string;
}

interface SectionHeaderTitleProps {
  children: React.ReactNode;
  badge?: React.ReactNode;
  size?: "page" | "nested";
  className?: string;
}

interface SectionHeaderActionsProps {
  children?: React.ReactNode;
  className?: string;
}

interface SectionHeaderToolbarProps {
  children?: React.ReactNode;
  className?: string;
}

function SectionHeaderBreadcrumb({
  children,
  className,
}: SectionHeaderBreadcrumbProps) {
  return (
    <div
      data-slot="section-header-breadcrumb"
      className={cn(
        "text-muted-foreground flex flex-wrap items-center gap-1.5 py-2 text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
SectionHeaderBreadcrumb.displayName = "SectionHeader.Breadcrumb";

function SectionHeaderTitle({
  children,
  badge,
  size = "page",
  className,
}: SectionHeaderTitleProps) {
  return (
    <div
      data-slot="section-header-title"
      data-size={size}
      className={cn("flex min-w-0 items-center gap-3", className)}
    >
      <h1
        className={cn(
          "text-foreground min-w-0 truncate font-semibold tracking-tight",
          size === "page" ? "text-2xl" : "text-xl",
        )}
      >
        {children}
      </h1>
      {badge ? <div className="shrink-0">{badge}</div> : null}
    </div>
  );
}
SectionHeaderTitle.displayName = "SectionHeader.Title";

function SectionHeaderActions({
  children,
  className,
}: SectionHeaderActionsProps) {
  return (
    <div
      data-slot="section-header-actions"
      className={cn("flex shrink-0 items-center gap-2", className)}
    >
      {children}
    </div>
  );
}
SectionHeaderActions.displayName = "SectionHeader.Actions";

function SectionHeaderToolbar({
  children,
  className,
}: SectionHeaderToolbarProps) {
  return (
    <div
      data-slot="section-header-toolbar"
      className={cn(
        "border-border flex flex-wrap items-center gap-3 border-b py-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
SectionHeaderToolbar.displayName = "SectionHeader.Toolbar";

function SectionHeader({ children, className }: SectionHeaderProps) {
  let breadcrumb: React.ReactNode = null;
  let title: React.ReactNode = null;
  let actions: React.ReactNode = null;
  let toolbar: React.ReactNode = null;

  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (child.type === SectionHeaderBreadcrumb) breadcrumb = child;
    else if (child.type === SectionHeaderTitle) title = child;
    else if (child.type === SectionHeaderActions) actions = child;
    else if (child.type === SectionHeaderToolbar) toolbar = child;
  });

  return (
    <header
      data-slot="section-header"
      className={cn("bg-white text-foreground flex flex-col px-6", className)}
    >
      {breadcrumb}
      <div className="border-border flex items-center justify-between gap-4 border-b py-4">
        {title}
        {actions}
      </div>
      {toolbar}
    </header>
  );
}
SectionHeader.displayName = "SectionHeader";

SectionHeader.Breadcrumb = SectionHeaderBreadcrumb;
SectionHeader.Title = SectionHeaderTitle;
SectionHeader.Actions = SectionHeaderActions;
SectionHeader.Toolbar = SectionHeaderToolbar;

export { SectionHeader };
export type {
  SectionHeaderProps,
  SectionHeaderBreadcrumbProps,
  SectionHeaderTitleProps,
  SectionHeaderActionsProps,
  SectionHeaderToolbarProps,
};
