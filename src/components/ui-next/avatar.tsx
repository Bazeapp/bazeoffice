"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Avatar — refresh primitive.
 *
 * Sizes  xs(20) · sm(24) · md(32) · lg(40) · xl(56) · 2xl(80)
 * Tones  neutral (default) · blue · green · amber · red — for initial fallbacks
 * Status optional dot (online · offline · away · busy)
 */
const avatarVariants = cva(
  "relative inline-flex shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        xs: "size-5 text-[9px]",
        sm: "size-6 text-[10px]",
        md: "size-8 text-[11px]",
        lg: "size-10 text-[13px]",
        xl: "size-14 text-[16px]",
        "2xl": "size-20 text-[22px]",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: { size: "md", shape: "circle" },
  }
);

const fallbackTones: Record<string, string> = {
  neutral: "bg-[var(--neutral-200)] text-[var(--neutral-700)]",
  blue: "bg-[var(--blue-100)] text-[var(--blue-700)]",
  green: "bg-[var(--green-100)] text-[var(--green-700)]",
  amber: "bg-[var(--amber-100)] text-[var(--amber-700)]",
  red: "bg-[var(--red-100)] text-[var(--red-700)]",
};

const statusColor: Record<string, string> = {
  online: "bg-[var(--green-500)]",
  away: "bg-[var(--amber-500)]",
  busy: "bg-[var(--red-500)]",
  offline: "bg-[var(--neutral-300)]",
};

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  tone?: keyof typeof fallbackTones;
  status?: keyof typeof statusColor;
}

export const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(
  (
    { className, size, shape, src, alt, fallback, tone = "neutral", status, ...props },
    ref
  ) => (
    <span className="relative inline-block">
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({ size, shape }), className)}
        {...props}
      >
        {src ? (
          <AvatarPrimitive.Image src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
        ) : null}
        <AvatarPrimitive.Fallback
          className={cn(
            "flex h-full w-full items-center justify-center font-medium uppercase",
            fallbackTones[tone]
          )}
        >
          {fallback}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
      {status ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-[var(--surface)]",
            statusColor[status]
          )}
        />
      ) : null}
    </span>
  )
);
Avatar.displayName = "Avatar";
