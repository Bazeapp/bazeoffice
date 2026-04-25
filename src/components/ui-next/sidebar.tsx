"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sidebar — refresh primitive.
 * App-shell navigation surface. Compose with Section / Item / count slots.
 */
export const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn(
      "flex flex-col w-[220px] bg-[var(--background-subtle)] p-2 gap-2",
      "border-r border-[var(--border-subtle)]",
      className
    )}
    {...props}
  />
));
Sidebar.displayName = "Sidebar";

export const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col gap-0.5", className)} {...props} />
));
SidebarSection.displayName = "SidebarSection";

export const SidebarLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
      "text-[var(--foreground-faint)]",
      className
    )}
    {...props}
  />
));
SidebarLabel.displayName = "SidebarLabel";

export interface SidebarItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
  count?: React.ReactNode;
  asChild?: boolean;
}

export const SidebarItem = React.forwardRef<HTMLButtonElement, SidebarItemProps>(
  ({ className, active, icon, count, children, ...props }, ref) => (
    <button
      ref={ref}
      data-active={active || undefined}
      className={cn(
        "group flex h-[30px] items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 text-left",
        "text-[var(--text-sm)] text-[var(--foreground-muted)] cursor-pointer",
        "transition-colors duration-[var(--duration-fast)]",
        "hover:bg-[var(--neutral-150)] hover:text-[var(--foreground-strong)]",
        "data-[active=true]:bg-[var(--surface)] data-[active=true]:text-[var(--foreground-strong)]",
        "data-[active=true]:shadow-[0_1px_2px_rgba(20,20,18,.04),0_0_0_1px_var(--border)]",
        "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-[var(--foreground-subtle)]",
        "data-[active=true]:[&_svg]:text-[var(--accent)]",
        className
      )}
      {...props}
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {count != null ? (
        <span className="text-[10px] font-medium text-[var(--foreground-faint)] tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  )
);
SidebarItem.displayName = "SidebarItem";
