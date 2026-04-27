"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — refresh primitive.
 *
 * Variants
 *   default          Filled accent (primary CTA). Inset-top highlight.
 *   secondary        Filled neutral.
 *   outline          1px ring, transparent fill.
 *   ghost            Hover-only background.
 *   link             Inline accent link, underline on hover.
 *   destructive      Soft red — for inline destructive actions.
 *   destructive-strong  Filled red — reserved for AlertDialog confirm.
 *
 * Sizes
 *   xs / sm / md(default) / lg
 *   icon-sm / icon / icon-lg   square
 */
const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "rounded-lg font-medium leading-none",
    "transition-[background,box-shadow,color] duration-(--duration-fast) ease-out",
    "outline-none focus-visible:shadow-(--shadow-ring)",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-neutral-950 text-foreground-on-accent!",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-neutral-800",
        ],
        secondary: [
          "bg-neutral-150 text-foreground-strong!",
          "hover:bg-neutral-200",
        ],
        outline: [
          "bg-surface text-foreground-strong!",
          "shadow-[inset_0_0_0_1px_var(--border-strong)]",
          "hover:bg-neutral-100",
        ],
        ghost: [
          "bg-transparent text-foreground-strong!",
          "hover:bg-neutral-150",
        ],
        link: [
          "bg-transparent text-accent! px-0 h-auto",
          "hover:text-accent-hover!",
        ],
        destructive: [
          "bg-danger-soft text-danger!",
          "shadow-[inset_0_0_0_1px_var(--danger)]",
          "hover:bg-danger-muted",
        ],
        "destructive-strong": [
          "bg-red-500 text-foreground-on-accent!",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-red-700",
        ],
      },
      size: {
        xs: "h-6 px-2.5 text-2xs",
        sm: "h-7 px-3 text-xs",
        default: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-md",
        "icon-sm": "h-7 w-7",
        icon: "h-9 w-9",
        "icon-lg": "h-11 w-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
