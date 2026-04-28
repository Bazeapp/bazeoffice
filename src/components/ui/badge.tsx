import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Badge — refresh primitive.
 *
 * Variants     default · secondary · outline · success · warning · danger · info
 * Shape        pill (default) · square (12px radius for tabular contexts)
 * Tone         soft (default) · solid
 * Size         sm · md
 */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 font-medium leading-none whitespace-nowrap",
    "[&_svg]:size-3 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        default: "bg-surface-muted text-foreground",
        secondary: "bg-neutral-100 text-foreground-muted",
        outline:
          "bg-transparent text-foreground-muted shadow-[inset_0_0_0_1px_var(--border)]",
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        info: "bg-accent-soft text-accent-ink",
      },
      shape: {
        pill: "rounded-full",
        square: "rounded-sm",
      },
      size: {
        sm: "h-[18px] px-1.5 text-[10px]",
        md: "h-[22px] px-2 text-2xs",
      },
    },
    defaultVariants: { variant: "default", shape: "pill", size: "md" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, shape, size, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, shape, size }), className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";
