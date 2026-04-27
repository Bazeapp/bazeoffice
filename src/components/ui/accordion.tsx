"use client";

import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDownIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Accordion — refresh primitive.
 *
 * Two visual tones:
 *   card  (default) — Each item is a bordered card. Use for richer detail panels
 *                     (e.g. Famiglia: Orari, Luogo di lavoro, Casa…) with an
 *                     optional `icon` slot in a tonal square on the trigger row.
 *   flush           — Borderless rows separated by a hairline. Use inside
 *                     existing surfaces (FAQ, settings groups).
 *
 * Triggers render uppercase labels by default; pass `plain` to render
 * sentence case (matches FAQ-style content).
 *
 *   <Accordion type="single" collapsible>
 *     <AccordionItem value="orari">
 *       <AccordionTrigger icon={<ClockIcon />}>Orari e frequenza</AccordionTrigger>
 *       <AccordionContent>…</AccordionContent>
 *     </AccordionItem>
 *   </Accordion>
 */

type AccordionRootProps = React.ComponentPropsWithoutRef<
  typeof AccordionPrimitive.Root
> & {
  tone?: "card" | "flush";
};

const AccordionToneCtx = React.createContext<"card" | "flush">("card");

function Accordion({ className, tone = "card", ...props }: AccordionRootProps) {
  return (
    <AccordionToneCtx.Provider value={tone}>
      <AccordionPrimitive.Root
        className={cn(
          tone === "card"
            ? "flex flex-col gap-1.5"
            : "rounded-md shadow-[0_0_0_1px_var(--border)] bg-surface divide-y divide-border-subtle overflow-hidden",
          className
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>)}
      />
    </AccordionToneCtx.Provider>
  );
}

const itemVariants = cva("group/accordion-item", {
  variants: {
    tone: {
      card: "rounded-md bg-surface shadow-[0_0_0_1px_var(--border-subtle)] data-[state=open]:shadow-[0_0_0_1px_var(--border)] overflow-hidden",
      flush: "",
    },
  },
  defaultVariants: { tone: "card" },
});

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item> &
    VariantProps<typeof itemVariants>
>(({ className, tone, ...props }, ref) => {
  const ctxTone = React.useContext(AccordionToneCtx);
  return (
    <AccordionPrimitive.Item
      ref={ref}
      className={cn(itemVariants({ tone: tone ?? ctxTone }), className)}
      {...props}
    />
  );
});
AccordionItem.displayName = "AccordionItem";

interface AccordionTriggerProps
  extends React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger> {
  icon?: React.ReactNode;
  plain?: boolean;
}

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  AccordionTriggerProps
>(({ className, children, icon, plain, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "group flex flex-1 items-center gap-3 px-4 py-3 text-left",
        "outline-none focus-visible:shadow-[var(--shadow-ring),inset_0_0_0_1px_var(--accent)]",
        "transition-colors duration-(--duration-fast)",
        "hover:bg-neutral-50",
        className
      )}
      {...props}
    >
      {icon ? (
        <span
          className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-sm",
            "bg-neutral-100 text-foreground-muted!",
            "[&_svg]:size-4 [&_svg]:shrink-0"
          )}
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span
        className={cn(
          "flex-1 truncate text-foreground-strong!",
          plain
            ? "text-sm font-medium"
            : "text-xs font-semibold uppercase tracking-[0.06em]"
        )}
      >
        {children}
      </span>
      <ChevronDownIcon
        className={cn(
          "size-4 shrink-0 text-foreground-faint!",
          "transition-transform duration-(--duration-fast)",
          "group-data-[state=open]:rotate-180 group-data-[state=open]:text-foreground-muted!"
        )}
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
));
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className={cn(
      "overflow-hidden text-sm leading-relaxed text-foreground-muted!",
      "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    )}
    {...props}
  >
    <div
      className={cn(
        "border-t border-border-subtle px-4 py-3.5",
        className
      )}
    >
      {children}
    </div>
  </AccordionPrimitive.Content>
));
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
