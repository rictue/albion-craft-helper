/**
 * Numbered step marker used inside sidebar config sections.
 *
 * Used by SimpleRefine, IslandPlanner, Cooking, etc. The accent color is
 * customisable so each calculator can keep its own visual identity
 * (cyan for refining, emerald for island, orange for cooking).
 */

interface Props {
  num: number;
  label: string;
  /** Tailwind color tokens — pass e.g. { ring: 'cyan-500', text: 'cyan-300' } */
  accent?: { ring: string; text: string };
}

const DEFAULT_ACCENT = { ring: 'cyan-500', text: 'cyan-300' };

export default function StepHeader({ num, label, accent = DEFAULT_ACCENT }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-5 h-5 rounded-full bg-${accent.ring}/15 border border-${accent.ring}/30 flex items-center justify-center text-[10px] font-bold text-${accent.text}`}
      >
        {num}
      </span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-300 font-semibold">
        {label}
      </span>
    </div>
  );
}
