"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/**
 * Sidebar — refresh primitive.
 *
 * App-shell navigation surface. Compose with Provider + Header + Content +
 * Footer + Menu/Group primitives. Skips mobile/Sheet handling on purpose;
 * the collapse state persists via cookie just like the legacy shell.
 *
 *   <SidebarProvider>
 *     <Sidebar>
 *       <SidebarHeader>...</SidebarHeader>
 *       <SidebarContent>
 *         <SidebarGroup>
 *           <SidebarGroupLabel>Menu</SidebarGroupLabel>
 *           <SidebarGroupContent>
 *             <SidebarMenu>
 *               <SidebarMenuItem>
 *                 <SidebarMenuButton isActive>...</SidebarMenuButton>
 *               </SidebarMenuItem>
 *             </SidebarMenu>
 *           </SidebarGroupContent>
 *         </SidebarGroup>
 *       </SidebarContent>
 *       <SidebarFooter>...</SidebarFooter>
 *     </Sidebar>
 *     <SidebarInset>...page content...</SidebarInset>
 *   </SidebarProvider>
 */

const SIDEBAR_COOKIE_NAME = "ui-sidebar:state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_ICON = "3rem";

type SidebarState = "expanded" | "collapsed";

interface SidebarContextValue {
  state: SidebarState;
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return ctx;
}

interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  SidebarProviderProps
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange,
      className,
      style,
      children,
      ...props
    },
    ref,
  ) => {
    const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
    const open = openProp ?? internalOpen;

    const setOpen = React.useCallback(
      (next: boolean) => {
        if (onOpenChange) {
          onOpenChange(next);
        } else {
          setInternalOpen(next);
        }
        if (typeof document !== "undefined") {
          document.cookie = `${SIDEBAR_COOKIE_NAME}=${next}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
        }
      },
      [onOpenChange],
    );

    const toggleSidebar = React.useCallback(() => {
      setOpen(!open);
    }, [open, setOpen]);

    const state: SidebarState = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextValue>(
      () => ({ state, open, setOpen, toggleSidebar }),
      [state, open, setOpen, toggleSidebar],
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          ref={ref}
          data-state={state}
          className={cn(
            "group/sidebar-root flex min-h-svh w-full has-data-[variant=inset]:bg-background-subtle",
            className,
          )}
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    );
  },
);
SidebarProvider.displayName = "SidebarProvider";

export const Sidebar = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, children, ...props }, ref) => {
  const { state } = useSidebar();
  return (
    <aside
      ref={ref}
      data-state={state}
      data-slot="sidebar"
      className={cn(
        "group/sidebar flex h-svh shrink-0 flex-col border-r border-border-subtle bg-surface",
        "transition-[width] duration-(--duration-base) ease-out",
        "w-(--sidebar-width) data-[state=collapsed]:w-(--sidebar-width-icon)",
        "overflow-hidden",
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  );
});
Sidebar.displayName = "Sidebar";

export const SidebarInset = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    data-slot="sidebar-inset"
    className={cn(
      "relative flex min-h-svh flex-1 flex-col bg-surface",
      className,
    )}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-header"
    className={cn("flex flex-col gap-2 px-3 py-3", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-content"
    className={cn(
      "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto",
      "group-data-[state=collapsed]/sidebar:overflow-hidden",
      className,
    )}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-footer"
    className={cn("flex flex-col gap-2 px-3 py-3", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-separator"
    className={cn("mx-3 my-1 h-px bg-border-subtle", className)}
    {...props}
  />
));
SidebarSeparator.displayName = "SidebarSeparator";

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-group"
    className={cn("flex flex-col gap-1 px-2", className)}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-group-label"
    className={cn(
      "px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em]",
      "text-foreground-faint",
      "group-data-[state=collapsed]/sidebar:hidden",
      className,
    )}
    {...props}
  />
));
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="sidebar-group-content"
    className={cn("flex flex-col gap-0.5", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-slot="sidebar-menu"
    className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-slot="sidebar-menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  [
    "group/menu-button peer/menu-button flex h-[34px] w-full items-center gap-2.5 rounded-sm px-2.5 text-left",
    "text-sm text-foreground-muted",
    "outline-none transition-colors duration-(--duration-fast)",
    "hover:bg-surface-muted hover:text-foreground-strong",
    "focus-visible:shadow-(--shadow-ring)",
    "disabled:pointer-events-none disabled:opacity-50",
    "data-[active=true]:bg-surface data-[active=true]:text-foreground-strong",
    "data-[active=true]:shadow-[0_1px_2px_rgba(20,20,18,.04),0_0_0_1px_var(--border)]",
    "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-foreground-subtle",
    "data-[active=true]:[&_svg]:text-accent",
    "group-data-[state=collapsed]/sidebar:justify-center group-data-[state=collapsed]/sidebar:px-0",
    "group-data-[state=collapsed]/sidebar:[&>span]:hidden",
  ].join(" "),
);

interface SidebarMenuButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof sidebarMenuButtonVariants> {
  isActive?: boolean;
  asChild?: boolean;
  tooltip?: string;
}

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuButtonProps
>(({ className, isActive, asChild, tooltip, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref as never}
      data-slot="sidebar-menu-button"
      data-active={isActive || undefined}
      title={tooltip}
      className={cn(sidebarMenuButtonVariants(), className)}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-slot="sidebar-menu-sub"
    className={cn(
      "ml-6 flex min-w-0 flex-col gap-0.5 border-l border-border-subtle pl-2",
      "group-data-[state=collapsed]/sidebar:hidden",
      className,
    )}
    {...props}
  />
));
SidebarMenuSub.displayName = "SidebarMenuSub";

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-slot="sidebar-menu-sub-item"
    className={cn("group/menu-sub-item relative", className)}
    {...props}
  />
));
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

interface SidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  asChild?: boolean;
}

export const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  SidebarMenuSubButtonProps
>(({ className, isActive, asChild, children, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref as never}
      data-slot="sidebar-menu-sub-button"
      data-active={isActive || undefined}
      className={cn(
        "flex h-7 w-full items-center gap-2 rounded-sm px-2 text-left",
        "text-sm text-foreground-muted",
        "outline-none transition-colors duration-(--duration-fast)",
        "not-data-[active=true]:hover:bg-surface-muted not-data-[active=true]:hover:text-foreground-strong",
        "data-[active=true]:font-semibold data-[active=true]:text-foreground-strong",
        "[&_svg]:size-3.5 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      ref={ref}
      type="button"
      variant="ghost"
      size="icon-sm"
      data-slot="sidebar-trigger"
      className={cn("size-8", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

/* Backwards-compat slim primitives (legacy ui/sidebar API). */

export const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-0.5", className)}
    {...props}
  />
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
      "text-foreground-faint",
      className,
    )}
    {...props}
  />
));
SidebarLabel.displayName = "SidebarLabel";

export interface SidebarItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  icon?: React.ReactNode;
  count?: React.ReactNode;
  asChild?: boolean;
}

export const SidebarItem = React.forwardRef<
  HTMLButtonElement,
  SidebarItemProps
>(({ className, active, icon, count, children, ...props }, ref) => (
  <button
    ref={ref}
    data-active={active || undefined}
    className={cn(
      "group flex h-7.5 items-center gap-2.5 rounded-sm px-2.5 text-left",
      "text-sm text-foreground-muted cursor-pointer",
      "transition-colors duration-(--duration-fast)",
      "hover:bg-surface-muted hover:text-foreground-strong",
      "data-[active=true]:bg-surface data-[active=true]:text-foreground-strong",
      "data-[active=true]:shadow-[0_1px_2px_rgba(20,20,18,.04),0_0_0_1px_var(--border)]",
      "[&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-foreground-subtle",
      "data-[active=true]:[&_svg]:text-accent",
      className,
    )}
    {...props}
  >
    {icon}
    <span className="flex-1 truncate">{children}</span>
    {count != null ? (
      <span className="text-[10px] font-medium text-foreground-faint tabular-nums">
        {count}
      </span>
    ) : null}
  </button>
));
SidebarItem.displayName = "SidebarItem";
