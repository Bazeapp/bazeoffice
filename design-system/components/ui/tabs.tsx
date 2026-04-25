"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Tabs — refresh primitive.
 *   underline (default) — bordered list, accent underline on active.
 *   pills               — soft pill highlight (for compact toolbars).
 *   segmented           — same look as RadioGroup variant="segmented".
 */
const Tabs = TabsPrimitive.Root;

const listVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      underline:
        "gap-4 border-b border-[var(--border)] w-full",
      pills: "gap-1",
      segmented: "p-0.5 bg-[var(--neutral-150)] rounded-[var(--radius-md)] gap-0",
    },
  },
  defaultVariants: { variant: "underline" },
});

const triggerVariants = cva(
  [
    "inline-flex items-center gap-2 whitespace-nowrap font-medium leading-none",
    "transition-[color,background,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "outline-none focus-visible:shadow-[var(--shadow-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-3.5",
  ],
  {
    variants: {
      variant: {
        underline: [
          "h-9 px-1 -mb-px text-[var(--text-sm)] text-[var(--foreground-subtle)]",
          "border-b-2 border-transparent",
          "data-[state=active]:text-[var(--foreground-strong)] data-[state=active]:border-[var(--accent)]",
          "hover:text-[var(--foreground)]",
        ],
        pills: [
          "h-7 px-2.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] text-[var(--foreground-muted)]",
          "data-[state=active]:bg-[var(--accent-soft)] data-[state=active]:text-[var(--accent-ink)]",
          "hover:bg-[var(--neutral-100)]",
        ],
        segmented: [
          "h-7 px-3 rounded-[var(--radius-sm)] text-[var(--text-xs)] text-[var(--foreground-muted)]",
          "data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--foreground-strong)]",
          "data-[state=active]:shadow-[0_1px_2px_rgba(20,20,18,.05),0_0_0_1px_var(--border)]",
        ],
      },
    },
    defaultVariants: { variant: "underline" },
  }
);

interface VariantCtx {
  variant: "underline" | "pills" | "segmented";
}
const TabsCtx = React.createContext<VariantCtx>({ variant: "underline" });

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> &
    VariantProps<typeof listVariants>
>(({ className, variant = "underline", ...props }, ref) => (
  <TabsCtx.Provider value={{ variant: variant ?? "underline" }}>
    <TabsPrimitive.List
      ref={ref}
      className={cn(listVariants({ variant }), className)}
      {...props}
    />
  </TabsCtx.Provider>
));
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => {
  const { variant } = React.useContext(TabsCtx);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(triggerVariants({ variant }), className)}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 outline-none focus-visible:shadow-[var(--shadow-ring)] rounded-[var(--radius-sm)]",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
