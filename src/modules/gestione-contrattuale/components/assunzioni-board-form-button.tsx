import type { ReactNode } from "react"
import { FileTextIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function AssunzioniBoardFormButton({
  href,
  children,
}: {
  href: string
  children: ReactNode
}) {
  if (!href) {
    return (
      <Button
        className="gap-2"
        disabled
        title="Link form da configurare"
        variant="outline"
      >
        <FileTextIcon className="size-4" />
        {children}
      </Button>
    )
  }

  return (
    <Button className="gap-2" variant="outline" asChild>
      <a href={href} target="_blank" rel="noreferrer">
        <FileTextIcon className="size-4" />
        {children}
      </a>
    </Button>
  )
}
