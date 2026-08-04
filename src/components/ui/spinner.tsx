import React from "react"

import { cn } from "@/lib/utils"

interface SpinnerProps extends React.ComponentProps<"span"> {
  size?: number | string
  ticksCount?: number
  tickWidth?: string
}

const CYCLE_DURATION = 1.2

export function Spinner({ className, ticksCount = 12, tickWidth = "8%", ...props }: SpinnerProps) {
  const stagger = CYCLE_DURATION / ticksCount
  return (
    <span
      className={cn("relative size-[1em]", className)}
      role="status"
      aria-label="Loading"
      data-slot="spinner"
      {...props}
    >
      {Array(ticksCount)
        .fill(0)
        .map((_, i) => {
          return (
            <div
              className={cn(
                "absolute right-1/2 h-1/2 origin-bottom scale-95 transform animate-tick-fade",
                "after:absolute after:inset-x-0 after:top-0 after:h-1/2 after:rounded-full after:bg-current",
              )}
              style={{
                width: tickWidth,
                transform: `rotate(${i * (360 / ticksCount)}deg)`,
                animationDuration: `${CYCLE_DURATION}s`,
                animationDelay: `-${(ticksCount - i) * stagger}s`,
                opacity: `${0.1 + (0.9 / (ticksCount - 1)) * i}`,
                ["--tw-translate-x" as string]: parseInt(tickWidth) / 2,
              }}
              key={i}
            />
          )
        })}
    </span>
  )
}
