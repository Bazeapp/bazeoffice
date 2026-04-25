"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Skeleton — refresh primitive. Two tones: shimmer (default) and pulse.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "shimmer" | "pulse";
}

export function Skeleton({ className, variant = "shimmer", ...props }: SkeletonProps) {
  return (
    <div
      data-variant={variant}
      className={cn(
        "rounded-[var(--radius-sm)] bg-[var(--neutral-150)]",
        variant === "pulse" && "animate-pulse",
        variant === "shimmer" &&
          "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-[var(--neutral-100)] before:to-transparent",
        className
      )}
      {...props}
    />
  );
}
