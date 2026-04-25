"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Tabs — refresh primitive.
 *
 * Variants
 *   underline   Accent underline on active (default).
 *   boxed       Filled pill on active, subtle border. Built-in count chip slot.
 *   pills       Soft accent-tint pill (compact toolbars).
 *   segmented   Same look as RadioGroup variant="segmented".
 *
 * `count` prop on TabsTrigger renders a small chip after the label (every variant).
 */
const Tabs = TabsPrimitive.Root;

const listVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      underline:
        "gap-4 border-b border-[var(--border)] w-full",
      boxed: "gap-1",
      pills: "gap-1",
      segmented: "p-0.5 bg-[var(--neutral-150)] rounded-[var(--radius-md)] gap-0",
    },
  },
  defaultVariants: { variant: "underline" },
});

const triggerVariants = cva(
  [
    "inline-flex items-center gap-1.5 whitespace-nowrap font-medium leading-none",
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
          "data-[state=active]:!text-[var(--foreground-strong)] data-[state=active]:border-[var(--accent)]",
          "hover:!text-[var(--foreground)]",
        ],
        boxed: [
          "h-[30px] px-3 rounded-[var(--radius-md)] text-[var(--text-sm)] !text-[var(--foreground-subtle)]",
          "data-[state=active]:bg-[var(--surface)] data-[state=active]:!text-[var(--foreground-strong)]",
          "data-[state=active]:shadow-[inset_0_0_0_1px_var(--border-strong),0_1px_2px_rgba(20,20,18,0.04)]",
          "hover:!text-[var(--foreground)]",
        ],
        pills: [
          "h-7 px-2.5 rounded-[var(--radius-sm)] text-[var(--text-xs)] !text-[var(--foreground-muted)]",
          "data-[state=active]:bg-[var(--accent-soft)] data-[state=active]:!text-[var(--accent-ink)]",
          "hover:bg-[var(--neutral-100)]",
        ],
        segmented: [
          "h-7 px-3 rounded-[var(--radius-sm)] text-[var(--text-xs)] !text-[var(--foreground-muted)]",
          "data-[state=active]:bg-[var(--surface)] data-[state=active]:!text-[var(--foreground-strong)]",
          "data-[state=active]:shadow-[0_1px_2px_rgba(20,20,18,.05),0_0_0_1px_var(--border)]",
        ],
      },
    },
    defaultVariants: { variant: "underline" },
  }
);

const countVariants = cva(
  "inline-flex items-center justify-center tabular-nums font-semibold rounded-[var(--radius-xs)] text-[10px]",
  {
    variants: {
      variant: {
        underline:
          "h-[18px] min-w-[18px] px-1 bg-[var(--neutral-150)] !text-[var(--foreground-muted)]",
        boxed:
          "h-[18px] min-w-[18px] px-1 bg-[var(--neutral-150)] !text-[var(--foreground-muted)] group-data-[state=active]/tab-trigger:bg-[var(--neutral-200)] group-data-[state=active]/tab-trigger:!text-[var(--foreground-strong)]",
        pills:
          "h-[16px] min-w-[16px] px-1 bg-[var(--neutral-150)] !text-[var(--foreground-muted)] group-data-[state=active]/tab-trigger:bg-[var(--accent-muted)] group-data-[state=active]/tab-trigger:!text-[var(--accent-ink)]",
        segmented:
          "h-[16px] min-w-[16px] px-1 bg-[var(--neutral-200)] !text-[var(--foreground-muted)]",
      },
    },
    defaultVariants: { variant: "underline" },
  }
);

interface VariantCtx {
  variant: "underline" | "boxed" | "pills" | "segmented";
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

interface TabsTriggerProps
  extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  count?: React.ReactNode;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, count, children, ...props }, ref) => {
  const { variant } = React.useContext(TabsCtx);
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn("group/tab-trigger", triggerVariants({ variant }), className)}
      {...props}
    >
      <span>{children}</span>
      {count != null ? (
        <span className={cn(countVariants({ variant }))}>{count}</span>
      ) : null}
    </TabsPrimitive.Trigger>
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
