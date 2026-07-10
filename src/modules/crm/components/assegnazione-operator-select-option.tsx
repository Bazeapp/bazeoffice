import { Avatar } from "@/components/ui/avatar";
import { toAvatarRingClass } from "@/lib/utils";
import type { OperatoreOption } from "@/hooks/use-operatori-options";

export function AssegnazioneOperatorSelectOption({
  operator,
}: {
  operator: OperatoreOption;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar
        size="sm"
        fallback={operator.avatar}
        className={toAvatarRingClass(operator.avatarBorderClassName)}
      />
      <span className="truncate">{operator.label}</span>
    </span>
  );
}
