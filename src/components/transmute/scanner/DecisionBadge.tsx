// Ported from Codex 2026-05-14 transmutation scanner.
import type { DecisionLevel } from "./types";

const styles: Record<DecisionLevel, string> = {
  Strong: "border-moss-300/70 bg-moss-500/20 text-moss-300",
  Playable: "border-oldgold-300/70 bg-oldgold-500/20 text-oldgold-300",
  Thin: "border-sky-300/50 bg-sky-500/15 text-sky-200",
  Loss: "border-ember-400/70 bg-ember-500/20 text-ember-400"
};

export function DecisionBadge({ decision }: { decision: DecisionLevel }) {
  return (
    <span
      className={`inline-flex min-w-20 items-center justify-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${styles[decision]}`}
    >
      {decision}
    </span>
  );
}
