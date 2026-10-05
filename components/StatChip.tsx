import { Check, Minus, Pencil, Plus } from "lucide-react";

type StatChipType = "added" | "deleted" | "modified" | "unchanged";

const VARIANTS: Record<StatChipType, { icon: typeof Plus; prefix: string; classes: string }> = {
  added: { icon: Plus, prefix: "+", classes: "bg-ok-soft text-ok" },
  deleted: { icon: Minus, prefix: "-", classes: "bg-bad-soft text-bad" },
  modified: { icon: Pencil, prefix: "~", classes: "bg-warn-soft text-warn" },
  unchanged: { icon: Check, prefix: "", classes: "bg-card text-subtle" },
};

export default function StatChip({
  type,
  count,
}: {
  type: StatChipType;
  count: number | null;
}) {
  if (count == null) return null;
  const { icon: Icon, prefix, classes } = VARIANTS[type];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold num ${classes}`}>
      <Icon size={11} aria-hidden="true" />
      {prefix}{count.toLocaleString()}
      <span className="font-medium opacity-80">{type}</span>
    </span>
  );
}
