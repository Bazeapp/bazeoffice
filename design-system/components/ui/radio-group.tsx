"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * RadioGroup with three variants:
 *   plain (default) — Stacked radios.
 *   card            — Each option is a tappable card with optional title/desc.
 *   segmented       — Compact segmented control for toolbars / metric switches.
 */
const groupVariants = cva("", {
  variants: {
    variant: {
      plain: "flex flex-col gap-2",
      card: "flex flex-col gap-2",
      segmented:
        "inline-flex p-0.5 bg-[var(--neutral-150)] rounded-[var(--radius-md)] gap-0",
    },
  },
  defaultVariants: { variant: "plain" },
});

const ctx = React.createContext<"plain" | "card" | "segmented">("plain");

export interface RadioGroupProps
  extends React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>,
    VariantProps<typeof groupVariants> {}

export const RadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, variant = "plain", ...props }, ref) => (
  <ctx.Provider value={variant ?? "plain"}>
    <RadioGroupPrimitive.Root
      ref={ref}
      className={cn(groupVariants({ variant }), className)}
      {...props}
    />
  </ctx.Provider>
));
RadioGroup.displayName = "RadioGroup";

export interface RadioGroupItemProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
    "children"
  > {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}

export const RadioGroupItem = React.forwardRef<
  React.ElementRef<typeof RadioGroupPrimitive.Item>,
  RadioGroupItemProps
>(({ className, title, description, children, ...props }, ref) => {
  const variant = React.useContext(ctx);

  if (variant === "segmented") {
    return (
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          "h-7 px-3 rounded-[var(--radius-sm)] text-[var(--text-xs)] font-medium",
          "text-[var(--foreground-muted)] transition-[background,color,box-shadow]",
          "data-[state=checked]:bg-[var(--surface)] data-[state=checked]:text-[var(--foreground-strong)]",
          "data-[state=checked]:shadow-[0_1px_2px_rgba(20,20,18,.05),0_0_0_1px_var(--border)]",
          "outline-none focus-visible:shadow-[var(--shadow-ring)]",
          className
        )}
        {...props}
      >
        {children ?? title}
      </RadioGroupPrimitive.Item>
    );
  }

  if (variant === "card") {
    return (
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          "group flex items-start gap-3 rounded-[var(--radius-md)] bg-[var(--surface)] p-3 text-left",
          "shadow-[inset_0_0_0_1px_var(--border)]",
          "transition-[background,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
          "data-[state=checked]:shadow-[inset_0_0_0_2px_var(--accent)]",
          "data-[state=checked]:bg-[var(--accent-soft)]",
          "outline-none focus-visible:shadow-[var(--shadow-ring),inset_0_0_0_2px_var(--accent)]",
          className
        )}
        {...props}
      >
        <RadioDot />
        <span className="flex flex-col gap-0.5 leading-tight">
          {title ? (
            <span className="text-[var(--text-sm)] font-medium text-[var(--foreground-strong)]">
              {title}
            </span>
          ) : null}
          {description ? (
            <span className="text-[var(--text-xs)] text-[var(--foreground-subtle)]">
              {description}
            </span>
          ) : null}
          {children}
        </span>
      </RadioGroupPrimitive.Item>
    );
  }

  return (
    <label className="inline-flex items-center gap-2 text-[var(--text-sm)] text-[var(--foreground-strong)]">
      <RadioGroupPrimitive.Item
        ref={ref}
        className={cn(
          "size-4 rounded-full bg-[var(--surface)]",
          "shadow-[inset_0_0_0_1px_var(--border-strong)]",
          "transition-[background,box-shadow]",
          "data-[state=checked]:shadow-[inset_0_0_0_5px_var(--accent)]",
          "outline-none focus-visible:shadow-[var(--shadow-ring),inset_0_0_0_1px_var(--border-strong)]",
          className
        )}
        {...props}
      />
      {children ?? title}
    </label>
  );
});
RadioGroupItem.displayName = "RadioGroupItem";

function RadioDot() {
  return (
    <span
      aria-hidden
      className={cn(
        "mt-0.5 size-4 shrink-0 rounded-full bg-[var(--surface)]",
        "shadow-[inset_0_0_0_1px_var(--border-strong)]",
        "group-data-[state=checked]:shadow-[inset_0_0_0_5px_var(--accent)]"
      )}
    />
  );
}
