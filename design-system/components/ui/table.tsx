"use client";

import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Table — refresh primitive.
 * Tabular-nums on numeric cells, sticky header support, hover row highlight.
 */
export const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto">
    <table
      ref={ref}
      className={cn(
        "w-full caption-bottom text-[var(--text-sm)] text-[var(--foreground-strong)]",
        className
      )}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn("bg-[var(--background-subtle)]", className)}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-[var(--border-subtle)] transition-colors",
      "hover:bg-[var(--neutral-50)] data-[state=selected]:bg-[var(--accent-soft)]",
      className
    )}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-9 px-3 text-left align-middle font-semibold",
      "text-[10px] uppercase tracking-[0.08em] text-[var(--foreground-faint)]",
      "border-b border-[var(--border-subtle)]",
      className
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("h-10 px-3 align-middle", className)}
    {...props}
  />
));
TableCell.displayName = "TableCell";

export const TableNumeric = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <TableCell className={cn("text-right tabular-nums", className)} {...props} />
);
