"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import { Badge } from "./badge";

/**
 * ExperienceCardTitle — refresh layout for ruolo + datore.
 * Stacked hierarchy: bold role + chips, mid-weight context, mono small for hard data.
 */
export interface ExperienceCardTitleProps
  extends React.HTMLAttributes<HTMLDivElement> {
  role: React.ReactNode;
  duration?: React.ReactNode;
  verified?: boolean;
  employer?: React.ReactNode;
  city?: React.ReactNode;
  meta?: React.ReactNode;
  tags?: React.ReactNode[];
}

export function ExperienceCardTitle({
  className,
  role,
  duration,
  verified,
  employer,
  city,
  meta,
  tags,
  ...props
}: ExperienceCardTitleProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[var(--text-md)] font-semibold tracking-[var(--tracking-snug)] text-[var(--foreground-strong)]">
          {role}
        </span>
        {duration ? (
          <Badge variant="success" shape="square" size="sm">
            {duration}
          </Badge>
        ) : null}
        {verified ? (
          <Badge variant="info" shape="square" size="sm">
            verificato
          </Badge>
        ) : null}
        {tags?.map((t, i) => (
          <Badge key={i} variant="outline" shape="square" size="sm">
            {t}
          </Badge>
        ))}
      </div>
      {(employer || city) && (
        <div className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--foreground-muted)]">
          {employer}
          {employer && city ? (
            <span className="text-[var(--foreground-faint)]">·</span>
          ) : null}
          {city}
        </div>
      )}
      {meta ? (
        <div className="text-[11.5px] text-[var(--foreground-subtle)] tabular-nums">
          {meta}
        </div>
      ) : null}
    </div>
  );
}
