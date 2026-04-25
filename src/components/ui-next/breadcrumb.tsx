"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

/**
 * Breadcrumb — refresh primitive.
 *
 *   <Breadcrumb>
 *     <BreadcrumbItem href="/">Lavoratori</BreadcrumbItem>
 *     <BreadcrumbItem href="/cerca">Cerca</BreadcrumbItem>
 *     <BreadcrumbItem current idBadge="LAV-1024">Aria Bocelli</BreadcrumbItem>
 *   </Breadcrumb>
 */
export function Breadcrumb({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <nav aria-label="breadcrumb" className={cn(className)}>
      <ol
        className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--foreground-subtle)]"
        {...props}
      />
    </nav>
  );
}

export interface BreadcrumbItemProps
  extends React.LiHTMLAttributes<HTMLLIElement> {
  href?: string;
  current?: boolean;
  icon?: React.ReactNode;
  idBadge?: React.ReactNode;
  asChild?: boolean;
}

export function BreadcrumbItem({
  className,
  href,
  current,
  icon,
  idBadge,
  asChild,
  children,
  ...props
}: BreadcrumbItemProps) {
  const Inner: React.ElementType = asChild ? Slot : current ? "span" : href ? "a" : "span";
  const interactive = !current && (href || asChild);
  return (
    <>
      <li className={cn("inline-flex items-center gap-1.5", className)} {...props}>
        <Inner
          {...(interactive && href ? { href } : {})}
          aria-current={current ? "page" : undefined}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] px-1.5 py-0.5 no-underline",
            current
              ? "font-medium text-[var(--foreground-strong)]"
              : "text-[var(--foreground-subtle)] hover:text-[var(--foreground)]"
          )}
        >
          {icon}
          {children}
        </Inner>
        {idBadge ? (
          <Badge variant="outline" shape="square" size="sm" className="font-mono">
            {idBadge}
          </Badge>
        ) : null}
      </li>
      {!current ? <BreadcrumbSeparator /> : null}
    </>
  );
}

export function BreadcrumbSeparator({
  className,
}: {
  className?: string;
}) {
  return (
    <li aria-hidden className={cn("text-[var(--foreground-faint)]", className)}>
      <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 4l4 4-4 4" />
      </svg>
    </li>
  );
}

export function BreadcrumbEllipsis({ className }: { className?: string }) {
  return (
    <li className={cn("inline-flex items-center", className)}>
      <button
        type="button"
        className="rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[var(--foreground-subtle)] hover:bg-[var(--neutral-100)]"
        aria-label="Show more"
      >
        …
      </button>
    </li>
  );
}
