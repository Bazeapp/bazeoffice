"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ExperienceLevel — 4-bar gauge replacing the flat-pill from the legacy kit.
 *
 *   <ExperienceLevel level="senior" yearsLabel="5–10 anni" />
 *   <ExperienceLevel level={3} compact />     // bars only
 */
const levelMap = {
  junior: 1,
  mid: 2,
  senior: 3,
  specialist: 4,
} as const;

const labelMap = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  specialist: "Specialista",
} as const;

const yearsMap = {
  junior: "0–2 anni",
  mid: "2–5 anni",
  senior: "5–10 anni",
  specialist: "10+ anni · cert.",
} as const;

type LevelKey = keyof typeof levelMap;

export interface ExperienceLevelProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  level: LevelKey | 1 | 2 | 3 | 4;
  label?: React.ReactNode;
  yearsLabel?: React.ReactNode;
  compact?: boolean;
}

export function ExperienceLevel({
  className,
  level,
  label,
  yearsLabel,
  compact = false,
  ...props
}: ExperienceLevelProps) {
  const value = typeof level === "number" ? level : levelMap[level];
  const resolvedLabel =
    label ?? (typeof level === "string" ? labelMap[level] : null);
  const resolvedYears =
    yearsLabel ?? (typeof level === "string" ? yearsMap[level] : null);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-[var(--text-xs)] text-[var(--foreground-strong)]",
        className
      )}
      {...props}
    >
      <span className="inline-flex gap-[2px]" aria-hidden>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={cn(
              "h-3.5 w-1.5 rounded-[2px]",
              i <= value ? "bg-[var(--accent)]" : "bg-[var(--neutral-200)]"
            )}
          />
        ))}
      </span>
      {!compact && resolvedLabel ? (
        <span className="font-medium">{resolvedLabel}</span>
      ) : null}
      {!compact && resolvedYears ? (
        <span className="text-[var(--foreground-subtle)]">{resolvedYears}</span>
      ) : null}
    </span>
  );
}
