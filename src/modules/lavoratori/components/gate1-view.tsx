import { CalendarDaysIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { GATE1_IN_PERSON_BOOKING_LINKS } from "../lib/gate1-utils";
import type { GateViewProps } from "../types/gate1-view";
import { Gate1DetailPanel } from "./gate1/gate1-detail-panel";
import { Gate1ListPanel } from "./gate1/gate1-list-panel";
import { Gate1ViewProvider, useGate1ViewContext } from "./gate1/gate1-view-context";

export type { GateViewProps } from "../types/gate1-view";

export function Gate1View(props: GateViewProps) {
  return (
    <Gate1ViewProvider {...props}>
      <Gate1ViewLayout />
    </Gate1ViewProvider>
  );
}

function Gate1ViewLayout() {
  const { selectedWorkerId, showInPersonBookingLinks } = useGate1ViewContext();

  return (
    <section className="ui flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      {showInPersonBookingLinks ? (
        <div className="flex flex-wrap items-center justify-end gap-2 px-4 pt-4">
          {GATE1_IN_PERSON_BOOKING_LINKS.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm">
              <a href={link.href} target="_blank" rel="noreferrer">
                <CalendarDaysIcon className="size-4" />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      ) : null}
      <div
        className={
          selectedWorkerId
            ? "grid min-h-0 flex-1 gap-3 px-4 pb-2 pt-4 lg:grid-cols-[332px_minmax(0,1fr)]"
            : "grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 pb-2 pt-4"
        }
      >
        <Gate1ListPanel />
        <Gate1DetailPanel />
      </div>
    </section>
  );
}
