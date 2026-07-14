import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { cn } from "@/lib/utils"

import type { MentionAutocompleteSection } from "../hooks/use-mention-autocomplete"

type MentionAutocompleteProps = {
  sections: MentionAutocompleteSection[]
  highlightedIndex: number
  onSelect: (operator: OperatoreOption) => void
  className?: string
}

function getFlatIndex(
  sections: MentionAutocompleteSection[],
  sectionIndex: number,
  optionIndex: number,
): number {
  let index = 0
  for (let currentSection = 0; currentSection < sections.length; currentSection += 1) {
    const section = sections[currentSection]
    if (!section) continue
    if (currentSection === sectionIndex) {
      return index + optionIndex
    }
    index += section.options.length
  }
  return index
}

export function MentionAutocomplete({
  sections,
  highlightedIndex,
  onSelect,
  className,
}: MentionAutocompleteProps) {
  return (
    <div
      data-testid="comments-mention-autocomplete"
      className={cn(
        "max-h-56 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-(--shadow-lg)",
        className,
      )}
      role="listbox"
    >
      {sections.map((section, sectionIndex) => (
        <div key={section.title} className="py-1">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {section.title}
          </p>
          {section.options.map((option, optionIndex) => {
            const flatIndex = getFlatIndex(sections, sectionIndex, optionIndex)
            const isHighlighted = flatIndex === highlightedIndex
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                data-testid={`comments-mention-option-${option.id}`}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                  isHighlighted ? "bg-accent-soft text-accent-ink" : "hover:bg-surface-muted",
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  onSelect(option)
                }}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full bg-neutral-100 text-xs font-semibold",
                    option.avatarBorderClassName,
                  )}
                >
                  {option.avatar}
                </span>
                <span className="truncate">{option.label}</span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
