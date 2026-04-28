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
 *   line        Same family as underline but transparent bg, primary color on active,
 *               built for in-page navigation tabs (e.g. detail sheet section nav).
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
        "gap-4 border-b border-border w-full",
      line: "gap-4 border-b border-border w-full",
      boxed: "gap-1",
      pills: "gap-1",
      segmented: "p-0.5 bg-surface-muted rounded-md gap-0",
    },
  },
  defaultVariants: { variant: "underline" },
});

const triggerVariants = cva(
  [
    "inline-flex items-center gap-1.5 whitespace-nowrap font-medium leading-none",
    "transition-[color,background,box-shadow] duration-(--duration-fast) ease-out",
    "outline-none focus-visible:shadow-(--shadow-ring)",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-3.5",
  ],
  {
    variants: {
      variant: {
        underline: [
          "h-9 px-1 -mb-px text-sm text-foreground-subtle",
          "border-b-2 border-transparent",
          "data-[state=active]:text-foreground-strong! data-[state=active]:border-accent",
          "hover:text-foreground!",
        ],
        line: [
          "h-10 px-3 -mb-px text-sm text-foreground-subtle",
          "border-b-2 border-transparent",
          "data-[state=active]:text-accent! data-[state=active]:border-accent",
          "hover:text-foreground!",
        ],
        boxed: [
          "h-7.5 px-3 rounded-md text-sm text-foreground-subtle!",
          "data-[state=active]:bg-surface data-[state=active]:text-foreground-strong!",
          "data-[state=active]:shadow-[inset_0_0_0_1px_var(--border-strong),0_1px_2px_rgba(20,20,18,0.04)]",
          "hover:text-foreground!",
        ],
        pills: [
          "h-7 px-2.5 rounded-sm text-xs text-foreground-muted!",
          "data-[state=active]:bg-accent-soft data-[state=active]:text-accent-ink!",
          "hover:bg-neutral-100",
        ],
        segmented: [
          "h-7 px-3 rounded-sm text-xs text-foreground-muted!",
          "data-[state=active]:bg-surface data-[state=active]:text-foreground-strong!",
          "data-[state=active]:shadow-[0_1px_2px_rgba(20,20,18,.05),0_0_0_1px_var(--border)]",
        ],
      },
    },
    defaultVariants: { variant: "underline" },
  }
);

const countVariants = cva(
  "inline-flex items-center justify-center tabular-nums font-semibold rounded-sm text-[10px]",
  {
    variants: {
      variant: {
        underline:
          "h-[18px] min-w-[18px] px-1 bg-surface-muted text-foreground-muted!",
        line:
          "h-[18px] min-w-[18px] px-1 bg-surface-muted text-foreground-muted!",
        boxed:
          "h-[18px] min-w-[18px] px-1 bg-surface-muted text-foreground-muted! group-data-[state=active]/tab-trigger:bg-neutral-200 group-data-[state=active]/tab-trigger:text-foreground-strong!",
        pills:
          "h-4 min-w-4 px-1 bg-surface-muted text-foreground-muted! group-data-[state=active]/tab-trigger:bg-accent-muted group-data-[state=active]/tab-trigger:text-accent-ink!",
        segmented:
          "h-4 min-w-4 px-1 bg-neutral-200 text-foreground-muted!",
      },
    },
    defaultVariants: { variant: "underline" },
  }
);

interface VariantCtx {
  variant: "underline" | "line" | "boxed" | "pills" | "segmented";
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
      {children}
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
      "mt-3 outline-none focus-visible:shadow-(--shadow-ring) rounded-sm",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
