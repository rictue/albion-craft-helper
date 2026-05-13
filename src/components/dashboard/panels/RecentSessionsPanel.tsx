import { Link } from 'react-router-dom';
import { DataTable, EmptyState, ProfitBadge, SectionDivider } from '../../ui';
import type { Column } from '../../ui';
import { formatSilver } from '../../../utils/formatters';
import type { CraftEntry } from '../Dashboard';

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const TYPE_COLOR: Record<CraftEntry['type'], string> = {
  refining: 'text-cyan-300',
  crafting: 'text-gold-light',
  butcher:  'text-rose-300',
  cooking:  'text-orange-300',
  farming:  'text-lime-300',
  flipping: 'text-purple-300',
  other:    'text-zinc-300',
};

export default function RecentSessionsPanel({ rows }: { rows: CraftEntry[] }) {
  const columns: Column<CraftEntry>[] = [
    {
      key: 'name',
      header: 'Session',
      cell: r => (
        <div>
          <div className="text-zinc-100 font-semibold leading-tight">{r.name}</div>
          <div className={`text-[10px] uppercase tracking-wider mt-0.5 ${TYPE_COLOR[r.type]}`}>{r.type}</div>
        </div>
      ),
    },
    { key: 'cost',  header: 'Cost',    numeric: true, cell: r => formatSilver(r.cost) },
    { key: 'rev',   header: 'Revenue', numeric: true, cell: r => formatSilver(r.revenue) },
    {
      key: 'profit',
      header: 'Profit',
      numeric: true,
      cell: r => (
        <ProfitBadge
          amount={r.revenue - r.cost}
          percent={r.cost > 0 ? ((r.revenue - r.cost) / r.cost) * 100 : undefined}
        />
      ),
    },
    {
      key: 'when',
      header: 'When',
      numeric: true,
      cell: r => <span className="text-[11px] text-zinc-500">{formatRelativeTime(r.ts)}</span>,
    },
  ];

  return (
    <section className="space-y-3">
      <SectionDivider label="Recent Sessions" hint="Last logged crafts from Profit History" />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={r => r.id}
        empty={
          <EmptyState
            title="No sessions logged yet"
            description="Use Profit History to log finished refining, crafting, or cooking runs. They feed the stat cards above."
            action={
              <Link
                to="/craft-history"
                className="chip border-gold/40 bg-gold/10 text-gold-light hover:bg-gold/20 transition-colors"
              >
                Open Profit History
              </Link>
            }
          />
        }
      />
    </section>
  );
}
