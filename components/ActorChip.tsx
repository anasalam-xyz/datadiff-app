import { Bot, UserRound } from "lucide-react";

interface ActorChipProps {
  label?: string | null;
  type?: string | null;
  className?: string;
}

export default function ActorChip({
  label,
  type,
  className = "",
}: ActorChipProps) {
  const actorLabel = label?.trim() || "anonymous";
  const actorType = type?.trim();
  const isSystem = actorType?.toLowerCase() === "system";
  const Icon = isSystem ? Bot : UserRound;

  return (
    <span
      className={`chip inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 text-[11px] ${className}`}
      title={actorType ? `${actorLabel} (${actorType})` : actorLabel}
    >
      <Icon size={12} aria-hidden="true" className="shrink-0 text-subtle" />
      <span className="truncate font-semibold">{actorLabel}</span>
      {actorType && (
        <span className="shrink-0 rounded-full bg-card px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-mute">
          {actorType}
        </span>
      )}
    </span>
  );
}
