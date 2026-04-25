"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

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
    "rounded-md font-medium leading-none",
    "transition-[background,box-shadow,color] duration-[var(--duration-fast)] ease-[var(--ease-out)]",
    "outline-none focus-visible:shadow-[var(--shadow-ring)]",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-3.5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--accent)] text-[var(--foreground-on-accent)]",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-[var(--accent-hover)]",
        ],
        secondary: [
          "bg-[var(--neutral-100)] text-[var(--foreground)]",
          "shadow-[inset_0_0_0_1px_var(--border)]",
          "hover:bg-[var(--neutral-150)]",
        ],
        outline: [
          "bg-[var(--surface)] text-[var(--foreground)]",
          "shadow-[inset_0_0_0_1px_var(--border)]",
          "hover:bg-[var(--neutral-100)]",
        ],
        ghost: [
          "bg-transparent text-[var(--foreground)]",
          "hover:bg-[var(--neutral-150)]",
        ],
        link: [
          "bg-transparent text-[var(--accent)] underline-offset-4",
          "hover:underline px-0 h-auto",
        ],
        destructive: [
          "bg-[var(--danger-soft)] text-[var(--danger)]",
          "shadow-[inset_0_0_0_1px_var(--danger-muted)]",
          "hover:bg-[var(--danger-muted)]",
        ],
        "destructive-strong": [
          "bg-[var(--red-500)] text-white",
          "shadow-[var(--shadow-sm),var(--shadow-inset-top)]",
          "hover:bg-[var(--red-700)]",
        ],
      },
      size: {
        xs: "h-[var(--h-xs)] px-2 text-[var(--text-2xs)]",
        sm: "h-[var(--h-sm)] px-2.5 text-[var(--text-xs)]",
        md: "h-[var(--h-md)] px-3 text-[var(--text-sm)]",
        lg: "h-[var(--h-lg)] px-4 text-[var(--text-md)]",
        "icon-sm": "h-[var(--h-sm)] w-[var(--h-sm)]",
        icon: "h-[var(--h-md)] w-[var(--h-md)]",
        "icon-lg": "h-[var(--h-lg)] w-[var(--h-lg)]",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
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

export { buttonVariants };
