import { ToolCard, SectionDivider } from '../../ui';
import {
  IconHammer,
  IconFurnace,
  IconFlame,
  IconLaborer,
  IconPouch,
} from '../../shell/navIcons';

const TOOLS = [
  { to: '/calculator', title: 'Crafting Calculator', description: 'Per-item profit with fees, focus, RR.',       icon: IconHammer,    prominent: true },
  { to: '/refining',   title: 'Refining Calculator', description: 'Raw → refined with focus, RR + transport.',  icon: IconFurnace,   prominent: true },
  { to: '/cooking',    title: 'Cooking Calculator',  description: 'Recipe-by-recipe meal profit.',              icon: IconFlame },
  { to: '/laborers',   title: 'Laborer Calculator',  description: 'House, journals, happiness, ROI.',           icon: IconLaborer },
  { to: '/transmute',  title: 'Transmutation Profit', description: 'Recipe-aware flip calculator with what-if slider.', icon: IconFurnace, prominent: true },
  { to: '/portfolio',  title: 'Portfolio',           description: 'Track silver positions across items.',       icon: IconPouch },
];

export default function QuickToolsPanel() {
  return (
    <section className="space-y-3">
      <SectionDivider label="Quick Tools" hint="Direct paths into the most-used calculators" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {TOOLS.map(t => (
          <ToolCard key={t.to} {...t} />
        ))}
      </div>
      <div className="text-right pt-1">
        <a href="#tools-all" className="text-[10px] uppercase tracking-[0.18em] text-gold/65 hover:text-gold-light font-bold">
          See all in the Tools menu →
        </a>
      </div>
    </section>
  );
}
