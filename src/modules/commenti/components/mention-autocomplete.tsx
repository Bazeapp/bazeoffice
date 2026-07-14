import type { OperatoreOption } from "@/hooks/use-operatori-options"
import { cn } from "@/lib/utils"

import { getAvatarColor } from "../lib/comment-display"
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
        "max-h-56 overflow-x-hidden overflow-y-auto rounded-xl border border-[#e0e3e9] bg-white",
        "shadow-[0_12px_32px_rgba(15,23,42,0.16)]",
        className,
      )}
      role="listbox"
    >
      {sections.map((section, sectionIndex) => (
        <div
          key={section.title}
          className={cn(
            "pb-1",
            sectionIndex > 0 ? "border-t border-[#f1f3f5]" : null,
          )}
        >
          <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-[0.06em] text-[#9ca3af] uppercase">
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
                  "flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left",
                  isHighlighted ? "bg-[#EFF6FF]" : "hover:bg-[#F8F9FA]",
                )}
                onMouseDown={(event) => {
                  event.preventDefault()
                  onSelect(option)
                }}
              >
                <span
                  aria-hidden
                  className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: getAvatarColor(option.label) }}
                >
                  {option.avatar}
                </span>
                <span className="truncate text-[13px] font-medium text-[#1a1f2e]">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
