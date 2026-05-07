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
        md: "size-8 text-2xs",
        lg: "size-10 text-sm",
        xl: "size-14 text-lg",
        "2xl": "size-20 text-2xl",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-md",
      },
    },
    defaultVariants: { size: "md", shape: "circle" },
  }
);

const fallbackTones: Record<string, string> = {
  neutral: "bg-neutral-200 text-neutral-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const statusColor: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-amber-500",
  busy: "bg-red-500",
  offline: "bg-neutral-300",
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
          <AvatarPrimitive.Image
            src={src}
            alt={alt ?? ""}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
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
            "absolute bottom-0 right-0 size-2 rounded-full ring-2 ring-surface",
            statusColor[status]
          )}
        />
      ) : null}
    </span>
  )
);
Avatar.displayName = "Avatar";
