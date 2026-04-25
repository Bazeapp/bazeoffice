"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { Button, type ButtonProps } from "./button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { cn } from "../../lib/utils";

/**
 * Pagination — refresh primitive (compound).
 *
 *   <Pagination>
 *     <Pagination.Range from={21} to={40} total={412} unit="lavoratori" />
 *     <Pagination.Pages page={2} pageCount={21} onChange={setPage} />
 *     <Pagination.PerPage value={20} onChange={setPerPage} />
 *   </Pagination>
 */

function Root({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-[var(--text-xs)]",
        className
      )}
      {...props}
    />
  );
}

interface RangeProps extends React.HTMLAttributes<HTMLDivElement> {
  from: number;
  to: number;
  total: number;
  unit?: string;
}

function Range({ from, to, total, unit, className, ...props }: RangeProps) {
  return (
    <div
      className={cn(
        "text-[var(--text-xs)] text-[var(--foreground-muted)] tabular-nums",
        className
      )}
      {...props}
    >
      <strong className="text-[var(--foreground-strong)] font-semibold">
        {from}–{to}
      </strong>{" "}
      di <strong className="text-[var(--foreground-strong)] font-semibold">{total}</strong>
      {unit ? ` ${unit}` : null}
    </div>
  );
}

interface PagesProps {
  page: number;
  pageCount: number;
  onChange?: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

function Pages({ page, pageCount, onChange, siblingCount = 1, className }: PagesProps) {
  const items = buildPageItems(page, pageCount, siblingCount);
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page <= 1}
        onClick={() => onChange?.(page - 1)}
        aria-label="Previous page"
      >
        ‹
      </Button>
      {items.map((it, i) =>
        it === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-[var(--foreground-faint)]">
            …
          </span>
        ) : (
          <Button
            key={it}
            variant={it === page ? "default" : "ghost"}
            size="sm"
            onClick={() => onChange?.(it)}
            aria-current={it === page ? "page" : undefined}
            className="tabular-nums min-w-[var(--h-sm)]"
          >
            {it}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon-sm"
        disabled={page >= pageCount}
        onClick={() => onChange?.(page + 1)}
        aria-label="Next page"
      >
        ›
      </Button>
    </div>
  );
}

interface PerPageProps {
  value: number;
  options?: number[];
  onChange?: (value: number) => void;
  label?: React.ReactNode;
  className?: string;
}

function PerPage({
  value,
  options = [10, 20, 50, 100],
  onChange,
  label = "Per pagina",
  className,
}: PerPageProps) {
  return (
    <div className={cn("flex items-center gap-2 text-[var(--foreground-muted)]", className)}>
      {label ? <span>{label}</span> : null}
      <Select
        value={String(value)}
        onValueChange={(v) => onChange?.(Number(v))}
      >
        <SelectTrigger className="h-7 min-w-[60px] text-[var(--text-xs)] tabular-nums">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={String(o)} className="tabular-nums">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function buildPageItems(
  page: number,
  pageCount: number,
  sibling: number
): (number | "…")[] {
  const items: (number | "…")[] = [];
  const left = Math.max(2, page - sibling);
  const right = Math.min(pageCount - 1, page + sibling);

  items.push(1);
  if (left > 2) items.push("…");
  for (let i = left; i <= right; i++) items.push(i);
  if (right < pageCount - 1) items.push("…");
  if (pageCount > 1) items.push(pageCount);
  return items;
}

export const Pagination = Object.assign(Root, { Range, Pages, PerPage });
