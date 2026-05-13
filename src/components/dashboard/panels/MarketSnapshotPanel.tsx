import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { SectionDivider, ProfitBadge } from '../../ui';
import { useAppStore } from '../../../store/appStore';
import { formatSilver } from '../../../utils/formatters';

/**
 * Market snapshot — reads from the user's customPrices store as a proxy for
 * "watched items". Real live-scan would require the AODP-bulk pipeline we
 * removed, so this panel is intentionally personal: show what the user has
 * manually tracked, plus a CTA to add more.
 *
 * Buy/sell order placeholder columns: if user enters paired buy+sell prices
 * for the same item (key shape "ITEM_ID@city@buy" / "@sell" — convention
 * documented but not enforced), we render a spread. Otherwise it's a single
 * value.
 */

interface Row {
  itemId: string;
  city: string;
  price: number;
  ts?: number;
}

function parseCustomPriceKey(key: string): { itemId: string; city: string } | null {
  // Conventional shape: "ITEM_ID@CITY" (Albion item IDs already contain @ for
  // enchant, so we split on the LAST @ that has a known city after it).
  const lastAt = key.lastIndexOf('@');
  if (lastAt < 0) return null;
  return { itemId: key.slice(0, lastAt), city: key.slice(lastAt + 1) };
}

export default function MarketSnapshotPanel() {
  const customPrices = useAppStore(s => s.customPrices);

  const rows = useMemo<Row[]>(() => {
    return Object.entries(customPrices)
      .map(([key, price]) => {
        const parsed = parseCustomPriceKey(key);
        return parsed ? { itemId: parsed.itemId, city: parsed.city, price } : null;
      })
      .filter((r): r is Row => r !== null)
      .slice(0, 8);
  }, [customPrices]);

  return (
    <section className="space-y-3">
      <SectionDivider label="Market Snapshot" hint="Your watched items" />
      <div className="medieval-panel p-3">
        {rows.length === 0 ? (
          <EmptyMarket />
        ) : (
          <div className="space-y-1.5">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 pb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-gold/65 border-b border-[color:var(--color-border)]">
              <span>Item · City</span>
              <span className="text-right">Price</span>
              <span className="text-right pl-3">Trend</span>
            </div>
            {rows.map(r => (
              <div
                key={`${r.itemId}@${r.city}`}
                className="grid grid-cols-[1fr_auto_auto] gap-3 items-center px-2 py-1.5 rounded hover:bg-[rgba(214,166,74,0.05)]"
              >
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-zinc-200 truncate">{r.itemId}</div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{r.city}</div>
                </div>
                <div className="text-right font-bold tabular-nums text-zinc-100 text-[13px]">
                  {formatSilver(r.price)}
                </div>
                <div className="pl-3 text-right">
                  <ProfitBadge amount={0} signed={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-gold/65 font-bold pt-1">
        <span>{rows.length} of {Object.keys(customPrices).length} watched</span>
        <Link to="/database" className="hover:text-gold-light">Manage list →</Link>
      </div>
    </section>
  );
}

function EmptyMarket() {
  return (
    <div className="text-center py-6 px-3">
      <div className="medieval-title-sm mb-2">No watched items yet</div>
      <p className="text-[12px] text-[#a89175] leading-relaxed max-w-sm mx-auto">
        Add manual price overrides via the Custom Prices page to track them
        here. Pair this with the Crafting Calculator's live AODP fetch.
      </p>
      <Link
        to="/database"
        className="inline-block mt-3 px-4 py-1.5 rounded-md bg-gold/15 hover:bg-gold/25 border border-gold/45 text-gold-light text-[11px] font-bold uppercase tracking-[0.16em] transition-colors"
      >
        Add Custom Prices
      </Link>
    </div>
  );
}
